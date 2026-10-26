import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import net from 'node:net';
import { checkCurrentTruth } from './current-truth.mjs';
import { prepareRequest, methodGuidance, validateMethodContext } from './method-policy.mjs';
import { validateExecutionGraph, compileExecutionGraph, buildNodeContextProjection } from './execution-graph.mjs';

const digest = value => createHash('sha256').update(value).digest('hex');
const copy = value => structuredClone(value);
const commandKey = value => JSON.stringify(value ? { file: value.file, args: value.args, ...(value.cwd !== undefined ? { cwd: value.cwd } : {}) } : null);
const repairsFor = (state, step) => (state.repairs ?? []).filter(repair => repair.stepId === step.stepId);
const statusForResult = result => result?.status === 'completed' ? 'completed' : result?.status === 'not-started' ? 'not-started' : 'uncertain';
const unsettled = record => record.status === 'running' || record.status === 'uncertain';
const contained = (root, target) => {
  const rel = path.relative(root, target);
  return rel === '' || (!rel.startsWith(`..${path.sep}`) && rel !== '..' && !path.isAbsolute(rel));
};

function validate(spec) {
  if (!spec || typeof spec.id !== 'string' || !spec.id || typeof spec.text !== 'string') throw new Error('A goal needs an id and original text.');
  if (!Array.isArray(spec.steps) || !spec.steps.length || new Set(spec.steps.map(s => s.id)).size !== spec.steps.length) throw new Error('Distinct explicit steps are required.');
  for (const step of [...spec.steps, spec.checker]) {
    if (!step || typeof step.id !== 'string' || !step.id || typeof step.command?.file !== 'string' || !Array.isArray(step.command.args) || !step.command.args.every(a => typeof a === 'string')) throw new Error('Each step and checker needs an id and a command with string arguments.');
  }
  if (!Array.isArray(spec.artifacts) || !spec.artifacts.length) throw new Error('Requested artifacts are required.');
  for (const artifact of spec.artifacts) {
    if (typeof artifact.id !== 'string' || !artifact.id || typeof artifact.path !== 'string' || !artifact.path || path.isAbsolute(artifact.path)) throw new Error('Artifacts need an id and project-relative path.');
    const acceptance = artifact.acceptance;
    if (!acceptance || (typeof acceptance.equals !== 'string' && !/^[a-f0-9]{64}$/.test(acceptance.sha256 ?? ''))) throw new Error('Artifacts need an explicit equals or sha256 acceptance value.');
  }
  if (spec.executionGraph !== undefined) {
    const graphCheck = validateExecutionGraph(spec.executionGraph);
    if (!graphCheck.valid) throw new Error(`Invalid executionGraph: ${graphCheck.violations.join(' ')}`);
  }
}

