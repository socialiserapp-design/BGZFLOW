// The one Jev client for BGZFLOW (TypeSafe "System One"). Node 18+ (node:http/https), no dependencies.
//
// Library use:   import { ask, noul, choice, score } from '.../tools/jev/jev.mjs'
//   const res = await ask({ caller: 'h7', state: { command }, questions: { x: choice('...', { a: '...', b: '...' }) }, timeoutMs: 2500 });
//   res === null  -> no key, timeout, HTTP error or a malformed answer: the caller FAILS OPEN.
// CLI use:       bgz jev ask|file|files|score|route|skills|arch|unasked|grade|league   (tools/jev/cli.mjs; see `bgz jev --help`)
//
// Rules this file keeps:
//  * Jev decides; it does not write. Answers are evidence, never authority. Numbers, dates and counting stay in code.
//  * The key is read from TYPESAFE_API_KEY, then FAST_JEV_KEY_FILE, then ~/.typesafe_key. It is never printed or logged.
//  * Every call that reaches the network gets ONE line in ~/.bgzflow/jev-ledger.jsonl: time, caller, question ids,
//    answers, latency and a cost estimate. The state text (the evidence sent) is never written there.
//  * Everything sent (state and questions) and every ledger row is passed through sanitize/sanitizeRecord
//    (hooks/lib/secrets.mjs) first, whatever the caller already did.
//  * Outage breaker: after a timeout or network error, ~/.bgzflow/jev-down.json holds "down until now + 5 min"; while
//    it holds, calls return { ok:false, err:'jevdown' } at once with no network use. BGZFLOW_JEV_BREAKER=off ignores it.
//  * BGZFLOW_JEV_GATES=off switches off every Jev use inside hooks. BGZFLOW_JEV_URL may point at a local mock
//    (loopback hosts only, so the key can never be sent to another host this way). BGZFLOW_HOME moves ~/.bgzflow.
import fs from 'node:fs';
import http from 'node:http';
import https from 'node:https';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sanitize, sanitizeRecord, valueShape } from '../../hooks/lib/secrets.mjs';

export const ENDPOINT = 'https://api.typesafe.ai/v1/systemone';
export const MODEL = 'jev-latest';
export const DEFAULT_TIMEOUT_MS = 3000;
// Vendor price: $0.042 per million input tokens, output free (TypeSafe launch post). An estimate, not a bill.
export const INPUT_USD_PER_TOKEN = 0.042 / 1e6;
const MAX_STATE_CHARS = 60000;
const LEDGER_MAX_BYTES = 1024 * 1024;
const LEDGER_KEEP_BYTES = 512 * 1024;

// ---------- question builders ----------
export const noul = (instructions, criteria) => ({ type: 'noul', instructions, ...(criteria ? { criteria } : {}) });
export const choice = (instructions, options) => ({ type: 'choice', instructions, criteria: options });
export const score = (instructions, levels) => ({ type: 'score', instructions, criteria: levels });

// ---------- evidence helpers ----------
// sanitize and sanitizeRecord live in hooks/lib/secrets.mjs (the one masker); they are re-exported here for tools.
export { sanitize, sanitizeRecord, valueShape };

// Text that is about to leave the machine: fully sanitized (PEM blocks, tokens, passwords, emails, phones), then
// bounded. Keeps the head and the tail of long text.
export function safeText(text, max = 12000) {
  let t = sanitize(text);
  if (t.length > max) t = `${t.slice(0, Math.floor(max * 0.6))}
...[cut]...
${t.slice(-Math.floor(max * 0.4))}`;
  return t;
}

// Kept for its callers: the same full sanitize. A secret-named value or a token-shaped word becomes a marker that keeps
// only its kind and length, so the judge sees the shape, never the value; every other secret form is masked as well.
export function maskSecrets(text) {
  return sanitize(text);
}

// Run async jobs with a concurrency limit; results keep input order.
export async function pool(items, limit, fn) {
  const out = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return out;
}

// ---------- environment ----------
export const gatesOff = (env = process.env) => /^(off|0|false|no)$/i.test(String(env.BGZFLOW_JEV_GATES || '').trim());

export function bgzHome(env = process.env) {
  return env.BGZFLOW_HOME && env.BGZFLOW_HOME.trim() ? path.resolve(env.BGZFLOW_HOME) : path.join(os.homedir(), '.bgzflow');
}

