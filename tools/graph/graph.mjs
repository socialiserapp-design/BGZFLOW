#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {
  ASSESS_CLASSIFICATIONS,
  HARNESS2_STAGES,
  addContextGraphPrecedent,
  assessExecutionGraphSlice,
  buildNodeContextProjection,
  compileExecutionGraph,
  formatThreeLineAdvisory,
  loadContextGraph,
  loadExecutionGraph,
  queryContextGraphPrecedents,
  saveExecutionGraph,
  transitionExecutionGraph,
  validateExecutionGraph,
} from '../engine/execution-graph.mjs';
import {
  advanceWaveNode,
  auditContextGraph,
  computeCodeGraphImpact,
  initThreeGraphs,
  loadThreeGraphs,
} from '../bgz-graph.mjs';

const USAGE = `usage: bgz graph <subcommand> [options]

Google Graph Engineering & Harness 2 SDLC controller for BGZFLOW.

Subcommands:
  init | compile   Compile and save an ExecutionGraphSpec (.bgzflow/graph/execution-graph.json)
                   --goal "<summary>" [--slices s1,s2] [--dir <project>] [--json]
  validate         Validate an ExecutionGraphSpec against the 4 hard invariants
                   [--file <spec.json>] [--dir <project>] [--json]
  status           Show Execution Graph & Context Graph status for a project
                   [--dir <project>] [--json]
  transition       Advance a graph node (running | passed | failed) with 2-failure circuit breaker
                   --node <id> --status <running|passed|failed> [--agent <id>]
                   [--receipt <path>] [--reason <text>] [--builder-reasoning <text>] [--dir <project>] [--json]
  context          Build node-scoped context projection (strips builder reasoning for verifier)
                   --node <id> [--dir <project>] [--json]
  assess           Mandatory 2-failure Assess, Research, Adapt circuit-breaker resolution
                   --slice <id> --classification <${ASSESS_CLASSIFICATIONS.join('|')}>
                   --root-cause "<why>" --research "<sources>" --new-method "<changed plan>"
                   [--triage <rebuild|split>] [--receipt <path>] [--dir <project>] [--json]
  precedent        Manage Context Graph operational precedents (.bgzflow/graph/context-graph.json)
                   add --topic "<topic>" --goal "<goal>" --chosen "<opt>" --fix "<practice>" [--dir <project>]
                   query [<search>] [--dir <project>] [--json]
  advisory         Format a 3-Line Plain-English Best-Practice Advisory
                   --why "<why it fits>" --tradeoff "<main trade-off>" --concept "<1 core concept>"
  stages           List the 6-Stage Harness 2 SDLC stages and wired skills [--json]
`;

function parseFlags(argv) {
  const positional = [];
  const flags = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') {
      flags.help = true;
    } else if (arg === '--json') {
      flags.json = true;
    } else if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const next = argv[i + 1];
      if (next !== undefined && !next.startsWith('--')) {
        flags[key] = next;
        i += 1;
      } else {
        flags[key] = true;
      }
    } else {
      positional.push(arg);
    }
  }
  return { positional, flags };
}

function output(data, isJson, formatter) {
  if (isJson) {
    process.stdout.write(JSON.stringify(data, null, 2) + '\n');
  } else {
    process.stdout.write(formatter(data) + '\n');
  }
}

