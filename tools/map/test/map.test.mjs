import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { after, test } from 'node:test';

const mapCli = fileURLToPath(new URL('../map.mjs', import.meta.url));
const setupCli = fileURLToPath(new URL('../../project-setup/project-setup.mjs', import.meta.url));
const CLEAN_ENV = Object.fromEntries(Object.entries(process.env).filter(([name]) => !['BGZFLOW_PROJECT', 'CLAUDE_PROJECT_DIR', 'GROK_WORKSPACE_ROOT', 'BGZFLOW_ROLE'].includes(name)));
const SENTINEL = 'SENTINEL-secret-7b2d90';
const made = [];

after(() => {
  for (const dir of made) fs.rmSync(dir, { recursive: true, force: true });
});

function git(cwd, ...args) {
  const r = spawnSync('git', ['-c', 'user.name=t', '-c', 'user.email=noreply@example.invalid', '-c', 'commit.gpgsign=false', ...args], { cwd, encoding: 'utf8' });
  assert.equal(r.status, 0, `git ${args.join(' ')}: ${r.stderr}`);
  return r.stdout.trim();
}

const put = (dir, rel, text) => {
  const full = path.join(dir, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, text);
  return full;
};
const pkg = (name, deps = {}) => JSON.stringify({ name, dependencies: deps });
const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const writeJson = (file, value) => fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
const run = (cli, args, cwd, env = {}) => spawnSync(process.execPath, [cli, ...args], { cwd, encoding: 'utf8', env: { ...CLEAN_ENV, ...env } });
const setup = (fx) => {
  const r = run(setupCli, [fx.proj], fx.proj);
  assert.equal(r.status, 0, r.stderr);
  return r;
};
const view = (fx, ...flags) => run(mapCli, [fx.proj, ...flags], fx.proj);
const viewJson = (fx) => {
  const r = view(fx, '--json');
  assert.equal(r.status, 0, r.stderr);
  return JSON.parse(r.stdout);
};
const record = (fx, args, env = {}) => run(mapCli, ['record', 'T1', ...args], fx.proj, env);
const everything = (r) => `${r.stdout}\n${r.stderr}`;

// A project with services api and web (web depends on api), a deploy file under api, a second worktree that the work graph hands to task T1
// (owner X, integration_owner X) with one commit on it, and secret files that must never be read.
function fixture({ graph = {}, branch = 'main' } = {}) {
  const base = fs.realpathSync.native(fs.mkdtempSync(path.join(os.tmpdir(), 'bgz-map-')));
  made.push(base);
  const proj = path.join(base, 'proj');
  put(proj, 'api/package.json', pkg('api'));
  put(proj, 'api/wrangler.toml', 'name = "api-worker"\nmain = "index.js"\n');
  put(proj, 'web/package.json', pkg('web', { api: '*' }));
  put(proj, 'web/page.js', 'page\n');
  git(proj, 'init', '-b', branch);
  git(proj, 'add', '.');
  git(proj, 'commit', '-m', 'first');
  put(proj, '.env', `TOKEN=${SENTINEL}\n`);
  put(proj, 'api/.env', `KEY=${SENTINEL}\n`);
  put(proj, 'api/.dev.vars', `KEY=${SENTINEL}\n`);

  const wt = path.join(base, 'proj-t1');
  git(proj, 'worktree', 'add', '-b', 't1', wt);
  put(wt, 'api/index.js', 'new handler\n');
  git(wt, 'add', '.');
  git(wt, 'commit', '-m', 'change api');
  const sha = git(wt, 'rev-parse', 'HEAD');

  const graphFile = path.join(proj, '.bgzflow', 'work-graph.json');
  fs.mkdirSync(path.dirname(graphFile), { recursive: true });
  const doc = { schema_version: 1, integration_owner: 'X', tasks: [{ id: 'T1', outcome: 'Change the api', owner: 'X', workspace: wt, worker_state: 'running' }], ...graph };
  writeJson(graphFile, doc);
  const handback = put(base, 'handback.md', '# Handback\nDone.\nChanged: api handler | where: api/index.js | effect: api answers with the new body\n');
  return { base, proj, wt, sha, graphFile, handback, projectFile: path.join(proj, '.bgzflow', 'project.json') };
}

