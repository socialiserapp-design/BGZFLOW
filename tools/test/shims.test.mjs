// The POSIX shims in tools/bin: sh scripts that find Node (or Python) and run a tool. They run under Git Bash on
// Windows. There are no .cmd or .ps1 shims: Windows hosts run `node <plugin>/tools/<tool>/<tool>.mjs` directly.
//
// The tools are copied into a folder whose name contains a space, so quoting is tested on every machine.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { after, before, describe, test } from 'node:test';
import { ROOT, TEST_TIMEOUT_MS, cleanEnv } from '../../hooks/test/helpers.mjs';

const TOOLS = ['startup-check', 'bg-rounds', 'doctor', 'notes-map', 'bg-heavy', 'bg-mail', 'bg-governor', 'bg-route', 'bg-swarm', 'swarm-resources', 'swarm-status', 'swarm-gate'];
const NODE_TOOLS = TOOLS.filter((tool) => tool !== 'notes-map');
const candidates = [process.env.BGZFLOW_TEST_BASH, 'C:\\Program Files\\Git\\bin\\bash.exe', 'bash', '/bin/bash', '/bin/sh'].filter(Boolean);
const bash = candidates.find((b) => {
  try {
    return spawnSync(b, ['-c', 'echo ok'], { encoding: 'utf8', timeout: 20000 }).stdout.trim() === 'ok';
  } catch {
    return false;
  }
});
const posix = (p) => p.split(path.sep).join('/');
// The modes git records for the shims. A working tree on Windows carries no executable bit, so the index is the truth.
const gitModes = (() => {
  try {
    const r = spawnSync('git', ['-C', ROOT, 'ls-files', '-s', '--', 'tools/bin'], { encoding: 'utf8', timeout: 20000 });
    if (r.status !== 0 || !r.stdout.trim()) return undefined;
    return Object.fromEntries(r.stdout.trim().split('\n').map((line) => {
      const m = /^(\d+) \S+ \d+\t(?:.*\/)?([^/]+)$/.exec(line.trim());
      return m ? [m[2], m[1]] : ['?', line];
    }));
  } catch {
    return undefined;
  }
})();
const pythonWorks = ['python3', 'python'].some((c) => spawnSync(c, ['-c', 'import sys; sys.exit(0 if sys.version_info >= (3, 10) else 1)'], { stdio: 'ignore' }).status === 0) ||
  spawnSync('py', ['-3', '-c', 'import sys; sys.exit(0 if sys.version_info >= (3, 10) else 1)'], { stdio: 'ignore' }).status === 0;

test('every tool has a POSIX shim with LF line endings, and no Windows launcher is shipped', () => {
  const bin = path.join(ROOT, 'tools', 'bin');
  assert.deepEqual(fs.readdirSync(bin).sort(), [...TOOLS].sort());
  for (const name of TOOLS) {
    const text = fs.readFileSync(path.join(bin, name), 'utf8');
    assert.ok(text.startsWith('#!/bin/sh\n'), `${name}: first line must be #!/bin/sh`);
    assert.ok(!text.includes('\r'), `${name}: no CR characters`);
    assert.match(text, /exit 127/, `${name}: exits 127 when its runtime is missing`);
  }
});

test('every shim is recorded as executable in git, so a POSIX checkout can run it', { skip: !gitModes && 'not a git checkout' }, () => {
  assert.deepEqual(Object.keys(gitModes).sort(), [...TOOLS].sort());
  for (const [name, mode] of Object.entries(gitModes)) assert.equal(mode, '100755', `${name} must be mode 100755 in git`);
});

