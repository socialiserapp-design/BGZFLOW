import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, test } from 'node:test';
import { canonical, discover, isSystemFound, skipList, stripCredentials } from '../discover.mjs';

// Built at run time so the source holds no address-shaped text (leak check).
const AT = '@';

const made = [];
const SENTINEL = 'SENTINEL-secret-4f9c1e';

// A temp folder holding the given files ({ 'path': 'text' }).
function tree(files = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bgz-discover-'));
  made.push(dir);
  for (const [name, text] of Object.entries(files)) {
    const full = path.join(dir, name);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, text);
  }
  return dir;
}

function git(cwd, ...args) {
  const r = spawnSync('git', ['-c', 'user.name=t', '-c', 'user.email=noreply@example.invalid', '-c', 'commit.gpgsign=false', ...args], { cwd, encoding: 'utf8' });
  assert.equal(r.status, 0, `git ${args.join(' ')}: ${r.stderr}`);
  return r.stdout.trim();
}

const pkg = (name, deps = {}, extra = {}) => JSON.stringify({ name, dependencies: deps, ...extra });
const byName = (list) => Object.fromEntries(list.map((x) => [x.name, x]));

after(() => {
  for (const dir of made) fs.rmSync(dir, { recursive: true, force: true });
});

test('an empty folder finds nothing and is not a system', () => {
  const found = discover(tree({ 'README.md': 'hello\n' }));
  assert.deepEqual([found.repos, found.worktrees, found.services, found.deployments], [[], [], [], []]);
  assert.match(found.scanned_at, /^\d{4}-\d\d-\d\dT.*Z$/);
  assert.equal(isSystemFound(found), false);
});

test('services come from marker files, with a kind, and skipped or hidden folders are not scanned', () => {
  const dir = tree({
    'api/package.json': pkg('api'),
    'web/package.json': pkg('web', { api: '*' }),
    'py/pyproject.toml': '[project]\nname = "py"\ndependencies = ["api>=1"]\n',
    'gosvc/go.mod': 'module example.com/gosvc\n',
    'core/Cargo.toml': '[package]\nname = "core"\n',
    'img/Dockerfile': 'FROM node\n',
    'mobile/app.json': '{}',
    'mobile/eas.json': '{}',
    'supabase/functions/hello/index.ts': '',
    'supabase/functions/_shared/util.ts': '',
    'node_modules/dep/package.json': pkg('dep'),
    'dist/package.json': pkg('dist'),
    'build/package.json': pkg('build'),
    'vendor/package.json': pkg('vendor'),
    '.next/package.json': pkg('next'),
    'coverage/package.json': pkg('coverage'),
    'target/Cargo.toml': '[package]\nname = "t"\n',
    '.bgzflow/package.json': pkg('bgzflow'),
    '.hidden/package.json': pkg('hidden'),
  });
  const services = byName(discover(dir).services);
  assert.deepEqual(Object.keys(services).sort(), ['api', 'core', 'gosvc', 'hello', 'img', 'mobile', 'py', 'web']);
  assert.deepEqual(services.api, { name: 'api', path: 'api', kind: 'node', deps: [] });
  assert.equal(services.py.kind, 'python');
  assert.equal(services.gosvc.kind, 'go');
  assert.equal(services.core.kind, 'rust');
  assert.equal(services.img.kind, 'docker');
  assert.equal(services.mobile.kind, 'expo');
  assert.deepEqual(services.hello, { name: 'hello', path: 'supabase/functions/hello', kind: 'supabase-function', deps: [] });
});

test('an internal edge appears only when a dependency names another service', () => {
  const dir = tree({
    'api/package.json': pkg('@acme/api', { react: '1', lodash: '4' }),
    'web/package.json': pkg('web', { '@acme/api': '*', react: '1' }),
    'admin/package.json': pkg('admin', {}, { devDependencies: { web: 'workspace:*' } }),
    'tool/package.json': pkg('tool', { shared: 'file:../api' }),
    'py/pyproject.toml': '[project]\nname = "py"\ndependencies = ["web>=1", "requests"]\n',
  });
  const services = byName(discover(dir).services);
  assert.deepEqual(services.web.deps, ['@acme/api']);
  assert.deepEqual(services.admin.deps, ['web']);
  assert.deepEqual(services.tool.deps, ['@acme/api'], 'a file: dependency that points at another service folder');
  assert.deepEqual(services.py.deps, ['web']);
  assert.deepEqual(services['@acme/api'].deps, []);
});

