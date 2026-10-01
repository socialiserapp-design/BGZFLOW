import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { after, test } from 'node:test';
import { collectStatus } from '../lib.mjs';

const made = [];
const now = Date.parse('2026-01-01T12:00:00Z');
function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'swarm-status-'));
  made.push(root);
  const dir = path.join(root, 'state');
  const overlay = path.join(root, 'overlay');
  const workspace = path.join(root, 'workspace');
  for (const folder of [dir, overlay, workspace]) fs.mkdirSync(folder);
  return { dir, overlay, workspace, home: root, env: { BGZFLOW_OVERLAY: overlay }, now, isAlive: () => false };
}
function record(f, name, data, base = f.dir) {
  const folder = path.join(base, 'lane');
  fs.mkdirSync(folder, { recursive: true });
  const file = path.join(folder, `${name}.json`);
  fs.writeFileSync(file, JSON.stringify(data));
  return file;
}
after(() => made.forEach((dir) => fs.rmSync(dir, { recursive: true, force: true })));

// Catches private project tables baked into status, prefix collisions and lost active jobs.
test('projects use the longest overlay workspace match, then the folder name', () => {
  const f = fixture();
  fs.writeFileSync(path.join(f.overlay, 'PROJECTS.md'), `| Project | Path |\n|---|---|\n| outer | ${path.dirname(f.workspace)} |\n| named | ${f.workspace} |\n`);
  record(f, 'a', { id: 'a', cwd: path.join(f.workspace, 'src'), status: 'running', pid: 1, createdAt: '2025-12-01T12:00:00Z' });
  record(f, 'b', { id: 'b', cwd: path.join(path.dirname(f.workspace), 'other'), status: 'running', pid: 2 });
  record(f, 'c', { id: 'c', cwd: '/independent/standalone', status: 'running', pid: 3 });
  const result = collectStatus({ ...f, isAlive: () => true });
  assert.deepEqual(result.jobs.map((j) => j.project), ['named', 'outer', 'standalone']);
});

// Catches ghost jobs counted as active and terminal processes omitted from the report.
test('missing active processes are uncertain; PID presence never proves job ownership', () => {
  const f = fixture();
  record(f, 'dead', { id: 'dead', cwd: f.workspace, status: 'running', pid: 1, createdAt: '2026-01-01T11:00:00Z' });
  record(f, 'queued', { id: 'queued', cwd: f.workspace, status: 'queued', pid: 2, createdAt: '2026-01-01T11:54:00Z' });
  record(f, 'failed', { id: 'failed', cwd: f.workspace, status: 'failed', pid: 3, completedAt: '2026-01-01T11:55:00Z' });
  const jobs = collectStatus({ ...f, isAlive: (pid) => pid !== 1 }).jobs;
  assert.equal(jobs.find((j) => j.id === 'dead')?.status, 'uncertain');
  assert.match(jobs.find((j) => j.id === 'queued')?.flags.join(' '), /STUCK/);
  assert.match(jobs.find((j) => j.id === 'failed')?.flags.join(' '), /ownership unverified/i);
  assert.equal(jobs.find((j) => j.id === 'queued')?.liveness, 'unknown');
});

// Catches applying a built-in model policy or forgetting overlay-specific policy.
test('model and effort mismatches come solely from the matching overlay resource', () => {
  const f = fixture();
  fs.writeFileSync(path.join(f.overlay, 'ROUTES.md'), '| Resource | Kind | Jobs | Model | Effort |\n|---|---|---|---|---|\n| remote | cloud | ./jobs | expected | chosen |\n');
  record(f, 'remote', { id: 'r', workspaceRoot: f.workspace, status: 'running', request: { model: 'other', effort: 'other' } }, path.join(f.overlay, 'jobs'));
  record(f, 'local', { project: 'ignored', name: 'l', cwd: f.workspace, state: 'running', pid: 2, started: now, command: ['worker', '--model', 'other', '--effort', 'other'] });
  const jobs = collectStatus({ ...f, isAlive: () => true }).jobs;
  assert.match(jobs.find((j) => j.id === 'r')?.flags.join(' '), /MODEL.*EFFORT/);
  assert.equal(jobs.find((j) => j.id === 'l')?.flags.some((flag) => /MODEL|EFFORT/.test(flag)), false);
  assert.equal(jobs.find((j) => j.id === 'r')?.liveness, 'unknown');
});

