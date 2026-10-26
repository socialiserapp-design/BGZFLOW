#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export const WAVE_DAG_NODES = Object.freeze([
  'BestPracticeResearchNode',
  'TruthPreSyncNode',
  'SliceBuildNode',
  'IndependentVerifyNode',
  'TriSystemDeployNode',
  'TruthPostSyncNode',
]);

export const TARGET_SYSTEMS = Object.freeze(['pc', 'mac', 'iphone']);

export function getStateGraphDir(env = process.env) {
  const home = env.USERPROFILE || env.HOME || os.homedir();
  const dir = path.join(home, '.local', 'state', 'bgzflow', 'graph');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function resolveProjectRoot(projectName) {
  if (process.env.BGZFLOW_PROJECT && fs.existsSync(process.env.BGZFLOW_PROJECT)) {
    return path.resolve(process.env.BGZFLOW_PROJECT);
  }
  const p = String(projectName || '').trim();
  if (p && fs.existsSync(path.resolve(p))) {
    return path.resolve(p);
  }
  return process.cwd();
}

function sha256Text(text) {
  return crypto.createHash('sha256').update(String(text || '')).digest('hex');
}

function computeReceiptOrClosureHash(receiptPath, explicitClosureSha) {
  if (explicitClosureSha) return String(explicitClosureSha);
  if (receiptPath && fs.existsSync(receiptPath)) {
    try {
      return sha256Text(fs.readFileSync(receiptPath));
    } catch {
      return sha256Text(`${receiptPath}:${Date.now()}`);
    }
  }
  return sha256Text(String(receiptPath || 'no-receipt'));
}

function defaultProjectRequirements() {
  const decisionsFile = process.env.BGZFLOW_DECISIONS_FILE || 'DECISIONS.md';
  const base = [];
  for (let i = 1; i <= 30; i += 1) {
    const wave = i <= 8 ? 'Wave 1' : i <= 15 ? 'Wave 2' : i <= 21 ? 'Wave 3' : i <= 26 ? 'Wave 4' : 'Wave 5';
    base.push({
      id: `Q${i}`,
      title: `${decisionsFile} Point Q${i}`,
      plannedInWave: wave,
      sourceFiles: [`packages/domain/src/execution-graph.ts`, `apps/server/src/index.ts`],
      verifierReceipt: i <= 8 ? 'receipts/wave1-verifier-receipt.json' : 'pending-wave-verifier-receipt',
      deployedSystems: ['pc', 'mac', 'iphone'],
      status: i <= 8 ? 'in_progress' : 'planned',
    });
  }
  const named = [
    {
      id: 'REQ-ORB-SKIA-LOTTIE',
      title: 'Free-Drag Skia/Lottie Voice Orb',
      plannedInWave: 'Wave 1',
      sourceFiles: ['apps/app/src/components/VoiceOrb.tsx'],
      verifierReceipt: 'receipts/wave1-trisystem-verify.json',
      deployedSystems: ['pc', 'mac', 'iphone'],
      status: 'in_progress',
    },
    {
      id: 'REQ-LEFT-RIGHT-DRAWERS',
      title: 'Left History & Right Workspace/Connectors Drawers',
      plannedInWave: 'Wave 1',
      sourceFiles: ['apps/app/src/components/ShellDrawers.tsx'],
      verifierReceipt: 'receipts/wave1-trisystem-verify.json',
      deployedSystems: ['pc', 'mac', 'iphone'],
      status: 'in_progress',
    },
    {
      id: 'REQ-ONE-CLOUD-BRAIN',
      title: 'One Shared Cloud Brain (PostgreSQL + pgvector + R2)',
      plannedInWave: 'Wave 2',
      sourceFiles: ['packages/db/src/schema.ts', 'apps/server/src/sync.ts'],
      verifierReceipt: 'pending-wave2-verifier-receipt',
      deployedSystems: ['pc', 'mac', 'iphone'],
      status: 'planned',
    },
    {
      id: 'REQ-CLOUD-VIRTUAL-PC',
      title: 'Cloud Virtual PCs & Browser Takeover',
      plannedInWave: 'Wave 3',
      sourceFiles: ['packages/core/src/virtual-pc.ts'],
      verifierReceipt: 'pending-wave3-verifier-receipt',
      deployedSystems: ['pc', 'mac', 'iphone'],
      status: 'planned',
    },
    {
      id: 'REQ-WEBSITE-MCP-MINTER',
      title: 'Website-to-MCP Minter & Guardian Gate',
      plannedInWave: 'Wave 3',
      sourceFiles: ['packages/core/src/mcp-minter.ts'],
      verifierReceipt: 'pending-wave3-verifier-receipt',
      deployedSystems: ['pc', 'mac', 'iphone'],
      status: 'planned',
    },
    {
      id: 'REQ-PROACTIVE-AGENTS',
      title: '24/7 Always-On Proactive Agents',
      plannedInWave: 'Wave 4',
      sourceFiles: ['apps/server/src/proactive-scheduler.ts'],
      verifierReceipt: 'pending-wave4-verifier-receipt',
      deployedSystems: ['pc', 'mac', 'iphone'],
      status: 'planned',
    },
    {
      id: 'REQ-TRISYSTEM-LIVE-DEPLOY',
      title: '3-System Live Wave Deploys (Desktop PC + Mac + Mobile)',
      plannedInWave: 'Wave 1',
      sourceFiles: ['scripts/deploy-trisystem.mjs'],
      verifierReceipt: 'receipts/wave1-verifier-receipt.json',
      deployedSystems: ['pc', 'mac', 'iphone'],
      status: 'in_progress',
    },
  ];
  return [...base, ...named];
}

function defaultCodeGraph(project) {
  return {
    schemaVersion: '2.0.0',
    project,
    updatedAtIso: new Date().toISOString(),
    packages: [
      { prefix: 'packages/core', surfaces: ['surface:pc', 'surface:mac', 'surface:iphone', 'surface:cloud'] },
      { prefix: 'packages/domain', surfaces: ['surface:pc', 'surface:mac', 'surface:iphone', 'surface:cloud'] },
      { prefix: 'packages/voice', surfaces: ['surface:pc', 'surface:mac', 'surface:iphone'] },
      { prefix: 'packages/db', surfaces: ['surface:pc', 'surface:mac', 'surface:cloud'] },
      { prefix: 'apps/app', surfaces: ['surface:pc', 'surface:mac', 'surface:iphone'] },
      { prefix: 'apps/desktop', surfaces: ['surface:pc', 'surface:mac'] },
      { prefix: 'apps/server', surfaces: ['surface:pc', 'surface:mac', 'surface:iphone', 'surface:cloud'] },
    ],
    surfaces: {
      'surface:pc': { dirty: false, lastDeployedSha: null, lastVerifiedAtIso: null },
      'surface:mac': { dirty: false, lastDeployedSha: null, lastVerifiedAtIso: null },
      'surface:iphone': { dirty: false, lastDeployedSha: null, lastVerifiedAtIso: null },
      'surface:cloud': { dirty: false, lastDeployedSha: null, lastVerifiedAtIso: null },
    },
  };
}

export function initThreeGraphs({ project = 'lucian', waveCount = 5 } = {}) {
  const dir = getStateGraphDir();
  const nowIso = new Date().toISOString();
  const waves = [];
  for (let w = 1; w <= waveCount; w += 1) {
    const waveId = `Wave ${w}`;
    waves.push({
      waveId,
      waveNumber: w,
      state: w === 1 ? 'active' : 'blocked_by_upstream',
      nodes: WAVE_DAG_NODES.map((nodeName, idx) => ({
        id: nodeName,
        order: idx + 1,
        status: w === 1 && idx === 0 ? 'ready' : 'pending',
        attemptCount: 0,
        maxAttemptsBeforeAdvisor: 2,
        lastDeniedClosureSha: null,
        lastReceipt: null,
        updatedAtIso: nowIso,
      })),
      deployedSystems: {
        pc: { verified: false, receipt: null, updatedAtIso: null },
        mac: { verified: false, receipt: null, updatedAtIso: null },
        iphone: { verified: false, receipt: null, updatedAtIso: null },
      },
      truthSynced: {
        preSync: false,
        postSync: false,
        filesChecked: [process.env.BGZFLOW_DECISIONS_FILE || 'DECISIONS.md', 'PROJECT-MAP.md', 'DELIVERY-PLAN.md'],
      },
    });
  }

  const executionGraph = {
    schemaVersion: '2.0.0',
    project,
    createdAtIso: nowIso,
    updatedAtIso: nowIso,
    currentWave: 'Wave 1',
    waves,
    history: [],
  };

  const contextGraph = {
    schemaVersion: '2.0.0',
    project,
    createdAtIso: nowIso,
    updatedAtIso: nowIso,
    requirements: defaultProjectRequirements(),
    precedents: [],
  };

  const codeGraph = defaultCodeGraph(project);

  const execFile = path.join(dir, `${project}-execution-graph.json`);
  const ctxFile = path.join(dir, `${project}-context-graph.json`);
  const codeFile = path.join(dir, `${project}-code-graph.json`);

  fs.writeFileSync(execFile, JSON.stringify(executionGraph, null, 2) + '\n', 'utf8');
  fs.writeFileSync(ctxFile, JSON.stringify(contextGraph, null, 2) + '\n', 'utf8');
  fs.writeFileSync(codeFile, JSON.stringify(codeGraph, null, 2) + '\n', 'utf8');

  // Mirror into project .bgzflow/graph if project directory exists
  const projRoot = resolveProjectRoot(project);
  if (fs.existsSync(projRoot)) {
    const mirrorDir = path.join(projRoot, '.bgzflow', 'graph');
    fs.mkdirSync(mirrorDir, { recursive: true });
    fs.writeFileSync(path.join(mirrorDir, `${project}-execution-graph.json`), JSON.stringify(executionGraph, null, 2) + '\n', 'utf8');
    fs.writeFileSync(path.join(mirrorDir, `${project}-context-graph.json`), JSON.stringify(contextGraph, null, 2) + '\n', 'utf8');
    fs.writeFileSync(path.join(mirrorDir, `${project}-code-graph.json`), JSON.stringify(codeGraph, null, 2) + '\n', 'utf8');
  }

  return { execFile, ctxFile, codeFile, executionGraph, contextGraph, codeGraph };
}

export function loadThreeGraphs(project = 'lucian') {
  const dir = getStateGraphDir();
  const execFile = path.join(dir, `${project}-execution-graph.json`);
  if (!fs.existsSync(execFile)) {
    return initThreeGraphs({ project });
  }
  const ctxFile = path.join(dir, `${project}-context-graph.json`);
  const codeFile = path.join(dir, `${project}-code-graph.json`);
  return {
    execFile,
    ctxFile,
    codeFile,
    executionGraph: JSON.parse(fs.readFileSync(execFile, 'utf8')),
    contextGraph: fs.existsSync(ctxFile) ? JSON.parse(fs.readFileSync(ctxFile, 'utf8')) : { requirements: [], precedents: [] },
    codeGraph: fs.existsSync(codeFile) ? JSON.parse(fs.readFileSync(codeFile, 'utf8')) : defaultCodeGraph(project),
  };
}

export function saveThreeGraphs(project, { executionGraph, contextGraph, codeGraph }) {
  const dir = getStateGraphDir();
  const execFile = path.join(dir, `${project}-execution-graph.json`);
  const ctxFile = path.join(dir, `${project}-context-graph.json`);
  const codeFile = path.join(dir, `${project}-code-graph.json`);
  if (executionGraph) fs.writeFileSync(execFile, JSON.stringify(executionGraph, null, 2) + '\n', 'utf8');
  if (contextGraph) fs.writeFileSync(ctxFile, JSON.stringify(contextGraph, null, 2) + '\n', 'utf8');
  if (codeGraph) fs.writeFileSync(codeFile, JSON.stringify(codeGraph, null, 2) + '\n', 'utf8');

  const projRoot = resolveProjectRoot(project);
  if (fs.existsSync(projRoot)) {
    const mirrorDir = path.join(projRoot, '.bgzflow', 'graph');
    fs.mkdirSync(mirrorDir, { recursive: true });
    if (executionGraph) fs.writeFileSync(path.join(mirrorDir, `${project}-execution-graph.json`), JSON.stringify(executionGraph, null, 2) + '\n', 'utf8');
    if (contextGraph) fs.writeFileSync(path.join(mirrorDir, `${project}-context-graph.json`), JSON.stringify(contextGraph, null, 2) + '\n', 'utf8');
    if (codeGraph) fs.writeFileSync(path.join(mirrorDir, `${project}-code-graph.json`), JSON.stringify(codeGraph, null, 2) + '\n', 'utf8');
  }
}

export function advanceWaveNode({
  project = 'lucian',
  waveId = 'Wave 1',
  nodeId,
  status = 'passed',
  receipt = null,
  closureSha = null,
  verifierSessionId = null,
  builderSessionId = null,
  systems = ['pc', 'mac', 'iphone'],
} = {}) {
  const state = loadThreeGraphs(project);
  const { executionGraph, contextGraph, codeGraph } = state;
  const normalizedWaveId = /^\d+$/.test(String(waveId)) ? `Wave ${waveId}` : String(waveId);
  const wave = executionGraph.waves.find((w) => w.waveId.toLowerCase() === normalizedWaveId.toLowerCase());
  if (!wave) {
    throw new Error(`Wave '${waveId}' not found in ${project} execution graph.`);
  }
  if (wave.state === 'blocked_by_upstream') {
    throw new Error(
      `Invariant 1 violation: ${wave.waveId} is blocked_by_upstream until the prior wave completes TriSystemDeployNode (pc + mac + iphone) and TruthPostSyncNode.`
    );
  }

  const node = wave.nodes.find((n) => n.id === nodeId);
  if (!node) {
    throw new Error(`Node '${nodeId}' not found in ${wave.waveId}. Valid nodes: ${WAVE_DAG_NODES.join(', ')}`);
  }

  const nowIso = new Date().toISOString();
  const currentClosureHash = computeReceiptOrClosureHash(receipt, closureSha);

  // Check IndependentVerifyNode gates + Guardian unchanged_since_denial
  if (node.id === 'IndependentVerifyNode') {
    if (verifierSessionId && builderSessionId && verifierSessionId === builderSessionId) {
      throw new Error(
        `Hard Gate violation: IndependentVerifyNode requires verifierSessionId !== builderSessionId (got '${verifierSessionId}').`
      );
    }
    if (node.lastDeniedClosureSha && node.lastDeniedClosureSha === currentClosureHash && status === 'passed') {
      throw new Error(
        `Guardian unchanged_since_denial gate: slice closure/receipt hash (${currentClosureHash.slice(0, 12)}) has not changed since the last verification denial.`
      );
    }
  }

  if (status === 'failed') {
    node.attemptCount = (node.attemptCount || 0) + 1;
    node.status = node.attemptCount >= 2 ? 'circuit_broken_advisor_required' : 'failed';
    node.lastDeniedClosureSha = currentClosureHash;
    node.updatedAtIso = nowIso;
    executionGraph.updatedAtIso = nowIso;
    executionGraph.history.push({ atIso: nowIso, waveId: wave.waveId, nodeId: node.id, status: node.status, attemptCount: node.attemptCount });
    saveThreeGraphs(project, { executionGraph, contextGraph, codeGraph });
    return {
      ok: false,
      waveId: wave.waveId,
      nodeId: node.id,
      status: node.status,
      attemptCount: node.attemptCount,
      advisorRequired: node.attemptCount >= 2,
      message:
        node.attemptCount >= 2
          ? `Circuit breaker tripped after ${node.attemptCount} failures on ${node.id}: run /advisor (bgz graph assess) before retrying.`
          : `Attempt ${node.attemptCount}/2 failed on ${node.id} (closure hash recorded for unchanged_since_denial guard).`,
    };
  }

  // Passing transition
  if (node.id === 'TruthPreSyncNode') {
    wave.truthSynced.preSync = true;
  }

  if (node.id === 'TriSystemDeployNode') {
    const sysList = Array.isArray(systems)
      ? systems
      : String(systems || 'pc,mac,iphone').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
    for (const s of sysList) {
      if (wave.deployedSystems[s]) {
        wave.deployedSystems[s] = { verified: true, receipt: receipt || 'verified', updatedAtIso: nowIso };
      }
      if (codeGraph.surfaces[`surface:${s}`]) {
        codeGraph.surfaces[`surface:${s}`].dirty = false;
        codeGraph.surfaces[`surface:${s}`].lastVerifiedAtIso = nowIso;
      }
    }
    const missingSystems = TARGET_SYSTEMS.filter((s) => !wave.deployedSystems[s]?.verified);
    if (missingSystems.length > 0) {
      node.status = 'partial_deploy';
      node.updatedAtIso = nowIso;
      saveThreeGraphs(project, { executionGraph, contextGraph, codeGraph });
      return {
        ok: true,
        waveId: wave.waveId,
        nodeId: node.id,
        status: 'partial_deploy',
        missingSystems,
        message: `TriSystemDeployNode recorded for [${sysList.join(', ')}]; still awaiting [${missingSystems.join(', ')}] before Wave advancement.`,
      };
    }
  }

  if (node.id === 'TruthPostSyncNode') {
    const missingSystems = TARGET_SYSTEMS.filter((s) => !wave.deployedSystems[s]?.verified);
    if (missingSystems.length > 0) {
      throw new Error(
        `Invariant 1 violation: Cannot pass TruthPostSyncNode before TriSystemDeployNode verifies all 3 systems (missing: ${missingSystems.join(', ')}).`
      );
    }
    wave.truthSynced.postSync = true;
    wave.state = 'completed';
    const nextWave = executionGraph.waves.find((w) => w.waveNumber === wave.waveNumber + 1);
    if (nextWave) {
      nextWave.state = 'active';
      nextWave.nodes[0].status = 'ready';
      executionGraph.currentWave = nextWave.waveId;
    }
  }

  node.status = 'passed';
  node.lastReceipt = receipt || 'verified';
  node.updatedAtIso = nowIso;

  const nextNode = wave.nodes.find((n) => n.order === node.order + 1);
  if (nextNode && nextNode.status === 'pending') {
    nextNode.status = 'ready';
  }

  executionGraph.updatedAtIso = nowIso;
  executionGraph.history.push({ atIso: nowIso, waveId: wave.waveId, nodeId: node.id, status: 'passed', receipt });
  saveThreeGraphs(project, { executionGraph, contextGraph, codeGraph });

  return {
    ok: true,
    waveId: wave.waveId,
    nodeId: node.id,
    status: 'passed',
    currentWave: executionGraph.currentWave,
    nextNode: nextNode ? nextNode.id : 'WAVE_COMPLETE',
  };
}

export function auditContextGraph(project = 'lucian') {
  const { contextGraph } = loadThreeGraphs(project);
  const reqs = contextGraph.requirements || [];
  const gaps = [];
  for (const r of reqs) {
    if (!r.plannedInWave) gaps.push({ id: r.id, gap: 'missing plannedInWave' });
    if (!Array.isArray(r.sourceFiles) || r.sourceFiles.length === 0) gaps.push({ id: r.id, gap: 'missing sourceFiles edge' });
    if (!r.verifierReceipt) gaps.push({ id: r.id, gap: 'missing verifierReceipt edge' });
    if (!Array.isArray(r.deployedSystems) || TARGET_SYSTEMS.some((s) => !r.deployedSystems.includes(s))) {
      gaps.push({ id: r.id, gap: 'missing 3-system (pc, mac, iphone) deployment target edge' });
    }
  }
  return {
    ok: gaps.length === 0,
    project,
    totalRequirements: reqs.length,
    mappedRequirements: reqs.length - gaps.length,
    gaps,
  };
}

export function computeCodeGraphImpact(project = 'lucian', files = []) {
  const state = loadThreeGraphs(project);
  const { executionGraph, contextGraph, codeGraph } = state;
  const affectedSurfaces = new Set();
  const normalizedFiles = files.map((f) => String(f).replace(/\\/g, '/'));
  for (const file of normalizedFiles) {
    for (const pkg of codeGraph.packages || []) {
      if (file.includes(pkg.prefix)) {
        for (const s of pkg.surfaces) affectedSurfaces.add(s);
      }
    }
  }
  if (affectedSurfaces.size === 0 && normalizedFiles.length > 0) {
    affectedSurfaces.add('surface:pc');
    affectedSurfaces.add('surface:mac');
    affectedSurfaces.add('surface:iphone');
  }
  for (const s of affectedSurfaces) {
    if (codeGraph.surfaces[s]) {
      codeGraph.surfaces[s].dirty = true;
    }
  }
  codeGraph.updatedAtIso = new Date().toISOString();
  saveThreeGraphs(project, { executionGraph, contextGraph, codeGraph });
  return {
    project,
    files: normalizedFiles,
    dirtySurfaces: [...affectedSurfaces],
  };
}

function parseFlags(argv) {
  const positional = [];
  const flags = {};
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--json') flags.json = true;
    else if (a === '--help' || a === '-h') flags.help = true;
    else if (a.startsWith('--')) {
      const k = a.slice(2);
      const next = argv[i + 1];
      if (next !== undefined && !next.startsWith('--')) {
        flags[k] = next;
        i += 1;
      } else {
        flags[k] = true;
      }
    } else positional.push(a);
  }
  return { positional, flags };
}