const t1 = (fx) => readJson(fx.graphFile).tasks.find((t) => t.id === 'T1');
const bytes = (fx) => [fs.readFileSync(fx.graphFile), fs.existsSync(fx.projectFile) ? fs.readFileSync(fx.projectFile) : Buffer.alloc(0)];
const same = (a, b) => a.length === b.length && a.every((buf, i) => buf.equals(b[i]));

test('bgz setup writes the system even when no build commands exist, and map shows the inventory and who owns each worktree', () => {
  const fx = fixture();
  const s = setup(fx);
  assert.match(s.stdout, /saved \.bgzflow\/project\.json/);
  const system = readJson(fx.projectFile).system;
  assert.equal(system.detected.repos.length, 1);
  assert.deepEqual(system.manual, {});

  const map = viewJson(fx);
  assert.equal(map.repos.length, 1);
  assert.equal(map.worktrees.length, 2);
  const t1Tree = map.worktrees.find((w) => w.branch === 't1');
  assert.deepEqual([t1Tree.tasks, t1Tree.owner, t1Tree.unowned], [['T1'], 'X', false]);
  assert.equal(map.worktrees.find((w) => w.branch === 'main').unowned, false, 'the main checkout is not flagged');
  assert.deepEqual(map.services.map((x) => x.name).sort(), ['api', 'web']);
  assert.deepEqual(map.edges, [{ from: 'web', to: 'api' }]);
  assert.equal(map.deployments.length, 1);
  assert.deepEqual([map.deployments[0].name, map.deployments[0].service, map.deployments[0].live], ['api-worker', 'api', false]);
  assert.equal(map.owner, 'X');
  assert.deepEqual(map.unowned_worktrees, []);
  assert.equal(map.drift.drifted, false);
  assert.deepEqual(map.stages.plan, ['T1'], 'a task with no change record is plan');
  assert.deepEqual(map.changes, []);
});

test('record with a handback and a commit gives committed, with impact on the service, its dependents and its deployment', () => {
  const fx = fixture();
  setup(fx);
  const r = record(fx, ['--handback', fx.handback, '--commit', fx.sha, '--as', 'X']);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /T1/);
  assert.match(r.stdout, /Inbox line: .*T1.*committed/);
  assert.ok(!fs.readdirSync(path.dirname(fx.graphFile)).some((n) => n.endsWith('.tmp')), 'no temp file left behind');

  const change = t1(fx).change;
  assert.equal(change.stage, 'committed');
  assert.equal(change.commit, fx.sha);
  assert.deepEqual(change.items, [{ what: 'api handler', where: ['api/index.js'], effect: 'api answers with the new body' }]);
  assert.equal(change.history.length, 1);
  assert.deepEqual([change.history[0].stage, change.history[0].by, change.history[0].evidence], ['committed', 'X', null]);
  assert.match(change.history[0].at, /^\d{4}-\d\d-\d\dT.*Z$/);

  const map = viewJson(fx);
  assert.equal(map.changes.length, 1);
  const c = map.changes[0];
  assert.deepEqual([c.task, c.stage, c.recorded_stage, c.git_stage], ['T1', 'committed', 'committed', 'committed']);
  assert.deepEqual(c.impact, { services: ['api'], dependents: ['web'], deployments: ['api-worker'] });
  assert.deepEqual(c.flags, []);
  assert.deepEqual(map.stages.committed, ['T1']);
  assert.deepEqual(map.stages.plan, []);

  const text = view(fx);
  assert.equal(text.status, 0, text.stderr);
  assert.match(text.stdout, /committed/);
  assert.match(text.stdout, /api/);
  assert.match(text.stdout, /web/);
  assert.match(text.stdout, /api-worker/);
});

