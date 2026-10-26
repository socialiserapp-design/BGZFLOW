import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export const NODE_KINDS = Object.freeze([
  'router_research',
  'lead_planner',
  'worker_slice',
  'deterministic_join',
  'advisor_circuit_breaker',
  'independent_verifier',
  'complete',
]);

export const EDGE_CONDITIONS = Object.freeze([
  'always',
  'on_pass',
  'on_fail_retry_slice',
  'on_fail_circuit_break_advisor',
  'on_all_joined',
]);

export const ASSESS_CLASSIFICATIONS = Object.freeze([
  'spec',
  'decomposition',
  'method',
  'tool',
  'model',
  'test',
]);

export const HARNESS2_STAGES = Object.freeze([
  {
    id: 'stage_1_requirements_premortem',
    stageNumber: 1,
    name: 'Requirements, Scope & Step 0 Pre-Mortem',
    summary: 'Clarify completion criteria, run Step 0 Pre-Mortem (rank failure modes with Jev and write catching check first), and query Context Graph precedents.',
    recommendedSkills: ['interrogate', 'research-scout-ground-truth', 'advisor'],
  },
  {
    id: 'stage_2_architecture_oss_reuse',
    stageNumber: 2,
    name: 'Architecture, Statecharts & OSS Reuse',
    summary: 'Prefer battle-tested OSS (MIT/Apache-2.0) and explicit statecharts/DAGs over bespoke hand-rolled state.',
    recommendedSkills: ['how', 'architect', 'statechart'],
  },
  {
    id: 'stage_3_ui_ux_taste',
    stageNumber: 3,
    name: 'UI/UX, Generative Surfaces & Anti-Slop Taste',
    summary: 'Exhaust the design space, enforce anti-slop taste gates, and use structured generative UI surfaces where appropriate.',
    recommendedSkills: ['openui-generative-surfaces', 'exhaust-the-design-space-and-deslop', 'grok-voice'],
  },
  {
    id: 'stage_4_vertical_slice_build',
    stageNumber: 4,
    name: 'Vertical-Slice Build & Deterministic Join',
    summary: 'Build one user-observable vertical slice at a time (BUILT -> REACHED -> USED) and pass zero-LLM deterministic join (build + typecheck + scan + taste).',
    recommendedSkills: ['create-verification-skill', 'maintain-verification-skill'],
  },
  {
    id: 'stage_5_independent_verification_attack',
    stageNumber: 5,
    name: 'Closed-Loop Real-Surface Verification & Step 2 Jev Attack',
    summary: 'Independent verifier (stripped of builder reasoning) exercises real surface and runs Step 2 Jev Attack across content, hostile inputs, failure injection, regressions, and cost.',
    recommendedSkills: ['control-ui', 'control-cli', 'verify-this', 'principle-prove-it-works'],
  },
  {
    id: 'stage_6_post_task_learning',
    stageNumber: 6,
    name: 'Post-Task Structural Learning & Context Graph Precedents',
    summary: 'Record causal decision traces in Context Graph, capture lessons, and propose skill improvements from evidence.',
    recommendedSkills: ['advisor', 'maintain-verification-skill'],
  },
]);

/**
 * Formats a 3-Line Plain-English Best-Practice Advisory as agreed in the Lucian chat:
 * Line 1: Why it fits (plain English benefit for this task)
 * Line 2: Main trade-off (what it costs or changes)
 * Line 3: 1 core concept (the single mechanism to understand)
 */
export function formatThreeLineAdvisory({ whyItFits, mainTradeOff, coreConcept }) {
  const w = String(whyItFits || '').trim();
  const t = String(mainTradeOff || '').trim();
  const c = String(coreConcept || '').trim();
  if (!w || !t || !c) {
    throw new Error('3-line advisory requires non-empty whyItFits, mainTradeOff, and coreConcept.');
  }
  return [
    `Why it fits: ${w}`,
    `Main trade-off: ${t}`,
    `Core concept: ${c}`,
  ].join('\n');
}

/**
 * Validates a Google Graph Engineering ExecutionGraphSpec against the 4 hard invariants:
 * 1. `complete` can ONLY be reached from `independent_verifier` on `on_pass`.
 * 2. Every `independent_verifier` must satisfy `assignedAgentId !== builderAgentId` and `contextProjection.includeBuilderReasoning === false`.
 * 3. Every `worker_slice` must pass through `deterministic_join` before reaching `independent_verifier`.
 * 4. Retry edges (`on_fail_retry_slice`) are bounded to `maxTraversals <= 2`, and slices with retries must have an `on_fail_circuit_break_advisor` route to `advisor_circuit_breaker`.
 */
