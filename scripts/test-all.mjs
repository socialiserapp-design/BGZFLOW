#!/usr/bin/env node
// Runs every test suite in this repository, one suite at a time, and prints one summary.
//   node scripts/test-all.mjs              run every suite (npm test runs the same command)
//   node scripts/test-all.mjs --list       print the suites it would run, and run nothing
//   node scripts/test-all.mjs --only doctor   run only the suites whose path contains the text
//
// Suites (including tools/lessons/test) are found on disk automatically:
// - Node: every folder holding *.test.mjs files, run with node:test. A folder whose package.json names a
//   "main" is run through that entry (its index imports the suite), because Node 24 loads a folder as one module.
// - Python: every test_*.py file, run with unittest under Python 3.10 or newer (python3, python or py -3).
// Each suite's full output is written to .tmp/test-all/; the console shows one line per suite and the
// full output of any suite that fails. A suite still running after BGZFLOW_TEST_TIMEOUT_MIN minutes
// (default 15) is stopped and counted as failed, so a hang cannot hold a shared machine slot.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LOGS = path.join(ROOT, '.tmp', 'test-all');
const SKIP_DIRS = new Set(['.git', '.tmp', 'node_modules', '__pycache__', 'fixtures', '.codegraph', '.notes-map']);
const NODE_TEST = /\.test\.(?:mjs|cjs|js)$/;
const PY_TEST = /^test_.*\.py$/;
const timeoutMs = (Number(process.env.BGZFLOW_TEST_TIMEOUT_MIN) || 15) * 60_000;
const env = { ...process.env, PYTHONUTF8: '1', PYTHONIOENCODING: 'utf-8', PYTHONDONTWRITEBYTECODE: '1' };
const rel = (p) => path.relative(ROOT, p).split(path.sep).join('/');

function findSuites() {
  const nodeDirs = new Map();
  const python = [];
  const stack = [ROOT];
  while (stack.length) {
    const dir = stack.pop();
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (!SKIP_DIRS.has(e.name)) stack.push(full);
      } else if (NODE_TEST.test(e.name)) {
        if (!nodeDirs.has(dir)) nodeDirs.set(dir, []);
        nodeDirs.get(dir).push(rel(full));
      } else if (PY_TEST.test(e.name)) {
        python.push(full);
      }
    }
  }
  const suites = [];
  for (const [dir, files] of nodeDirs) {
    let main = null;
    try {
      main = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8')).main || null;
    } catch {
      main = null;
    }
    suites.push({ name: rel(dir), kind: 'node', targets: main ? [rel(path.join(dir, main))] : files.sort() });
  }
  for (const file of python) suites.push({ name: rel(file), kind: 'python', file });
  return suites.sort((a, b) => a.name.localeCompare(b.name));
}

function findPython() {
  const probe = 'import sys; sys.exit(0 if sys.version_info >= (3, 10) else 1)';
  for (const cmd of [['python3'], ['python'], ['py', '-3']]) {
    const check = spawnSync(cmd[0], [...cmd.slice(1), '-c', probe], { stdio: 'ignore', env });
    if (!check.error && check.status === 0) return cmd;
  }
  return null;
}

function nodeCounts(out) {
  // The summary is the last block of the TAP output, so take the last match of each line.
  const get = (key) => Number([...out.matchAll(new RegExp(`^# ${key} (\\d+)`, 'gm'))].pop()?.[1] || 0);
  return { tests: get('tests'), pass: get('pass'), fail: get('fail') + get('cancelled'), skip: get('skipped') + get('todo') };
}

function pythonCounts(out) {
  const tests = Number((out.match(/^Ran (\d+) tests? in /m) || [])[1] || 0);
  const detail = (out.match(/^(?:OK|FAILED)(?: \((.*)\))?\s*$/m) || [])[1] || '';
  const get = (key) => Number((detail.match(new RegExp(`${key}=(\\d+)`)) || [])[1] || 0);
  const fail = get('failures') + get('errors') + get('unexpected successes');
  const skip = get('skipped') + get('expected failures');
  return { tests, pass: Math.max(0, tests - fail - skip), fail, skip };
}