export function resolveKey(env = process.env) {
  const fromEnv = typeof env.TYPESAFE_API_KEY === 'string' ? env.TYPESAFE_API_KEY.trim() : '';
  if (fromEnv) return fromEnv;
  const file = env.FAST_JEV_KEY_FILE && env.FAST_JEV_KEY_FILE.trim() ? env.FAST_JEV_KEY_FILE.trim() : path.join(os.homedir(), '.typesafe_key');
  try {
    return fs.readFileSync(file, 'utf8').trim() || null;
  } catch {
    return null;
  }
}

// True when Jev may be used inside a hook now: gates not switched off and a key exists.
export const jevUsable = (env = process.env) => !gatesOff(env) && resolveKey(env) !== null;

function endpoint(env) {
  const raw = env.BGZFLOW_JEV_URL;
  if (!raw) return ENDPOINT;
  try {
    const u = new URL(raw);
    if (['127.0.0.1', 'localhost', '[::1]', '::1'].includes(u.hostname)) return u.toString();
  } catch {
    // fall through to the real endpoint
  }
  return ENDPOINT;
}

// ---------- ledger ----------
export function ledgerPath(env = process.env) {
  return path.join(bgzHome(env), 'jev-ledger.jsonl');
}

// Append one JSON line to a file in ~/.bgzflow, keeping it small. Every string field is sanitized first. Never throws.
export function appendJsonl(file, record) {
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.appendFileSync(file, `${JSON.stringify(sanitizeRecord(record))}\n`, 'utf8');
    const size = fs.statSync(file).size;
    if (size > LEDGER_MAX_BYTES) {
      const buf = fs.readFileSync(file);
      const tail = buf.subarray(buf.length - LEDGER_KEEP_BYTES).toString('utf8');
      fs.writeFileSync(file, tail.slice(tail.indexOf('\n') + 1), 'utf8');
    }
  } catch {
    // a ledger problem must never break a caller
  }
}

// Only the shape of each answer: no state text, no instructions.
export function summarizeAnswers(answers = {}) {
  const out = {};
  for (const [id, a] of Object.entries(answers)) {
    if (!a || typeof a !== 'object') continue;
    if (a.type === 'noul') out[id] = round(a.noul);
    else if (a.type === 'choice') out[id] = { c: String(a.choice).slice(0, 60), conf: round(a.confidence) };
    else if (a.type === 'score') out[id] = { s: round(a.score), conf: round(a.confidence) };
  }
  return out;
}
const round = (n) => (Number.isFinite(n) ? Math.round(n * 1000) / 1000 : null);

// ---------- outage breaker ----------
// After a timeout or network error Jev is treated as down for JEV_DOWN_MS: calls fail open at once instead of each
// waiting out its own timeout. The stamp is one small JSON file; a missing or unreadable stamp means "not down".
export const JEV_DOWN_FILE = 'jev-down.json';
export const JEV_DOWN_MS = 5 * 60 * 1000;
export const breakerOff = (env = process.env) => /^(off|0|false|no)$/i.test(String(env.BGZFLOW_JEV_BREAKER || '').trim());
export const jevDownPath = (env = process.env) => path.join(bgzHome(env), JEV_DOWN_FILE);

// The time (ms since epoch) Jev is down until, or 0 when it is not down now.
export function jevDownUntil(env = process.env, now = Date.now()) {
  try {
    const until = Number(JSON.parse(fs.readFileSync(jevDownPath(env), 'utf8')).until);
    return Number.isFinite(until) && until > now ? until : 0;
  } catch {
    return 0;
  }
}