export function validateExecutionGraph(spec) {
  const violations = [];
  if (!spec || typeof spec !== 'object') {
    return { valid: false, violations: ['ExecutionGraphSpec must be a non-null object.'] };
  }
  if (!Array.isArray(spec.nodes) || spec.nodes.length === 0) {
    return { valid: false, violations: ['ExecutionGraphSpec must contain a non-empty nodes array.'] };
  }
  if (!Array.isArray(spec.edges)) {
    return { valid: false, violations: ['ExecutionGraphSpec must contain an edges array.'] };
  }

  const nodeMap = new Map(spec.nodes.map((n) => [n.id, n]));

  // Edge endpoint existence
  for (const edge of spec.edges) {
    if (!nodeMap.has(edge.fromNodeId)) {
      violations.push(`Edge '${edge.id}' references unknown fromNodeId '${edge.fromNodeId}'.`);
    }
    if (!nodeMap.has(edge.toNodeId)) {
      violations.push(`Edge '${edge.id}' references unknown toNodeId '${edge.toNodeId}'.`);
    }
    if (!EDGE_CONDITIONS.includes(edge.condition)) {
      violations.push(`Edge '${edge.id}' has invalid condition '${edge.condition}'.`);
    }
  }

  // Invariant 1: 'complete' nodes can ONLY have incoming edges from 'independent_verifier' with condition 'on_pass'.
  const completeNodes = spec.nodes.filter((n) => n.kind === 'complete');
  if (completeNodes.length === 0) {
    violations.push('Graph must contain at least one terminal node of kind "complete".');
  }
  for (const completeNode of completeNodes) {
    const incoming = spec.edges.filter((e) => e.toNodeId === completeNode.id);
    if (incoming.length === 0) {
      violations.push(`Complete node '${completeNode.id}' has no incoming edges.`);
    }
    for (const edge of incoming) {
      const source = nodeMap.get(edge.fromNodeId);
      if (!source || source.kind !== 'independent_verifier') {
        violations.push(
          `Invariant violation: Complete node '${completeNode.id}' is reachable from '${edge.fromNodeId}' (${source?.kind ?? 'unknown'}). Only 'independent_verifier' may transition to 'complete'.`
        );
      }
      if (edge.condition !== 'on_pass') {
        violations.push(
          `Invariant violation: Edge '${edge.id}' into complete node '${completeNode.id}' must have condition 'on_pass' (got '${edge.condition}').`
        );
      }
    }
  }

  // Invariant 2: Independent verifier separation of powers & stripped builder reasoning.
  const verifiers = spec.nodes.filter((n) => n.kind === 'independent_verifier');
  if (verifiers.length === 0) {
    violations.push('Graph must contain at least one node of kind "independent_verifier".');
  }
  for (const verifier of verifiers) {
    if (!verifier.assignedAgentId) {
      violations.push(`Independent verifier '${verifier.id}' must specify an assignedAgentId.`);
    }
    if (verifier.builderAgentId && verifier.assignedAgentId === verifier.builderAgentId) {
      violations.push(
        `Invariant violation: Independent verifier '${verifier.id}' has the same agent ('${verifier.assignedAgentId}') as builderAgentId.`
      );
    }
    if (!verifier.contextProjection || verifier.contextProjection.includeBuilderReasoning !== false) {
      violations.push(
        `Invariant violation: Independent verifier '${verifier.id}' has includeBuilderReasoning !== false. Verifiers must not receive builder internal reasoning.`
      );
    }
  }

  // Invariant 3: Worker slices must not bypass deterministic_join to reach independent_verifier or complete.
  const workerNodes = spec.nodes.filter((n) => n.kind === 'worker_slice');
  for (const worker of workerNodes) {
    const outgoing = spec.edges.filter((e) => e.fromNodeId === worker.id);
    for (const edge of outgoing) {
      const target = nodeMap.get(edge.toNodeId);
      if (target && (target.kind === 'independent_verifier' || target.kind === 'complete')) {
        violations.push(
          `Invariant violation: Worker slice '${worker.id}' connects directly to '${target.id}' (${target.kind}), bypassing 'deterministic_join'.`
        );
      }
      // Also ensure builder agent != verifier agent across the graph
      if (worker.assignedAgentId) {
        for (const v of verifiers) {
          if (v.assignedAgentId === worker.assignedAgentId) {
            violations.push(
              `Invariant violation: Worker slice '${worker.id}' and independent verifier '${v.id}' share agent '${worker.assignedAgentId}'.`
            );
          }
        }
      }
    }
  }

  // Invariant 4: Retry edges must have maxTraversals <= 2 and circuit-break to advisor_circuit_breaker.
  for (const edge of spec.edges) {
    if (edge.condition === 'on_fail_retry_slice') {
      if (typeof edge.maxTraversals !== 'number' || edge.maxTraversals > 2 || edge.maxTraversals < 1) {
        violations.push(
          `Invariant violation: Retry edge '${edge.id}' must have maxTraversals between 1 and 2 before circuit-breaking to 'advisor_circuit_breaker' (got ${edge.maxTraversals}).`
        );
      }
      const hasCircuitBreakerEdge = spec.edges.some(
        (e) =>
          e.fromNodeId === edge.fromNodeId &&
          e.condition === 'on_fail_circuit_break_advisor' &&
          nodeMap.get(e.toNodeId)?.kind === 'advisor_circuit_breaker'
      );
      if (!hasCircuitBreakerEdge) {
        violations.push(
          `Invariant violation: Node '${edge.fromNodeId}' has a retry edge '${edge.id}' but no 'on_fail_circuit_break_advisor' edge to an 'advisor_circuit_breaker' node.`
        );
      }
    }
  }

  return {
    valid: violations.length === 0,
    violations,
  };
}

