// Finds what a project is made of: repos, worktrees, services, the edges between them and the deployments they declare.
// Read-only and local: it runs `git` for repo facts and opens only a short list of known config files; it never opens .env or other secret files.
//   import { discover } from './discover.mjs';  discover(dir) -> { scanned_at, repos, worktrees, services, deployments }
// `bgz setup` stores the result under `system.detected` in .bgzflow/project.json; `bgz map` compares a fresh scan against it.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { looksLikeSecretFile } from '../facts/facts.mjs';

const SKIP = new Set(['node_modules', '.git', 'dist', 'build', '.next', 'vendor', '.bgzflow', 'coverage', 'target']);
const MAX_SERVICE_DEPTH = 4;
const MAX_REPO_DEPTH = 2;
const MAX_DIRS = 5000;
const MAX_FILE_BYTES = 1024 * 1024;
const GIT_TIMEOUT_MS = 15000;

const DEPLOY_FILES = {
  'wrangler.toml': 'cloudflare',
  'wrangler.json': 'cloudflare',
  'wrangler.jsonc': 'cloudflare',
  'fly.toml': 'fly',
  'vercel.json': 'vercel',
  'netlify.toml': 'netlify',
  'eas.json': 'eas',
  Procfile: 'procfile',
  'render.yaml': 'render',
  'railway.json': 'railway',
};
const NODE_DEP_FIELDS = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies'];

const posix = (p) => p.split(path.sep).join('/').replace(/\/+$/, '') || '/';

// One spelling of a path: real (so 8.3 short names resolve), forward slashes, no trailing slash.
export function canonical(p) {
  const full = path.resolve(String(p));
  try {
    return posix(fs.realpathSync.native(full));
  } catch {
    return posix(full);
  }
}

// What two spellings of the same path share; Windows paths ignore case.
export const pathKey = (p) => (process.platform === 'win32' ? canonical(p).toLowerCase() : canonical(p));

// Runs git in `cwd`; returns trimmed stdout, or null when git is missing or the command fails.
export function runGit(cwd, args) {
  try {
    const r = spawnSync('git', args, { cwd, encoding: 'utf8', timeout: GIT_TIMEOUT_MS });
    return r.status === 0 && typeof r.stdout === 'string' ? r.stdout.trim() : null;
  } catch {
    return null;
  }
}

// A remote URL without the secret in it: https://user:pass@host/x -> https://host/x. ssh-style addresses stay as they are.
export function stripCredentials(url) {
  const s = typeof url === 'string' ? url.trim() : '';
  if (!s) return null;
  return s.replace(/^(https?:\/\/|ftps?:\/\/)[^/\s]*@/i, '$1').replace(/^([a-z][a-z0-9+.-]*:\/\/)[^/@\s]*:[^/\s]*@/i, '$1');
}