describe('run through Git Bash from a folder with a space in its name', { skip: !bash && 'no bash on this machine' }, () => {
  let base;
  let bin;
  const sh = (script, args = [], { functions = '', env = {} } = {}) =>
    spawnSync(bash, ['-c', `${functions}\nbash "$0" "$@"`, posix(path.join(bin, script)), ...args], { encoding: 'utf8', env: cleanEnv(env), timeout: TEST_TIMEOUT_MS });

  before(() => {
    base = path.join(ROOT, '.tmp', `shim space ${process.pid}`);
    fs.mkdirSync(base, { recursive: true });
    const ignore = path.join(ROOT, '.tmp', '.gitignore');
    if (!fs.existsSync(ignore)) fs.writeFileSync(ignore, '*\n');
    fs.cpSync(path.join(ROOT, 'tools'), path.join(base, 'tools'), { recursive: true, filter: (src) => !/[\\/](?:\.tmp|__pycache__)(?:[\\/]|$)/.test(src) });
    fs.mkdirSync(path.join(base, 'hooks'), { recursive: true });
    fs.cpSync(path.join(ROOT, 'hooks', 'lib'), path.join(base, 'hooks', 'lib'), { recursive: true });
    bin = path.join(base, 'tools', 'bin');
  });
  after(() => fs.rmSync(base, { recursive: true, force: true }));

  for (const [tool, args, expect] of [
    ['startup-check', ['--help'], /usage: startup-check/],
    ['bg-rounds', ['--help'], /bg-rounds next <package>/],
    ['doctor', ['--help'], /doctor urls/],
    ['swarm-resources', ['--help'], /usage: swarm-resources/],
    ['swarm-status', ['--help'], /usage: swarm-status/],
    ['swarm-gate', ['--help'], /swarm-gate start/],
  ]) {
    test(`${tool} ${args.join(' ')} runs and exits 0`, () => {
      const r = sh(tool, args);
      assert.equal(r.status, 0, `${r.stdout}\n${r.stderr}`);
      assert.match(r.stdout, expect);
    });
  }

  test('notes-map --version runs through the shim', { skip: !pythonWorks && 'no Python 3.10 or newer on this machine' }, () => {
    const r = sh('notes-map', ['--version']);
    assert.equal(r.status, 0, `${r.stdout}\n${r.stderr}`);
    assert.match(r.stdout, /^notes-map \d+\.\d+/);
  });

  // The queue and the worker registry point into this test folder, never at the machine's real ones.
  const queues = () => ({ BG_HEAVY_DIR: path.join(base, 'heavy'), BG_SWARM_DIR: path.join(base, 'swarm') });

  test('bg-heavy status runs through the shim and reads only its own queue folder', () => {
    const r = sh('bg-heavy', ['status'], { env: queues() });
    assert.equal(r.status, 0, `${r.stdout}\n${r.stderr}`);
    assert.match(r.stdout, /bg-heavy: no heavy jobs running/);
  });

  test('bg-swarm status --json runs through the shim with an empty registry', () => {
    const r = sh('bg-swarm', ['status', '--json'], { env: queues() });
    assert.equal(r.status, 0, `${r.stdout}\n${r.stderr}`);
    assert.deepEqual(JSON.parse(r.stdout).workers, []);
  });

  test('the exit code of the tool comes through the shim', () => {
    const r = sh('startup-check', ['--budget', 'abc']);
    assert.equal(r.status, 2);
    assert.match(r.stderr, /--budget needs a number above 0/);
  });

  test('a Node shim without Node exits 127 and says so', () => {
    for (const tool of NODE_TOOLS) {
      const r = sh(tool, ['--help'], { functions: 'node() { return 127; }; export -f node', env: queues() });
      assert.equal(r.status, 127, tool);
      assert.match(r.stderr, new RegExp(`${tool}: Node 18 or newer was not found on PATH`));
    }
  });

  test('the notes-map shim without Python exits 127 and says so', () => {
    const r = sh('notes-map', ['--version'], { functions: 'python3() { return 1; }; python() { return 1; }; py() { return 1; }; export -f python3 python py' });
    assert.equal(r.status, 127);
    assert.match(r.stderr, /notes-map: Python 3\.10 or newer was not found \(tried python3, python, py -3\)/);
  });

  test('a Store-style Python stub that only prints a hint is skipped, not trusted', () => {
    const r = sh('notes-map', ['--version'], { functions: 'python3() { echo "Python was not found; run without arguments to install"; return 9009; }; export -f python3' });
    // python3 is a stub, so the shim moves on to python or py; if neither exists it exits 127, and if one does it runs.
    assert.ok(r.status === 0 || r.status === 127, `${r.status}: ${r.stderr}`);
    assert.doesNotMatch(r.stdout, /run without arguments to install/);
  });
});