/**
 * Compiles a canonical Google Graph Engineering ExecutionGraphSpec for a goal and its vertical slices.
 */
export function compileExecutionGraph({
  graphId = `graph-${crypto.randomUUID().slice(0, 8)}`,
  goalSummary,
  slices = [{ id: 'slice-1', label: 'Primary Vertical Slice' }],
  routerAgentId = 'router-agent',
  plannerAgentId = 'lead-planner-agent',
  defaultBuilderAgentId = 'builder-worker-agent',
  verifierAgentId = 'independent-verifier-agent',
  advisorAgentId = 'advisor-breaker-agent',
  precedentTraceIds = [],
  premortemRisks = [],
  advisory = null,
} = {}) {
  if (!goalSummary || !String(goalSummary).trim()) {
    throw new Error('compileExecutionGraph requires a non-empty goalSummary.');
  }

  const normalizedSlices = (Array.isArray(slices) && slices.length > 0 ? slices : ['slice-1']).map((s, idx) => {
    if (typeof s === 'string') {
      const cleanId = s.trim().replace(/[^a-zA-Z0-9_-]/g, '-') || `slice-${idx + 1}`;
      return {
        id: cleanId.startsWith('worker_') ? cleanId : `worker_${cleanId}`,
        sliceKey: cleanId,
        label: `Vertical Slice: ${s.trim()}`,
        assignedAgentId: defaultBuilderAgentId,
        codeGraphSymbols: [],
        surfaceFeatureMapIds: [],
      };
    }
    const cleanId = String(s.id || `slice-${idx + 1}`).trim().replace(/[^a-zA-Z0-9_-]/g, '-');
    return {
      id: cleanId.startsWith('worker_') ? cleanId : `worker_${cleanId}`,
      sliceKey: cleanId,
      label: s.label || `Vertical Slice: ${cleanId}`,
      assignedAgentId: s.assignedAgentId || s.builderAgentId || defaultBuilderAgentId,
      codeGraphSymbols: Array.isArray(s.codeGraphSymbols) ? s.codeGraphSymbols : [],
      surfaceFeatureMapIds: Array.isArray(s.surfaceFeatureMapIds) ? s.surfaceFeatureMapIds : [],
    };
  });

  // Ensure builder agent never matches verifierAgentId
  for (const s of normalizedSlices) {
    if (s.assignedAgentId === verifierAgentId) {
      s.assignedAgentId = `${s.assignedAgentId}-builder`;
    }
  }

  const allSymbols = [...new Set(normalizedSlices.flatMap((s) => s.codeGraphSymbols))];
  const allFeatures = [...new Set(normalizedSlices.flatMap((s) => s.surfaceFeatureMapIds))];

  const nodes = [
    {
      id: 'node_router_research',
      kind: 'router_research',
      label: 'Router & Context Graph Precedent Lookup',
      status: 'pending',
      assignedAgentId: routerAgentId,
      attemptCount: 0,
      maxAttemptsBeforeAdvisor: 2,
      contextProjection: {
        codeGraphSymbols: allSymbols,
        surfaceFeatureMapIds: allFeatures,
        precedentTraceIds,
        includeBuilderReasoning: false,
      },
      requiredGates: ['context_graph_precedent_check'],
    },
    {
      id: 'node_lead_planner',
      kind: 'lead_planner',
      label: 'Lead Planner & Step 0 Pre-Mortem',
      status: 'pending',
      assignedAgentId: plannerAgentId,
      attemptCount: 0,
      maxAttemptsBeforeAdvisor: 2,
      contextProjection: {
        codeGraphSymbols: allSymbols,
        surfaceFeatureMapIds: allFeatures,
        precedentTraceIds,
        includeBuilderReasoning: false,
      },
      requiredGates: ['step0_premortem_ranked', 'catching_check_defined'],
      premortemRisks: Array.isArray(premortemRisks) ? premortemRisks : [],
    },
  ];

  for (const s of normalizedSlices) {
    nodes.push({
      id: s.id,
      sliceKey: s.sliceKey,
      kind: 'worker_slice',
      label: s.label,
      status: 'pending',
      assignedAgentId: s.assignedAgentId,
      attemptCount: 0,
      maxAttemptsBeforeAdvisor: 2,
      contextProjection: {
        codeGraphSymbols: s.codeGraphSymbols,
        surfaceFeatureMapIds: s.surfaceFeatureMapIds,
        precedentTraceIds,
        includeBuilderReasoning: true,
      },
      requiredGates: ['unit_test', 'post_action_state_verified'],
    });
  }

  nodes.push(
    {
      id: 'node_deterministic_join',
      kind: 'deterministic_join',
      label: 'Deterministic Join Gate (Build + Typecheck + Scan + Anti-Slop Taste)',
      status: 'pending',
      assignedAgentId: 'system-deterministic-gate',
      attemptCount: 0,
      maxAttemptsBeforeAdvisor: 2,
      contextProjection: {
        codeGraphSymbols: allSymbols,
        surfaceFeatureMapIds: allFeatures,
        precedentTraceIds,
        includeBuilderReasoning: false,
      },
      requiredGates: ['build', 'typecheck', 'bgz_scan', 'bgz_taste_anti_slop'],
    },
    {
      id: 'node_advisor_circuit_breaker',
      kind: 'advisor_circuit_breaker',
      label: '2-Failure Circuit Breaker: Assess, Research, Adapt',
      status: 'pending',
      assignedAgentId: advisorAgentId,
      attemptCount: 0,
      maxAttemptsBeforeAdvisor: 2,
      contextProjection: {
        codeGraphSymbols: allSymbols,
        surfaceFeatureMapIds: allFeatures,
        precedentTraceIds,
        includeBuilderReasoning: true,
      },
      requiredGates: [
        'jev_classify_open_findings',
        'cross_round_root_cause',
        'multi_platform_research',
        'changed_method_or_split_slice',
        'lessons_and_context_graph_recorded',
      ],
    },
    {
      id: 'node_independent_verifier',
      kind: 'independent_verifier',
      label: 'Independent Real-Surface Verifier & Step 2 Jev Attack',
      status: 'pending',
      assignedAgentId: verifierAgentId,
      builderAgentId: normalizedSlices[0].assignedAgentId,
      attemptCount: 0,
      maxAttemptsBeforeAdvisor: 2,
      contextProjection: {
        codeGraphSymbols: allSymbols,
        surfaceFeatureMapIds: allFeatures,
        precedentTraceIds,
        includeBuilderReasoning: false,
      },
      requiredGates: [
        'real_surface_used_verification',
        'step2_jev_attack_content_and_hostile',
        'step2_jev_attack_failure_injection',
        'step2_jev_attack_regression_and_cost',
      ],
    },
    {
      id: 'node_complete',
      kind: 'complete',
      label: 'Goal Complete (Verified on Real Surface)',
      status: 'pending',
      attemptCount: 0,
      maxAttemptsBeforeAdvisor: 1,
      contextProjection: {
        codeGraphSymbols: [],
        surfaceFeatureMapIds: allFeatures,
        precedentTraceIds,
        includeBuilderReasoning: false,
      },
      requiredGates: ['completion_criteria_confirmed'],
    }
  );

  const edges = [
    {
      id: 'edge_router_to_planner',
      fromNodeId: 'node_router_research',
      toNodeId: 'node_lead_planner',
      condition: 'on_pass',
      maxTraversals: 2,
      currentTraversals: 0,
    },
  ];

  for (const s of normalizedSlices) {
    edges.push(
      {
        id: `edge_planner_to_${s.id}`,
        fromNodeId: 'node_lead_planner',
        toNodeId: s.id,
        condition: 'on_pass',
        maxTraversals: 2,
        currentTraversals: 0,
      },
      {
        id: `edge_${s.id}_to_join`,
        fromNodeId: s.id,
        toNodeId: 'node_deterministic_join',
        condition: 'on_all_joined',
        maxTraversals: 4,
        currentTraversals: 0,
      },
      {
        id: `edge_${s.id}_retry`,
        fromNodeId: s.id,
        toNodeId: s.id,
        condition: 'on_fail_retry_slice',
        maxTraversals: 2,
        currentTraversals: 0,
      },
      {
        id: `edge_${s.id}_to_breaker`,
        fromNodeId: s.id,
        toNodeId: 'node_advisor_circuit_breaker',
        condition: 'on_fail_circuit_break_advisor',
        maxTraversals: 2,
        currentTraversals: 0,
      },
      {
        id: `edge_breaker_to_${s.id}`,
        fromNodeId: 'node_advisor_circuit_breaker',
        toNodeId: s.id,
        condition: 'on_pass',
        maxTraversals: 2,
        currentTraversals: 0,
      }
    );
  }

  const primaryWorkerId = normalizedSlices[0].id;
  edges.push(
    {
      id: 'edge_join_to_verifier',
      fromNodeId: 'node_deterministic_join',
      toNodeId: 'node_independent_verifier',
      condition: 'on_pass',
      maxTraversals: 4,
      currentTraversals: 0,
    },
    {
      id: 'edge_join_fail_retry',
      fromNodeId: 'node_deterministic_join',
      toNodeId: primaryWorkerId,
      condition: 'on_fail_retry_slice',
      maxTraversals: 2,
      currentTraversals: 0,
    },
    {
      id: 'edge_join_fail_breaker',
      fromNodeId: 'node_deterministic_join',
      toNodeId: 'node_advisor_circuit_breaker',
      condition: 'on_fail_circuit_break_advisor',
      maxTraversals: 2,
      currentTraversals: 0,
    },
    {
      id: 'edge_verifier_to_complete',
      fromNodeId: 'node_independent_verifier',
      toNodeId: 'node_complete',
      condition: 'on_pass',
      maxTraversals: 1,
      currentTraversals: 0,
    },
    {
      id: 'edge_verifier_fail_retry',
      fromNodeId: 'node_independent_verifier',
      toNodeId: primaryWorkerId,
      condition: 'on_fail_retry_slice',
      maxTraversals: 2,
      currentTraversals: 0,
    },
    {
      id: 'edge_verifier_fail_breaker',
      fromNodeId: 'node_independent_verifier',
      toNodeId: 'node_advisor_circuit_breaker',
      condition: 'on_fail_circuit_break_advisor',
      maxTraversals: 2,
      currentTraversals: 0,
    }
  );

  const spec = {
    schemaVersion: '1.0.0',
    graphId,
    createdAtIso: new Date().toISOString(),
    goalSummary: String(goalSummary).trim(),
    harnessStage: HARNESS2_STAGES[0].id,
    advisory: advisory ? formatThreeLineAdvisory(advisory) : null,
    nodes,
    edges,
    history: [],
  };

  const validation = validateExecutionGraph(spec);
  if (!validation.valid) {
    throw new Error(`Compiled graph failed validation: ${validation.violations.join('; ')}`);
  }

  return spec;
}

