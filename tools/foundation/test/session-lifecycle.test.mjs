import {realpathSync as canonicalTestPath} from 'node:fs'; // Resolve OS temp aliases before testing descendant link protection.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createFoundationSession, createProjectPathReservations } from '../session.mjs';

function fixture(t, overrides = {}) {
  const root = fs.mkdtempSync(path.join(canonicalTestPath.native(os.tmpdir()), 'bgz-input-lifecycle-'));
  const projectRoot = path.join(root, 'project'); fs.mkdirSync(projectRoot);
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const config = { projectRoot, sessionId: 'native-owner', storageRoot: path.join(root, 'store') };
  const host = { ...createProjectPathReservations(config), confirmRequest: async value => ({ ...value, observed: true }), authorizeExecution: async () => ({ allowed: true, sourceId: 'original-request' }), ...overrides };
  return { config, host, session: createFoundationSession({ ...config, host }) };
}
async function assignment(f) {
  const request = await f.session.acceptRequest({ sourceId: 'original', text: 'Build the agreed calendar.' });
  await f.session.assign({ id: 'calendar', owner: 'builder', revision: request.revision });
  return request;
}

test('explicit follow-ups keep the original request and assignment through restart and late input', async t => {
  let executions = 0;
  const f = fixture(t, { execute: async task => { executions++; return { status: 'completed', source: 'host', observationId: task.operationId }; } });
  const request = await assignment(f);
  const one = await f.session.queueInput({ assignmentId: 'calendar', revision: request.revision, sourceId: 'correction', text: 'Keep the existing colours.' });
  const restored = createFoundationSession({ ...f.config, host: f.host });
  assert.deepEqual(await restored.queueInput({ assignmentId: 'calendar', revision: request.revision, sourceId: 'correction', text: 'Keep the existing colours.' }), one);
  await assert.rejects(restored.queueInput({ assignmentId: 'calendar', revision: request.revision, sourceId: 'correction', text: 'Changed content under same identity.' }), /conflicting/);
  await restored.execute({ id: 'calendar', revision: request.revision });
  await restored.queueInput({ assignmentId: 'calendar', revision: request.revision, sourceId: 'late', text: 'What happened to the weekend view?' });
  assert.equal(executions, 1);
  assert.deepEqual(restored.current().request, request);
  assert.equal(restored.current().assignments.length, 1);
  assert.equal(restored.current().assignments[0].inputs.length, 2);
  assert.equal(restored.current().assignments[0].inputs[1].status, 'queued');
  await assert.rejects(restored.queueInput({ assignmentId: 'missing', revision: request.revision, sourceId: 'bad', text: 'Guess the owner.' }), /existing assignment/);
  const replacement = await restored.acceptRequest({ sourceId: 'separate', text: 'Now research a different project.' });
  assert.notEqual(replacement.revision, request.revision);
});

test('input delivery and session consumption are distinct from execution and outcome verification', async t => {
  let deliveries = 0, taken = false;
  const f = fixture(t, {
    deliverInput: async ({ assignment, input, mode }) => { deliveries++; assert.equal(mode, 'queue'); return { status: 'delivered', assignmentId: assignment.id, inputId: input.id, source: 'native-inbox', observationId: 'persisted-message' }; },
    reconcileInput: async () => ({ status: taken ? 'taken' : 'delivered', source: 'native-history', observationId: 'history-snapshot' }),
  });
  const request = await assignment(f);
  const input = await f.session.queueInput({ assignmentId: 'calendar', revision: request.revision, sourceId: 'follow', text: 'Use the agreed existing package.' });
  assert.equal((await f.session.deliverInput({ assignmentId: 'calendar', inputId: input.id })).status, 'delivered');
  await f.session.deliverInput({ assignmentId: 'calendar', inputId: input.id });
  assert.equal(deliveries, 1);
  assert.equal(f.session.current().assignments[0].status, 'assigned');
  assert.deepEqual(f.session.current().outcomes, []);
  taken = true;
  assert.equal((await f.session.reconcileInput({ assignmentId: 'calendar', inputId: input.id })).status, 'taken');
  assert.deepEqual(f.session.current().outcomes, []);
});

test('a delivery interrupted after enqueue is reconciled using its original identity without replay', async t => {
  let sends = 0, delivered;
  const f = fixture(t, {
    deliverInput: async ({ input }) => { sends++; delivered = input.id; throw Error('Connection lost after enqueue'); },
    reconcileInput: async ({ input }) => ({ status: input.id === delivered ? 'delivered' : 'not-delivered', source: 'persistent-native-inbox', observationId: 'inbox-readback' }),
  });
  const request = await assignment(f);
  const input = await f.session.queueInput({ assignmentId: 'calendar', revision: request.revision, sourceId: 'update', text: 'Keep the phone design.' });
  assert.equal((await f.session.deliverInput({ assignmentId: 'calendar', inputId: input.id })).status, 'uncertain');
  const restored = createFoundationSession({ ...f.config, host: f.host });
  await restored.deliverInput({ assignmentId: 'calendar', inputId: input.id });
  assert.equal(sends, 1);
  assert.equal((await restored.reconcileInput({ assignmentId: 'calendar', inputId: input.id })).status, 'delivered');
  await restored.deliverInput({ assignmentId: 'calendar', inputId: input.id });
  assert.equal(sends, 1);
});