test('after the commit is merged into the integration branch the view shows integrated with no record call, and the view never writes', () => {
  const fx = fixture();
  setup(fx);
  assert.equal(record(fx, ['--handback', fx.handback, '--commit', fx.sha, '--as', 'X']).status, 0);
  assert.equal(viewJson(fx).changes[0].stage, 'committed');

  git(fx.proj, 'merge', '--ff-only', 't1');
  const before = bytes(fx);
  const map = viewJson(fx);
  assert.deepEqual([map.changes[0].stage, map.changes[0].recorded_stage, map.changes[0].git_stage], ['integrated', 'committed', 'integrated']);
  assert.deepEqual(map.changes[0].flags, []);
  assert.equal(map.integration_branch, 'main');
  assert.ok(same(before, bytes(fx)), 'the view left both files byte-identical');
});

test('a task whose integration state says integrated is integrated without any git proof', () => {
  const fx = fixture();
  setup(fx);
  assert.equal(record(fx, ['--handback', fx.handback, '--commit', fx.sha, '--as', 'X']).status, 0);
  const doc = readJson(fx.graphFile);
  doc.tasks[0].integration = { owner: 'X', state: 'integrated' };
  writeJson(fx.graphFile, doc);
  assert.equal(viewJson(fx).changes[0].stage, 'integrated');
});

test('deployed and production-verified without evidence are recorded and shown as claimed, no evidence; with evidence the flag goes', () => {
  const fx = fixture();
  setup(fx);
  assert.equal(record(fx, ['--handback', fx.handback, '--commit', fx.sha, '--as', 'X']).status, 0);

  const bare = record(fx, ['--stage', 'deployed', '--as', 'X']);
  assert.equal(bare.status, 0, bare.stderr);
  assert.equal(t1(fx).change.stage, 'deployed');
  assert.deepEqual(t1(fx).change.items.length, 1, 'earlier items are kept');
  const flagged = viewJson(fx).changes[0];
  assert.equal(flagged.stage, 'deployed');
  assert.ok(flagged.flags.some((f) => /claimed, no evidence/.test(f)), JSON.stringify(flagged.flags));
  assert.match(view(fx).stdout, /claimed, no evidence/);

  const proved = record(fx, ['--stage', 'deployed', '--evidence', 'wrangler deploy printed the new version id', '--as', 'X']);
  assert.equal(proved.status, 0, proved.stderr);
  assert.equal(t1(fx).change.history.length, 3);
  assert.equal(t1(fx).change.history[2].evidence, 'wrangler deploy printed the new version id');
  assert.deepEqual(viewJson(fx).changes[0].flags, []);
  assert.doesNotMatch(view(fx).stdout, /claimed, no evidence/);

  const verified = record(fx, ['--stage', 'production-verified', '--as', 'X']);
  assert.equal(verified.status, 0, verified.stderr);
  const last = viewJson(fx).changes[0];
  assert.equal(last.stage, 'production-verified');
  assert.ok(last.flags.some((f) => /claimed, no evidence/.test(f)));
});

test('a record that claims more than git proves is flagged, never refused', () => {
  const fx = fixture();
  setup(fx);
  const missing = 'f'.repeat(40);
  const r = record(fx, ['--handback', fx.handback, '--commit', missing, '--as', 'X']);
  assert.equal(r.status, 0, r.stderr);
  let c = viewJson(fx).changes[0];
  assert.equal(c.stage, 'committed', 'the record is shown as claimed');
  assert.equal(c.git_stage, 'plan');
  assert.ok(c.flags.some((f) => /commit/.test(f) && /not found/.test(f)), JSON.stringify(c.flags));

  assert.equal(record(fx, ['--commit', fx.sha, '--stage', 'integrated', '--as', 'X']).status, 0);
  c = viewJson(fx).changes[0];
  assert.equal(c.stage, 'integrated');
  assert.equal(c.git_stage, 'committed');
  assert.ok(c.flags.some((f) => /integrated/.test(f) && /not in main/.test(f)), JSON.stringify(c.flags));
});

