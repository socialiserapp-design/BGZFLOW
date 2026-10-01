// Shared test helpers. Fixtures live under <plugin>/.tmp/ (which ignores itself), never in the system temp folder.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const TMP = path.join(ROOT, '.tmp');

// A safety net against a hung child, not a speed assertion: a machine at full load can hold a fresh Node process
// for tens of seconds. Set BGZFLOW_TEST_TIMEOUT_MS to change it; BGZFLOW_SKIP_TIMING=1 skips the wall-clock tests.
export const TEST_TIMEOUT_MS = Number(process.env.BGZFLOW_TEST_TIMEOUT_MS) > 0 ? Number(process.env.BGZFLOW_TEST_TIMEOUT_MS) : 180000;

// A fresh project folder that is its own project root (it has an empty .bgzflow/).
export function makeProject(prefix = 'p') {
  fs.mkdirSync(TMP, { recursive: true });
  const ignore = path.join(TMP, '.gitignore');
  if (!fs.existsSync(ignore)) fs.writeFileSync(ignore, '*\n');
  const dir = fs.mkdtempSync(path.join(TMP, `${prefix}-`));
  fs.mkdirSync(path.join(dir, '.bgzflow'));
  return dir;
}

export function removeDir(dir) {
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch {
    // a fixture left behind in .tmp/ is harmless
  }
}

// The test environment must not inherit the developer's BGZFLOW_* limits or host project variables.
export function cleanEnv(extra = {}) {
  const env = { ...process.env };
  for (const key of Object.keys(env)) {
    if (/^BGZFLOW_/.test(key) || key === 'CLAUDE_PROJECT_DIR' || key === 'GROK_WORKSPACE_ROOT') delete env[key];
  }
  return { ...env, ...extra };
}

export function runHook(script, input, { env = {}, project } = {}) {
  const file = path.join(ROOT, 'hooks', script);
  const extra = project ? { BGZFLOW_PROJECT: project, ...env } : env;
  const started = process.hrtime.bigint();
  const r = spawnSync(process.execPath, [file], {
    input: typeof input === 'string' ? input : JSON.stringify(input),
    encoding: 'utf8',
    env: cleanEnv(extra),
    cwd: project || ROOT,
    timeout: TEST_TIMEOUT_MS,
  });
  const ms = Number(process.hrtime.bigint() - started) / 1e6;
  let json;
  try {
    json = r.stdout.trim() ? JSON.parse(r.stdout) : undefined;
  } catch {
    json = undefined;
  }
  return { status: r.status, stdout: r.stdout, stderr: r.stderr, json, ms };
}

export function write(dir, rel, content) {
  const file = path.join(dir, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
  return file;
}

export const kb = (n, ch = 'x') => ch.repeat(Math.round(n * 1024));
export const words = (text) => String(text).trim().split(/\s+/).filter(Boolean).length;

export function readLog(project) {
  try {
    return fs.readFileSync(path.join(project, '.bgzflow', 'hooks.log'), 'utf8');
  } catch {
    return '';
  }
}

// Tokens, passwords and user@host shapes are built from fragments so that no source line looks like a real
// secret or an email address to a scanner. Every value here is invented.
export const fake = {
  ghToken: () => ['gh', 'p_', 'a1B2c3D4e5F6g7H8i9J0k1L2m3N4o5P6q7R8'].join(''),
  password: () => ['s3', 'cr3t', 'Pw0rd'].join(''),
  passwordUrl: (host = 'example.invalid') => ['https://alice', ':', ['s3', 'cr3t', 'Pw0rd'].join(''), `@${host}/team/repo.git`].join(''),
  tokenUrl: (host = 'github.com') => ['https://', ['gh', 'p_', 'a1B2c3D4e5F6g7H8i9J0k1L2m3N4o5P6q7R8'].join(''), `@${host}/team/repo.git`].join(''),
  userOnlyUrl: (user = 'someuser', host = 'github.com', scheme = 'https') => [`${scheme}://`, user, '@', `${host}/team/repo.git`].join(''),
  scpUrl: (user = 'git', host = 'github.com') => [user, '@', `${host}:team/repo.git`].join(''),
  queryUrl: (param, value, host = 'mcp.example.invalid') => `https://${host}/sse?${param}=${value}`,
  longRandom: () => 'Zx9Qw8Er7Ty6Ui5Op4As3Df2Gh1Jk0Lm9Nb8Vc7',
  awsKey: () => ['AK', 'IA', 'ABCDEFGH12345678'].join(''),
  stripeKey: () => ['sk_', 'live_', 'x9y8z7w6v5u4t3s2r1'].join(''),
};
