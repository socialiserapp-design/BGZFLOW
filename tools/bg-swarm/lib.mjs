// Swarm registry, host argument plans, and the text status view.
// Host flags were checked against `grok --help`, `codex exec --help`, and `claude --help`.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CLI_NAMES = new Set(['grok', 'codex', 'claude', 'kimi']);
export const PRUNE_MS = 7 * 24 * 60 * 60 * 1000;

export function usage(message) {
  const err = new Error(message);
  err.exitCode = 2;
  return err;
}

export function resolveSwarmDir(env = process.env, homedir = os.homedir(), platform = process.platform) {
  if (env.BG_SWARM_DIR) return env.BG_SWARM_DIR;
  const home = typeof homedir === 'function' ? homedir() : homedir;
  if (platform === 'win32') {
    const base = env.LOCALAPPDATA || path.join(home, 'AppData', 'Local');
    return path.join(base, 'bgzflow', 'swarm');
  }
  const base = env.XDG_STATE_HOME || path.join(home, '.local', 'state');
  return path.join(base, 'bgzflow', 'swarm');
}

export function safeName(value, label) {
  if (!/^[A-Za-z0-9._-]+$/.test(value || '') || value === '.' || value === '..') {
    throw usage(`${label} must use letters, numbers, dots, underscores or dashes`);
  }
  return value;
}

export function buildPlan(opts) {
  const extra = opts.extra || [];
  const shell = false;
  if (opts.host === 'grok') {
    if (opts.sessionId && !UUID_RE.test(opts.sessionId)) throw usage('session id must be a UUID');
    const sessionId = opts.sessionId || randomUUID();
    const args = [
      '--prompt-file', opts.promptFile,
      '--cwd', opts.cwd,
      '--output-format', 'streaming-json',
      '--session-id', sessionId,
    ];
    if (opts.model) args.push('--model', opts.model);
    if (opts.effort) args.push('--reasoning-effort', opts.effort);
    if (opts.maxTurns != null && opts.maxTurns !== '') args.push('--max-turns', String(opts.maxTurns));
    args.push(...(opts.readOnly ? ['--permission-mode','plan'] : ['--always-approve']), ...extra);
    return { cmd: 'grok', args, sessionId, stdin: false, shell, cwd: opts.cwd };
  }
  if (opts.host === 'codex') {
    if (opts.effort && !/^[a-z][a-z0-9_-]{0,63}$/.test(opts.effort)) throw usage('invalid codex effort');
    if (opts.maxTurns != null && opts.maxTurns !== '') throw usage('codex exec has no max-turns flag');
    if (opts.sessionId) throw usage('codex exec has no session-id flag');
    const args = ['exec', '--json', '-C', opts.cwd];
    if (opts.model) args.push('--model', opts.model);
    if (opts.effort) args.push('-c', `model_reasoning_effort="${opts.effort}"`);
    if (opts.readOnly) args.push('--sandbox', 'read-only');
    args.push(...extra, '-');
    return { cmd: 'codex', args, sessionId: null, stdin: true, shell, cwd: opts.cwd };
  }
  if (opts.host === 'claude') {
    if (opts.maxTurns != null && opts.maxTurns !== '') throw usage('claude has no max-turns flag');
    if (opts.sessionId) throw usage('this claude launch does not take session-id');
    const args = ['-p', '--output-format', 'stream-json', '--verbose'];
    if (opts.model) args.push('--model', opts.model);
    if (opts.effort) args.push('--effort', opts.effort);
    if (opts.readOnly) args.push('--permission-mode', 'plan');
    args.push(...extra);
    return { cmd: 'claude', args, sessionId: null, stdin: true, shell, cwd: opts.cwd };
  }
  if (opts.host === 'kimi') {
    if (opts.sessionId || opts.maxTurns) {
      throw usage('Kimi qualification does not invent session or max-turns flags');
    }
    if (opts.effort && opts.effort !== 'none') throw usage('Kimi uses thinking rather than effort');
    const args = ['--print', '--work-dir', opts.cwd];
    if (opts.model) args.push('--model', opts.model);
    if (opts.thinking) args.push('--thinking');
    if (opts.readOnly) args.push('--plan');
    else args.push('--yolo');
    args.push(...extra);
    return { cmd: 'kimi', args, sessionId: null, stdin: true, shell, cwd: opts.cwd };
  }
  if (opts.host === 'custom') {
    if (!opts.command) throw usage('custom host needs --command');
    if (opts.model || opts.effort || opts.sessionId || (opts.maxTurns != null && opts.maxTurns !== '')) {
      throw usage('custom host takes --command and extra args only');
    }
    return { cmd: opts.command, args: [...extra], sessionId: null, stdin: false, shell, cwd: opts.cwd };
  }
  throw usage('host must be grok, codex, claude, kimi or custom');
}

