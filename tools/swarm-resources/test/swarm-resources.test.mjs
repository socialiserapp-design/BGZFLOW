import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { after, test } from 'node:test';
import { discoverResources, loadApproval, saveApproval } from '../lib.mjs';
import * as resourceApi from '../lib.mjs';

const made = [];
function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'swarm-resources-'));
  made.push(root);
  const home = path.join(root, 'home');
  const bin = path.join(root, 'bin');
  const overlay = path.join(root, 'overlay');
  const state = path.join(root, 'state');
  for (const dir of [home, bin, overlay, state]) fs.mkdirSync(dir, { recursive: true });
  return { home, bin, overlay, state, env: { PATH: bin, BGZFLOW_OVERLAY: overlay, BG_SWARM_DIR: state } };
}
function cli(f, name) {
  fs.writeFileSync(path.join(f.bin, name), '#!/bin/sh\nexit 99\n', { mode: 0o755 });
}
after(() => made.forEach((dir) => fs.rmSync(dir, { recursive: true, force: true })));

// Catches fabricated resources and discovery that executes a worker or ignores PATH.
test('detects installed CLIs without running them; installation is not access proof', () => {
  const f = fixture();
  cli(f, 'codex');
  const result = discoverResources({ ...f, cwd: f.home, platform: 'linux' });
  assert.deepEqual(result.resources.map((r) => r.id), ['codex-local']);
  assert.equal(result.resources[0].installed, true);
  assert.equal(result.resources[0].authenticated, null);
  assert.equal(result.resources[0].available, false);
  assert.equal(result.resources[0].state, 'installed');
  assert.equal(result.resources[0].qualified, false);
  assert.match(result.resources[0].status, /unverified/);
});

// Catches ignoring private route config, or treating a missing cloud home as available.
test('a gate lookup inventories only its selected resource and preserves other valid approvals', () => {
  const f = fixture(); cli(f, 'codex'); cli(f, 'grok');
  fs.mkdirSync(path.join(f.home, 'unrelated-cloud'));
  saveApproval(['grok-local'], [{ id: 'grok-local', installed: true }], { dir: f.state, workspace: f.home, swarm: 'other' });
  const result = discoverResources({ ...f, cwd: f.home, platform: 'linux', ids: ['codex-local'] });
  assert.deepEqual(result.resources.map(r => r.id), ['codex-local']);
  assert.deepEqual(result.lastApproved.approved, ['grok-local']);
});

test('overlay routes supply custom CLIs, cloud homes, dispatch and qualification', () => {
  const f = fixture();
  cli(f, 'worker-cli');
  fs.mkdirSync(path.join(f.home, 'remote-cloud'));
  fs.writeFileSync(path.join(f.overlay, 'ROUTES.md'), [
    '| Resource | Kind | CLI | Home | Jobs | Dispatch | Cost | Qualified | Recommended | Model | Effort |',
    '|---|---|---|---|---|---|---|---|---|---|---|',
    '| remote-build | cloud | worker-cli | ~/remote-cloud | ./jobs | supported job route | included | yes | yes | expected | strongest-choice |',
    '| missing-build | cloud | worker-cli | ~/missing | - | supported job route | unknown | no | no | - | - |',
  ].join('\n'));
  const result = discoverResources({ ...f, cwd: f.home, platform: 'linux' });
  const remote = result.resources.find((r) => r.id === 'remote-build');
  assert.equal(remote.installed, true);
  assert.equal(remote.available, false);
  assert.equal(remote.proven, false);
  assert.equal(remote.recommended, false);
  assert.equal(remote.qualified, true);
  assert.equal(remote.dispatch, 'supported job route');
  assert.equal(remote.jobsDir, path.join(f.overlay, 'jobs'));
  assert.equal(remote.model, 'expected');
  assert.equal(result.resources.find((r) => r.id === 'missing-build').available, false);
  assert.equal(result.resources.filter((r) => r.home === remote.home).length, 1);
});