test('the owner check is the one refusal: a wrong role exits non-zero, says what to put in the handback, and changes no file', () => {
  const fx = fixture();
  setup(fx);
  const before = bytes(fx);
  const wrong = record(fx, ['--handback', fx.handback, '--commit', fx.sha, '--as', 'worker-9']);
  assert.notEqual(wrong.status, 0);
  assert.match(wrong.stderr, /put this in your handback/i);
  assert.match(wrong.stderr, /Changed: api handler \| where: api\/index\.js \| effect: api answers with the new body/);
  assert.ok(same(before, bytes(fx)), 'both files byte-identical');

  const noRole = record(fx, ['--stage', 'deployed']);
  assert.notEqual(noRole.status, 0);
  assert.match(noRole.stderr, /put this in your handback/i);
  assert.ok(same(before, bytes(fx)));

  const byEnv = record(fx, ['--stage', 'deployed'], { BGZFLOW_ROLE: 'someone-else' });
  assert.notEqual(byEnv.status, 0);
  assert.ok(same(before, bytes(fx)));

  const live = run(mapCli, ['live', 'api-worker', '--evidence', 'curl 200', '--as', 'worker-9'], fx.proj);
  assert.notEqual(live.status, 0);
  assert.match(live.stderr, /put this in your handback/i);
  assert.ok(same(before, bytes(fx)));

  const good = record(fx, ['--stage', 'deployed', '--evidence', 'e'], { BGZFLOW_ROLE: 'X' });
  assert.equal(good.status, 0, good.stderr);
  assert.equal(t1(fx).change.history[0].by, 'X');
});

test('the owner is the graph integration_owner, else system.owner in project.json, else lead', () => {
  const fx = fixture({ graph: { integration_owner: undefined } });
  setup(fx);
  assert.equal(viewJson(fx).owner, 'lead');
  assert.notEqual(record(fx, ['--stage', 'committed', '--as', 'X']).status, 0);
  assert.equal(record(fx, ['--stage', 'committed', '--as', 'lead']).status, 0);

  const project = readJson(fx.projectFile);
  project.system.owner = 'ops';
  writeJson(fx.projectFile, project);
  assert.equal(viewJson(fx).owner, 'ops');
  assert.notEqual(record(fx, ['--stage', 'committed', '--as', 'lead']).status, 0);
  assert.equal(record(fx, ['--stage', 'committed', '--as', 'ops']).status, 0);

  setup(fx);
  assert.equal(readJson(fx.projectFile).system.owner, 'ops', 'a rerun of setup keeps the owner');
});

test('a new service folder added after setup is drift, exit 0, until setup runs again', () => {
  const fx = fixture();
  setup(fx);
  put(fx.proj, 'worker/package.json', pkg('worker'));
  const r = view(fx);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /drift/i);
  assert.match(r.stdout, /worker/);
  assert.match(r.stdout, /rerun bgz setup/);
  const map = viewJson(fx);
  assert.equal(map.drift.drifted, true);
  assert.ok(map.drift.added.some((x) => /worker/.test(x)), JSON.stringify(map.drift));
  assert.equal(map.services.some((x) => x.name === 'worker'), false, 'the stored inventory is what is shown');

  setup(fx);
  const after = viewJson(fx);
  assert.equal(after.drift.drifted, false);
  assert.equal(after.services.some((x) => x.name === 'worker'), true);
});

test('a worktree that no task owns is flagged', () => {
  const fx = fixture();
  const stray = path.join(fx.base, 'proj-stray');
  git(fx.proj, 'worktree', 'add', '-b', 'stray', stray);
  setup(fx);
  const map = viewJson(fx);
  assert.equal(map.worktrees.length, 3);
  assert.deepEqual(map.unowned_worktrees.map((w) => w.branch), ['stray']);
  assert.match(view(fx).stdout, /no task owns/);
});