/**
 * Projects node-scoped context for a specific node in the ExecutionGraphSpec,
 * enforcing that `independent_verifier` NEVER receives builder reasoning.
 */
export function buildNodeContextProjection(spec, nodeId, { builderNotes = [], precedents = [] } = {}) {
  const node = spec?.nodes?.find((n) => n.id === nodeId);
  if (!node) {
    throw new Error(`Unknown node '${nodeId}' in ExecutionGraphSpec.`);
  }
  const includeReasoning = Boolean(node.contextProjection?.includeBuilderReasoning) && node.kind !== 'independent_verifier';
  const relevantPrecedents = Array.isArray(precedents)
    ? precedents.filter(
        (p) =>
          !node.contextProjection?.precedentTraceIds?.length ||
          node.contextProjection.precedentTraceIds.includes(p.id)
      )
    : [];

  return {
    nodeId: node.id,
    nodeKind: node.kind,
    assignedAgentId: node.assignedAgentId || null,
    goalSummary: spec.goalSummary,
    codeGraphSymbols: node.contextProjection?.codeGraphSymbols || [],
    surfaceFeatureMapIds: node.contextProjection?.surfaceFeatureMapIds || [],
    precedentTraces: relevantPrecedents,
    includeBuilderReasoning: includeReasoning,
    builderNotes: includeReasoning ? builderNotes : [],
    strippedBuilderReasoningCount: includeReasoning ? 0 : builderNotes.length,
    requiredGates: node.requiredGates || [],
  };
}