// The branch other work merges into: origin's default, else local main or master; null when neither exists (the owner sets system.integration_branch).
export function defaultBranch(repo) {
  const origin = runGit(repo, ['symbolic-ref', '--short', '-q', 'refs/remotes/origin/HEAD']);
  if (origin) return origin.replace(/^origin\//, '');
  for (const name of ['main', 'master']) if (runGit(repo, ['rev-parse', '--verify', '-q', `refs/heads/${name}`]) !== null) return name;
  return null;
}

// Files never opened: facts' secret rule plus Wrangler's local secrets file.
export const isSecretFile = (file) => looksLikeSecretFile(file) || path.basename(file).toLowerCase() === '.dev.vars';

// A known config file's text; null for a secret-looking file, a missing one or one over 1 MB.
function readText(file) {
  if (isSecretFile(file)) return null;
  try {
    const stat = fs.statSync(file);
    return stat.isFile() && stat.size <= MAX_FILE_BYTES ? fs.readFileSync(file, 'utf8') : null;
  } catch {
    return null;
  }
}

function readJson(file) {
  const text = readText(file);
  if (text === null) return null;
  try {
    const value = JSON.parse(text);
    return value && typeof value === 'object' ? value : null;
  } catch {
    return null;
  }
}

// Sub-folders worth looking into: no hidden or build folders, and symlinks are not followed.
function entriesOf(dir) {
  try {
    return fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  } catch {
    return [];
  }
}
const isScanDir = (e) => e.isDirectory() && !e.name.startsWith('.') && !SKIP.has(e.name);

function gitTop(dir) {
  const top = runGit(dir, ['rev-parse', '--show-toplevel']);
  return top ? canonical(top) : null;
}

function repoInfo(repo) {
  const head = runGit(repo, ['rev-parse', '--verify', '-q', '--short', 'HEAD']);
  return {
    path: repo,
    branch: runGit(repo, ['symbolic-ref', '--short', '-q', 'HEAD']),
    head: head || null,
    origin: stripCredentials(runGit(repo, ['remote', 'get-url', 'origin'])),
    default_branch: defaultBranch(repo),
  };
}

// The project's own git toplevel plus real repos (a .git folder) nested up to two folders down.
function findRepos(root) {
  const found = new Map();
  const top = gitTop(root);
  if (top) found.set(pathKey(top), top);
  const visit = (dir, depth) => {
    if (depth > MAX_REPO_DEPTH) return;
    for (const e of entriesOf(dir)) {
      if (!isScanDir(e)) continue;
      const child = path.join(dir, e.name);
      let dotGit = null;
      try {
        dotGit = fs.statSync(path.join(child, '.git'));
      } catch { /* not a repo */ }
      if (dotGit?.isDirectory()) {
        const own = gitTop(child);
        if (own && pathKey(own) === pathKey(child)) found.set(pathKey(own), own);
      } else if (!dotGit) visit(child, depth + 1);
    }
  };
  visit(root, 1);
  return [...found.values()].sort().map(repoInfo);
}

// `git worktree list --porcelain` for every repo, each worktree once.
function findWorktrees(repos) {
  const seen = new Map();
  for (const repo of repos) {
    const out = runGit(repo.path, ['worktree', 'list', '--porcelain']);
    if (!out) continue;
    let first = true;
    for (const block of out.split(/\r?\n\r?\n/)) {
      const lines = block.split(/\r?\n/);
      const where = lines.find((l) => l.startsWith('worktree '));
      if (!where || lines.includes('bare')) continue;
      const wt = canonical(where.slice('worktree '.length));
      const branch = lines.find((l) => l.startsWith('branch '));
      const head = lines.find((l) => l.startsWith('HEAD '));
      if (!seen.has(pathKey(wt))) seen.set(pathKey(wt), { path: wt, branch: branch ? branch.slice('branch '.length).replace(/^refs\/heads\//, '') : null, head: head ? head.slice('HEAD '.length) : null, main: first });
      first = false;
    }
  }
  return [...seen.values()];
}

// Just enough TOML for names and dependency tables: { section name -> its lines }, top-level lines under ''.
function tomlSections(text) {
  const sections = { '': [] };
  let current = '';
  for (const line of text.split(/\r?\n/)) {
    const header = line.match(/^\s*\[+\s*([^\]]+?)\s*\]+\s*(#.*)?$/);
    if (header) {
      current = header[1];
      sections[current] ??= [];
    } else sections[current].push(line);
  }
  return sections;
}
const tomlString = (lines, key) => {
  for (const line of lines ?? []) {
    const m = line.match(new RegExp(`^\\s*${key}\\s*=\\s*["']([^"']+)["']`));
    if (m) return m[1];
  }
  return null;
};
const tomlKeys = (lines) => (lines ?? []).map((l) => l.match(/^\s*([A-Za-z0-9_.-]+)\s*=/)?.[1]).filter(Boolean);

const depKey = (name) => String(name).toLowerCase().replace(/_/g, '-');
const unique = (list) => [...new Set(list)];

// The raw facts of one service folder: its name, kind and the dependency names or local paths it declares (not yet reduced to internal edges).
function readService(dir, rel, names) {
  const has = (n) => names.has(n);
  const pkg = has('package.json') ? readJson(path.join(dir, 'package.json')) : null;
  const isNode = pkg !== null && !pkg.workspaces;
  const kind = has('eas.json') || has('app.json') ? 'expo' : isNode ? 'node' : has('pyproject.toml') ? 'python' : has('go.mod') ? 'go' : has('Cargo.toml') ? 'rust' : has('Dockerfile') ? 'docker' : null;
  if (!kind) return null;
  let name = typeof pkg?.name === 'string' && pkg.name ? pkg.name : null;
  const refs = [];
  for (const field of NODE_DEP_FIELDS) {
    for (const [dep, spec] of Object.entries(pkg?.[field] ?? {})) {
      const local = typeof spec === 'string' ? spec.match(/^(?:file|link|portal):(.+)$/) : null;
      refs.push(local ? { path: path.resolve(dir, local[1]) } : { name: dep });
    }
  }
  if (has('pyproject.toml')) {
    const sections = tomlSections(readText(path.join(dir, 'pyproject.toml')) ?? '');
    name = name ?? tomlString(sections.project, 'name') ?? tomlString(sections['tool.poetry'], 'name');
    const listed = (sections.project ?? []).join('\n').match(/^dependencies\s*=\s*\[([\s\S]*?)\]/m)?.[1] ?? '';
    for (const m of listed.matchAll(/["']\s*([A-Za-z0-9_.-]+)/g)) refs.push({ name: m[1] });
    for (const key of tomlKeys(sections['tool.poetry.dependencies'])) if (key !== 'python') refs.push({ name: key });
  }
  if (has('requirements.txt')) {
    for (const line of (readText(path.join(dir, 'requirements.txt')) ?? '').split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Za-z0-9][A-Za-z0-9_.-]*)/);
      if (m) refs.push({ name: m[1] });
    }
  }
  if (has('go.mod')) {
    for (const m of (readText(path.join(dir, 'go.mod')) ?? '').matchAll(/^\s*(?:require\s+)?([\w.-]+\.[\w.-]+\/[^\s]+)\s+v[\w.+-]+/gm)) refs.push({ name: m[1].split('/').pop() });
  }
  if (has('Cargo.toml')) {
    const sections = tomlSections(readText(path.join(dir, 'Cargo.toml')) ?? '');
    name = name ?? tomlString(sections.package, 'name');
    for (const table of ['dependencies', 'dev-dependencies', 'build-dependencies']) {
      for (const line of sections[table] ?? []) {
        const key = line.match(/^\s*([A-Za-z0-9_-]+)\s*=/)?.[1];
        if (!key) continue;
        const local = line.match(/path\s*=\s*["']([^"']+)["']/);
        refs.push(local ? { path: path.resolve(dir, local[1]) } : { name: key });
      }
    }
  }
  return { name: name ?? (rel === '.' ? path.basename(dir) : path.basename(rel)), path: rel, kind, refs };
}

// Walks the project once and returns the service candidates and the deploy config files it passes.
function walkProject(root) {
  const services = [];
  const deployFiles = [];
  let visited = 0;
  const visit = (dir, depth) => {
    if (depth > MAX_SERVICE_DEPTH || visited >= MAX_DIRS) return;
    visited += 1;
    const entries = entriesOf(dir);
    const names = new Set(entries.filter((e) => e.isFile()).map((e) => e.name));
    const rel = posix(path.relative(root, dir)) || '.';
    const service = readService(dir, rel, names);
    if (service) services.push(service);
    for (const [file, kind] of Object.entries(DEPLOY_FILES)) if (names.has(file)) deployFiles.push({ dir: rel, file: rel === '.' ? file : `${rel}/${file}`, kind, full: path.join(dir, file) });
    if (path.basename(dir) === 'supabase' && names.has('config.toml')) deployFiles.push({ dir: rel, file: `${rel}/config.toml`, kind: 'supabase', full: path.join(dir, 'config.toml') });
    for (const e of entries) {
      if (!isScanDir(e)) continue;
      if (e.name === 'functions' && path.basename(dir) === 'supabase') {
        for (const fn of entriesOf(path.join(dir, e.name))) {
          if (fn.isDirectory() && !fn.name.startsWith('_') && !fn.name.startsWith('.')) services.push({ name: fn.name, path: posix(path.relative(root, path.join(dir, e.name, fn.name))), kind: 'supabase-function', refs: [] });
        }
      } else visit(path.join(dir, e.name), depth + 1);
    }
  };
  visit(root, 0);
  return { services, deployFiles };
}

// Gives colliding names their folder path, then keeps only the dependencies that name another service.
function linkServices(root, found) {
  const counts = new Map();
  for (const s of found) counts.set(s.name, (counts.get(s.name) ?? 0) + 1);
  const services = found.map((s) => ({ ...s, name: counts.get(s.name) > 1 ? s.path : s.name }));
  const byPath = new Map(services.map((s) => [pathKey(path.join(root, s.path)), s]));
  const byName = new Map();
  const claim = (key, s) => byName.set(key, byName.has(key) && byName.get(key) !== s ? null : s);
  for (const s of services) {
    claim(depKey(s.name), s);
    claim(depKey(s.name.replace(/^@[^/]+\//, '')), s);
  }
  return services
    .map(({ refs, ...s }) => {
      const deps = refs.map((r) => (r.path ? byPath.get(pathKey(r.path)) : byName.get(depKey(r.name)))).filter((t) => t && t !== s).map((t) => t.name);
      return { name: s.name, path: s.path, kind: s.kind, deps: unique(deps).sort() };
    })
    .sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
}

// The innermost service whose folder holds `relDir`; the project root counts last.
export function serviceAt(services, relDir) {
  let best = null;
  for (const s of services) {
    const inside = s.path === '.' || relDir === s.path || relDir.startsWith(`${s.path}/`);
    if (inside && (!best || s.path.length > best.path.length)) best = s;
  }
  return best;
}

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// A workflow belongs to a service only when it names exactly one service folder.
function workflowService(services, text) {
  const named = services.filter((s) => s.path !== '.' && new RegExp(`(^|[\\s'"/=:])${escapeRegex(s.path)}(/|[\\s'"]|$)`, 'm').test(text));
  return named.length === 1 ? named[0].name : null;
}

// The declared name inside a deploy file: `name = ".."` (wrangler) or `app = ".."` (fly) before the first table, or a JSON "name".
function declaredName(kind, text) {
  if (text === null) return null;
  if (kind === 'cloudflare' || kind === 'fly') {
    const key = kind === 'fly' ? 'app' : 'name';
    const top = text.split(/\r?\n/);
    const stop = top.findIndex((l) => /^\s*\[/.test(l));
    const toml = tomlString(stop === -1 ? top : top.slice(0, stop), key);
    return toml ?? text.match(new RegExp(`"${key}"\\s*:\\s*"([^"]+)"`))?.[1] ?? null;
  }
  return null;
}

function findDeployments(root, services, repos, deployFiles) {
  const found = deployFiles.map((d) => ({ d, service: d.kind === 'supabase' ? null : serviceAt(services, d.dir)?.name ?? null, name: declaredName(d.kind, readText(d.full)) }));
  const workflowDirs = new Map();
  for (const base of [root, ...repos.map((r) => r.path)]) workflowDirs.set(pathKey(base), base);
  for (const base of workflowDirs.values()) {
    const dir = path.join(base, '.github', 'workflows');
    for (const e of entriesOf(dir)) {
      if (!e.isFile() || !/\.ya?ml$/i.test(e.name)) continue;
      const text = readText(path.join(dir, e.name));
      if (text === null || !/deploy/i.test(text)) continue;
      const file = posix(path.relative(root, path.join(dir, e.name)));
      found.push({ d: { file, kind: 'github-actions' }, service: workflowService(services, text), name: `gh-${e.name.replace(/\.ya?ml$/i, '')}` });
    }
  }
  const taken = new Map();
  return found
    .map(({ d, service, name }) => {
      const base = name ?? (service ? `${service}-${d.kind}` : d.kind);
      const n = (taken.get(base) ?? 0) + 1;
      taken.set(base, n);
      return { name: n === 1 ? base : `${base}-${n}`, service, kind: d.kind, file: d.file };
    })
    .sort((a, b) => (a.file < b.file ? -1 : a.file > b.file ? 1 : 0));
}

// True when the scan found anything worth keeping as the project's system.
export const isSystemFound = (found) => found.repos.length > 0 || found.services.length > 0 || found.deployments.length > 0;

export function discover(dir, { now } = {}) {
  const root = canonical(dir);
  const repos = findRepos(root);
  const { services: candidates, deployFiles } = walkProject(root);
  const services = linkServices(root, candidates);
  return {
    scanned_at: new Date(now ?? Date.now()).toISOString(),
    repos,
    worktrees: findWorktrees(repos),
    services,
    deployments: findDeployments(root, services, repos, deployFiles),
  };
}