/** One explicit goal store per project, with non-waiting local process exclusion. */
export async function createEngine({ projectRoot, adapter, product = 'bgzflow' }) {
  if (!path.isAbsolute(projectRoot ?? '') || !adapter?.execute || !adapter?.readArtifact) throw new Error('An absolute projectRoot and host adapter are required.');
  const root = await fs.realpath(projectRoot);
  const directory = path.join(root, '.bgzflow', 'engine');
  await fs.mkdir(directory, { recursive: true });
  if (!contained(root, await fs.realpath(directory))) throw new Error('Engine state escapes the project root.');
  const listeners = new Set();
  const active = new Set();
  let disposed = false;
  const filename = id => path.join(directory, `${digest(id)}.json`);
  const load = async id => {
    try { return JSON.parse(await fs.readFile(filename(id), 'utf8')); }
    catch (error) { if (error.code === 'ENOENT') return null; throw error; }
  };
  const acceptanceScope = { acceptanceScope: 'declared-artifacts', wholeOutcomeStatus: 'not-assessed' };
  const historical = state => state && ({ ...state, ...(state.currentTruth ? { currentTruth: { ...state.currentTruth, freshness: 'historical' } } : {}), ...acceptanceScope, freshness: 'historical' });
  const exclusive = async (id, action) => {
    // OS ownership disappears on process death. No stale-file removal or expiry.
    // Hash collisions intentionally report contention instead of risking two writers.
    const identity = digest(`${root}\0${id}`);
    const endpoint = process.platform === 'win32'
      ? { path: `\\\\.\\pipe\\bgzflow-engine-${identity}` }
      : { host: '127.0.0.1', port: 20000 + Number.parseInt(identity.slice(0, 8), 16) % 40000, exclusive: true };
    const server = net.createServer(socket => socket.destroy());
    const acquired = await new Promise((resolve, reject) => {
      server.once('error', error => error.code === 'EADDRINUSE' ? resolve(false) : reject(error));
      server.listen(endpoint, () => resolve(true));
    });
    if (!acquired) return { id, status: 'busy', reason: 'Local coordination endpoint is in use; no goal work was attempted.', freshness: 'historical', snapshot: historical(await load(id)) };
    try { return await action(); }
    finally { await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())); }
  };
  const save = async state => {
    const temporary = `${filename(state.id)}.${randomUUID()}.tmp`;
    await fs.writeFile(temporary, JSON.stringify(state, null, 2));
    await fs.rename(temporary, filename(state.id));
  };
  const emit = async (state, type, detail = {}) => {
    const event = { sequence: state.events.length + 1, type, at: new Date().toISOString(), ...detail };
    state.events.push(event);
    await save(state);
    for (const listener of listeners) {
      try { listener(copy(event)); } catch { /* Observers cannot change an effect's result. */ }
    }
  };
  const operation = (state, step, key) => ({
    operationId: digest(`${root}\0${state.id}\0${key}`), stepId: step.id,
    command: copy(step.command), status: 'pending',
  });
  const requestFor = (state, record) => {
    const isChecker = record.stepId === state.spec?.checker?.id;
    let contextProjection;
    if (state.executionGraph) {
      const targetNodeId = isChecker
        ? (state.executionGraph.nodes.find(n => n.kind === 'independent_verifier')?.id ?? 'node_independent_verifier')
        : (state.executionGraph.nodes.find(n => n.sliceKey === record.stepId || n.id === record.stepId || n.id === `worker_${record.stepId}`)?.id);
      if (targetNodeId && state.executionGraph.nodes.some(n => n.id === targetNodeId)) {
        contextProjection = buildNodeContextProjection(state.executionGraph, targetNodeId);
      }
    }
    return {
      projectRoot: root,
      goalId: state.id,
      stepId: record.stepId,
      operationId: record.operationId,
      command: copy(record.command),
      ...(state.methodContext ? { methodContext: copy(state.methodContext), guidance: methodGuidance(state.methodContext) } : {}),
      ...(contextProjection ? { contextProjection } : {}),
    };
  };
  const checkTruth = async state => {
    const report = await checkCurrentTruth({ projectRoot: root, expectedManifestSha256: state.truthManifestSha256, observe: adapter.observeTruth });
    if (report.status === 'not-configured') return true;
    if (!state.truthManifestSha256 && report.manifestSha256) state.truthManifestSha256 = report.manifestSha256;
    state.currentTruth = report;
    await emit(state, 'current-truth-checked', { currentTruth: copy(report) });
    return report.status === 'checked';
  };
  const truthReason = (state, fallback) => state.currentTruth && state.currentTruth.status !== 'checked' ? 'Current evidence changed or is unavailable; refresh the affected source and reconcile this plan before dependent work.' : fallback;
  const perform = async (state, record) => {
    const request = requestFor(state, record);
    let result;
    if (record.status === 'running' || record.status === 'uncertain') {
      try { result = adapter.reconcile ? await adapter.reconcile(request) : { status: 'uncertain', reason: 'Host has no reconciliation support.' }; }
      catch (error) { result = { status: 'uncertain', reason: error.message }; }
      await emit(state, 'operation-reconciled', { operationId: record.operationId, result });
      // Only a host's affirmative no-effect result authorizes another execution.
      if (result?.status !== 'not-started') {
        record.result = result ?? { status: 'uncertain' };
        record.status = result?.status === 'completed' ? 'completed' : 'uncertain';
        await save(state);
        return record.status === 'completed' && result.exitCode === 0;
      }
    }
    if (!await checkTruth(state)) return false;
    record.status = 'running';
    await emit(state, 'operation-started', { operationId: record.operationId, stepId: record.stepId });
    try { result = await adapter.execute(request); }
    catch (error) { result = { status: 'uncertain', reason: error.message }; }
    record.result = result ?? { status: 'uncertain' };
    record.status = result?.status === 'completed' ? 'completed' : 'uncertain';
    await emit(state, 'operation-result', { operationId: record.operationId, stepId: record.stepId, result: record.result });
    return record.status === 'completed' && result.exitCode === 0;
  };
  // Reconcile a genuinely unknown authorised operation through the host adapter without re-executing it.
  // A caller boolean is never accepted as evidence that a readback happened.
  const reconcileOperation = async (state, record) => {
    const request = requestFor(state, record);
    let result;
    try { result = adapter.reconcile ? await adapter.reconcile(request) : { status: 'uncertain', reason: 'Host has no reconciliation support.' }; }
    catch (error) { result = { status: 'uncertain', reason: error.message }; }
    await emit(state, 'operation-reconciled', { operationId: record.operationId, stepId: record.stepId, result });
    record.result = result ?? { status: 'uncertain' };
    // A host-confirmed not-started result is settled absence of an effect, distinct from unknown.
    record.status = statusForResult(result);
    await save(state);
    return record.result;
  };
  // Reconcile every genuinely outstanding original/repair operation before new work, except the
  // operation that will reconcile through its own perform path. Returns false while any remains unknown.
  const settleOutstanding = async (state, except) => {
    const records = [...state.steps, ...(state.repairs ?? [])];
    for (const record of records) {
      if (record === except || !unsettled(record)) continue;
      await reconcileOperation(state, record);
    }
    return records.every(record => record === except || !unsettled(record));
  };
  const incomplete = async (state, reason) => {
    state.status = 'incomplete'; state.reason = reason;
    await emit(state, 'goal-incomplete', { reason });
    return copy(state);
  };
  const readArtifacts = async state => {
    const artifacts = [];
    for (const requested of state.spec.artifacts) {
      try {
        const bytes = await adapter.readArtifact({ projectRoot: root, path: requested.path });
        if (!Buffer.isBuffer(bytes) && !(bytes instanceof Uint8Array)) throw new Error('Host must return artifact bytes.');
        const data = Buffer.from(bytes);
        const sha256 = digest(data);
        const matches = (requested.acceptance.equals === undefined || data.equals(Buffer.from(requested.acceptance.equals))) && (requested.acceptance.sha256 === undefined || sha256 === requested.acceptance.sha256);
        artifacts.push({ id: requested.id, path: requested.path, sha256, size: data.length, matches });
      } catch (error) { artifacts.push({ id: requested.id, path: requested.path, matches: false, error: error.message }); }
    }
    return artifacts;
  };
  const verifyIntegrity = async state => {
    const truthMatches = await checkTruth(state);
    const artifacts = await readArtifacts(state);
    state.integrity = { checkedAt: new Date().toISOString(), matches: artifacts.every(a => a.matches), artifacts };
    await emit(state, 'artifact-integrity-checked', { integrity: copy(state.integrity) });
    return { ...copy(state), ...acceptanceScope, freshness: 'checked', status: state.integrity.matches && truthMatches ? 'accepted' : 'invalidated' };
  };
  const run = async state => {
    if (active.has(state.id)) throw new Error('Goal is already running in this engine.');
    if (disposed) throw new Error('Engine is disposed.');
    active.add(state.id);
    try {
      if (state.methodContext) validateMethodContext(state.methodContext);
      if (state.status === 'accepted') return verifyIntegrity(state);
      state.status = 'running'; delete state.reason;
      await emit(state, 'goal-running');
      for (const step of state.steps) {
        if (disposed) return incomplete(state, 'Engine disposed at a step boundary.');
        const repairs = repairsFor(state, step);
        // Settle every other outstanding original/repair effect before deciding or executing
        // anything for this step. A step that will be performed reconciles through perform below.
        const performing = repairs.length === 0 && step.status !== 'completed';
        if (!await settleOutstanding(state, performing ? step : null)) return incomplete(state, 'An outstanding effect is unreconciled; the host must reconcile the destination before further work.');
        if (repairs.length) {
          // The newest explicit repair governs the step's outcome, but every repair effect must be
          // settled first; a newer success never masks an older unknown effect.
          const latest = repairs.at(-1);
          if (latest.status !== 'completed' || latest.result?.exitCode !== 0) return incomplete(state, 'The latest explicit repair for this step is unresolved or failed; reconcile it or supply another explicit repair id.');
          continue;
        }
        if (step.status === 'completed') {
          if (step.result.exitCode !== 0) return incomplete(state, 'Builder failed; explicit recovery is required.');
          continue;
        }
        if (!await perform(state, step)) return incomplete(state, truthReason(state, 'Builder failed or its effect is uncertain.'));
        await emit(state, 'step-completed', { stepId: step.stepId, operationId: step.operationId });
      }
      if (disposed) return incomplete(state, 'Engine disposed at a step boundary.');
      let checker = state.checks.at(-1);
      // A known failed checker may be retried; an unknown checker must first reconcile.
      if (!checker || checker.status === 'completed') {
        checker = operation(state, state.spec.checker, `checker:${state.checks.length}`);
        state.checks.push(checker);
        await save(state);
      }
      // No checker may run while an original or repair effect is still unknown.
      if (!await settleOutstanding(state, checker)) return incomplete(state, 'An outstanding effect is unreconciled; the host must reconcile the destination before the checker.');
      if (!await perform(state, checker)) return incomplete(state, truthReason(state, 'Checker failed or is unavailable.'));
      state.artifacts = await readArtifacts(state);
      await emit(state, 'artifacts-read', { artifacts: copy(state.artifacts) });
      if (state.artifacts.some(a => !a.matches)) return incomplete(state, 'Requested artifact acceptance did not match actual bytes.');
      if (!await checkTruth(state)) return incomplete(state, truthReason(state, 'Evidence changed before acceptance.'));
      state.status = 'accepted';
      state.acceptedAt = new Date().toISOString();
      state.integrity = { checkedAt: state.acceptedAt, matches: true, artifacts: copy(state.artifacts) };
      await emit(state, 'goal-accepted');
      return { ...copy(state), freshness: 'checked' };
    } finally { active.delete(state.id); }
  };
  return {
    async start(spec) {
      validate(spec);
      return exclusive(spec.id, async () => {
      if (await load(spec.id)) throw new Error('Goal already exists; resume its stable identity.');
      const executionGraph = spec.executionGraph
        ? copy(spec.executionGraph)
        : compileExecutionGraph({
            graphId: `graph-${spec.id}`,
            goalSummary: spec.text,
            slices: spec.steps.map(s => ({ id: s.id, label: s.id })),
          });
      const state = { version: 1, id: spec.id, spec: copy(spec), ...acceptanceScope, executionGraph, methodContext: await prepareRequest({ text: spec.text, product, vocabulary: spec.vocabulary ?? spec.goalContract?.vocabulary }), status: 'pending', events: [], checks: [], artifacts: [], repairs: [] };
      state.steps = spec.steps.map(step => operation(state, step, `step:${step.id}`));
      // Exclusive creation prevents two initial submissions from overwriting the goal.
      await fs.writeFile(filename(state.id), JSON.stringify(state, null, 2), { flag: 'wx' });
      return run(state);
      });
    },
    async resume(id) { return exclusive(id, async () => { const state = await load(id); if (!state) throw new Error('Goal not found in this project.'); return run(state); }); },
    // Explicit, caller-supplied repair of one logical step under the existing goal.
    // The original goal, step, effect identity, method/vocabulary bytes, failure evidence
    // and artifact criteria are retained; the repair is a new authorised command with a
    // single durable identity that is reconciled rather than replayed on repetition.
    async recover(id, { recoveryId, stepId, command, reason } = {}) {
      return exclusive(id, async () => {
        if (disposed) throw new Error('Engine is disposed.');
        const state = await load(id);
        if (!state) throw new Error('Goal not found in this project.');
        if (state.methodContext) validateMethodContext(state.methodContext);
        if (typeof recoveryId !== 'string' || !recoveryId) throw new Error('A stable recoveryId is required for an explicit repair.');
        if (typeof stepId !== 'string' || !stepId) throw new Error('A logical stepId is required for an explicit repair.');
        if (!command || typeof command.file !== 'string' || !command.file || !Array.isArray(command.args) || !command.args.every(argument => typeof argument === 'string')) throw new Error('The repair command needs a file and string arguments.');
        if (typeof reason !== 'string' || !reason.trim()) throw new Error('An explicit repair reason is required.');
        if (!Array.isArray(state.repairs)) state.repairs = [];
        const target = state.steps.find(step => step.stepId === stepId);
        if (!target) throw new Error(`No logical step ${stepId} exists in this goal.`);
        const existing = state.repairs.find(repair => repair.recoveryId === recoveryId);
        // One repair id is bound to exactly one logical step and payload; a changed binding may never run.
        if (existing && (existing.stepId !== stepId || commandKey(existing.command) !== commandKey(command))) throw new Error(`Repair ${recoveryId} is already bound to another step and command; a changed payload cannot run under the same repair id.`);
        if (state.status === 'accepted') {
          if (!existing) throw new Error('Goal is already accepted; no explicit repair is required.');
          return verifyIntegrity(state);
        }
        const repair = existing ?? { recoveryId, stepId, reason, command: copy(command), operationId: digest(`${root}\0${state.id}\0repair:${recoveryId}`), status: 'pending' };
        // Settle every genuinely outstanding original/repair operation before any new effect,
        // for brand-new and revisited repair ids alike. The current repair reconciles through perform below.
        if (!await settleOutstanding(state, repair)) {
          await emit(state, 'repair-blocked', { recoveryId, stepId, operationId: repair.operationId });
          return incomplete(state, 'A prior effect is unreconciled; the host must reconcile the destination before an explicit repair.');
        }
        if (!existing) {
          state.repairs.push(repair);
          await emit(state, 'repair-requested', { recoveryId, stepId, operationId: repair.operationId, reason });
        }
        if (repair.status !== 'completed') {
          if (!await perform(state, repair)) {
            await emit(state, 'repair-failed', { recoveryId, operationId: repair.operationId, result: repair.result });
            return incomplete(state, truthReason(state, 'Explicit repair did not complete successfully; another explicit repair id is required.'));
          }
          await emit(state, 'repair-completed', { recoveryId, operationId: repair.operationId });
        }
        return run(state);
      });
    },
    status: async id => historical(await load(id)),
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    dispose() { disposed = true; listeners.clear(); },
  };
}