test('a workspace root package.json is a container, not a service', () => {
  const dir = tree({ 'package.json': pkg('root', {}, { workspaces: ['api'] }), 'api/package.json': pkg('api') });
  assert.deepEqual(discover(dir).services.map((s) => s.name), ['api']);
});

test('the scan is bounded in depth', () => {
  const dir = tree({ 'l1/l2/l3/l4/package.json': pkg('deep4'), 'l1/l2/l3/l4/l5/package.json': pkg('deep5') });
  assert.deepEqual(discover(dir).services.map((s) => s.name), ['deep4']);
});

test('declared deployments come from deploy config files and name their service', () => {
  const dir = tree({
    'api/package.json': pkg('api'),
    'api/wrangler.toml': 'name = "api-worker"\nmain = "src/index.js"\n\n[vars]\nname = "not-this"\n',
    'web/package.json': pkg('web'),
    'web/vercel.json': '{}',
    'fly/Dockerfile': 'FROM node\n',
    'fly/fly.toml': 'app = "fly-app"\n',
    'site/package.json': pkg('site'),
    'site/netlify.toml': '[build]\n',
    'site/wrangler.jsonc': '{ // worker\n "name": "site-edge" }\n',
    'mobile/app.json': '{}',
    'mobile/eas.json': '{}',
    'pro/package.json': pkg('pro'),
    'pro/Procfile': 'web: node .\n',
    'pro/render.yaml': 'services: []\n',
    'pro/railway.json': '{}',
    'supabase/config.toml': 'project_id = "x"\n',
    'supabase/functions/hello/index.ts': '',
    '.github/workflows/ship.yml': 'name: Ship\non: push\njobs:\n  go:\n    steps:\n      - run: npm run deploy\n        working-directory: api\n',
    '.github/workflows/lint.yml': 'name: Lint\non: push\njobs:\n  lint:\n    steps:\n      - run: npm run lint\n',
  });
  const found = discover(dir);
  const deployments = Object.fromEntries(found.deployments.map((d) => [d.file, d]));
  assert.equal(found.deployments.length, 11);
  assert.deepEqual(deployments['api/wrangler.toml'], { name: 'api-worker', service: 'api', kind: 'cloudflare', file: 'api/wrangler.toml' });
  assert.deepEqual([deployments['web/vercel.json'].kind, deployments['web/vercel.json'].service], ['vercel', 'web']);
  assert.deepEqual([deployments['fly/fly.toml'].name, deployments['fly/fly.toml'].kind, deployments['fly/fly.toml'].service], ['fly-app', 'fly', 'fly']);
  assert.deepEqual([deployments['site/netlify.toml'].kind, deployments['site/wrangler.jsonc'].name], ['netlify', 'site-edge']);
  assert.deepEqual([deployments['mobile/eas.json'].kind, deployments['mobile/eas.json'].service], ['eas', 'mobile']);
  assert.deepEqual(['pro/Procfile', 'pro/render.yaml', 'pro/railway.json'].map((f) => deployments[f].kind), ['procfile', 'render', 'railway']);
  assert.deepEqual([deployments['supabase/config.toml'].kind, deployments['supabase/config.toml'].service], ['supabase', null]);
  assert.deepEqual([deployments['.github/workflows/ship.yml'].kind, deployments['.github/workflows/ship.yml'].service], ['github-actions', 'api']);
  assert.equal(deployments['.github/workflows/lint.yml'], undefined, 'a workflow that never mentions deploy is not a deployment');
  const names = found.deployments.map((d) => d.name);
  assert.equal(new Set(names).size, names.length, 'deployment names are unique');
});

test('.env and other secret files are never read, so their contents never reach the result', () => {
  const dir = tree({
    '.env': `TOKEN=${SENTINEL}\n`,
    'api/package.json': pkg('api'),
    'api/.env': `KEY=${SENTINEL}\n`,
    'api/.env.production': `KEY=${SENTINEL}\n`,
    'api/.dev.vars': `KEY=${SENTINEL}\n`,
    'api/deploy.pem': SENTINEL,
    'api/wrangler.toml': 'name = "api-worker"\n',
  });
  const text = JSON.stringify(discover(dir));
  assert.ok(!text.includes(SENTINEL));
  assert.match(text, /api-worker/);
});

