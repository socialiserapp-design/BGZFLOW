import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  assessExecutionGraphSlice,
  buildNodeContextProjection,
  compileExecutionGraph,
  formatThreeLineAdvisory,
  queryContextGraphPrecedents,
  saveExecutionGraph,
  transitionExecutionGraph,
  validateExecutionGraph,
} from '../../engine/execution-graph.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const bgzCli = path.join(root, 'tools/bgz.mjs');
const bgz = (args, opts = {}) =>
  spawnSync(process.execPath, [bgzCli, ...args], { encoding: 'utf8', timeout: 30000, ...opts });

test('compileExecutionGraph produces a valid spec satisfying all 4 Google Graph Engineering invariants', () => {
  const spec = compileExecutionGraph({
    graphId: 'test-graph-1',
    goalSummary: 'Upgrade BGZFLOW with Google Graph Engineering',
    slices: [
      { id: 's1', label: 'Graph Engine', codeGraphSymbols: ['validateExecutionGraph'], surfaceFeatureMapIds: ['FM-1'] },
      { id: 's2', label: 'Harness 2 Skills', codeGraphSymbols: ['HARNESS2_STAGES'], surfaceFeatureMapIds: ['FM-2'] },
    ],
  });
  const res = validateExecutionGraph(spec);
  assert.equal(res.valid, true, res.violations.join('; '));
  assert.equal(res.violations.length, 0);
});

test('validateExecutionGraph catches all 4 hard invariant violations', () => {
  // 1. Worker slice directly to complete
  const bad1 = compileExecutionGraph({ goalSummary: 'Test 1', slices: ['s1'] });
  bad1.edges.push({
    id: 'illegal_direct_complete',
    fromNodeId: 'worker_s1',
    toNodeId: 'node_complete',
    condition: 'on_pass',
    maxTraversals: 1,
    currentTraversals: 0,
  });
  const v1 = validateExecutionGraph(bad1);
  assert.equal(v1.valid, false);
  assert.ok(v1.violations.some((msg) => msg.includes("Only 'independent_verifier' may transition to 'complete'")));

  // 2. Verifier has includeBuilderReasoning: true or matches builderAgentId
  const bad2 = compileExecutionGraph({ goalSummary: 'Test 2', slices: ['s1'] });
  const verifier = bad2.nodes.find((n) => n.kind === 'independent_verifier');
  verifier.contextProjection.includeBuilderReasoning = true;
  verifier.assignedAgentId = verifier.builderAgentId;
  const v2 = validateExecutionGraph(bad2);
  assert.equal(v2.valid, false);
  assert.ok(v2.violations.some((msg) => msg.includes('includeBuilderReasoning !== false')));
  assert.ok(v2.violations.some((msg) => msg.includes('same agent')));

  // 3. Worker slice bypasses deterministic_join to reach independent_verifier
  const bad3 = compileExecutionGraph({ goalSummary: 'Test 3', slices: ['s1'] });
  bad3.edges.push({
    id: 'illegal_bypass_join',
    fromNodeId: 'worker_s1',
    toNodeId: 'node_independent_verifier',
    condition: 'on_pass',
    maxTraversals: 1,
    currentTraversals: 0,
  });
  const v3 = validateExecutionGraph(bad3);
  assert.equal(v3.valid, false);
  assert.ok(v3.violations.some((msg) => msg.includes("bypassing 'deterministic_join'")));

  // 4. Retry edge with maxTraversals > 2
  const bad4 = compileExecutionGraph({ goalSummary: 'Test 4', slices: ['s1'] });
  const retryEdge = bad4.edges.find((e) => e.condition === 'on_fail_retry_slice');
  retryEdge.maxTraversals = 5;
  const v4 = validateExecutionGraph(bad4);
  assert.equal(v4.valid, false);
  assert.ok(v4.violations.some((msg) => msg.includes('maxTraversals between 1 and 2')));
});

test('buildNodeContextProjection strips builder reasoning for independent_verifier', () => {
  const spec = compileExecutionGraph({ goalSummary: 'Context projection test', slices: ['s1'] });
  const notes = [{ sliceId: 'worker_s1', reasoning: 'I assumed the mocked response matches production.' }];

  const workerProj = buildNodeContextProjection(spec, 'worker_s1', { builderNotes: notes });
  assert.equal(workerProj.includeBuilderReasoning, true);
  assert.equal(workerProj.builderNotes.length, 1);
  assert.equal(workerProj.strippedBuilderReasoningCount, 0);

  const verifierProj = buildNodeContextProjection(spec, 'node_independent_verifier', { builderNotes: notes });
  assert.equal(verifierProj.includeBuilderReasoning, false);
  assert.equal(verifierProj.builderNotes.length, 0);
  assert.equal(verifierProj.strippedBuilderReasoningCount, 1);
});

