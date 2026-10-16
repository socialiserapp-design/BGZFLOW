// notes-map is Python; these tests run its unittest file and the Node launcher that finds a working Python.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { test } from 'node:test';
import { ROOT, TEST_TIMEOUT_MS, cleanEnv } from '../../../hooks/test/helpers.mjs';

const UNITTEST = path.join(ROOT, 'tools', 'notes-map', 'test_notes_map.py');
const LAUNCHER = path.join(ROOT, 'tools', 'notes-map', 'notes-map.mjs');
const probe = 'import sys; sys.exit(0 if sys.version_info >= (3, 10) else 1)';

function findPython() {
  for (const [cmd, ...pre] of [['python3'], ['python'], ['py', '-3']]) {
    const r = spawnSync(cmd, [...pre, '-c', probe], { stdio: 'ignore' });
    if (!r.error && r.status === 0) return [cmd, ...pre];
  }
  return undefined;
}
const python = findPython();

test('the Python unit tests pass', { skip: !python && 'no Python 3.10 or newer on this machine' }, () => {
  const [cmd, ...pre] = python;
  const r = spawnSync(cmd, [...pre, '-X', 'utf8', UNITTEST], { encoding: 'utf8', env: cleanEnv({ PYTHONUTF8: '1' }), timeout: TEST_TIMEOUT_MS });
  assert.equal(r.status, 0, `${r.stdout}\n${r.stderr}`);
  assert.match(r.stderr, /\nOK\b/);
});

test('the Node launcher finds Python and passes its arguments and exit code through', { skip: !python && 'no Python 3.10 or newer on this machine' }, () => {
  const ok = spawnSync(process.execPath, [LAUNCHER, '--version'], { encoding: 'utf8', env: cleanEnv(), timeout: TEST_TIMEOUT_MS });
  assert.equal(ok.status, 0, ok.stderr);
  assert.match(ok.stdout, /^notes-map \d+\.\d+/);
  const bad = spawnSync(process.execPath, [LAUNCHER, 'show', 'no-such-file.md:1-2', '--root', ROOT], { encoding: 'utf8', env: cleanEnv(), timeout: TEST_TIMEOUT_MS });
  assert.equal(bad.status, 2);
  assert.match(bad.stderr, /file not found/);
});

test('the launcher says what is missing when there is no Python (exit 127, like the shims)', () => {
  const r = spawnSync(process.execPath, [LAUNCHER, '--version'], {
    encoding: 'utf8',
    env: { PATH: '', Path: '', SystemRoot: process.env.SystemRoot || '', PATHEXT: process.env.PATHEXT || '' },
    timeout: TEST_TIMEOUT_MS,
  });
  assert.equal(r.status, 127);
  assert.match(r.stderr, /notes-map: Python 3\.10 or newer was not found \(tried python3, python, py -3\)/);
});