async function main() {
  const { positional, flags } = parseFlags(process.argv.slice(2));
  const sub = positional[0];

  if (flags.help || !sub) {
    process.stdout.write(USAGE);
    process.exit(sub ? 0 : flags.help ? 0 : 2);
  }

  const projectDir = path.resolve(String(flags.dir || process.cwd()));

  try {
    if (sub === 'init' && flags.project && !flags.goal) {
      const res = initThreeGraphs({ project: String(flags.project), waveCount: Number(flags.waves || 5) });
      output(
        { ok: true, execFile: res.execFile, ctxFile: res.ctxFile, codeFile: res.codeFile },
        flags.json,
        (d) => `Initialized 3-Graph state for '${flags.project}' -> ${d.execFile}`
      );
      return;
    }

    if (sub === 'init' || sub === 'compile') {
      const goalSummary = flags.goal || positional.slice(1).join(' ');
      if (!goalSummary || goalSummary === true) {
        process.stderr.write('error: --goal "<summary>" is required for bgz graph compile\n');
        process.exit(2);
      }
      const slices = typeof flags.slices === 'string'
        ? flags.slices.split(',').map((s) => s.trim()).filter(Boolean)
        : [{ id: 'slice-1', label: 'Primary Vertical Slice' }];
      const cg = loadContextGraph(projectDir);
      const precedentTraceIds = cg.precedents.slice(-5).map((p) => p.id);
      const spec = compileExecutionGraph({
        graphId: typeof flags.id === 'string' ? flags.id : undefined,
        goalSummary: String(goalSummary),
        slices,
        routerAgentId: typeof flags.router === 'string' ? flags.router : undefined,
        plannerAgentId: typeof flags.planner === 'string' ? flags.planner : undefined,
        defaultBuilderAgentId: typeof flags.builder === 'string' ? flags.builder : undefined,
        verifierAgentId: typeof flags.verifier === 'string' ? flags.verifier : undefined,
        advisorAgentId: typeof flags.advisor === 'string' ? flags.advisor : undefined,
        precedentTraceIds,
      });
      const savedPath = saveExecutionGraph(projectDir, spec);
      output(
        { ok: true, graphFile: savedPath, spec },
        flags.json,
        (d) =>
          `Execution graph '${d.spec.graphId}' compiled (${d.spec.nodes.length} nodes, ${d.spec.edges.length} edges) -> ${d.graphFile}`
      );
      return;
    }

    if (sub === 'validate') {
      let spec;
      if (typeof flags.file === 'string') {
        spec = JSON.parse(fs.readFileSync(path.resolve(flags.file), 'utf8'));
      } else {
        spec = loadExecutionGraph(projectDir);
      }
      if (!spec) {
        process.stderr.write(`error: no execution graph found in ${projectDir}\n`);
        process.exit(1);
      }
      const result = validateExecutionGraph(spec);
      output(
        { graphId: spec.graphId, ...result },
        flags.json,
        (d) =>
          d.valid
            ? `PASS: Execution graph '${d.graphId}' satisfies all 4 Google Graph Engineering invariants.`
            : `FAIL: Execution graph '${d.graphId}' has ${d.violations.length} violation(s):\n- ${d.violations.join('\n- ')}`
      );
      process.exit(result.valid ? 0 : 1);
    }

    if (sub === 'status') {
      const spec = loadExecutionGraph(projectDir);
      const cg = loadContextGraph(projectDir);
      if (!spec) {
        output(
          { initialized: false, projectDir, precedentsCount: cg.precedents.length },
          flags.json,
          (d) => `No active execution graph in ${d.projectDir} (Context Graph precedents: ${d.precedentsCount})`
        );
        return;
      }
      const validation = validateExecutionGraph(spec);
      const breaker = spec.nodes.find((n) => n.kind === 'advisor_circuit_breaker');
      const summary = {
        initialized: true,
        graphId: spec.graphId,
        goalSummary: spec.goalSummary,
        valid: validation.valid,
        circuitBreakerActive: breaker?.status === 'running',
        precedentsCount: cg.precedents.length,
        nodes: spec.nodes.map((n) => ({
          id: n.id,
          kind: n.kind,
          status: n.status,
          attemptCount: n.attemptCount,
          assignedAgentId: n.assignedAgentId || null,
          ...(n.adaptedMethod ? { adaptedMethod: n.adaptedMethod } : {}),
        })),
      };
      output(summary, flags.json, (d) => {
        const lines = [
          `Graph: ${d.graphId} (${d.valid ? 'VALID' : 'INVALID'})`,
          `Goal:  ${d.goalSummary}`,
          `Circuit Breaker: ${d.circuitBreakerActive ? 'ACTIVE (run bgz graph assess)' : 'clear'}`,
          `Context Graph Precedents: ${d.precedentsCount}`,
          `Nodes:`,
          ...d.nodes.map(
            (n) => `  - [${n.status.toUpperCase()}] ${n.id} (${n.kind}, attempts=${n.attemptCount}, agent=${n.assignedAgentId || 'none'})`
          ),
        ];
        return lines.join('\n');
      });
      return;
    }

    if (sub === 'transition') {
      const nodeId = flags.node;
      const status = flags.status;
      if (typeof nodeId !== 'string' || typeof status !== 'string') {
        process.stderr.write('error: --node <id> and --status <running|passed|failed> are required\n');
        process.exit(2);
      }
      const spec = loadExecutionGraph(projectDir);
      if (!spec) {
        process.stderr.write(`error: no execution-graph.json in ${projectDir}\n`);
        process.exit(1);
      }
      const res = transitionExecutionGraph(spec, {
        nodeId,
        status,
        agentId: typeof flags.agent === 'string' ? flags.agent : null,
        evidenceReceiptPath: typeof flags.receipt === 'string' ? flags.receipt : null,
        builderReasoning: typeof flags['builder-reasoning'] === 'string' ? flags['builder-reasoning'] : null,
        failureReason: typeof flags.reason === 'string' ? flags.reason : null,
      });
      const graphFile = saveExecutionGraph(projectDir, res.spec);
      output(
        {
          ok: true,
          graphFile,
          nodeId: res.node.id,
          status: res.node.status,
          attemptCount: res.node.attemptCount,
          circuitBroken: res.circuitBroken,
          nextActions: res.nextActions,
        },
        flags.json,
        (d) =>
          `Node '${d.nodeId}' -> ${d.status.toUpperCase()} (attempts=${d.attemptCount})\n${d.nextActions.map((a) => `Next: ${a}`).join('\n')}`
      );
      return;
    }

    if (sub === 'context') {
      const nodeId = flags.node || positional[1];
      if (typeof nodeId !== 'string') {
        process.stderr.write('error: --node <id> is required for bgz graph context\n');
        process.exit(2);
      }
      const spec = loadExecutionGraph(projectDir);
      if (!spec) {
        process.stderr.write(`error: no execution-graph.json in ${projectDir}\n`);
        process.exit(1);
      }
      const cg = loadContextGraph(projectDir);
      const builderNotes = spec.nodes
        .filter((n) => n.kind === 'worker_slice' && n.builderReasoning)
        .map((n) => ({ sliceId: n.id, reasoning: n.builderReasoning }));
      const projection = buildNodeContextProjection(spec, nodeId, {
        builderNotes,
        precedents: cg.precedents,
      });
      output(projection, flags.json, (d) =>
        [
          `Context Projection for ${d.nodeId} (${d.nodeKind}):`,
          `  includeBuilderReasoning: ${d.includeBuilderReasoning} (stripped=${d.strippedBuilderReasoningCount})`,
          `  precedents attached:     ${d.precedentTraces.length}`,
          `  requiredGates:           ${d.requiredGates.join(', ') || 'none'}`,
        ].join('\n')
      );
      return;
    }

    if (sub === 'assess') {
      const sliceId = flags.slice;
      const classification = flags.classification;
      const rootCause = flags['root-cause'];
      const research = flags.research;
      const newMethod = flags['new-method'];
      if (!sliceId || !classification || !rootCause || !research || !newMethod) {
        process.stderr.write(
          `error: bgz graph assess requires --slice, --classification <${ASSESS_CLASSIFICATIONS.join('|')}>, --root-cause, --research, and --new-method\n`
        );
        process.exit(2);
      }
      const res = assessExecutionGraphSlice(projectDir, {
        sliceId: String(sliceId),
        classification: String(classification),
        rootCause: String(rootCause),
        research: String(research),
        newMethod: String(newMethod),
        triageAction: typeof flags.triage === 'string' ? flags.triage : 'rebuild',
        evidenceReceiptPath: typeof flags.receipt === 'string' ? flags.receipt : 'assess-receipt',
      });
      output(
        { ok: true, ...res },
        flags.json,
        (d) =>
          `ASSESS recorded (${d.classification}) -> Precedent ${d.precedent.id} saved. Unlocked '${d.unlockedSliceId}' with adapted method: ${d.adaptedMethod}`
      );
      return;
    }

    if (sub === 'precedent') {
      const action = positional[1] || 'query';
      if (action === 'add') {
        const res = addContextGraphPrecedent(projectDir, {
          topic: flags.topic,
          goalSummary: flags.goal,
          optionsEvaluated: typeof flags.options === 'string' ? flags.options.split(',').map((s) => s.trim()) : [],
          chosenOption: flags.chosen,
          failureSignature: flags.failure || null,
          rootCause: flags['root-cause'] || null,
          verifiedPracticeOrFix: flags.fix,
          evidenceReceiptPath: flags.receipt || 'manual-receipt',
        });
        output(res, flags.json, (d) => `Added Context Graph precedent '${d.node.id}' (${d.totalPrecedents} total)`);
        return;
      }
      if (action === 'query') {
        const q = flags.query || positional.slice(2).join(' ') || '';
        const matches = queryContextGraphPrecedents(projectDir, q);
        output({ query: q, count: matches.length, precedents: matches }, flags.json, (d) =>
          d.count === 0
            ? 'No matching Context Graph precedents.'
            : d.precedents
                .map((p) => `- [${p.id}] ${p.topic}: ${p.verifiedPracticeOrFix} (chosen: ${p.chosenOption})`)
                .join('\n')
        );
        return;
      }
      process.stderr.write(`error: unknown precedent action '${action}'. Use 'add' or 'query'.\n`);
      process.exit(2);
    }

    if (sub === 'advisory') {
      const text = formatThreeLineAdvisory({
        whyItFits: flags.why,
        mainTradeOff: flags.tradeoff,
        coreConcept: flags.concept,
      });
      output({ advisory: text, lines: text.split('\n') }, flags.json, (d) => d.advisory);
      return;
    }

    if (sub === 'stages') {
      output({ stages: HARNESS2_STAGES }, flags.json, (d) =>
        d.stages
          .map(
            (s) =>
              `Stage ${s.stageNumber}: ${s.name}\n  ${s.summary}\n  Skills: ${s.recommendedSkills.join(', ')}`
          )
          .join('\n\n')
      );
      return;
    }

    if (sub === 'advance') {
      const res = advanceWaveNode({
        project: String(flags.project || 'lucian'),
        waveId: flags.wave || 'Wave 1',
        nodeId: flags.node,
        status: flags.status || 'passed',
        receipt: flags.receipt || null,
        closureSha: flags['closure-sha'] || null,
        verifierSessionId: flags.verifier || null,
        builderSessionId: flags.builder || null,
        systems: flags.systems ? String(flags.systems).split(',') : ['pc', 'mac', 'iphone'],
      });
      output(res, flags.json, (d) => `${d.waveId} :: ${d.nodeId} -> ${d.status} (${d.message || `next: ${d.nextNode}`})`);
      if (!res.ok) process.exit(1);
      return;
    }

    if (sub === 'audit') {
      const res = auditContextGraph(String(flags.project || 'lucian'));
      output(res, flags.json, (d) =>
        d.ok
          ? `PASS: 100% of ${d.totalRequirements} requirement nodes in '${d.project}' ContextGraph have wave, source, verifier, and 3-system deployment edges.`
          : `FAIL: ${d.gaps.length} gap(s) found across ${d.totalRequirements} requirements.`
      );
      process.exit(res.ok ? 0 : 1);
    }

    if (sub === 'impact') {
      const files = typeof flags.files === 'string' ? flags.files.split(',') : positional.slice(1);
      const res = computeCodeGraphImpact(String(flags.project || 'lucian'), files);
      output(res, flags.json, (d) => `Dirty surfaces for [${d.files.join(', ')}]: ${d.dirtySurfaces.join(', ')}`);
      return;
    }

    process.stderr.write(`bgz graph: unknown subcommand '${sub}'\n${USAGE}`);
    process.exit(2);
  } catch (err) {
    process.stderr.write(`bgz graph error: ${err.message}\n`);
    process.exit(1);
  }
}

main();