// Write the stamp (temp file + rename, so a reader never sees half a file). Never throws.
export function markJevDown(env = process.env, reason = 'timeout', now = Date.now()) {
  const file = jevDownPath(env);
  const until = now + JEV_DOWN_MS;
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const tmp = `${file}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, `${JSON.stringify({ until, untilIso: new Date(until).toISOString(), since: new Date(now).toISOString(), reason: String(reason).slice(0, 40) })}\n`, 'utf8');
    fs.renameSync(tmp, file);
  } catch {
    // a stamp problem must never break a caller
  }
  return until;
}

export function clearJevDown(env = process.env) {
  try {
    fs.rmSync(jevDownPath(env), { force: true });
  } catch {
    // nothing to do
  }
}

// ---------- the call ----------
function validAnswer(q, a) {
  if (!a || typeof a !== 'object' || a.type !== q.type) return false;
  if (q.type === 'noul') return Number.isFinite(a.noul) && a.noul >= 0 && a.noul <= 1;
  if (q.type === 'choice') return typeof a.choice === 'string' && Number.isFinite(a.confidence) && Object.hasOwn(q.criteria || {}, a.choice);
  if (q.type === 'score') return Number.isFinite(a.score) && a.score >= 0 && a.score <= (Array.isArray(q.criteria) ? q.criteria.length - 1 : 1e9) && Number.isFinite(a.confidence);
  return false;
}

// One JSON POST over node:http(s) with no connection pool. Global fetch keeps pooled sockets that make
// process.exit() abort on Windows (libuv "UV_HANDLE_CLOSING"), and hooks leave through process.exit.
function postJson(urlString, headers, body, signal) {
  return new Promise((resolve, reject) => {
    const u = new URL(urlString);
    const lib = u.protocol === 'http:' ? http : https;
    const req = lib.request(u, { method: 'POST', agent: false, signal, headers: { ...headers, 'Content-Length': Buffer.byteLength(body), Connection: 'close' } }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, text: Buffer.concat(chunks).toString('utf8') }));
      res.on('error', reject);
    });
    req.on('error', reject);
    req.end(body);
  });
}

// Returns { ok:true, answers, model, usage, ms, cost } or { ok:false, err } where err is a short code, never a body.
// err codes: noquestions, nokey, badstate, toolarge, jevdown (breaker holds, no network use), timeout, network,
// http_<status>, badanswer. Every one of them means "fail open". timeoutMs is per call (minimum 50 ms) and is a hard
// ceiling on the whole call, including a server that sends headers and then stalls.
export async function askDetailed({ caller = 'unknown', state, questions, timeoutMs = DEFAULT_TIMEOUT_MS, env = process.env, signal } = {}) {
  const ids = Object.keys(questions || {});
  if (!ids.length) return { ok: false, err: 'noquestions' };
  const key = resolveKey(env);
  if (!key) return { ok: false, err: 'nokey' };
  let body;
  try {
    JSON.stringify({ state, questions }); // a state that cannot be serialised is the caller's bug: say so
    body = JSON.stringify({ model: MODEL, state: sanitizeRecord(state), questions: sanitizeRecord(questions) });
  } catch {
    return { ok: false, err: 'badstate' };
  }
  if (body.length > MAX_STATE_CHARS + 20000) return { ok: false, err: 'toolarge' };
  const useBreaker = !breakerOff(env);
  if (useBreaker && jevDownUntil(env)) return { ok: false, err: 'jevdown' };
  const started = Date.now();
  const controller = new AbortController();
  let timer;
  const deadline = new Promise((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      const e = new Error('timeout');
      e.name = 'AbortError';
      reject(e);
    }, Math.max(50, Number(timeoutMs) || DEFAULT_TIMEOUT_MS));
  });
  let callerAborted = false;
  const onCallerAbort = () => {
    callerAborted = true;
    controller.abort();
  };
  if (signal) {
    if (signal.aborted) onCallerAbort();
    else signal.addEventListener('abort', onCallerAbort, { once: true });
  }
  const ledger = (extra) => appendJsonl(ledgerPath(env), { t: new Date().toISOString(), caller, ids, ms: Date.now() - started, ...extra });
  try {
    const r = await Promise.race([postJson(endpoint(env), { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, body, controller.signal), deadline]);
    if (r.status < 200 || r.status >= 300) {
      ledger({ ok: false, err: `http_${r.status}` });
      return { ok: false, err: `http_${r.status}` };
    }
    let json;
    try {
      json = JSON.parse(r.text);
    } catch {
      ledger({ ok: false, err: 'badanswer' });
      return { ok: false, err: 'badanswer' };
    }
    const answers = json && json.answers;
    for (const id of ids) {
      if (!validAnswer(questions[id], answers && answers[id])) {
        ledger({ ok: false, err: 'badanswer' });
        return { ok: false, err: 'badanswer' };
      }
    }
    const usage = json.usage && typeof json.usage === 'object' ? { input: Number(json.usage.input_tokens) || 0, output: Number(json.usage.output_tokens) || 0 } : { input: 0, output: 0 };
    const cost = Math.round(usage.input * INPUT_USD_PER_TOKEN * 1e9) / 1e9;
    const ms = Date.now() - started;
    ledger({ ok: true, answers: summarizeAnswers(answers), in: usage.input, out: usage.output, cost });
    return { ok: true, answers, model: json.model || null, usage, ms, cost };
  } catch (err) {
    const code = err && (err.name === 'AbortError' || err.code === 'ABORT_ERR') ? 'timeout' : 'network';
    // A caller that gives up is not an outage; a timeout or a network error is.
    if (useBreaker && !callerAborted) markJevDown(env, code);
    ledger({ ok: false, err: code });
    return { ok: false, err: code };
  } finally {
    clearTimeout(timer);
    if (signal) signal.removeEventListener('abort', onCallerAbort);
  }
}

// The fail-open form: the response, or null.
export async function ask(opts) {
  const r = await askDetailed(opts);
  return r.ok ? r : null;
}

// ---------- reading answers (normalised) ----------
export const pYes = (res, id) => res.answers[id].noul;
export const pick = (res, id) => ({ choice: res.answers[id].choice, confidence: res.answers[id].confidence, probabilities: res.answers[id].probabilities || {} });
// Score is 0-based over the described levels (levels.length levels => 0..levels.length-1). norm is 0..1.
export function scoreOf(res, id, levels) {
  const a = res.answers[id];
  const top = Math.max(1, (levels ? levels.length : Object.keys(a.legend || {}).length || 2) - 1);
  return { score: a.score, norm: Math.min(1, Math.max(0, a.score / top)), confidence: a.confidence };
}

// ---------- CLI ----------
const here = path.dirname(fileURLToPath(import.meta.url));
export const toolsRoot = path.resolve(here, '..');

const BOOLEAN_FLAGS = new Set(['json', 'help', 'strict', 'no-run']);

export function parseArgs(argv) {
  const flags = {};
  const rest = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--') && a.length > 2) {
      const eq = a.indexOf('=');
      const name = eq === -1 ? a.slice(2) : a.slice(2, eq);
      let value;
      if (eq !== -1) value = a.slice(eq + 1);
      else if (BOOLEAN_FLAGS.has(name)) value = true;
      else value = argv[++i];
      if (value === undefined) value = true;
      if (flags[name] === undefined) flags[name] = value;
      else flags[name] = [].concat(flags[name], value);
    } else rest.push(a);
  }
  return { flags, rest };
}

export const list = (v) => (v === undefined || v === true ? [] : [].concat(v));
export const csv = (v) => list(v).flatMap((s) => String(s).split(',')).map((s) => s.trim()).filter(Boolean);

// "--state text" or "--state @file"
export function readTextArg(value, maxChars = 20000) {
  if (typeof value !== 'string') return '';
  if (value.startsWith('@')) {
    try {
      return fs.readFileSync(value.slice(1), 'utf8').slice(0, maxChars);
    } catch {
      return '';
    }
  }
  return value.slice(0, maxChars);
}

// A question from CLI flags: --q text --type noul|choice|score [--options a,b,c] [--levels "l1|l2|l3"]
export function questionFromFlags(flags, defaultType = 'noul') {
  const instructions = String(flags.q || '').trim();
  if (!instructions) throw new Error('--q "<question>" is required');
  const type = String(flags.type || defaultType);
  if (type === 'noul') return noul(instructions);
  if (type === 'choice') {
    const opts = csv(flags.options);
    if (opts.length < 2) throw new Error('--type choice needs --options a,b,c (at least two; add "other" when the list may not cover everything)');
    if (opts.length > 255) throw new Error('a choice takes at most 255 options; prune in code first');
    return choice(instructions, Object.fromEntries(opts.map((o) => [o, null])));
  }
  if (type === 'score') {
    const levels = String(flags.levels || '').split('|').map((s) => s.trim()).filter(Boolean);
    if (levels.length < 2 || levels.length > 10) throw new Error('--type score needs --levels "level 0|level 1|..." (2 to 10 situations, lowest first)');
    return score(instructions, levels);
  }
  throw new Error(`unknown --type ${type} (noul, choice or score)`);
}

// Compact, human-readable form of one answer for the CLI.
export function shape(q, a, id) {
  if (q.type === 'noul') return { id, type: 'noul', p_yes: round(a.noul) };
  if (q.type === 'choice') return { id, type: 'choice', choice: a.choice, confidence: round(a.confidence), probabilities: a.probabilities };
  return { id, type: 'score', score: round(a.score), of: q.criteria.length - 1, legend: a.legend, confidence: round(a.confidence) };
}

// `node tools/jev/jev.mjs <command>` (the slash command) runs the CLI; importing this file as a library never does.
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) import('./cli.mjs').then((m) => m.main());
