import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, test } from 'node:test';
import { discover, isSystemFound, stripCredentials } from '../discover.mjs';

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