test('git: a repo, its worktrees and a clean origin URL with no credentials', () => {
  const dir = tree({ 'api/package.json': pkg('api'), 'api/index.js': 'x\n' });
  git(dir, 'init', '-b', 'main');
  git(dir, 'add', '.');
  git(dir, 'commit', '-m', 'first');
  git(dir, 'remote', 'add', 'origin', `https://someuser:p4ssw0rd-sentinel${AT}example.com/org/repo.git`);
  const wt = path.join(path.dirname(dir), `${path.basename(dir)}-wt`);
  made.push(wt);
  git(dir, 'worktree', 'add', '-b', 'feature', wt);

  const found = discover(dir);
  assert.equal(found.repos.length, 1);
  const [repo] = found.repos;
  assert.equal(repo.branch, 'main');
  assert.match(repo.head, /^[0-9a-f]{7,12}$/);
  assert.equal(repo.origin, 'https://example.com/org/repo.git');
  assert.equal(repo.default_branch, 'main');
  assert.equal(found.worktrees.length, 2);
  assert.ok(found.worktrees.every((w) => /^[0-9a-f]{40}$/.test(w.head)));
  assert.deepEqual(found.worktrees.map((w) => w.branch).sort(), ['feature', 'main']);
  assert.ok(!JSON.stringify(found).includes('p4ssw0rd'));
  assert.ok(!JSON.stringify(found).includes('someuser'));
});

test('stripCredentials removes user:pass@ and a lone token, and leaves ssh and plain URLs alone', () => {
  assert.equal(stripCredentials(`https://u:p${AT}github.com/o/r.git`), 'https://github.com/o/r.git');
  assert.equal(stripCredentials(`https://ghp_token${AT}github.com/o/r.git`), 'https://github.com/o/r.git');
  assert.equal(stripCredentials(`git${AT}github.com:o/r.git`), `git${AT}github.com:o/r.git`);
  assert.equal(stripCredentials('https://github.com/o/r.git'), 'https://github.com/o/r.git');
  assert.equal(stripCredentials(`https://u:p${AT}ss${AT}github.com/o/r.git`), 'https://github.com/o/r.git', 'a raw @ in the password leaves nothing behind');
  assert.equal(stripCredentials(''), null);
});

test('nested repos are found up to depth 2 and not deeper', () => {
  const dir = tree({ 'libs/inner/package.json': pkg('inner'), 'a/b/c/deep/package.json': pkg('deep') });
  for (const rel of ['libs/inner', 'a/b/c/deep']) {
    git(path.join(dir, rel), 'init', '-b', 'main');
  }
  const found = discover(dir);
  assert.deepEqual(found.repos.map((r) => path.basename(r.path)), ['inner']);
  assert.equal(found.repos[0].head, null, 'a repo with no commit has no head');
});

// Turns a folder that already holds files into a repo with one commit.
function commitAll(dir, branch = 'main') {
  git(dir, 'init', '-b', branch);
  git(dir, 'add', '.');
  git(dir, 'commit', '-m', 'first');
  return dir;
}

// A temp repo with one commit holding the given files.
const repo = (files, branch = 'main') => commitAll(tree(files), branch);

// A commit made at a fixed time, so "newest" is not left to the clock.
function commitAt(cwd, date, file) {
  fs.writeFileSync(path.join(cwd, file), `${date}\n`);
  const env = { ...process.env, GIT_AUTHOR_DATE: date, GIT_COMMITTER_DATE: date };
  for (const args of [['add', '.'], ['commit', '-m', `at ${date}`]]) {
    const r = spawnSync('git', ['-c', 'user.name=t', '-c', 'user.email=noreply@example.invalid', '-c', 'commit.gpgsign=false', ...args], { cwd, encoding: 'utf8', env });
    assert.equal(r.status, 0, `git ${args.join(' ')}: ${r.stderr}`);
  }
}