/**
 * Deterministic state transition for ExecutionGraphSpec.
 * Enforces:
 * - 2-failure circuit breaker (`advisor_circuit_breaker` / ASSESS)
 * - Fan-in join (`on_all_joined`) before `deterministic_join`
 * - `independent_verifier` separation of powers before `complete`
 */
export function transitionExecutionGraph(
  spec,
  { nodeId, status, agentId = null, evidenceReceiptPath = null, builderReasoning = null, failureReason = null } = {}
) {
  const validation = validateExecutionGraph(spec);
  if (!validation.valid) {
    throw new Error(`Cannot transition invalid ExecutionGraphSpec: ${validation.violations.join('; ')}`);
  }

  const node = spec.nodes.find((n) => n.id === nodeId);
  if (!node) {
    throw new Error(`Node '${nodeId}' not found in ExecutionGraphSpec.`);
  }

  const breakerNode = spec.nodes.find((n) => n.kind === 'advisor_circuit_breaker');
  if (
    breakerNode &&
    breakerNode.status === 'running' &&
    node.id !== breakerNode.id
  ) {
    throw new Error(
      `Circuit breaker '${breakerNode.id}' is active after 2 failed attempts. Run 'bgz graph assess' (Assess, Research, Adapt) before transitioning '${node.id}'.`
    );
  }

  if (node.kind === 'independent_verifier') {
    if (agentId && node.builderAgentId && agentId === node.builderAgentId) {
      throw new Error(
        `Invariant violation: Builder agent '${agentId}' cannot execute independent_verifier '${node.id}'.`
      );
    }
    const joinNode = spec.nodes.find((n) => n.kind === 'deterministic_join');
    if (joinNode && joinNode.status !== 'passed') {
      throw new Error(
        `Invariant violation: Cannot transition independent_verifier '${node.id}' before deterministic_join '${joinNode.id}' has passed.`
      );
    }
  }

  if (node.kind === 'complete') {
    throw new Error(
      `Invariant violation: 'complete' node '${node.id}' cannot be transitioned directly; it is reached automatically when 'independent_verifier' passes.`
    );
  }

  const nowIso = new Date().toISOString();
  const nextActions = [];

  if (status === 'running') {
    node.status = 'running';
    if (agentId) node.assignedAgentId = agentId;
    spec.history = spec.history || [];
    spec.history.push({ atIso: nowIso, nodeId: node.id, status: 'running', agentId });
    return { spec, node, nextActions: [`Continue executing ${node.id}`], circuitBroken: false };
  }

  if (status === 'passed') {
    node.status = 'passed';
    if (evidenceReceiptPath) node.evidenceReceiptPath = evidenceReceiptPath;
    if (builderReasoning && node.kind === 'worker_slice') {
      node.builderReasoning = String(builderReasoning);
    }

    spec.history = spec.history || [];
    spec.history.push({ atIso: nowIso, nodeId: node.id, status: 'passed', agentId, evidenceReceiptPath });

    // Check outgoing edges
    if (node.kind === 'worker_slice') {
      const allWorkers = spec.nodes.filter((n) => n.kind === 'worker_slice');
      const allPassed = allWorkers.every((w) => w.status === 'passed');
      if (allPassed) {
        const joinEdge = spec.edges.find((e) => e.fromNodeId === node.id && e.condition === 'on_all_joined');
        if (joinEdge) {
          joinEdge.currentTraversals += 1;
          const joinNode = spec.nodes.find((n) => n.id === joinEdge.toNodeId);
          if (joinNode) {
            joinNode.status = 'running';
            nextActions.push(`All worker slices passed -> execute deterministic_join (${joinNode.id})`);
          }
        }
      } else {
        const remaining = allWorkers.filter((w) => w.status !== 'passed').map((w) => w.id);
        nextActions.push(`Waiting for remaining worker slices: ${remaining.join(', ')}`);
      }
    } else if (node.kind === 'independent_verifier') {
      const completeEdge = spec.edges.find((e) => e.fromNodeId === node.id && e.condition === 'on_pass');
      if (completeEdge) {
        completeEdge.currentTraversals += 1;
        const completeNode = spec.nodes.find((n) => n.id === completeEdge.toNodeId);
        if (completeNode) {
          completeNode.status = 'passed';
          completeNode.evidenceReceiptPath = evidenceReceiptPath || node.evidenceReceiptPath;
          nextActions.push(`Independent verification passed -> goal complete (${completeNode.id})`);
        }
      }
    } else {
      const passEdges = spec.edges.filter((e) => e.fromNodeId === node.id && e.condition === 'on_pass');
      for (const edge of passEdges) {
        edge.currentTraversals += 1;
        const target = spec.nodes.find((n) => n.id === edge.toNodeId);
        if (target && target.status === 'pending') {
          nextActions.push(`Ready to execute ${target.id} (${target.kind})`);
        }
      }
    }

    return { spec, node, nextActions, circuitBroken: false };
  }

  if (status === 'failed') {
    node.attemptCount = (node.attemptCount || 0) + 1;
    node.status = 'failed';
    node.lastFailureReason = failureReason || 'Slice check failed';

    spec.history = spec.history || [];
    spec.history.push({
      atIso: nowIso,
      nodeId: node.id,
      status: 'failed',
      attemptCount: node.attemptCount,
      failureReason: node.lastFailureReason,
    });

    const retryEdge = spec.edges.find((e) => e.fromNodeId === node.id && e.condition === 'on_fail_retry_slice');
    const breakerEdge = spec.edges.find(
      (e) => e.fromNodeId === node.id && e.condition === 'on_fail_circuit_break_advisor'
    );

    // After 2 failed attempts (or if retry traversals hit maxTraversals), trip the circuit breaker!
    const maxAttempts = node.maxAttemptsBeforeAdvisor || 2;
    const retryExhausted =
      node.attemptCount >= maxAttempts ||
      (retryEdge && retryEdge.currentTraversals + 1 >= retryEdge.maxTraversals && node.attemptCount >= 2);

    if (retryExhausted && breakerEdge) {
      breakerEdge.currentTraversals += 1;
      node.status = 'blocked';
      const targetBreaker = spec.nodes.find((n) => n.id === breakerEdge.toNodeId);
      if (targetBreaker) {
        targetBreaker.status = 'running';
        targetBreaker.blockedSliceId = node.id;
      }
      nextActions.push(
        `CIRCUIT BREAKER TRIPPED after ${node.attemptCount} failed attempts on '${node.id}'. Stop retrying the same approach. Run 'bgz graph assess --slice ${node.id} ...' (Assess, Research, Adapt).`
      );
      return { spec, node, nextActions, circuitBroken: true };
    }

    if (retryEdge) {
      retryEdge.currentTraversals += 1;
      const retryTarget = spec.nodes.find((n) => n.id === retryEdge.toNodeId);
      if (retryTarget) {
        if (retryTarget.id !== node.id) {
          retryTarget.status = 'pending';
        }
        nextActions.push(
          `Attempt ${node.attemptCount}/${maxAttempts} failed on '${node.id}'. Fix narrow cause and retry '${retryTarget.id}' (1 retry remaining before mandatory Assess/Research/Adapt circuit breaker).`
        );
      }
    }

    return { spec, node, nextActions, circuitBroken: false };
  }

  throw new Error(`Unsupported transition status '${status}'. Use 'running', 'passed', or 'failed'.`);
}

