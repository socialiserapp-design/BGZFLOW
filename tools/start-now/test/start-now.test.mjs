import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { after, before, test } from 'node:test';
import { formatStartNow, readTasks, selectStartNow } from '../start-now.mjs';

const cli = fileURLToPath(new URL('../start-now.mjs', import.meta.url));
let dir;

const task = (id, extra = {}) => ({ id, outcome: `Outcome of ${id}`, dependsOn: [], owner: 'storage-worker', worker_state: 'planned', ...extra });
const accepted = { dependency_acceptance: { state: 'accepted' } };
const integrated = { integration: { state: 'integrated' } };
const ids = (r) => r.ready.map((t) => t.id);
const CLEAN_ENV = Object.fromEntries(Object.entries(process.env).filter(([name]) => !['BGZFLOW_PROJECT', 'CLAUDE_PROJECT_DIR', 'GROK_WORKSPACE_ROOT'].includes(name)));
const run = (args, opts = {}) => spawnSync(process.execPath, [cli, ...args], { cwd: dir, encoding: 'utf8', env: CLEAN_ENV, ...opts });
const writeGraph = (rel, graph) => {
  const full = path.join(dir, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, typeof graph === 'string' ? graph : JSON.stringify(graph));
  return full;
};

before(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bgz-start-now-'));
});

after(() => fs.rmSync(dir, { recursive: true, force: true }));

test('accepted-dependency gate: accepted or integrated prerequisites open it, pending or invalidated do not', () => {
  const r = selectStartNow([
    task('A', { owner: 'w1', worker_state: 'completed', ...accepted }),
    task('B', { owner: 'w2', worker_state: 'completed', integration: { state: 'integrated' } }),
    task('C', { owner: 'w3', worker_state: 'completed', dependency_acceptance: { state: 'pending' } }),
    task('D', { owner: 'w4', worker_state: 'completed', dependency_acceptance: { state: 'invalidated' } }),
    task('E', { dependsOn: [{ id: 'A', gate: 'accepted-dependency' }] }),
    task('F', { dependsOn: [{ id: 'B', gate: 'accepted-dependency' }] }),
    task('G', { dependsOn: [{ id: 'C', gate: 'accepted-dependency' }] }),
    task('H', { dependsOn: [{ id: 'D', gate: 'accepted-dependency' }] }),
  ]);
  assert.deepEqual(ids(r), ['E', 'F']);
  assert.deepEqual(r.waiting, [{ id: 'G', waitingOn: ['C'] }, { id: 'H', waitingOn: ['D'] }]);
});

test('integrated gate: only an integrated prerequisite opens it, acceptance alone does not', () => {
  const r = selectStartNow([
    task('A', { owner: 'w1', worker_state: 'completed', ...accepted }),
    task('B', { owner: 'w2', worker_state: 'completed', ...integrated }),
    task('C', { dependsOn: [{ id: 'A', gate: 'integrated' }] }),
    task('D', { dependsOn: [{ id: 'B', gate: 'integrated' }] }),
  ]);
  assert.deepEqual(ids(r), ['D']);
  assert.deepEqual(r.waiting, [{ id: 'C', waitingOn: ['A'] }]);
});

test('every dependency must be met, and a task with no dependencies is listed', () => {
  const r = selectStartNow([
    task('A', { owner: 'w1', worker_state: 'completed', ...accepted }),
    task('B', { owner: 'w2', worker_state: 'running' }),
    task('C'),
    task('D', { dependsOn: [{ id: 'A', gate: 'accepted-dependency' }, { id: 'B', gate: 'accepted-dependency' }] }),
  ]);
  assert.deepEqual(ids(r), ['C']);
  assert.deepEqual(r.waiting, [{ id: 'D', waitingOn: ['B'] }]);
});

test('a schema-valid planned task with an owner and met dependencies is listed', () => {
  const r = selectStartNow([
    task('A', { owner: 'storage-worker', worker_state: 'completed', ...integrated }),
    task('B', { owner: 'ui-worker', worker_state: 'planned', dependsOn: [{ id: 'A', gate: 'integrated' }] }),
    task('C', { owner: 'api-worker', worker_state: 'ready' }),
  ]);
  assert.deepEqual(ids(r), ['B', 'C']);
  assert.deepEqual(r.waiting, []);
});

test('an owner does not keep a task off the list: ownership is no reason to skip, state and dependencies decide', () => {
  const noState = task('N', { owner: 'storage-worker' });
  delete noState.worker_state;
  const r = selectStartNow([task('A', { owner: 'worker-1' }), task('B', { owner: 'worker-2', worker_state: 'running' }), noState]);
  assert.deepEqual(ids(r), ['A', 'N']);
});

test('only planned, ready or missing worker_state is listed', () => {
  const noState = task('N');
  delete noState.worker_state;
  const states = ['planned', 'ready', 'queued', 'running', 'completed', 'failed', 'interrupted', 'waiting-for-PC'];
  const r = selectStartNow([...states.map((s) => task(s, { worker_state: s })), noState]);
  assert.deepEqual(ids(r), ['planned', 'ready', 'N']);
  assert.deepEqual(r.waiting, []);
});

test('an unknown dependency, a bad gate or a malformed edge keeps the task off the list', () => {
  const r = selectStartNow([
    task('A', { owner: 'w1', worker_state: 'completed', ...accepted, ...integrated }),
    task('B', { dependsOn: [{ id: 'MISSING', gate: 'accepted-dependency' }] }),
    task('C', { dependsOn: [{ id: 'A', gate: 'someday' }] }),
    task('D', { dependsOn: ['A'] }),
  ]);
  assert.deepEqual(ids(r), []);
  assert.deepEqual(r.waiting.map((w) => w.id), ['B', 'C', 'D']);
  assert.deepEqual(r.waiting[0].waitingOn, ['MISSING']);
});