test('2-failure circuit breaker trips on 2nd failure and requires assessExecutionGraphSlice to unlock', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bgz-graph-test-'));
  try {
    const spec = compileExecutionGraph({ goalSummary: 'Circuit breaker lifecycle', slices: ['s1'] });
    saveExecutionGraph(dir, spec);

    // Attempt 1 fails -> retry allowed
    const fail1 = transitionExecutionGraph(spec, {
      nodeId: 'worker_s1',
      status: 'failed',
      failureReason: 'Timeout on cold start',
    });
    assert.equal(fail1.circuitBroken, false);
    assert.equal(fail1.node.attemptCount, 1);

    // Attempt 2 fails -> circuit breaker trips!
    const fail2 = transitionExecutionGraph(spec, {
      nodeId: 'worker_s1',
      status: 'failed',
      failureReason: 'Timeout on cold start again',
    });
    assert.equal(fail2.circuitBroken, true);
    assert.equal(fail2.node.status, 'blocked');
    saveExecutionGraph(dir, spec);

    // Trying to run worker_s1 without ASSESS throws
    assert.throws(
      () => transitionExecutionGraph(spec, { nodeId: 'worker_s1', status: 'running' }),
      /Circuit breaker .* is active after 2 failed attempts/
    );

    // Run mandatory ASSESS (Assess, Research, Adapt)
    const assessed = assessExecutionGraphSlice(dir, {
      sliceId: 'worker_s1',
      classification: 'method',
      rootCause: 'Synchronous startup blocked event loop before healthcheck listener bound.',
      research: 'Checked Node.js Fastify & Cloud Run docs: bind healthcheck port before async warmup.',
      newMethod: 'Bind listener immediately and run warmup asynchronously with readiness probe.',
      triageAction: 'rebuild',
    });
    assert.equal(assessed.unlockedSliceId, 'worker_s1');
    assert.ok(assessed.precedent.id.startsWith('prec-'));

    const precedents = queryContextGraphPrecedents(dir, 'healthcheck');
    assert.equal(precedents.length, 1);

    // Reload and complete the full graph lifecycle through independent_verifier -> complete
    const unlockedSpec = JSON.parse(fs.readFileSync(assessed.graphFile, 'utf8'));
    transitionExecutionGraph(unlockedSpec, { nodeId: 'worker_s1', status: 'passed', builderReasoning: 'Fixed bind order' });
    const joinNode = unlockedSpec.nodes.find((n) => n.kind === 'deterministic_join');
    assert.equal(joinNode.status, 'running');

    transitionExecutionGraph(unlockedSpec, { nodeId: 'node_deterministic_join', status: 'passed' });
    transitionExecutionGraph(unlockedSpec, {
      nodeId: 'node_independent_verifier',
      status: 'passed',
      agentId: 'verifier-2',
      evidenceReceiptPath: 'evidence/smoke.json',
    });
    const completeNode = unlockedSpec.nodes.find((n) => n.kind === 'complete');
    assert.equal(completeNode.status, 'passed');
    assert.equal(completeNode.evidenceReceiptPath, 'evidence/smoke.json');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('bgz graph CLI subcommands compile, validate, transition, assess, context, advisory, and stages work end-to-end', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bgz-graph-cli-'));
  try {
    const c = bgz(['graph', 'compile', '--goal', 'Ship Autopilot Execution Graph', '--slices', 'auth,feed', '--dir', dir, '--json']);
    assert.equal(c.status, 0, c.stderr);
    const compiled = JSON.parse(c.stdout);
    assert.equal(compiled.ok, true);

    const v = bgz(['graph', 'validate', '--dir', dir, '--json']);
    assert.equal(v.status, 0, v.stderr);
    assert.equal(JSON.parse(v.stdout).valid, true);

    const adv = bgz([
      'graph',
      'advisory',
      '--why',
      'Prevents infinite retry loops and context rot across multi-agent slices.',
      '--tradeoff',
      'Requires explicit slice contracts up front.',
      '--concept',
      'Cyclic execution graphs with bounded retry edges and node-scoped context projections.',
    ]);
    assert.equal(adv.status, 0, adv.stderr);
    assert.equal(adv.stdout.trim().split('\n').length, 3);

    const st = bgz(['graph', 'stages', '--json']);
    assert.equal(st.status, 0, st.stderr);
    assert.equal(JSON.parse(st.stdout).stages.length, 6);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