export function getGraphDir(projectDir = process.cwd()) {
  return path.join(path.resolve(projectDir), '.bgzflow', 'graph');
}

export function loadExecutionGraph(projectDir = process.cwd()) {
  const file = path.join(getGraphDir(projectDir), 'execution-graph.json');
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

export function saveExecutionGraph(projectDir, spec) {
  const dir = getGraphDir(projectDir);
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, 'execution-graph.json');
  fs.writeFileSync(file, JSON.stringify(spec, null, 2) + '\n', 'utf8');
  return file;
}

export function loadContextGraph(projectDir = process.cwd()) {
  const file = path.join(getGraphDir(projectDir), 'context-graph.json');
  if (!fs.existsSync(file)) {
    return { schemaVersion: '1.0.0', precedents: [] };
  }
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

export function addContextGraphPrecedent(
  projectDir,
  {
    id = `prec-${crypto.randomUUID().slice(0, 8)}`,
    topic,
    goalSummary,
    optionsEvaluated = [],
    chosenOption,
    failureSignature = null,
    rootCause = null,
    verifiedPracticeOrFix,
    evidenceReceiptPath = 'pending-receipt',
  } = {}
) {
  if (!topic || !goalSummary || !chosenOption || !verifiedPracticeOrFix) {
    throw new Error(
      'ContextGraphPrecedentNode requires topic, goalSummary, chosenOption, and verifiedPracticeOrFix.'
    );
  }
  const dir = getGraphDir(projectDir);
  fs.mkdirSync(dir, { recursive: true });
  const cg = loadContextGraph(projectDir);
  const node = {
    id,
    createdAtIso: new Date().toISOString(),
    topic: String(topic).trim(),
    goalSummary: String(goalSummary).trim(),
    optionsEvaluated: Array.isArray(optionsEvaluated) && optionsEvaluated.length > 0 ? optionsEvaluated : [chosenOption],
    chosenOption: String(chosenOption).trim(),
    ...(failureSignature ? { failureSignature: String(failureSignature).trim() } : {}),
    ...(rootCause ? { rootCause: String(rootCause).trim() } : {}),
    verifiedPracticeOrFix: String(verifiedPracticeOrFix).trim(),
    evidenceReceiptPath: String(evidenceReceiptPath).trim(),
  };
  cg.precedents.push(node);
  const file = path.join(dir, 'context-graph.json');
  fs.writeFileSync(file, JSON.stringify(cg, null, 2) + '\n', 'utf8');
  return { file, node, totalPrecedents: cg.precedents.length };
}

export function queryContextGraphPrecedents(projectDir, query = '') {
  const cg = loadContextGraph(projectDir);
  const q = String(query || '').trim().toLowerCase();
  if (!q) return cg.precedents;
  return cg.precedents.filter((p) => {
    const hay = [
      p.id,
      p.topic,
      p.goalSummary,
      p.chosenOption,
      p.failureSignature,
      p.rootCause,
      p.verifiedPracticeOrFix,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return hay.includes(q);
  });
}

/**
 * Implements the mandatory 2-Failure "Assess, Research, Adapt" (ASSESS) step.
 * Unlocks `advisor_circuit_breaker`, records the causal precedent in the Context Graph,
 * and updates the blocked slice with the new method/plan.
 */
export function assessExecutionGraphSlice(
  projectDir,
  {
    sliceId,
    classification,
    rootCause,
    research,
    newMethod,
    triageAction = 'rebuild',
    evidenceReceiptPath = 'assess-receipt',
  } = {}
) {
  if (!ASSESS_CLASSIFICATIONS.includes(classification)) {
    throw new Error(
      `Invalid classification '${classification}'. Must be one of: ${ASSESS_CLASSIFICATIONS.join(', ')}.`
    );
  }
  if (!rootCause || !String(rootCause).trim()) {
    throw new Error('ASSESS requires a non-empty cross-round rootCause.');
  }
  if (!research || !String(research).trim()) {
    throw new Error('ASSESS requires non-empty multi-platform/external research findings.');
  }
  if (!newMethod || !String(newMethod).trim()) {
    throw new Error('ASSESS requires a non-empty changed newMethod/plan (cannot retry the same approach).');
  }

  const spec = loadExecutionGraph(projectDir);
  if (!spec) {
    throw new Error(`No execution-graph.json found in ${getGraphDir(projectDir)}.`);
  }

  const targetNode =
    spec.nodes.find((n) => n.id === sliceId || n.sliceKey === sliceId) ||
    spec.nodes.find((n) => n.status === 'blocked' || n.status === 'failed');

  if (!targetNode) {
    throw new Error(`Slice node '${sliceId}' not found in execution graph.`);
  }

  const breakerNode = spec.nodes.find((n) => n.kind === 'advisor_circuit_breaker');
  const nowIso = new Date().toISOString();

  const precedentResult = addContextGraphPrecedent(projectDir, {
    topic: `2-failure-assess:${targetNode.id}:${classification}`,
    goalSummary: spec.goalSummary,
    optionsEvaluated: [`previous-failed-approach (${targetNode.attemptCount} attempts)`, newMethod],
    chosenOption: newMethod,
    failureSignature: targetNode.lastFailureReason || `${classification} failure on ${targetNode.id}`,
    rootCause,
    verifiedPracticeOrFix: `Research (${research}) -> Adapted method (${triageAction}): ${newMethod}`,
    evidenceReceiptPath,
  });

  // Reset the blocked node with the adapted method and unlock the circuit breaker
  targetNode.status = 'pending';
  targetNode.attemptCount = 0;
  targetNode.adaptedMethod = String(newMethod).trim();
  targetNode.triageAction = triageAction;
  targetNode.contextProjection = targetNode.contextProjection || {
    codeGraphSymbols: [],
    surfaceFeatureMapIds: [],
    precedentTraceIds: [],
    includeBuilderReasoning: true,
  };
  if (!targetNode.contextProjection.precedentTraceIds.includes(precedentResult.node.id)) {
    targetNode.contextProjection.precedentTraceIds.push(precedentResult.node.id);
  }

  // Reset retry edge traversal counter for the adapted slice
  for (const edge of spec.edges) {
    if (edge.fromNodeId === targetNode.id && edge.condition === 'on_fail_retry_slice') {
      edge.currentTraversals = 0;
    }
  }

  if (breakerNode) {
    breakerNode.status = 'passed';
    breakerNode.lastAssessment = {
      atIso: nowIso,
      sliceId: targetNode.id,
      classification,
      rootCause,
      research,
      newMethod,
      triageAction,
      precedentId: precedentResult.node.id,
    };
  }

  spec.history = spec.history || [];
  spec.history.push({
    atIso: nowIso,
    nodeId: breakerNode ? breakerNode.id : targetNode.id,
    status: 'assessed_and_adapted',
    sliceId: targetNode.id,
    classification,
    precedentId: precedentResult.node.id,
  });

  const graphFile = saveExecutionGraph(projectDir, spec);
  return {
    graphFile,
    precedent: precedentResult.node,
    unlockedSliceId: targetNode.id,
    adaptedMethod: targetNode.adaptedMethod,
    classification,
  };
}