export function alive(pid) {
  if (!pid) return false;
  try {
    process.kill(pid, 0);
    // A killed child can remain as a Linux zombie until its parent reaps it. It owns no
    // resources and must not keep a worker or heavy slot marked live.
    if (process.platform === 'linux') {
      try {
        const stat = fs.readFileSync(`/proc/${pid}/stat`, 'utf8');
        const close = stat.lastIndexOf(')');
        if (close >= 0 && stat.slice(close + 2, close + 3) === 'Z') return false;
      } catch { return false; }
    }
    return true;
  } catch (err) {
    return err.code === 'EPERM';
  }
}

export function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

export function writeAtomic(file, data) {
  const dir = path.dirname(file);
  fs.mkdirSync(dir, { recursive: true });
  const tmp = path.join(dir, `.${path.basename(file)}.${process.pid}.${Date.now()}.tmp`);
  fs.writeFileSync(tmp, `${JSON.stringify(data)}\n`);
  const backup = path.join(dir, `.${path.basename(file)}.bak`);
  try { fs.rmSync(backup, { force: true }); } catch { /* nothing to clear */ }
  if (fs.existsSync(file)) {
    try { fs.renameSync(file, backup); }
    catch (err) {
      try { fs.rmSync(tmp, { force: true }); } catch { /* keep the original error */ }
      throw err; // The original must remain intact unless its backup is durable.
    }
  }
  try {
    fs.renameSync(tmp, file);
  } catch (err) {
    try {
      if (!fs.existsSync(file) && fs.existsSync(backup)) fs.renameSync(backup, file);
    } catch { /* the original error is the one to report */ }
    try { fs.rmSync(tmp, { force: true }); } catch { /* ignore */ }
    throw err;
  }
  try { fs.rmSync(backup, { force: true }); } catch { /* ignore */ }
}

export function fileSize(file) {
  try {
    return fs.statSync(file).size;
  } catch {
    return 0;
  }
}

export function lastLines(file, count = 20) {
  let text = '';
  try {
    text = fs.readFileSync(file, 'utf8');
  } catch {
    return [];
  }
  const lines = text.split(/\r?\n/);
  if (lines.length && lines[lines.length - 1] === '') lines.pop();
  return lines.slice(-count);
}

export function workerState(rec, { now, stallMinutes, isAlive, bytes }) {
  if (rec.state === 'failed-to-start') return 'failed-to-start';
  if (rec.state === 'stopped') return 'stopped';
  if (!isAlive) {
    if (Number.isInteger(rec.exitCode)) return `exited ${rec.exitCode}`;
    return 'exited ?';
  }
  const grown = bytes > (rec.lastBytes || 0);
  const last = grown ? now : (rec.lastGrowthAt || rec.started || now);
  if (now - last >= Number(stallMinutes) * 60 * 1000) return 'stalled';
  if (rec.state === 'starting') return 'starting';
  return 'running';
}

export function parseTasklist(text) {
  const rows = [];
  for (const line of String(text).split(/\r?\n/)) {
    if (!line.trim()) continue;
    const fields = [];
    const re = /"([^"]*)"/g;
    let match;
    while ((match = re.exec(line))) fields.push(match[1]);
    if (fields.length < 2) continue;
    const pid = Number(fields[1]);
    if (!Number.isInteger(pid)) continue;
    rows.push({ pid, name: fields[0].replace(/\.exe$/i, '').toLowerCase() });
  }
  return rows;
}

export function parsePs(text) {
  const rows = [];
  for (const line of String(text).split(/\n/)) {
    const match = line.trim().match(/^(\d+)\s+(\S+)/);
    if (!match) continue;
    const base = match[2].split(/[/\\]/).pop().replace(/\.exe$/i, '').toLowerCase();
    rows.push({ pid: Number(match[1]), name: base });
  }
  return rows;
}

export function countUnregistered(entries, registeredPids) {
  const counts = { grok: 0, codex: 0, claude: 0 };
  for (const entry of entries) {
    if (!CLI_NAMES.has(entry.name)) continue;
    if (registeredPids.has(entry.pid)) continue;
    counts[entry.name] += 1;
  }
  return counts;
}