// A project folder with three linked worktrees of one repo that lives outside it, plus two unrelated clones under oss/.
function worktreeProject() {
  const engine = repo({ 'package.json': pkg('engine'), 'wrangler.toml': 'name = "engine-worker"\n' });
  const root = tree();
  for (const n of [1, 2, 3]) git(engine, 'worktree', 'add', '-b', `b${n}`, path.join(root, `wt${n}`));
  for (const n of ['a', 'b']) {
    const clone = path.join(root, 'oss', n);
    fs.mkdirSync(clone, { recursive: true });
    fs.writeFileSync(path.join(clone, 'package.json'), pkg(`${n}-svc`));
    fs.writeFileSync(path.join(clone, 'wrangler.toml'), `name = "${n}-worker"\n`);
    commitAll(clone);
  }
  return { engine, root };
}

const pathsOf = (list) => list.map((x) => x.path);
const enginePath = (found) => found.services.find((s) => s.name === 'engine')?.path;

test('linked worktrees of one repo count once and only one checkout is read', () => {
  const { engine, root } = worktreeProject();
  const found = discover(root);

  assert.equal(found.repos.filter((r) => r.path === canonical(engine)).length, 1, 'the repo is listed once, at its main checkout');
  assert.equal(found.repos.length, 3, 'the repo and the two clones under oss');
  for (const n of [1, 2, 3]) assert.ok(pathsOf(found.worktrees).includes(canonical(path.join(root, `wt${n}`))), `wt${n} still appears under worktrees`);
  assert.equal(found.worktrees.filter((w) => w.main).length, 3);

  assert.equal(found.services.filter((s) => s.name === 'engine').length, 1, 'the service is read from one checkout');
  assert.equal(found.deployments.filter((d) => d.name === 'engine-worker').length, 1);
  assert.deepEqual(found.services.map((s) => s.name).sort(), ['a-svc', 'b-svc', 'engine']);
  assert.equal(found.deployments.length, 3);

  const skipped = discover(root, { skip: ['oss'] });
  assert.equal(skipped.repos.length, 1);
  assert.equal(skipped.repos[0].path, canonical(engine));
  assert.equal(skipped.worktrees.length, 4, 'the main checkout and its three linked worktrees');
  assert.deepEqual(skipped.services.map((s) => s.name), ['engine']);
  assert.deepEqual(skipped.deployments.map((d) => d.name), ['engine-worker']);
  assert.ok(![...skipped.services, ...skipped.deployments].some((x) => (x.path ?? x.file).startsWith('oss/')), 'nothing under oss is listed');
});

test('the checkout that is read is the integration branch, then the default branch, then the newest commit', () => {
  const { root } = worktreeProject();
  assert.equal(enginePath(discover(root)), 'wt1', 'equal commits fall back to path order');
  assert.equal(enginePath(discover(root, { integrationBranch: 'b3' })), 'wt3');
  assert.equal(enginePath(discover(root, { integrationBranch: ' b2 ' })), 'wt2');
  assert.equal(enginePath(discover(root, { integrationBranch: 'no-such-branch' })), 'wt1');
  assert.equal(enginePath(discover(root, { skip: ['wt1', 'wt2'] })), 'wt3', 'a skipped checkout is never the one read');

  commitAt(path.join(root, 'wt2'), '2031-01-01T00:00:00Z', 'newer.txt');
  assert.equal(enginePath(discover(root)), 'wt2', 'the newest commit wins when no branch is named');
  assert.equal(enginePath(discover(root, { integrationBranch: 'b3' })), 'wt3', 'the integration branch still wins over a newer commit');

  const { engine, root: other } = worktreeProject();
  git(engine, 'checkout', '-b', 'work');
  git(engine, 'worktree', 'add', path.join(other, 'trunk'), 'main');
  commitAt(path.join(other, 'wt3'), '2032-01-01T00:00:00Z', 'newer.txt');
  assert.equal(enginePath(discover(other)), 'trunk', 'the default branch wins over a newer commit');
  assert.equal(enginePath(discover(other, { integrationBranch: 'b3' })), 'wt3');
});

test('a repo whose main checkout is bare is recorded at the checkout that is read', () => {
  const bare = tree();
  git(bare, 'init', '--bare', '-b', 'main');
  const seed = repo({ 'package.json': pkg('engine') });
  git(seed, 'push', bare, 'main');
  const root = tree();
  git(bare, 'worktree', 'add', path.join(root, 'wt1'), 'main');
  git(bare, 'worktree', 'add', '-b', 'b2', path.join(root, 'wt2'));

  const found = discover(root);
  assert.deepEqual(pathsOf(found.repos), [canonical(path.join(root, 'wt1'))]);
  assert.equal(found.worktrees.length, 2, 'the bare folder is not a worktree');
  assert.deepEqual(found.services.map((s) => [s.name, s.path]), [['engine', 'wt1']]);
});