test('unknown or mismatched delivery observations cannot confirm consumption or allow a blind retry', async t => {
  let sends = 0, observed = { status: 'taken', source: 'native', observationId: 'wrong-target', inputId: 'other' };
  const f = fixture(t, { deliverInput: async () => { sends++; return { status: 'delivered' }; }, reconcileInput: async () => observed });
  const request = await assignment(f);
  const input = await f.session.queueInput({ assignmentId: 'calendar', revision: request.revision, sourceId: 'input', text: 'Please continue.' });
  await f.session.deliverInput({ assignmentId: 'calendar', inputId: input.id });
  assert.equal((await f.session.reconcileInput({ assignmentId: 'calendar', inputId: input.id })).status, 'uncertain');
  await f.session.deliverInput({ assignmentId: 'calendar', inputId: input.id });
  assert.equal(sends, 1);
  observed = { status: 'not-delivered', source: 'native-inbox-and-history', observationId: 'proven-absent' };
  assert.equal((await f.session.reconcileInput({ assignmentId: 'calendar', inputId: input.id })).status, 'queued');
  await f.session.deliverInput({ assignmentId: 'calendar', inputId: input.id });
  assert.equal(sends, 2);
});

test('completed strings and explicitly live background work retain reservations until host-confirmed terminal state', async t => {
  let releases = 0, result = { status: 'completed' };
  const f = fixture(t, { reserve: async () => ({ id: 'slot', granted: true }), release: async () => { releases++; }, execute: async () => result, reconcile: async () => result });
  const request = await f.session.acceptRequest({ sourceId: 'original', text: 'Build the calendar.' });
  await f.session.assign({ id: 'calendar', owner: 'builder', resourcePool: 'account', paths: ['calendar.mjs'], revision: request.revision });
  assert.equal((await f.session.execute({ id: 'calendar', revision: request.revision })).status, 'uncertain');
  assert.equal(releases, 0);
  result = { status: 'completed', source: 'native', observationId: 'turn-ended', backgroundWork: { jobs: [{ id: 'build', status: 'running' }], workers: [] } };
  assert.equal((await f.session.reconcile({ id: 'calendar' })).status, 'uncertain');
  assert.equal(releases, 0);
  result = { ...result, observationId: 'all-owned-work-ended', backgroundWork: { jobs: [], workers: [] } };
  assert.equal((await f.session.reconcile({ id: 'calendar' })).status, 'completed');
  assert.equal(releases, 1);
  await f.session.reconcile({ id: 'calendar' });
  assert.equal(releases, 1);
  assert.deepEqual(f.session.current().outcomes, []);
  await f.session.assign({ id: 'later', owner: 'other', paths: ['calendar.mjs'], revision: request.revision });
});

test('a follow-up delivered during execution keeps its slot until consumption and terminal reconciliation', async t => {
  let finish, started, releases = 0;
  const began = new Promise(resolve => { started = resolve; });
  const terminal = { status: 'completed', source: 'native', observationId: 'terminal-readback' };
  const f = fixture(t, {
    reserve: async () => ({ id: 'slot', granted: true }), release: async () => { releases++; },
    execute: async () => { started(); return new Promise(resolve => { finish = resolve; }); },
    reconcile: async () => terminal,
    deliverInput: async () => ({ status: 'delivered', source: 'native-inbox', observationId: 'message-persisted' }),
    reconcileInput: async () => ({ status: 'taken', source: 'native-history', observationId: 'message-consumed' }),
  });
  const request = await f.session.acceptRequest({ sourceId: 'original', text: 'Build calendar.' });
  await f.session.assign({ id: 'calendar', owner: 'builder', resourcePool: 'account', revision: request.revision });
  const executing = f.session.execute({ id: 'calendar', revision: request.revision });
  await began;
  const input = await f.session.queueInput({ assignmentId: 'calendar', revision: request.revision, sourceId: 'late', text: 'Keep the agreed phone view.' });
  await f.session.deliverInput({ assignmentId: 'calendar', inputId: input.id });
  finish(terminal);
  assert.equal((await executing).status, 'uncertain');
  assert.equal(releases, 0);
  await f.session.reconcileInput({ assignmentId: 'calendar', inputId: input.id });
  assert.equal((await f.session.reconcile({ id: 'calendar' })).status, 'completed');
  assert.equal(releases, 1);
});