function clip(text, max = 80) {
  const line = String(text);
  if (line.length <= max) return line;
  return `${line.slice(0, max - 3)}...`;
}

function percent(value) {
  const rounded = Math.round(Number(value) * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

export function formatStatus(data, now = Date.now()) {
  const lines = [];
  lines.push(`cpu ${percent(data.cpu.busyPercent)}% busy, ${data.cpu.logical} logical`);
  const slots = data.heavy?.slots || [];
  const waiting = data.heavy?.waiting || [];
  if (!slots.length && !waiting.length) lines.push('heavy (none)');
  for (const slot of slots) {
    const age = Number.isFinite(slot.started) ? Math.max(0, Math.round((now - slot.started) / 60000)) : 0;
    const how = slot.stale ? 'stale' : 'running';
    const file = String(slot.file || 'slot').replace(/\.json$/, '');
    lines.push(`heavy ${file} ${how} ${age}m pid ${slot.pid} ${slot.label || '(no label)'}`);
  }
  for (const row of waiting) {
    lines.push(`heavy waiting pid ${row.pid} ${row.label || '(no label)'}`);
  }
  const workers = data.workers || [];
  if (!workers.length) lines.push('workers (none)');
  for (const worker of workers) {
    lines.push(`${worker.project}/${worker.name} ${worker.host} ${worker.state} pid ${worker.pid} age ${worker.ageMinutes}m quiet ${worker.quietMinutes}m`);
  }
  const unregistered = data.unregistered || { grok: 0, codex: 0, claude: 0 };
  lines.push(`unreg grok ${unregistered.grok}, codex ${unregistered.codex}, claude ${unregistered.claude}`);
  return `${lines.map((line) => clip(line)).join('\n')}\n`;
}

export function minutesBetween(later, earlier) {
  if (!Number.isFinite(earlier)) return 0;
  return Math.max(0, Math.round((later - earlier) / 60000));
}

export async function sampleCpu(pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms))) {
  const totalOf = (list) => {
    let idle = 0;
    let total = 0;
    for (const cpu of list) {
      const times = cpu.times;
      idle += times.idle;
      total += times.user + times.nice + times.sys + times.idle + times.irq;
    }
    return { idle, total };
  };
  const before = totalOf(os.cpus());
  await pause(1000);
  const after = totalOf(os.cpus());
  const total = after.total - before.total;
  const idle = after.idle - before.idle;
  const busy = total <= 0 ? 0 : (1 - idle / total) * 100;
  const busyPercent = Math.max(0, Math.min(100, Math.round(busy * 10) / 10));
  return { busyPercent, logical: os.cpus().length };
}

export function killTree(pid) {
  if (!pid) return Promise.resolve();
  if (process.platform === 'win32') {
    return new Promise((resolve) => {
      const child = spawn('taskkill', ['/PID', String(pid), '/T', '/F'], {
        shell: false,
      });
      child.on('exit', () => resolve());
      child.on('error', () => resolve());
    });
  }
  if (process.platform === 'linux') {
    // Kill descendants first and briefly leave their parent alive to reap them. Minimal
    // containers often have a PID 1 that does not reap adopted zombies.
    const children = new Map();
    try {
      for (const name of fs.readdirSync('/proc')) {
        if (!/^\d+$/.test(name)) continue;
        try {
          const status = fs.readFileSync(`/proc/${name}/status`, 'utf8');
          const parent = Number((status.match(/^PPid:\s+(\d+)/m) || [])[1]);
          if (!children.has(parent)) children.set(parent, []);
          children.get(parent).push(Number(name));
        } catch { /* process ended while scanning */ }
      }
    } catch { /* /proc unavailable */ }
    const descendants = [];
    const visit = (parent) => { for (const child of children.get(parent) || []) { visit(child); descendants.push(child); } };
    visit(Number(pid));
    for (const child of descendants) { try { process.kill(child, 'SIGKILL'); } catch { /* ended */ } }
    return new Promise((resolve) => setTimeout(() => {
      try { process.kill(pid, 'SIGKILL'); } catch { /* ended */ }
      resolve();
    }, descendants.length ? 100 : 0));
  }
  try { process.kill(-pid, 'SIGKILL'); } catch { /* the pid may not be a process-group leader */ }
  try { process.kill(pid, 'SIGKILL'); } catch { /* already gone */ }
  return Promise.resolve();
}

export function isInside(root, file) {
  if (!root || !file) return false;
  const rel = path.relative(path.resolve(root), path.resolve(file));
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
}