// Catches assuming a discovered home has cloud entitlement or a qualified dispatch route.
test('an unconfigured cloud home is detected but cannot be approved for dispatch', () => {
  const f = fixture();
  fs.mkdirSync(path.join(f.home, 'extra-cloud'));
  const result = discoverResources({ ...f, cwd: f.home, platform: 'linux' });
  assert.equal(result.resources.length, 1);
  assert.equal(result.resources[0].kind, 'cloud');
  assert.equal(result.resources[0].available, false);
  assert.throws(() => saveApproval([result.resources[0].id], result.resources, { dir: f.state, workspace: f.home, swarm: 'T1' }), /unavailable/);
});

// Catches saving outside plugin state or inheriting another project's/swarm's authority.
test('approval persists atomically in plugin state and is scoped to workspace and swarm', () => {
  const f = fixture();
  const options = { dir: f.state, workspace: f.home, swarm: 'T1', now: new Date('2026-01-01T00:00:00Z') };
  saveApproval(['worker', 'worker'], [{ id: 'worker', available: true }], options);
  assert.equal(fs.existsSync(path.join(f.state, 'swarm-resources-approved.json')), true);
  assert.deepEqual(loadApproval(options).approved, ['worker']);
  assert.equal(loadApproval({ ...options, swarm: 'T2' }), null);
  assert.equal(loadApproval({ ...options, workspace: f.bin }), null);
  assert.equal(loadApproval(options).at, '2026-01-01T00:00:00.000Z');
});

// Catches an invalid selection destroying the previously agreed set.
test('empty, unknown and unavailable selections leave existing approval intact', () => {
  const f = fixture();
  const options = { dir: f.state, workspace: f.home, swarm: 'T1' };
  const resources = [{ id: 'worker', available: true }, { id: 'offline', available: false }];
  saveApproval(['worker'], resources, options);
  for (const ids of [[], ['unknown'], ['offline']]) assert.throws(() => saveApproval(ids, resources, options));
  assert.deepEqual(loadApproval(options)?.approved, ['worker']);
});

// Catches silently trusting damaged state and ambiguous duplicate route IDs.
test('malformed approval and duplicate resource IDs are explicit errors', () => {
  const f = fixture();
  fs.writeFileSync(path.join(f.state, 'swarm-resources-approved.json'), '{');
  assert.throws(() => loadApproval({ dir: f.state, workspace: f.home, swarm: 'T1' }), /approval/);
  fs.writeFileSync(path.join(f.overlay, 'ROUTES.md'), '| Resource | Kind | CLI |\n|---|---|---|\n| same | local | a |\n| same | local | b |\n');
  assert.throws(() => discoverResources({ ...f, cwd: f.home, platform: 'linux' }), /duplicate/i);
});

// Catches CLI options being ignored, approvals using the wrong state directory, or bad usage succeeding.
test('CLI emits JSON, saves explicit approval and rejects bad usage without changing it', () => {
  const f = fixture();
  cli(f, 'codex');
  const script = fileURLToPath(new URL('../swarm-resources.mjs', import.meta.url));
  const run = (...args) => spawnSync(process.execPath, [script, ...args], { cwd: f.home, encoding: 'utf8',
    env: { ...process.env, ...f.env, HOME: f.home, USERPROFILE: f.home }, timeout: 10000 });
  const saved = run('--swarm', 'T1', '--approve', 'codex-local', '--json');
  assert.equal(saved.status, 0, saved.stderr);
  assert.deepEqual(JSON.parse(saved.stdout).approved.approved, ['codex-local']);
  const before = fs.readFileSync(path.join(f.state, 'swarm-resources-approved.json'), 'utf8');
  for (const args of [['--approve'], ['--swarm'], ['--unknown'], ['--approve', 'unknown']]) assert.equal(run(...args).status, 2);
  assert.equal(fs.readFileSync(path.join(f.state, 'swarm-resources-approved.json'), 'utf8'), before);
  assert.match(run('--help').stdout, /usage:/);
});

