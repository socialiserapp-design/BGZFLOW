#!/usr/bin/env node
// Launch and watch local AI workers. Prompts go in a file. Arguments are an array.
// Usage:
//   node bg-swarm.mjs launch --project P --name N --host grok|codex|claude|custom --cwd DIR --prompt-file FILE [--model M] [--effort E] [--max-turns N] [--session-id UUID] [--verify-seconds 90] [--command X] [-- extra args]
//   node bg-swarm.mjs status [--project P] [--json] [--stall-minutes N]
//   node bg-swarm.mjs stop --project P --name N
//   node bg-swarm.mjs reap [--prune]
// Env: BG_SWARM_DIR, BG_HEAVY_DIR.
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { readHeavyQueue, resolveHeavyDir } from '../bg-heavy/dir.mjs';
import { checkDispatch, recordState, resolveSwarmProject } from '../swarm-gate/swarm-gate.mjs';
import {
  PRUNE_MS,
  alive,
  buildPlan,
  countUnregistered,
  fileSize,
  formatStatus,
  isInside,
  killTree,
  lastLines,
  minutesBetween,
  parsePs,
  parseTasklist,
  readJson,
  resolveSwarmDir,
  safeName,
  sampleCpu,
  usage,
  workerState,
  writeAtomic,
} from './lib.mjs';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const log = (msg) => process.stderr.write(`bg-swarm: ${msg}\n`);

const ALLOWED = {
  launch: new Set(['project', 'name', 'host', 'cwd', 'prompt-file', 'model', 'effort', 'max-turns', 'session-id', 'verify-seconds', 'command', 'resource', 'worker-hours', 'gate-id','thinking']),
  status: new Set(['project', 'json', 'stall-minutes']),
  stop: new Set(['project', 'name']),
  reap: new Set(['prune']),
};

function parseArgs(argv, allowed) {
  const flags = {};
  const extra = [];
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--') {
      extra.push(...argv.slice(i + 1));
      break;
    }
    if (!arg.startsWith('--') || arg.length < 3) throw usage(`unexpected argument ${arg}`);
    const key = arg.slice(2);
    if (!allowed.has(key)) throw usage(`unknown option --${key}`);
    if (key === 'json' || key === 'prune'||key==='thinking') {
      flags[key] = true;
      continue;
    }
    const value = argv[i + 1];
    if (value == null || value.startsWith('--')) throw usage(`--${key} needs a value`);
    flags[key] = value;
    i += 1;
  }
  return { flags, extra };
}

function requireFlag(flags, key) {
  if (!flags[key]) throw usage(`--${key} is required`);
  return flags[key];
}

function recordPath(dir, project, name) {
  return path.join(dir, project, `${name}.json`);
}

function listRecords(dir) {
  const found = [];
  let projects = [];
  try {
    projects = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return found;
  }
  for (const project of projects) {
    if (!project.isDirectory() || project.name.startsWith('.')) continue;
    const folder = path.join(dir, project.name);
    let files = [];
    try {
      files = fs.readdirSync(folder);
    } catch {
      continue;
    }
    for (const name of files) {
      if (name.startsWith('.') || !name.endsWith('.json')) continue;
      const file = path.join(folder, name);
      const rec = readJson(file);
      if (!rec) continue;
      found.push({ file, rec });
    }
  }
  return found;
}

function dumpTail(label, file) {
  const lines = lastLines(file, 20);
  process.stderr.write(`bg-swarm: ${label}\n`);
  process.stderr.write(lines.length ? `${lines.join('\n')}\n` : '(empty)\n');
}

function readProcessTable() {
  return new Promise((resolve) => {
    const win = process.platform === 'win32';
    const child = spawn(win ? 'tasklist' : 'ps', win ? ['/fo', 'csv', '/nh'] : ['-eo', 'pid,args'], {
      shell: false,
    });
    let out = '';
    let settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };
    const timer = setTimeout(() => {
      try { child.kill(); } catch { /* already gone */ }
      finish(null);
    }, 10000);
    child.stdout.on('data', (chunk) => { out += chunk; });
    child.on('error', () => { clearTimeout(timer); finish(null); });
    child.on('exit', (code) => {
      clearTimeout(timer);
      finish(code === 0 ? out : (out || null));
    });
  });
}

