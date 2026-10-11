// Shared test helpers. Fixtures live under <plugin>/.tmp/ (which ignores itself), never in the system temp folder.
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
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
    if (/^BGZFLOW_/.test(key) || key === 'CLAUDE_PROJECT_DIR' || key === 'GROK_WORKSPACE_ROOT' || key === 'TYPESAFE_API_KEY') delete env[key];
  }
  // Tests never reach the real Jev: no key anywhere, and the ledger/performance files go to a scratch home.
  // A Jev test passes TYPESAFE_API_KEY (a fake) and BGZFLOW_JEV_URL (a loopback mock) in `extra`.
  return { ...env, FAST_JEV_KEY_FILE: path.join(TMP, 'no-such-key-file'), BGZFLOW_HOME: path.join(TMP, 'bgz-home'), BGZFLOW_OVERLAY: path.join(TMP, 'no-overlay'), ...extra };
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

// Async twin of runHook for tests that need an in-process mock Jev server (spawnSync would block its event loop).
export function runHookAsync(script, input, { env = {}, project } = {}) {
  const file = path.join(ROOT, 'hooks', script);
  return runNode([file], { input, env, project });
}

export function runNode(args, { input = '', env = {}, project, cwd } = {}) {
  const extra = project ? { BGZFLOW_PROJECT: project, ...env } : env;
  const started = process.hrtime.bigint();
  return new Promise((resolve) => {
    const child = spawn(process.execPath, args, { env: cleanEnv(extra), cwd: cwd || project || ROOT, stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => child.kill(), TEST_TIMEOUT_MS);
    child.stdout.on('data', (c) => (stdout += c));
    child.stderr.on('data', (c) => (stderr += c));
    child.on('close', (status) => {
      clearTimeout(timer);
      const ms = Number(process.hrtime.bigint() - started) / 1e6;
      let json;
      try {
        json = stdout.trim() ? JSON.parse(stdout) : undefined;
      } catch {
        json = undefined;
      }
      resolve({ status, stdout, stderr, json, ms });
    });
    child.stdin.on('error', () => {});
    child.stdin.end(typeof input === 'string' ? input : JSON.stringify(input));
  });
}

// A loopback stand-in for the Jev service. `reply(body)` gets the parsed request ({ state, questions }) and returns
// either { answers } or a plain object of per-question values: a number for a noul, { choice, confidence } for a
// choice, { score, confidence } for a score. Anything not given defaults to noul 0 / the first option / score 0.
export async function startMockJev(reply = () => ({}), { delayMs = 0, status = 200 } = {}) {
  const calls = [];
  const server = http.createServer((req, res) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      let body = {};
      try {
        body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      } catch {
        // an empty body is answered with no questions
      }
      calls.push({ body, auth: req.headers.authorization });
      const out = reply(body, calls.length) || {};
      const answers = {};
      for (const [id, q] of Object.entries(body.questions || {})) {
        const v = out[id];
        if (q.type === 'noul') answers[id] = { type: 'noul', noul: typeof v === 'number' ? v : 0 };
        else if (q.type === 'choice') {
          const options = Object.keys(q.criteria || {});
          const c = typeof v === 'string' ? v : v && v.choice ? v.choice : options[0];
          answers[id] = { type: 'choice', choice: c, confidence: (v && v.confidence) ?? 0.95, probabilities: { [c]: (v && v.confidence) ?? 0.95 } };
        } else answers[id] = { type: 'score', score: typeof v === 'number' ? v : (v && v.score) ?? 0, confidence: (v && v.confidence) ?? 0.95 };
      }
      setTimeout(() => {
        res.writeHead(status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(status === 200 ? { model: 'jev-mock', answers, usage: { input_tokens: 100, output_tokens: 10 } } : { error: 'mock' }));
      }, delayMs);
    });
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${server.address().port}/v1/systemone`;
  // `isolated` adds a BGZFLOW_HOME of this mock's own, so one test's outage stamp (jev-down.json) never skips Jev in
  // another test. `env` leaves BGZFLOW_HOME alone for tests that set their own home.
  fs.mkdirSync(TMP, { recursive: true });
  const home = fs.mkdtempSync(path.join(TMP, 'bgz-home-'));
  const env = { TYPESAFE_API_KEY: 'test-key-not-real', BGZFLOW_JEV_URL: url };
  return {
    url,
    calls,
    home,
    env,
    isolated: { ...env, BGZFLOW_HOME: home },
    close: () => new Promise((resolve) => (server.closeAllConnections?.(), server.close(resolve))),
  };
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