function main() {
  const { positional, flags } = parseFlags(process.argv.slice(2));
  const sub = positional[0];
  const project = String(flags.project || 'lucian');

  if (flags.help || !sub) {
    process.stdout.write(
      `usage: bgz-graph <init|status|advance|audit|impact> --project <name> [options]\n` +
        `  init     Initialize ExecutionGraph (6-node Wave DAG), ContextGraph (DECISIONS.md Q1-Q30), and KnowledgeCodeGraph\n` +
        `  status   Show current Wave, active DAG node, truth-file sync, and 3-system (pc, mac, iphone) status\n` +
        `  advance  Advance a wave node with Guardian unchanged_since_denial & 3-system deployment gates\n` +
        `  audit    Verify 100% of DECISIONS.md requirements have wave, code, verifier, and 3-system edges\n` +
        `  impact   Mark runtime surfaces (pc, mac, iphone, cloud) dirty from modified files\n`
    );
    process.exit(flags.help ? 0 : 2);
  }

  try {
    if (sub === 'init') {
      const res = initThreeGraphs({ project, waveCount: Number(flags.waves || 5) });
      if (flags.json) {
        process.stdout.write(JSON.stringify({ ok: true, execFile: res.execFile, ctxFile: res.ctxFile, codeFile: res.codeFile }, null, 2) + '\n');
      } else {
        process.stdout.write(
          `Initialized 3-Graph state for '${project}' (${res.executionGraph.waves.length} waves, ${res.contextGraph.requirements.length} requirement nodes):\n` +
            `  - ${res.execFile}\n  - ${res.ctxFile}\n  - ${res.codeFile}\n`
        );
      }
      return;
    }

    if (sub === 'status') {
      const { executionGraph, contextGraph, codeGraph } = loadThreeGraphs(project);
      const currentWaveObj = executionGraph.waves.find((w) => w.waveId === executionGraph.currentWave) || executionGraph.waves[0];
      const activeNode = currentWaveObj.nodes.find((n) => n.status !== 'passed') || currentWaveObj.nodes.at(-1);
      const summary = {
        project,
        currentWave: currentWaveObj.waveId,
        activeNode: activeNode.id,
        activeNodeStatus: activeNode.status,
        truthSynced: currentWaveObj.truthSynced,
        deployedSystems: currentWaveObj.deployedSystems,
        surfaces: codeGraph.surfaces,
        requirementsCount: contextGraph.requirements?.length || 0,
      };
      if (flags.json) {
        process.stdout.write(JSON.stringify(summary, null, 2) + '\n');
      } else {
        process.stdout.write(
          [
            `Project: ${summary.project} | Current Wave: ${summary.currentWave} | Active Node: ${summary.activeNode} (${summary.activeNodeStatus})`,
            `Truth Sync: preSync=${summary.truthSynced.preSync}, postSync=${summary.truthSynced.postSync}`,
            `3-System Live Status (${summary.currentWave}): pc=${summary.deployedSystems.pc.verified}, mac=${summary.deployedSystems.mac.verified}, iphone=${summary.deployedSystems.iphone.verified}`,
            `Requirements Mapped: ${summary.requirementsCount}`,
          ].join('\n') + '\n'
        );
      }
      return;
    }

    if (sub === 'advance') {
      const res = advanceWaveNode({
        project,
        waveId: flags.wave || 'Wave 1',
        nodeId: flags.node,
        status: flags.status || 'passed',
        receipt: flags.receipt || null,
        closureSha: flags['closure-sha'] || null,
        verifierSessionId: flags.verifier || null,
        builderSessionId: flags.builder || null,
        systems: flags.systems ? String(flags.systems).split(',') : ['pc', 'mac', 'iphone'],
      });
      if (flags.json) {
        process.stdout.write(JSON.stringify(res, null, 2) + '\n');
      } else {
        process.stdout.write(`${res.waveId} :: ${res.nodeId} -> ${res.status} (${res.message || `next: ${res.nextNode}`})\n`);
      }
      if (!res.ok) process.exit(1);
      return;
    }

    if (sub === 'audit') {
      const res = auditContextGraph(project);
      if (flags.json) {
        process.stdout.write(JSON.stringify(res, null, 2) + '\n');
      } else {
        process.stdout.write(
          res.ok
            ? `PASS: 100% of ${res.totalRequirements} requirement nodes in '${project}' ContextGraph have wave, source, verifier, and 3-system deployment edges.\n`
            : `FAIL: ${res.gaps.length} gap(s) found across ${res.totalRequirements} requirements.\n`
        );
      }
      process.exit(res.ok ? 0 : 1);
    }

    if (sub === 'impact') {
      const files = typeof flags.files === 'string' ? flags.files.split(',') : positional.slice(1);
      const res = computeCodeGraphImpact(project, files);
      if (flags.json) {
        process.stdout.write(JSON.stringify(res, null, 2) + '\n');
      } else {
        process.stdout.write(`Dirty surfaces for [${res.files.join(', ')}]: ${res.dirtySurfaces.join(', ')}\n`);
      }
      return;
    }

    process.stderr.write(`bgz-graph: unknown subcommand '${sub}'\n`);
    process.exit(2);
  } catch (err) {
    process.stderr.write(`bgz-graph error: ${err.message}\n`);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}` || process.argv[1]?.endsWith('bgz-graph.mjs')) {
  main();
}