async function prove(child, outFile, errFile, seconds, observed) {
  const deadline = Date.now() + (Number(seconds) * 1000);
  let firstAt = 0;
  while (true) {
    if (!child.pid || observed.error) {
      await sleep(50);
      return { ok: false, firstAt };
    }
    const living = !observed.exited && alive(child.pid);
    if (!living) {
      await sleep(150);
      return { ok: false, firstAt };
    }
    const bytes = fileSize(outFile) + fileSize(errFile);
    if (bytes > 0) {
      if (!firstAt) firstAt = Date.now();
      await sleep(150);
      if (observed.exited || observed.error || !alive(child.pid)) return { ok: false, firstAt };
      return { ok: true, firstAt };
    }
    if (Date.now() >= deadline) return { ok: false, firstAt };
    await sleep(100);
  }
}

async function failStart(rec, file, child, outFile, errFile, project, name) {
  rec.state = 'failed-to-start';
  writeAtomic(file, rec);
  if (child?.pid) {
    await killTree(child.pid);
    const end = Date.now() + 10000;
    while (alive(child.pid) && Date.now() < end) await sleep(200);
  }
  await sleep(100);
  log(`failed-to-start ${project}/${name}`);
  dumpTail('stdout', outFile);
  dumpTail('stderr', errFile);
  process.exit(1);
}

async function cmdLaunch(argv) {
  const { flags, extra } = parseArgs(argv, ALLOWED.launch);
  const project = safeName(requireFlag(flags, 'project'), 'project');
  const name = safeName(requireFlag(flags, 'name'), 'name');
  const host = requireFlag(flags, 'host');
  const cwd = requireFlag(flags, 'cwd');
  const promptFile = requireFlag(flags, 'prompt-file');
  let cwdOk = false;
  try { cwdOk = fs.statSync(cwd).isDirectory(); } catch { cwdOk = false; }
  if (!cwdOk) throw usage('cwd must be an existing directory');
  let promptOk = false;
  try { promptOk = fs.statSync(promptFile).isFile(); } catch { promptOk = false; }
  if (!promptOk) throw usage('prompt file was not found');
  const gateProject = resolveSwarmProject({ cwd: process.cwd(), workerCwd: cwd });
  const gateId = flags['gate-id'] || `local-${project}-${name}-${Date.now()}`;
  const gateInput = { jobId: gateId, launch: true, command: ['bg-swarm launch', ...argv].map(s => /\s/.test(s) ? JSON.stringify(s) : s).join(' '), cwd,
    promptFile, model: flags.model, effort: flags.effort, resource: flags.resource || (host === 'custom' ? undefined : host+'-local'), workerHours: flags['worker-hours'] };
  let gate;
  try { gate = checkDispatch(gateProject, gateInput); } catch { log('swarm-gate warning: internal error; non-release launch left open'); gate = { allowed: true }; }
  if (!gate.allowed) throw usage(`${gate.rule}: ${gate.reason} Next: ${gate.next}${gate.correctedCommand ? ' Corrected: '+gate.correctedCommand : ''}`);

  const verifySeconds = flags['verify-seconds'] == null ? 90 : Number(flags['verify-seconds']);
  if (!Number.isFinite(verifySeconds) || verifySeconds < 0) throw usage('--verify-seconds must be a number of seconds');

  const plan = buildPlan({
    host,
    promptFile,
    cwd,
    model: flags.model,
    effort: flags.effort,
    thinking:flags.thinking===true,
    maxTurns: flags['max-turns'],
    sessionId: flags['session-id'],
    command: flags.command,
    extra,
    readOnly: /^READ_ONLY:\s*true\s*$/m.test(fs.readFileSync(promptFile, 'utf8')),
  });

  const dir = resolveSwarmDir();
  const file = recordPath(dir, project, name);
  const existing = readJson(file);
  if (existing && alive(existing.pid)) {
    log(`${project}/${name} is already running as pid ${existing.pid}`);
    process.exit(1);
  }
  try { gate = checkDispatch(gateProject, gateInput, { reserve: true }); } catch { log('swarm-gate warning: internal error; non-release launch left open'); gate = { allowed: true }; }
  if (!gate.allowed) throw usage(`${gate.rule}: ${gate.reason} Next: ${gate.next}`);

  const outFile = path.join(dir, project, `${name}.out`);
  const errFile = path.join(dir, project, `${name}.err`);
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, '');
  fs.writeFileSync(errFile, '');

  const started = Date.now();
  const rec = {
    project,
    name,
    host,
    pid: null,
    cwd,
    command: [plan.cmd, ...plan.args],
    sessionId: plan.sessionId,
    started,
    state: 'starting',
    gateId, gateProject,
    exitCode: null,
    lastGrowthAt: started,
    lastBytes: 0,
    outFile,
    errFile,
  };

  const outFd = fs.openSync(outFile, 'w');
  const errFd = fs.openSync(errFile, 'w');
  const observed = { exitCode: null, exited: false, error: null };
  let child;
  try {
    child = spawn(plan.cmd, plan.args, {
      cwd: plan.cwd,
      detached: true,
      shell: false,
      // No windowsHide: shipped code never hides a window (av-safe rule). A detached worker starts with no console of its own.
      stdio: [plan.stdin ? 'pipe' : 'ignore', outFd, errFd],
    });
  } finally {
    fs.closeSync(outFd);
    fs.closeSync(errFd);
  }
  child.on('error', (err) => {
    observed.error = err;
    observed.exited = true;
    try { recordState(gateProject, 'job', { id: gateId, status: 'failed', workerHours: 0, evidence: errFile, error: err.code || 'unknown worker start failure' }); } catch { /* No swarm ledger: ordinary launch. */ }
  });
  child.on('exit', (code) => {
    observed.exited = true;
    if (Number.isInteger(code)) {
      observed.exitCode = code;
      rec.exitCode = code;
    }
  });
  if (plan.stdin && child.stdin) {
    child.stdin.write(fs.readFileSync(promptFile));
    child.stdin.end();
  }
  rec.pid = child.pid ?? null;
  writeAtomic(file, rec);

  const proof = await prove(child, outFile, errFile, verifySeconds, observed);
  if (!proof.ok) {
    if (Number.isInteger(observed.exitCode)) rec.exitCode = observed.exitCode;
    if (observed.error) log(observed.error.message);
    await failStart(rec, file, child, outFile, errFile, project, name);
  }

  rec.state = 'running';
  rec.lastBytes = fileSize(outFile) + fileSize(errFile);
  rec.lastGrowthAt = proof.firstAt || Date.now();
  rec.exitCode = null;
  writeAtomic(file, rec);
  child.unref();
  const seconds = ((proof.firstAt - started) / 1000).toFixed(1);
  log(`${project}/${name} running pid ${child.pid} (${seconds}s to first output)`);
  process.exit(0);
}

