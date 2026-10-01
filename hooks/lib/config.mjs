// Limits shared by the hooks and the tools.
// Precedence: environment variable, then <project>/.bgzflow/config.json, then the default.
// A config key may be written as BGZFLOW_CHECKPOINT_KB, checkpoint_kb or checkpointKb.
// Zero, negative, non-numeric or absurd values are ignored (never "disable"), with a warning.
//
// Environment rule (applies to every hook, tool and test helper): a log line or a report may name an
// environment variable but never carries its value, and a name that could hold a secret is not even named.
import fs from 'node:fs';
import path from 'node:path';

export const DEFAULTS = Object.freeze({
  checkpointKb: 8,
  handoffKb: 2,
  bigReadKb: 64,
  chatMb: 15,
  startupWords: 3000,
});

const ENV_NAMES = {
  checkpointKb: 'BGZFLOW_CHECKPOINT_KB',
  handoffKb: 'BGZFLOW_HANDOFF_KB',
  bigReadKb: 'BGZFLOW_BIG_READ_KB',
  chatMb: 'BGZFLOW_CHAT_MB',
  startupWords: 'BGZFLOW_STARTUP_WORDS',
};

const MAX_VALUE = 1e9;

export const SENSITIVE_ENV_NAME = /TOKEN|SECRET|KEY|PASSWORD|AUTH|COOKIE|SESSION|CREDENTIAL/i;

// The only form in which an environment variable may appear in a log line: its name, or a generic phrase
// when the name could point at a secret.
export function loggableEnvName(name) {
  return typeof name === 'string' && /^[A-Za-z_][A-Za-z0-9_]{0,63}$/.test(name) && !SENSITIVE_ENV_NAME.test(name)
    ? name
    : 'an environment variable';
}

function normKey(key) {
  return String(key).toLowerCase().replace(/^bgzflow[_-]?/, '').replace(/[^a-z0-9]/g, '');
}

function toLimit(value) {
  if (typeof value === 'boolean' || value === null || value === undefined) return undefined;
  if (typeof value === 'string' && !value.trim()) return undefined;
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0 || n > MAX_VALUE) return undefined;
  return n;
}

export function readProjectConfig(projectDir, warnings = []) {
  if (!projectDir) return {};
  const file = path.join(projectDir, '.bgzflow', 'config.json');
  let text;
  try {
    text = fs.readFileSync(file, 'utf8');
  } catch {
    return {};
  }
  try {
    const parsed = JSON.parse(text);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('not an object');
    const out = {};
    for (const [k, v] of Object.entries(parsed)) out[normKey(k)] = v;
    return out;
  } catch (err) {
    warnings.push(`config.json ignored: ${err.message}`);
    return {};
  }
}

export function loadConfig(projectDir, env = process.env) {
  const warnings = [];
  const file = readProjectConfig(projectDir, warnings);
  const cfg = { warnings };
  for (const name of Object.keys(DEFAULTS)) {
    let value;
    const envName = ENV_NAMES[name];
    if (env[envName] !== undefined && env[envName] !== '') {
      value = toLimit(env[envName]);
      if (value === undefined) warnings.push(`${loggableEnvName(envName)} ignored (need a number above 0)`);
    }
    if (value === undefined) {
      const raw = file[normKey(envName)];
      if (raw !== undefined) {
        value = toLimit(raw);
        if (value === undefined) warnings.push(`config.json ${loggableEnvName(envName)} ignored (need a number above 0)`);
      }
    }
    cfg[name] = value === undefined ? DEFAULTS[name] : value;
  }
  // Optional extra state folders (absolute, or relative to the project) for the snapshot hook.
  const listed = [];
  const fromEnv = env.BGZFLOW_STATE_DIRS;
  if (typeof fromEnv === 'string' && fromEnv.trim()) listed.push(...fromEnv.split(path.delimiter));
  const fromFile = file.statedirs;
  if (Array.isArray(fromFile)) listed.push(...fromFile.filter((s) => typeof s === 'string'));
  cfg.stateDirs = listed.map((s) => s.trim()).filter(Boolean).slice(0, 20);
  cfg.mailDir = typeof env.BG_MAIL_DIR === 'string' && env.BG_MAIL_DIR.trim()
    ? path.resolve(env.BG_MAIL_DIR)
    : null;
  return cfg;
}