test('a project that is itself a checkout keeps its own path, and a worktree nested inside it adds nothing', () => {
  const root = repo({ 'api/package.json': pkg('api'), 'api/index.js': 'x\n' });
  git(root, 'worktree', 'add', '-b', 'feature', path.join(root, 'nested'));
  const found = discover(root);
  assert.deepEqual(pathsOf(found.repos), [canonical(root)]);
  assert.equal(found.worktrees.length, 2);
  assert.ok(pathsOf(found.worktrees).includes(canonical(path.join(root, 'nested'))));
  assert.deepEqual(found.services.map((s) => s.path), ['api'], 'the nested worktree is not read as code');
  assert.deepEqual(discover(root, { integrationBranch: 'feature' }).services.map((s) => s.path), ['api'], 'the project root always wins');
});

test('a plain clone with a worktree of its own inside the project is listed once', () => {
  const root = tree();
  const clone = path.join(root, 'libs', 'tool');
  fs.mkdirSync(clone, { recursive: true });
  fs.writeFileSync(path.join(clone, 'package.json'), pkg('tool'));
  commitAll(clone);
  git(clone, 'worktree', 'add', '-b', 'side', path.join(root, 'side'));
  const found = discover(root);
  assert.deepEqual(pathsOf(found.repos), [canonical(clone)]);
  assert.equal(found.worktrees.length, 2);
  assert.deepEqual(found.services.map((s) => s.name), ['tool']);
});

// The services and deployments a project gives, ready to compare between two projects.
const readOf = (found) => ({ services: found.services, deployments: found.deployments.map((d) => [d.name, d.file ?? d.path]) });
const engineFiles = () => ({ 'package.json': pkg('engine'), 'wrangler.toml': 'name = "engine-worker"\n' });

// A project holding one reachable copy of the repo at eng/, the baseline the other cases must match.
function singleCopy() {
  const root = tree();
  git(repo(engineFiles()), 'worktree', 'add', '-b', 'only', path.join(root, 'eng'));
  return readOf(discover(root));
}

test('a checkout nested inside another checkout of the same repo is never the one read', () => {
  const root = tree();
  const app = path.join(root, 'app');
  fs.mkdirSync(app);
  for (const [name, text] of Object.entries(engineFiles())) fs.writeFileSync(path.join(app, name), text);
  commitAll(app);
  git(app, 'worktree', 'add', '-b', 'dev', path.join(app, 'wt'));

  const plain = readOf(discover(root));
  assert.deepEqual(plain.services.map((s) => s.path), ['app']);
  assert.deepEqual(plain.deployments.map((d) => d[0]), ['engine-worker']);
  assert.deepEqual(readOf(discover(root, { integrationBranch: 'dev' })), plain, 'naming the nested copy changes nothing');
  assert.equal(discover(root, { integrationBranch: 'dev' }).worktrees.length, 2, 'the nested copy is still a worktree');
});

test('a checkout the walk cannot enter (hidden folder, too deep) is never the one read', () => {
  const baseline = singleCopy();
  for (const hidden of [['.wt', 'x'], ['a', 'b', 'c', 'd', 'e']]) {
    const engine = repo(engineFiles());
    const root = tree();
    git(engine, 'worktree', 'add', '-b', 'side', path.join(root, 'eng'));
    git(engine, 'worktree', 'add', '-b', 'dev', path.join(root, ...hidden));
    const label = hidden.join('/');
    assert.deepEqual(readOf(discover(root)), baseline, `${label}: no options`);
    assert.deepEqual(readOf(discover(root, { integrationBranch: 'dev' })), baseline, `${label}: the unreachable copy is named as the integration branch`);
    commitAt(path.join(root, ...hidden), '2031-01-01T00:00:00Z', 'newer.txt');
    assert.deepEqual(readOf(discover(root)), baseline, `${label}: the unreachable copy has the newest commit`);
    assert.equal(discover(root).worktrees.length, 3, `${label}: still listed as a worktree`);
  }
});