function presentWorker(rec, state, now) {
  return {
    project: rec.project,
    name: rec.name,
    host: rec.host,
    pid: rec.pid,
    state,
    ageMinutes: minutesBetween(now, rec.started),
    quietMinutes: minutesBetween(now, rec.lastGrowthAt || rec.started),
    cwd: rec.cwd || '',
    command: rec.command || [],
    sessionId: rec.sessionId || null,
    started: rec.started,
    exitCode: rec.exitCode,
  };
}

async function cmdStatus(argv) {
  const { flags, extra } = parseArgs(argv, ALLOWED.status);
  if (extra.length) throw usage('status does not take extra arguments');
  const stallMinutes = flags['stall-minutes'] == null ? 30 : Number(flags['stall-minutes']);
  if (!Number.isFinite(stallMinutes) || stallMinutes < 0) throw usage('--stall-minutes must be a number');
  const projectFilter = flags.project ? safeName(flags.project, 'project') : '';
  const now = Date.now();
  const cpu = await sampleCpu();
  const heavy = readHeavyQueue(resolveHeavyDir());
  const dir = resolveSwarmDir();
  const records = listRecords(dir);
  const registered = new Set(records.map((row) => row.rec.pid).filter((pid) => Number.isInteger(pid)));
  const workers = [];
  for (const { file, rec } of records) {
    if (projectFilter && rec.project !== projectFilter) continue;
    const bytes = fileSize(rec.outFile) + fileSize(rec.errFile);
    const isAlive = alive(rec.pid);
    const state = workerState(rec, { now, stallMinutes, isAlive, bytes });
    if (bytes > (rec.lastBytes || 0)) {
      rec.lastBytes = bytes;
      rec.lastGrowthAt = now;
      writeAtomic(file, rec);
    }
    workers.push(presentWorker(rec, state, now));
  }
  workers.sort((a, b) => `${a.project}/${a.name}`.localeCompare(`${b.project}/${b.name}`));
  const table = await readProcessTable();
  let unregistered = { grok: 0, codex: 0, claude: 0 };
  if (table == null) log('could not list processes; unregistered counts are 0');
  else {
    const entries = process.platform === 'win32' ? parseTasklist(table) : parsePs(table);
    unregistered = countUnregistered(entries, registered);
  }
  const data = { cpu, heavy, workers, unregistered, stallMinutes };
  if (flags.json) process.stdout.write(`${JSON.stringify(data)}\n`);
  else process.stdout.write(formatStatus(data, now));
  process.exit(0);
}

