// A writer model from a different vendor than the one that did the work. Used to draft skill text, benchmark runs and
// regression checks. Pick order: BGZFLOW_DRAFTER_CMD (a command line that reads the prompt on stdin and prints the
// answer; BGZFLOW_DRAFTER_VENDOR names its vendor), then the first installed CLI from CANDIDATES whose vendor differs
// from every worker in `exclude`. A worker whose vendor is unknown means nothing can be proven different: defer.
// Every child runs read-only in a fresh empty temp folder, with the Jev key variables removed from its environment.
// Tests pass their own drafter function instead; callers pass sanitized text, so no secret reaches a drafter.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// Tools a drafter never needs: it reads a prompt and prints text.
const CLAUDE_DENY = 'Bash,Edit,Write,MultiEdit,NotebookEdit,WebFetch,WebSearch,Task';

export const CANDIDATES = [
  { name: 'claude', vendor: 'anthropic', cmd: 'claude', args: ['-p', '--permission-mode', 'plan', '--disallowedTools', CLAUDE_DENY] },
  { name: 'codex', vendor: 'openai', cmd: 'codex', args: ['exec', '--sandbox', 'read-only', '--skip-git-repo-check', '-'] },
];

// Env vars a child must never see: the Jev key and the file that holds it.
export const CHILD_ENV_DROP = ['TYPESAFE_API_KEY', 'FAST_JEV_KEY_FILE'];

const VENDORS = [
  ['anthropic', /claude|opus|sonnet|haiku|fable|anthropic/],
  ['openai', /codex|gpt|openai|(?:^|[^a-z0-9])o[1-9](?:$|[^0-9])/],
  ['zhipu', /glm|zhipu|z-?code/],
  ['xai', /grok|xai/],
];

/** The vendor behind a worker or model id, or '' when it is not known. */
export function vendorOf(id) {
  const s = String(id || '').toLowerCase().trim();
  if (!s) return '';
  for (const [vendor, re] of VENDORS) if (re.test(s)) return vendor;
  return '';
}

/** The environment a drafter or bench child gets: the parent's, minus the Jev key variables. */
export function childEnv(env = process.env) {
  const out = { ...env };
  for (const k of Object.keys(out)) if (CHILD_ENV_DROP.includes(k.toUpperCase())) delete out[k];
  return out;
}

// Looks the CLI up on the PATH of the env the caller passed (tests pass an empty PATH so no real CLI is ever run).
const has = (cmd, env = process.env) => {
  const pathKey = Object.keys(env).find((k) => k.toUpperCase() === 'PATH');
  const lookup = { ...process.env };
  if (pathKey !== undefined) {
    for (const k of Object.keys(lookup)) if (k.toUpperCase() === 'PATH') delete lookup[k];
    lookup.PATH = env[pathKey];
  }
  return spawnSync(process.platform === 'win32' ? 'where' : 'which', [cmd], { encoding: 'utf8', env: lookup }).status === 0;
};

// Windows needs a shell to run .cmd shims, so a program path or argument with a space is quoted for it.
const quote = (s) => (/[\s"]/.test(s) && !/^".*"$/.test(s) ? `"${s.replace(/"/g, '\\"')}"` : s);

export function runner(cmd, args, name, vendor = '', env = process.env) {
  const shell = process.platform === 'win32';
  // A custom drafter command (no args) is already a full command line; a program plus args is quoted part by part.
  const [file, argv] = shell && args.length ? [[cmd, ...args].map(quote).join(' '), []] : [cmd, args];
  return {
    name,
    vendor,
    run(prompt, timeoutMs = 180000) {
      const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'bgz-drafter-'));
      try {
        const r = spawnSync(file, argv, { cwd, env: childEnv(env), input: String(prompt), encoding: 'utf8', timeout: timeoutMs, maxBuffer: 8 * 1024 * 1024, shell });
        if (r.error || r.status !== 0) return { ok: false, err: r.error ? r.error.code || 'spawn' : `exit ${r.status}` };
        return { ok: true, text: String(r.stdout || '').trim() };
      } finally {
        try { fs.rmSync(cwd, { recursive: true, force: true }); } catch { /* temp folder; the OS cleans it */ }
      }
    },
  };
}

const tokens = (exclude) => String(Array.isArray(exclude) ? exclude.join(' ') : exclude || '').toLowerCase().split(/[\s,]+/).filter(Boolean);

/** { drafter, why }: a drafter from another vendor, or null and the reason. */
export function pickDrafterDetailed({ exclude = '', only = '', env = process.env } = {}) {
  const workers = tokens(exclude);
  const unknown = workers.filter((w) => !vendorOf(w));
  if (unknown.length) return { drafter: null, why: `vendor unknown for worker ${unknown.join(', ')}, so no drafter can be shown to be different` };
  const taken = new Set(workers.map(vendorOf));
  const skipped = [];
  if (env.BGZFLOW_DRAFTER_CMD) {
    const name = env.BGZFLOW_DRAFTER_NAME || 'custom';
    const vendor = String(env.BGZFLOW_DRAFTER_VENDOR || vendorOf(name)).toLowerCase();
    if (workers.length && !vendor) skipped.push(`${name} has no known vendor (set BGZFLOW_DRAFTER_VENDOR)`);
    else if (taken.has(vendor) || workers.includes(name.toLowerCase())) skipped.push(`${name} is ${vendor || 'the same model'}, same as the worker`);
    else return { drafter: runner(env.BGZFLOW_DRAFTER_CMD, [], name, vendor, env), why: '' };
  }
  for (const c of CANDIDATES) {
    if (only && c.name !== only) continue;
    if (taken.has(c.vendor)) { skipped.push(`${c.name} is ${c.vendor}, same as the worker`); continue; }
    if (!has(c.cmd, env)) continue;
    return { drafter: runner(c.cmd, c.args, c.name, c.vendor, env), why: '' };
  }
  return { drafter: null, why: skipped.length ? skipped.join('; ') : 'no model CLI installed' };
}

export function pickDrafter(opts = {}) {
  return pickDrafterDetailed(opts).drafter;
}