function run(suite, python) {
  let cmd;
  let args;
  if (suite.kind === 'node') {
    cmd = process.execPath;
    // Keep file-level subprocesses serial; tests still exercise their own concurrent work.
    args = ['--test', '--test-concurrency=1', '--test-reporter=tap', ...suite.targets];
  } else if (python) {
    const dir = path.dirname(suite.file);
    cmd = python[0];
    args = [...python.slice(1), '-m', 'unittest', 'discover', '-v', '-s', dir, '-t', dir, '-p', path.basename(suite.file)];
  } else {
    return { out: 'Python 3.10 or newer was not found (tried python3, python, py -3)\n', status: 127, ms: 0, timedOut: false };
  }
  const start = Date.now();
  const r = spawnSync(cmd, args, { cwd: ROOT, env, encoding: 'utf8', timeout: timeoutMs, maxBuffer: 256 * 1024 * 1024 });
  const timedOut = r.error?.code === 'ETIMEDOUT';
  const out = `${r.stdout || ''}${r.stderr || ''}${r.error && !timedOut ? `\n${r.error.message}\n` : ''}`;
  return { out, status: r.status, ms: Date.now() - start, timedOut };
}

const USAGE = 'usage: node scripts/test-all.mjs [--list] [--only <text>]';
const argv = process.argv.slice(2);
let listOnly = false;
let only = null;
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === '--list') listOnly = true;
  else if (argv[i] === '--only' && argv[i + 1]) only = argv[++i];
  else if (argv[i] === '--help' || argv[i] === '-h') {
    console.log(USAGE);
    process.exit(0);
  } else {
    console.error(USAGE);
    process.exit(2);
  }
}

const suites = findSuites().filter((s) => only === null || s.name.includes(only));
if (suites.length === 0) {
  console.error(`no suite matches "${only}"`);
  process.exit(2);
}
if (listOnly) {
  for (const s of suites) console.log(s.kind === 'node' ? `node ${s.name} -> ${s.targets.join(' ')}` : `python ${s.name}`);
  process.exit(0);
}
const python = suites.some((s) => s.kind === 'python') ? findPython() : null;
fs.rmSync(LOGS, { recursive: true, force: true });
fs.mkdirSync(LOGS, { recursive: true });

const total = { tests: 0, pass: 0, fail: 0, skip: 0, ms: 0 };
let failedSuites = 0;
const started = Date.now();
for (const suite of suites) {
  const res = run(suite, python);
  const counts = suite.kind === 'node' ? nodeCounts(res.out) : pythonCounts(res.out);
  // A suite that ran no tests, exited non-zero or timed out has failed even when no single test did.
  const ok = res.status === 0 && !res.timedOut && counts.fail === 0 && counts.tests > 0;
  fs.writeFileSync(path.join(LOGS, `${suite.name.replace(/[\\/:]/g, '_')}.log`), res.out);
  for (const k of ['tests', 'pass', 'fail', 'skip']) total[k] += counts[k];
  const note = res.timedOut ? ` timed out after ${timeoutMs / 60_000} min` : ok ? '' : ` exit ${res.status}`;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${suite.name.padEnd(58)} tests ${String(counts.tests).padStart(3)}  pass ${String(counts.pass).padStart(3)}  fail ${counts.fail}  skip ${counts.skip}  ${(res.ms / 1000).toFixed(1)}s${note}`);
  if (!ok) {
    failedSuites++;
    process.stdout.write(`---- output of ${suite.name} ----\n${res.out}\n---- end of ${suite.name} ----\n`);
  }
}
total.ms = Date.now() - started;
console.log(`RESULT suites ${suites.length} (failed ${failedSuites})  tests ${total.tests}  pass ${total.pass}  fail ${total.fail}  skip ${total.skip}  duration ${(total.ms / 1000).toFixed(1)}s  logs .tmp/test-all/`);
process.exitCode = failedSuites === 0 ? 0 : 1;
