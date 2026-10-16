#!/usr/bin/env node
// Run one heavy local job (full tests, native build) through a machine-wide queue.
// Default slots: 1 per 16 logical CPUs, minimum 1. Below-normal priority is inherited
// by the job. A slot whose pid is dead, or whose start is older than 4 hours, is free.
// Usage:
//   node bg-heavy.mjs [--label TEXT] [--slots N] [--wait-max MINUTES] [--priority below|normal] -- <command> [args...]
//   node bg-heavy.mjs status
// Env: BG_HEAVY_SLOTS, BG_HEAVY_DIR, BG_HEAVY_PRIORITY (below|normal).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { STALE_MS, alive, defaultSlotCount, resolveHeavyDir } from './dir.mjs';
import { recordOwnedProcess, setOwnedProcessState } from '../bg-governor/processes.mjs';

const CPUS = typeof os.availableParallelism === 'function' ? os.availableParallelism() : os.cpus().length;
const DIR = resolveHeavyDir();
const FRESH_MS = 30 * 1000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const log = (msg) => process.stderr.write(`bg-heavy: ${msg}\n`);

function read(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

function isStale(file) {
  const rec = read(file);
  if (!rec) {
    try {
      return Date.now() - fs.statSync(file).mtimeMs > FRESH_MS;
    } catch {
      return false;
    }
  }
  return !alive(rec.pid) || Date.now() - rec.started > STALE_MS;
}

// Move an abandoned slot aside. If a live owner appears in that moment, link it back.
function clearStale(file) {
  const aside = `${file}.${process.pid}.stale`;
  try {
    fs.renameSync(file, aside);
  } catch {
    return;
  }
  if (!isStale(aside)) {
    try { fs.linkSync(aside, file); } catch { /* slot already retaken */ }
  }
  try { fs.unlinkSync(aside); } catch { /* ignore */ }
}

function acquire(slots, meta) {
  fs.mkdirSync(DIR, { recursive: true });
  for (let i = 1; i <= slots; i += 1) {
    const file = path.join(DIR, `slot-${i}.json`);
    if (fs.existsSync(file) && isStale(file)) clearStale(file);
    try {
      const fd = fs.openSync(file, 'wx');
      fs.writeSync(fd, JSON.stringify({ ...meta, slot: i, started: Date.now() }));
      fs.closeSync(fd);
      return file;
    } catch (err) {
      if (err.code !== 'EEXIST') throw err;
    }
  }
  return null;
}

function holders() {
  let names = [];
  try {
    names = fs.readdirSync(DIR).filter((name) => /^slot-\d+\.json$/.test(name)).sort();
  } catch {
    /* no queue yet */
  }
  return names.map((name) => ({ f: name, rec: read(path.join(DIR, name)) })).filter((row) => row.rec);
}

function describe({ f, rec }) {
  const mins = Math.round((Date.now() - rec.started) / 60000);
  const state = alive(rec.pid) ? 'running' : 'stale';
  return `${f}: ${state} ${mins} min, pid ${rec.pid}, ${rec.label || '(no label)'}, ${rec.cwd}, ${rec.command}`;
}

const USAGE = 'usage: bg-heavy [--label TEXT] [--slots N] [--wait-max MINUTES] [--priority below|normal] -- <command> [args...] | status';
const argv = process.argv.slice(2);
if (argv[0] === 'status') {
  const held = holders();
  console.log(held.length ? held.map(describe).join('\n') : 'bg-heavy: no heavy jobs running');
  process.exit(0);
}

let label = '';
let slots = Number(process.env.BG_HEAVY_SLOTS) || defaultSlotCount(CPUS);
let waitMax = 180;
let priority = process.env.BG_HEAVY_PRIORITY === 'normal' ? 'normal' : 'below';
let index = 0;
for (; index < argv.length; index += 1) {
  const arg = argv[index];
  if (arg === '--') { index += 1; break; }
  // Help never queues: a help flag must not take the machine's heavy slot or run as a command.
  if (arg === '--help' || arg === '-h') {
    console.log(USAGE);
    process.exit(0);
  }
  if (arg === '--label') label = argv[++index] || '';
  else if (arg === '--slots') slots = Math.max(1, Number(argv[++index]) || 1);
  else if (arg === '--wait-max') {
    const value = Number(argv[++index]);
    if (Number.isFinite(value)) waitMax = value;
  } else if (arg === '--priority') priority = argv[++index] === 'normal' ? 'normal' : 'below';
  else break;
}

const cmd = argv.slice(index);
if (!cmd.length) {
  log(USAGE);
  process.exit(2);
}

// One argument is a full command line. Several arguments are quoted and joined for the shell.
const quote = (value) => (/^[\w@%+=:,./\\-]+$/.test(value) ? value : `"${String(value).replace(/"/g, '\\"')}"`);
const line = cmd.length === 1 ? cmd[0] : cmd.map(quote).join(' ');
const meta = {
  pid: process.pid,
  token: `${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  label,
  cwd: process.cwd(),
  command: line.slice(0, 300),
};

function waiterPath() {
  return path.join(DIR, `wait-${meta.token}.json`);
}
function writeWaiter() {
  try {
    fs.mkdirSync(DIR, { recursive: true });
    fs.writeFileSync(waiterPath(), JSON.stringify({ ...meta, kind: 'waiting', since: Date.now() }));
  } catch {
    /* a missing waiter file only hides the name in status */
  }
}
function clearWaiter() {
  try { fs.unlinkSync(waiterPath()); } catch { /* already gone */ }
}

const deadline = Date.now() + (waitMax * 60000);
let slot = acquire(slots, meta);
if (!slot) {
  log(`waiting for a heavy slot (${slots} on this machine); held by:\n  ${holders().map(describe).join('\n  ')}`);
}
while (!slot) {
  if (Date.now() >= deadline) {
    clearWaiter();
    log(`gave up after ${waitMax} min; all heavy slots are busy`);
    process.exit(75);
  }
  writeWaiter();
  await sleep(10000 + Math.random() * 5000);
  clearWaiter();
  slot = acquire(slots, meta);
}
clearWaiter();

if (priority === 'below') {
  try {
    os.setPriority(0, os.constants.priority.PRIORITY_BELOW_NORMAL);
  } catch {
    priority = 'normal';
  }
}
const priorityText = priority === 'below' ? 'below-normal' : 'normal';
log(`${path.basename(slot, '.json')} of ${slots} taken; running at ${priorityText} priority: ${line}`);

const release = () => {
  clearWaiter();
  const rec = read(slot);
  if (rec && rec.token === meta.token) {
    try { fs.unlinkSync(slot); } catch { /* already gone */ }
  }
};

const env = { ...process.env, BG_HEAVY: '1' };
// Several arguments run as an array. A single argument stays a shell command line, matching the queue's original use.
const child = cmd.length === 1
  ? spawn(cmd[0], { stdio: 'inherit', shell: true, env })
  : spawn(cmd[0], cmd.slice(1), { stdio: 'inherit', shell: false, env });
const processOwner = `bg-heavy:${meta.token}`;
child.once('spawn', () => {
  try { recordOwnedProcess(child.pid, processOwner, env); }
  catch (error) { log(`ownership receipt unavailable: ${error.message}`); }
});
child.once('exit', () => {
  try { setOwnedProcessState(child.pid, processOwner, 'exited', env); }
  catch { /* An exited PID has no live identity and can never be reaped. */ }
});

process.on('exit', release);
for (const sig of ['SIGINT', 'SIGTERM', 'SIGBREAK', 'SIGHUP']) {
  process.on(sig, () => {
    try { child.kill(sig); } catch { /* gone */ }
    release();
    process.exit(130);
  });
}
child.on('error', (err) => {
  log(err.message);
  release();
  process.exit(127);
});
child.on('exit', (code, signal) => {
  release();
  process.exit(code ?? (signal ? 1 : 0));
});