async function cmdStop(argv) {
  const { flags, extra } = parseArgs(argv, ALLOWED.stop);
  if (extra.length) throw usage('stop does not take extra arguments');
  const project = safeName(requireFlag(flags, 'project'), 'project');
  const name = safeName(requireFlag(flags, 'name'), 'name');
  const file = recordPath(resolveSwarmDir(), project, name);
  const rec = readJson(file);
  if (!rec) {
    log(`no worker ${project}/${name}`);
    process.exit(1);
  }
  if (rec.pid) await killTree(rec.pid);
  const end = Date.now() + 10000;
  while (rec.pid && alive(rec.pid) && Date.now() < end) await sleep(200);
  if (rec.pid && alive(rec.pid)) {
    log(`${project}/${name} is still alive as pid ${rec.pid}`);
    process.exit(1);
  }
  rec.state = 'stopped';
  rec.stopped = true;
  rec.stoppedAt = Date.now();
  writeAtomic(file, rec);
  if (rec.gateId) { try { recordState(rec.gateProject, 'job', { id: rec.gateId, status: 'cancelled', workerHours: (rec.stoppedAt-rec.started)/3_600_000, evidence: file, error: 'cancelled by lead' }); } catch { /* Preserve the native result for reconciliation. */ } }
  log(`stopped ${project}/${name}`);
  process.exit(0);
}

async function cmdReap(argv) {
  const { flags, extra } = parseArgs(argv, ALLOWED.reap);
  if (extra.length) throw usage('reap does not take extra arguments');
  const dir = resolveSwarmDir();
  const now = Date.now();
  let marked = 0;
  let pruned = 0;
  for (const { file, rec } of listRecords(dir)) {
    const isAlive = alive(rec.pid);
    const old = Number.isFinite(rec.started) && now - rec.started > PRUNE_MS;
    if (!isAlive && flags.prune && old) {
      for (const extraFile of [rec.outFile, rec.errFile]) {
        if (isInside(dir, extraFile)) {
          try { fs.rmSync(extraFile, { force: true }); } catch { /* already gone */ }
        }
      }
      try { fs.rmSync(file, { force: true }); } catch { /* already gone */ }
      pruned += 1;
      continue;
    }
    if (!isAlive && (rec.state === 'starting' || rec.state === 'running' || rec.state === 'stalled')) {
      rec.state = 'exited';
      writeAtomic(file, rec);
      marked += 1;
    }
  }
  log(`reap marked ${marked}, pruned ${pruned}`);
  process.exit(0);
}

const USAGE = 'usage: bg-swarm <launch|status|stop|reap> [options]  (options and examples: tools/bg-swarm/README.md)';
const command = process.argv[2];
try {
  if (command === 'launch') await cmdLaunch(process.argv.slice(3));
  else if (command === 'status') await cmdStatus(process.argv.slice(3));
  else if (command === 'stop') await cmdStop(process.argv.slice(3));
  else if (command === 'reap') await cmdReap(process.argv.slice(3));
  else if (command === '--help' || command === '-h' || command === 'help') {
    process.stdout.write(`${USAGE}\n`);
    process.exit(0);
  } else {
    throw usage(USAGE);
  }
} catch (err) {
  process.stderr.write(`bg-swarm: ${err.message}\n`);
  process.exit(err.exitCode === 2 ? 2 : 1);
}