test('an empty graph lists nothing', () => {
  const r = selectStartNow([]);
  assert.deepEqual(r, { ready: [], waiting: [] });
  assert.equal(formatStartNow(r), 'Nothing to start now.');
});

test('plain output is one line per task: id and outcome', () => {
  const text = formatStartNow(selectStartNow([task('T1', { outcome: 'Build\nthe  thing' }), task('T2', { outcome: undefined })]));
  assert.equal(text, 'T1  Build the thing\nT2');
});

test('readTasks accepts an envelope or a bare array and rejects bad files with a reason', () => {
  assert.equal(readTasks(writeGraph('env.json', { schema_version: 1, tasks: [task('A')] })).length, 1);
  assert.equal(readTasks(writeGraph('bare.json', [task('A'), task('B')])).length, 2);
  assert.throws(() => readTasks(path.join(dir, 'nope.json')), /no graph file at/);
  assert.throws(() => readTasks(writeGraph('junk.json', '{ not json')), /not valid JSON/);
  assert.throws(() => readTasks(writeGraph('notasks.json', { tasks: 'x' })), /no tasks array/);
  assert.throws(() => readTasks(writeGraph('noid.json', [{ outcome: 'x' }])), /task 1 .* has no id/);
  assert.throws(() => readTasks(writeGraph('dup.json', [task('A'), task('A')])), /appears twice/);
});

test('cli reads <project>/.bgzflow/work-graph.json by default and prints the list', () => {
  const project = path.join(dir, 'proj');
  writeGraph('proj/.bgzflow/work-graph.json', { tasks: [task('T1'), task('T2', { owner: 'w1', worker_state: 'running' })] });
  const r = run([project]);
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.stdout.trim(), 'T1  Outcome of T1');
});

test('cli with no folder looks upward from a subfolder and finds the project graph', () => {
  const project = path.join(dir, 'upward');
  writeGraph('upward/.bgzflow/work-graph.json', { tasks: [task('U1', { owner: 'storage-worker' })] });
  const sub = path.join(project, 'src', 'deep');
  fs.mkdirSync(sub, { recursive: true });
  const r = run([], { cwd: sub });
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.stdout.trim(), 'U1  Outcome of U1');
});

test('cli with an explicit folder uses that folder, not the one above the current folder', () => {
  writeGraph('upward-a/.bgzflow/work-graph.json', { tasks: [task('FROM_A')] });
  writeGraph('upward-b/.bgzflow/work-graph.json', { tasks: [task('FROM_B')] });
  const sub = path.join(dir, 'upward-a', 'sub');
  fs.mkdirSync(sub, { recursive: true });
  const r = run([path.join(dir, 'upward-b')], { cwd: sub });
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.stdout.trim(), 'FROM_B  Outcome of FROM_B');
});

test('cli --graph overrides the default and "Nothing to start now." exits 0', () => {
  writeGraph('other.json', { tasks: [task('T1', { owner: 'w1', worker_state: 'running' })] });
  const r = run(['--graph', 'other.json']);
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.stdout.trim(), 'Nothing to start now.');
  assert.equal(run(['--graph=other.json']).status, 0);
});

test('cli --json prints ready plus waiting, total and graph', () => {
  writeGraph('json.json', { tasks: [task('A', { owner: 'w1', worker_state: 'completed', ...accepted }), task('B', { dependsOn: [{ id: 'A', gate: 'accepted-dependency' }] }), task('C', { dependsOn: [{ id: 'A', gate: 'integrated' }] })] });
  const r = run(['--graph', 'json.json', '--json']);
  assert.equal(r.status, 0, r.stderr);
  const out = JSON.parse(r.stdout);
  assert.deepEqual(out.ready, [{ id: 'B', outcome: 'Outcome of B' }]);
  assert.deepEqual(out.waiting, [{ id: 'C', waitingOn: ['A'] }]);
  assert.equal(out.total, 3);
  assert.match(out.graph, /json\.json$/);
});

test('cli exits 2 with a one-line reason for bad usage and unreadable graphs', () => {
  const cases = [
    [['--graph', 'missing.json'], /no graph file/],
    [['--bogus'], /unknown option --bogus/],
    [['--graph'], /--graph needs a file/],
    [['a', 'b'], /only one project folder/],
  ];
  for (const [args, pattern] of cases) {
    const r = run(args);
    assert.equal(r.status, 2, args.join(' '));
    assert.equal(r.stdout, '');
    assert.match(r.stderr, pattern);
    assert.equal(r.stderr.trim().split('\n').length, 1, 'one-line reason');
  }
  writeGraph('bad.json', '{ nope');
  assert.equal(run(['--graph', 'bad.json']).status, 2);
  assert.equal(run([dir]).status, 2, 'a folder with no .bgzflow graph');
});

test('cli never writes: the graph file is unchanged after a run', () => {
  const file = writeGraph('ro.json', { tasks: [task('T1')] });
  const before = fs.readFileSync(file, 'utf8');
  const stat = fs.statSync(file).mtimeMs;
  assert.equal(run(['--graph', 'ro.json']).status, 0);
  assert.equal(fs.readFileSync(file, 'utf8'), before);
  assert.equal(fs.statSync(file).mtimeMs, stat);
});