test('secret file contents never reach any output or project.json', () => {
  const fx = fixture();
  const outputs = [setup(fx)];
  outputs.push(view(fx), view(fx, '--json'), view(fx, '--brief'));
  outputs.push(record(fx, ['--handback', fx.handback, '--commit', fx.sha, '--as', 'X']));
  outputs.push(run(mapCli, ['live', 'api-worker', '--evidence', 'curl 200', '--as', 'X'], fx.proj));
  outputs.push(view(fx));
  for (const r of outputs) assert.ok(!everything(r).includes(SENTINEL));
  assert.ok(!fs.readFileSync(fx.projectFile, 'utf8').includes(SENTINEL));
  assert.ok(!fs.readFileSync(fx.graphFile, 'utf8').includes(SENTINEL));

  const secretHandback = put(fx.base, '.env', `Changed: leak | where: api | effect: ${SENTINEL}\n`);
  const before = bytes(fx);
  const refused = record(fx, ['--handback', secretHandback, '--as', 'X']);
  assert.notEqual(refused.status, 0);
  assert.ok(!everything(refused).includes(SENTINEL));
  assert.ok(same(before, bytes(fx)));
});

test('--brief is three to five plain lines', () => {
  const fx = fixture();
  setup(fx);
  let lines = view(fx, '--brief').stdout.trim().split('\n');
  assert.ok(lines.length >= 3 && lines.length <= 5, lines.join(' / '));
  assert.match(lines[0], /2 services/);

  assert.equal(record(fx, ['--handback', fx.handback, '--commit', fx.sha, '--as', 'X']).status, 0);
  assert.equal(record(fx, ['--stage', 'deployed', '--as', 'X']).status, 0);
  put(fx.proj, 'worker/package.json', pkg('worker'));
  lines = view(fx, '--brief').stdout.trim().split('\n');
  assert.ok(lines.length >= 3 && lines.length <= 5, lines.join(' / '));
  const all = lines.join('\n');
  assert.match(all, /deployed/);
  assert.match(all, /claimed, no evidence/);
  assert.match(all, /rerun bgz setup/);
});

test('live: the owner confirms a deployment into system.manual, and setup keeps it', () => {
  const fx = fixture();
  setup(fx);
  const noEvidence = run(mapCli, ['live', 'api-worker', '--as', 'X'], fx.proj);
  assert.equal(noEvidence.status, 2);

  const r = run(mapCli, ['live', 'api-worker', '--evidence', 'curl https://api.example.com returned 200', '--as', 'X'], fx.proj);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /Inbox line: .*api-worker.*live/);
  const manual = readJson(fx.projectFile).system.manual;
  assert.equal(manual.deployments.length, 1);
  const entry = manual.deployments[0];
  assert.deepEqual([entry.name, entry.active, entry.evidence, entry.confirmed_by], ['api-worker', true, 'curl https://api.example.com returned 200', 'X']);
  assert.match(entry.confirmed_at, /^\d{4}-\d\d-\d\dT.*Z$/);

  const d = viewJson(fx).deployments[0];
  assert.deepEqual([d.name, d.service, d.live, d.evidence, d.confirmed_by], ['api-worker', 'api', true, entry.evidence, 'X']);
  assert.match(view(fx).stdout, /api-worker[^\n]*live/);

  setup(fx);
  assert.deepEqual(readJson(fx.projectFile).system.manual.deployments, [entry], 'a rerun of setup keeps the manual entries');

  const unknown = run(mapCli, ['live', 'edge-thing', '--evidence', 'seen in the dashboard', '--as', 'X'], fx.proj);
  assert.equal(unknown.status, 0, unknown.stderr);
  assert.match(everything(unknown), /not in the detected inventory/);
  assert.equal(readJson(fx.projectFile).system.manual.deployments.length, 2);
});

test('with no project.json the map still works from a live scan and says to run bgz setup', () => {
  const fx = fixture();
  const r = view(fx, '--json');
  assert.equal(r.status, 0, r.stderr);
  const map = JSON.parse(r.stdout);
  assert.equal(map.stored, false);
  assert.equal(map.services.length, 2);
  assert.match(view(fx).stdout, /bgz setup/);
  assert.equal(fs.existsSync(fx.projectFile), false, 'the view wrote nothing');
});