function proof(id = 'codex-local') {
  return { id, at: '2026-01-01T00:00:00Z', jobId: 'qualification-job', account: 'test-scope',
    environment: 'test-environment', model: 'expected', effort: 'strongest-choice',
    access: 'owned scratch read/write and required services verified', returnRef: 'local-result',
    evidence: 'results/qualification.json', result: 'passed' };
}
function observed(f) {
  fs.writeFileSync(path.join(f.state, 'swarm-current-identities.json'), JSON.stringify({ identities: [{ id: 'codex-local', account: 'test-scope', environment: 'test-environment', authenticated: true, source: 'safe login observation', at: new Date().toISOString() }] }));
}

// Catches an installed/authenticated-looking route or an overlay yes bypassing qualification.
test('only dated passed route evidence makes a detected resource available for real work', () => {
  const f = fixture();
  observed(f);
  cli(f, 'codex');
  const before = discoverResources({ ...f, cwd: f.home, platform: 'linux' });
  saveApproval(['codex-local'], before.resources, { dir: f.state, workspace: f.home, swarm: 'T1' });
  assert.equal(before.resources[0].available, false, 'approval alone grants no proven access');
  assert.equal(typeof resourceApi.saveProven, 'function');
  resourceApi.saveProven(proof(), before.resources, { dir: f.state });
  const afterProof = discoverResources({ ...f, cwd: f.home, platform: 'linux', swarm: 'T1' });
  assert.equal(afterProof.resources[0].state, 'proven');
  assert.equal(afterProof.resources[0].available, true);
  assert.equal(afterProof.resources[0].proofs[0].jobId, 'qualification-job');
  assert.deepEqual(afterProof.approved.approved, ['codex-local']);
  fs.rmSync(path.join(f.bin, 'codex'));
  assert.equal(discoverResources({ ...f, cwd: f.home, platform: 'linux' }).resources[0]?.available ?? false, false);
});

// Catches accepting failed/future/incomplete proofs, wrong settings, or a non-commit cloud return.
test('qualification validation binds cloud return and effective settings without overwriting good proof', () => {
  const f = fixture();
  const resources = [{ id: 'remote', kind: 'cloud', model: 'expected', effort: 'strongest-choice' }];
  const good = { ...proof('remote'), returnRef: 'a'.repeat(40) };
  assert.equal(typeof resourceApi.saveProven, 'function');
  resourceApi.saveProven(good, resources, { dir: f.state });
  const file = path.join(f.state, 'swarm-proven-routes.json');
  const saved = fs.readFileSync(file, 'utf8');
  for (const bad of [null, [], { ...good, id: 'unknown' }, { ...good, result: 'failed' },
    { ...good, at: '2999-01-01' }, { ...good, access: '' }, { ...good, evidence: '' },
    { ...good, returnRef: 'branch-name' }, { ...good, model: 'other' }, { ...good, effort: '(default)' }]) {
    assert.throws(() => resourceApi.saveProven(bad, resources, { dir: f.state }), /qualification|proof/i);
    assert.equal(fs.readFileSync(file, 'utf8'), saved);
  }
});