// Catches duplicates hidden across roots, empty-summary false positives and stale results.
test('duplicates use task identity; recent filtering keeps active and zombie jobs', () => {
  const f = fixture();
  for (const id of ['a', 'b']) record(f, id, { id, cwd: f.workspace, status: 'running', pid: 1, taskId: 'T1', createdAt: '2026-01-01T11:00:00Z' });
  record(f, 'empty', { id: 'empty', cwd: f.workspace, status: 'running', pid: 1 });
  record(f, 'old', { id: 'old', cwd: f.workspace, status: 'completed', completedAt: '2025-12-01T12:00:00Z' });
  record(f, 'zombie', { id: 'zombie', cwd: f.workspace, status: 'failed', pid: 1, completedAt: '2025-12-01T12:00:00Z' });
  const jobs = collectStatus({ ...f, isAlive: () => true }).jobs;
  assert.match(jobs.find((j) => j.id === 'b')?.flags.join(' '), /DUPLICATE/);
  assert.equal(jobs.find((j) => j.id === 'empty')?.flags.some((s) => s.includes('DUPLICATE')), false);
  assert.equal(jobs.some((j) => j.id === 'old'), false);
  assert.equal(jobs.some((j) => j.id === 'zombie'), true);
});

// Catches dropping damaged records silently, writing status back, or following a wrong filter.
test('status is read-only, filters by project and reports damaged records as gaps', () => {
  const f = fixture();
  const file = record(f, 'job', { id: 'a', cwd: f.workspace, status: 'running', pid: 1 });
  const before = fs.readFileSync(file, 'utf8');
  fs.writeFileSync(path.join(f.dir, 'lane', 'broken.json'), '{');
  const result = collectStatus({ ...f, project: 'workspace', isAlive: () => true });
  assert.equal(result.jobs.length, 1);
  assert.equal(result.gaps.length, 1);
  assert.equal(fs.readFileSync(file, 'utf8'), before);
  assert.equal(collectStatus({ ...f, project: 'absent' }).jobs.length, 0);
});

// Catches misleading exit status and invalid hours silently turning into default windows.
test('local exit codes survive normalization and invalid hour windows are rejected', () => {
  const f = fixture();
  record(f, 'done', { name: 'done', cwd: f.workspace, state: 'exited', exitCode: 0, started: now });
  record(f, 'failed', { name: 'failed', cwd: f.workspace, state: 'exited', exitCode: 2, started: now });
  const jobs = collectStatus(f).jobs;
  assert.equal(jobs.find((j) => j.id === 'done')?.status, 'completed');
  assert.equal(jobs.find((j) => j.id === 'failed')?.status, 'failed');
  for (const hours of [0, -1, NaN, Infinity]) assert.throws(() => collectStatus({ ...f, hours }), /hours/);
});

// Catches project/options parsing that changes the reported scope or mutates job records.
test('CLI reports real local liveness in JSON and rejects invalid options', () => {
  const f = fixture();
  const file = record(f, 'active', { name: 'active', cwd: f.workspace, state: 'running', pid: process.pid });
  const before = fs.readFileSync(file, 'utf8');
  const script = fileURLToPath(new URL('../swarm-status.mjs', import.meta.url));
  const run = (...args) => spawnSync(process.execPath, [script, ...args], { encoding: 'utf8', timeout: 10000,
    env: { ...process.env, ...f.env, BG_SWARM_DIR: f.dir } });
  const result = run('workspace', '--hours', '1', '--json');
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).jobs[0].liveness, 'unknown');
  assert.equal(JSON.parse(result.stdout).jobs[0].pidState, 'present');
  assert.equal(fs.readFileSync(file, 'utf8'), before);
  for (const args of [['--hours'], ['--hours', '0'], ['--hours', 'bad'], ['--stop'], ['a', 'b']]) assert.equal(run(...args).status, 2);
  assert.match(run('--help').stdout, /usage:/);
  assert.match(run().stdout, /workspace/);
});

// Catches a generic local scan misclassifying cloud records stored beneath the shared state directory.
test('configured cloud metadata keeps its remote identity inside local state', () => {
  const f = fixture();
  const cloud = path.join(f.dir, 'cloud');
  fs.writeFileSync(path.join(f.overlay, 'ROUTES.md'), `| Resource | Kind | Jobs |\n|---|---|---|\n| remote | cloud | ${cloud} |\n`);
  record(f, 'remote', { id: 'remote-job', cwd: f.workspace, status: 'running', pid: 1 }, cloud);
  const result = collectStatus(f);
  assert.equal(result.jobs.length, 1);
  assert.equal(result.jobs[0].resource, 'remote');
  assert.equal(result.jobs[0].status, 'running');
  assert.equal(result.jobs[0].liveness, 'unknown');
});

// Catches same-title false positives and mirrored records inflating counts.
test('durable IDs are counted once and titles never define duplicate task attempts', () => {
  const f = fixture();
  const base = { cwd: f.workspace, status: 'running', pid: 1, createdAt: '2026-01-01T11:00:00Z', summary: 'same title' };
  record(f, 'a', { ...base, id: 'a', taskId: 'task-a' });
  record(f, 'b', { ...base, id: 'b', taskId: 'task-b' });
  record(f, 'mirror', { ...base, id: 'a', taskId: 'task-a' });
  const result = collectStatus({ ...f, isAlive: () => true });
  assert.equal(result.jobs.length, 2);
  assert.deepEqual(result.mirroredIds, ['a']);
  assert.equal(result.jobs.some((job) => job.flags.some((flag) => /DUPLICATE/.test(flag))), false);
  assert.equal(result.jobs.find((job) => job.id === 'a').records.length, 2);
});