test('record can take the change from flags, replaces items only when new ones are given, and rejects bad usage with exit 2', () => {
  const fx = fixture();
  setup(fx);
  const r = record(fx, ['--what', 'web page', '--where', 'web/page.js, web/util.js', '--effect', 'web shows it', '--as', 'X']);
  assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(t1(fx).change.items, [{ what: 'web page', where: ['web/page.js', 'web/util.js'], effect: 'web shows it' }]);
  assert.equal(t1(fx).change.stage, 'plan');
  const map = viewJson(fx);
  assert.deepEqual(map.changes[0].impact, { services: ['web'], dependents: [], deployments: [] });

  assert.equal(record(fx, ['--stage', 'bogus', '--as', 'X']).status, 2);
  assert.equal(run(mapCli, ['record', 'NOPE', '--stage', 'committed', '--as', 'X'], fx.proj).status, 2);
  assert.equal(run(mapCli, ['record', '--as', 'X'], fx.proj).status, 2);
  assert.equal(run(mapCli, ['--bogus'], fx.proj).status, 2);
  assert.equal(run(mapCli, ['--help'], fx.proj).status, 0);
});

test('a repo with no main or master has no guessed integration branch, so a merge proves nothing until the owner names one', () => {
  const fx = fixture({ branch: 'develop' });
  setup(fx);
  assert.equal(record(fx, ['--handback', fx.handback, '--commit', fx.sha, '--as', 'X']).status, 0);
  git(fx.proj, 'merge', '--ff-only', 't1');
  let map = viewJson(fx);
  assert.equal(map.integration_branch, null);
  assert.equal(map.changes[0].stage, 'committed', 'the checked-out branch is not taken as the integration branch');
  assert.match(view(fx).stdout, /set system\.integration_branch/);

  const project = readJson(fx.projectFile);
  project.system.integration_branch = 'develop';
  writeJson(fx.projectFile, project);
  map = viewJson(fx);
  assert.deepEqual([map.integration_branch, map.changes[0].stage], ['develop', 'integrated']);
});

test('each worktree gets the right label: main checkout, task, integration workspace, no task, no work graph', () => {
  const integration = 'proj-int';
  const fx = fixture({ graph: { integration_workspace: `../${integration}` } });
  git(fx.proj, 'worktree', 'add', '-b', 'int', path.join(fx.base, integration));
  git(fx.proj, 'worktree', 'add', '-b', 'stray', path.join(fx.base, 'proj-stray'));
  setup(fx);
  const labels = (map) => Object.fromEntries(map.worktrees.map((w) => [w.branch, w.tasks.length ? w.tasks.join(',') : w.label]));
  let map = viewJson(fx);
  assert.deepEqual(labels(map), { main: 'main checkout', t1: 'T1', int: 'integration workspace', stray: 'no task owns it' });
  assert.deepEqual(map.unowned_worktrees.map((w) => w.branch), ['stray']);

  fs.rmSync(fx.graphFile);
  map = viewJson(fx);
  assert.deepEqual(labels(map), { main: 'main checkout', t1: 'no work graph', int: 'no work graph', stray: 'no work graph' });
  assert.deepEqual(map.unowned_worktrees, []);
});

test('a .dev.vars handback is refused like any other secret file and changes nothing', () => {
  const fx = fixture();
  setup(fx);
  const secret = put(fx.base, '.dev.vars', `Changed: leak | where: api | effect: ${SENTINEL}\n`);
  const before = bytes(fx);
  const refused = record(fx, ['--handback', secret, '--as', 'X']);
  assert.equal(refused.status, 2);
  assert.match(refused.stderr, /secret file/);
  assert.ok(!everything(refused).includes(SENTINEL));
  assert.ok(same(before, bytes(fx)));
});

test('a change line with no effect is kept and shown as effect not stated', () => {
  const fx = fixture();
  setup(fx);
  const handback = put(fx.base, 'no-effect.md', 'Changed: api handler | where: api/index.js\n');
  assert.equal(record(fx, ['--handback', handback, '--as', 'X']).status, 0);
  assert.equal(t1(fx).change.items.length, 1);
  assert.match(view(fx).stdout, /api handler \(api\/index\.js\): effect not stated/);
});