// Catches old proof silently following a different account/environment or effective route policy.
test('proof reuse respects the configured scope and reports stale evidence', () => {
  const f = fixture();
  cli(f, 'worker-cli');
  const table = (account, environment, model) => `| Resource | Kind | CLI | Dispatch | Account | Environment | Model | Effort |\n|---|---|---|---|---|---|---|---|\n| worker | local | worker-cli | supported route | ${account} | ${environment} | ${model} | strongest-choice |\n`;
  fs.writeFileSync(path.join(f.overlay, 'ROUTES.md'), table('test-scope', 'test-environment', 'expected'));
  fs.writeFileSync(path.join(f.state, 'swarm-current-identities.json'), JSON.stringify({ identities: [{ id: 'worker', account: 'test-scope', environment: 'test-environment', authenticated: true, source: 'safe login observation', at: '2026-03-01T00:00:00Z' }] }));
  assert.equal(typeof resourceApi.saveProven, 'function');
  const detected = discoverResources({ ...f, platform: 'linux' });
  resourceApi.saveProven(proof('worker'), detected.resources, { dir: f.state });
  const qualified = discoverResources({ ...f, platform: 'linux', now: Date.parse('2026-03-01T00:00:00Z') });
  assert.equal(qualified.resources[0].proven, true);
  assert.deepEqual(qualified.staleIds, ['worker']);
  for (const scope of [['other', 'test-environment', 'expected'], ['test-scope', 'other', 'expected'], ['test-scope', 'test-environment', 'other']]) {
    fs.writeFileSync(path.join(f.overlay, 'ROUTES.md'), table(...scope));
    assert.equal(discoverResources({ ...f, platform: 'linux' }).resources[0].proven, false);
  }
});

// Catches null/array state crashing discovery and a disappeared resource retaining approval authority.
test('damaged proof or unknown approval IDs fail closed and first save creates its state directory', () => {
  const f = fixture();
  cli(f, 'codex');
  fs.rmSync(f.state, { recursive: true });
  const found = discoverResources({ ...f, cwd: f.home, platform: 'linux' });
  saveApproval(['codex-local'], found.resources, { dir: f.state, workspace: f.home, swarm: 'T1' });
  assert.deepEqual(loadApproval({ dir: f.state }).approved, ['codex-local']);
  fs.writeFileSync(path.join(f.state, 'swarm-proven-routes.json'), 'null');
  assert.throws(() => discoverResources({ ...f, cwd: f.home, platform: 'linux' }), /proof|qualification/i);
  fs.rmSync(path.join(f.state, 'swarm-proven-routes.json'));
  fs.writeFileSync(path.join(f.state, 'swarm-resources-approved.json'), JSON.stringify({
    approved: ['removed-route'], at: '2026-01-01T00:00:00Z', workspace: f.home, swarm: 'T1',
  }));
  assert.throws(() => discoverResources({ ...f, cwd: f.home, platform: 'linux' }), /approval|unknown resource/i);
});

// Catches a CLI proof option being ignored or malformed proof saving successfully.
test('CLI saves qualification once and preserves error exit codes', () => {
  const f = fixture();
  const now = '2026-03-01T12:00:00.000Z';
  const environment = path.resolve(f.home).replace(/\\/g, '/').toLowerCase();
  fs.writeFileSync(path.join(f.state, 'swarm-current-identities.json'), JSON.stringify({
    identities: [{
      id: 'codex-local',
      account: 'test-scope',
      environment,
      authenticated: true,
      source: 'safe login observation',
      at: now,
    }],
  }));
  cli(f, 'codex');
  const file = path.join(f.home, 'proof.json');
  const freshProof = proof();
  freshProof.at = now;
  freshProof.environment = environment;
  fs.writeFileSync(file, JSON.stringify(freshProof));
  const script = fileURLToPath(new URL('../swarm-resources.mjs', import.meta.url));
  const run = (...args) => spawnSync(process.execPath, [script, ...args], { cwd: f.home, encoding: 'utf8',
    env: {
      ...process.env,
      ...f.env,
      HOME: f.home,
      USERPROFILE: f.home,
      NODE_ENV: 'test',
      BGZFLOW_TEST_NOW: now,
      CODEX_HOME: f.home,
    }, timeout: 10000 });
  const saved = run('--save-proven', file, '--json');
  assert.equal(saved.status, 0, saved.stderr);
  assert.equal(JSON.parse(saved.stdout).resources[0].proven, true);
  fs.writeFileSync(file, 'null');
  assert.equal(run('--save-proven', file).status, 2);
  assert.equal(run('--save-proven').status, 2);
});