// Catches a completed newer mirror being replaced by a stale active copy, or retry overlap being lost.
test('newest mirror wins and only overlapping attempts of the same task are flagged', () => {
  const f = fixture();
  record(f, 'old-copy', { id: 'a', cwd: f.workspace, taskId: 'T1', status: 'running', createdAt: '2026-01-01T10:00:00Z' });
  record(f, 'new-copy', { id: 'a', cwd: f.workspace, taskId: 'T1', status: 'completed', createdAt: '2026-01-01T10:00:00Z', completedAt: '2026-01-01T10:30:00Z' });
  record(f, 'retry', { id: 'b', cwd: f.workspace, taskId: 'T1', status: 'running', createdAt: '2026-01-01T11:00:00Z' });
  record(f, 'overlap', { id: 'c', cwd: f.workspace, taskId: 'T1', status: 'running', createdAt: '2026-01-01T11:30:00Z' });
  const result = collectStatus(f);
  assert.equal(result.jobs.find((job) => job.id === 'a').status, 'completed');
  assert.equal(result.jobs.find((job) => job.id === 'a').flags.some((flag) => /DUPLICATE/.test(flag)), false);
  assert.match(result.jobs.find((job) => job.id === 'b').flags.join(' '), /DUPLICATE.*c/);
  assert.match(result.jobs.find((job) => job.id === 'c').flags.join(' '), /DUPLICATE.*b/);
});

// Catches age-based death inference, hidden stale/undated results and default-setting exemptions.
test('stale and unknown records remain visible and default settings stay unverified', () => {
  const f = fixture();
  record(f, 'stale', { id: 'stale', cwd: f.workspace, status: 'queued', createdAt: '2025-12-01T12:00:00Z', pid: 1,
    request: { model: '(default)', effort: '(default)' } });
  record(f, 'undated', { id: 'undated', cwd: f.workspace, status: 'completed' });
  const result = collectStatus({ ...f, isAlive: () => true });
  assert.equal(result.jobs.find((job) => job.id === 'stale').status, 'queued');
  assert.deepEqual(result.staleIds, ['stale']);
  assert.equal(result.unknownIds.includes('undated'), true);
  assert.match(result.jobs.find((job) => job.id === 'stale').flags.join(' '), /unverified.*model\/effort/i);
  assert.equal(result.jobs.find((job) => job.id === 'stale').model, null);
});

// Catches schema crashes and unavailable scans appearing as an empty healthy provider.
test('null and malformed metadata are gaps while coverage and recent result IDs are explicit', () => {
  const f = fixture();
  record(f, 'null', null);
  record(f, 'array', []);
  record(f, 'bad-workspace', { id: 'bad', status: 'running', cwd: {} });
  record(f, 'done', { id: 'done', cwd: f.workspace, status: 'completed', completedAt: '2026-01-01T11:59:00Z', result: 'results/done.json', exitCode: 0 });
  const missing = path.join(f.overlay, 'absent');
  fs.writeFileSync(path.join(f.overlay, 'ROUTES.md'), `| Resource | Kind | Jobs |\n|---|---|---|\n| remote | cloud | ${missing} |\n`);
  const result = collectStatus(f);
  assert.equal(result.jobs.length, 1);
  assert.equal(result.gaps.length, 4);
  assert.deepEqual(result.completedIds, ['done']);
  assert.equal(result.jobs[0].result, 'results/done.json');
  assert.equal(result.coverage.find((source) => source.resource === 'remote').available, false);
  assert.equal(result.jobs[0].exitCode, 0);
});

// Catches duplicate writers in different worktrees and omission of an explicitly configured source.
test('duplicate task IDs span worktrees', () => {
  const f = fixture();
  fs.writeFileSync(path.join(f.overlay, 'PROJECTS.md'), `| Project | Path |\n|---|---|\n| named | ${f.home} |\n`);
  record(f, 'a', { id: 'a', cwd: path.join(f.home, 'tree-a'), status: 'running', pid: 1, taskId: 'T1' });
  record(f, 'b', { id: 'b', cwd: path.join(f.home, 'tree-b'), status: 'running', pid: 2, taskId: 'T1' });
  const result = collectStatus({ ...f, isAlive: () => true });
  assert.match(result.jobs.find((j) => j.id === 'b')?.flags.join(' '), /DUPLICATE/);
});

test('missing configured job directories are explicit gaps', () => {
  const f = fixture();
  fs.writeFileSync(path.join(f.overlay, 'ROUTES.md'), '| Resource | Kind | Jobs |\n|---|---|---|\n| remote | cloud | ./missing-jobs |\n');
  assert.equal(collectStatus(f).gaps.length, 1);
});