test('a checkout under a built-in skip name is never the one read, even when it sorts first or is newest', () => {
  const baseline = singleCopy();
  const engine = repo(engineFiles());
  const root = tree();
  for (const n of ['eng', 'build']) git(engine, 'worktree', 'add', '-b', `b-${n}`, path.join(root, n));
  assert.deepEqual(readOf(discover(root)), baseline, 'equal commits: path order would pick build');
  assert.deepEqual(readOf(discover(root, { integrationBranch: 'b-build' })), baseline, 'named as the integration branch');
  commitAt(path.join(root, 'build'), '2031-01-01T00:00:00Z', 'newer.txt');
  assert.deepEqual(readOf(discover(root)), baseline, 'newest commit');
  assert.equal(discover(root).repos.length, 1);
});

test('skip drops every checkout of a repo when all of them are skipped', () => {
  const { root } = worktreeProject();
  const found = discover(root, { skip: ['wt1', 'wt2', 'wt3', 'oss'] });
  assert.deepEqual([found.repos, found.worktrees, found.services, found.deployments], [[], [], [], []]);
});

test('skipList keeps clean relative folders and drops anything else', () => {
  assert.deepEqual(skipList(['oss', 'a\\b', './c/', 'd//e', 'oss', ' f ']), ['oss', 'a/b', 'c', 'd/e', 'f']);
  assert.deepEqual(skipList(['', '.', './', '/abs', 'C:/abs', 'C:\\abs', '..', '../x', 'a/../b', 'a/..', 42, null, { x: 1 }]), []);
  assert.deepEqual(skipList('oss'), []);
  assert.deepEqual(skipList(undefined), []);
});

test('skip matches a folder or what is under it, with either slash, and ignores unsafe entries', () => {
  const root = tree({
    'oss/a/package.json': pkg('a-svc'),
    'oss/b/package.json': pkg('b-svc'),
    'ossify/package.json': pkg('ossify'),
    'tools/oss/package.json': pkg('deep-oss'),
    'api/package.json': pkg('api'),
    'supabase/functions/keep/index.ts': '',
    'supabase/functions/drop/index.ts': '',
  });
  const names = (opts) => discover(root, opts).services.map((s) => s.name).sort();
  const all = ['a-svc', 'api', 'b-svc', 'deep-oss', 'drop', 'keep', 'ossify'];
  assert.deepEqual(names({}), all);
  assert.deepEqual(names({ skip: ['oss'] }), ['api', 'deep-oss', 'drop', 'keep', 'ossify'], 'a name that only starts the same is not skipped');
  assert.deepEqual(names({ skip: ['oss/a'] }), all.filter((n) => n !== 'a-svc'));
  assert.deepEqual(names({ skip: ['oss\\a\\'] }), all.filter((n) => n !== 'a-svc'), 'back slashes and a trailing slash work');
  assert.deepEqual(names({ skip: ['./oss/b'] }), all.filter((n) => n !== 'b-svc'));
  assert.deepEqual(names({ skip: ['tools/oss', 'supabase/functions/drop'] }), all.filter((n) => n !== 'deep-oss' && n !== 'drop'));
  assert.deepEqual(names({ skip: [path.join(root, 'oss'), '../oss', 'oss/../api', '', 7] }), all, 'absolute, parent and empty entries do nothing');
  assert.deepEqual(names({ skip: 'oss' }), all, 'a skip that is not a list does nothing');
  if (process.platform === 'win32') assert.deepEqual(names({ skip: ['OSS'] }), names({ skip: ['oss'] }), 'windows paths ignore case');
});

test('skip also keeps a folder out of the workflow lookup', () => {
  const root = tree({
    '.github/workflows/deploy.yml': 'name: deploy\non: push\njobs:\n  run:\n    steps:\n      - run: echo deploy\n',
    'api/package.json': pkg('api'),
  });
  assert.deepEqual(discover(root).deployments.map((d) => d.name), ['gh-deploy']);
  assert.deepEqual(discover(root, { skip: ['.github'] }).deployments, []);
  assert.deepEqual(discover(root, { skip: ['.github/workflows'] }).deployments, []);
  assert.deepEqual(discover(root, { skip: ['api'] }).deployments.map((d) => d.name), ['gh-deploy']);
});
