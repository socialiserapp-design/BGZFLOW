import {realpathSync as canonicalTestPath} from 'node:fs'; // Resolve OS temp aliases before testing descendant link protection.
import assert from 'node:assert/strict';
import {test} from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const scripts = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
function isolated(code, overrides = {}) {
  const dir = fs.mkdtempSync(path.join(canonicalTestPath.native(os.tmpdir()), 'bgz-skill-deps-'));
  try {
    const result = spawnSync(process.execPath, ['--input-type=module', '-e', code], {
      encoding: 'utf8', timeout: 10000,
      env: {...process.env, XDG_CACHE_HOME: dir, STATECHART_ALLOW_INSTALL: '',
        TLA2TOOLS: '', JAVA: '', ...overrides},
    });
    return {...result, files: fs.readdirSync(dir)};
  } finally { fs.rmSync(dir, {recursive: true, force: true}); }
}

test('missing renderer reports its dependency without creating cache or starting npm', () => {
  const module = new URL('../render.mjs', import.meta.url).href;
  const result = isolated(`import {loadRenderer} from ${JSON.stringify(module)}; await loadRenderer();`);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Optional renderer unavailable/);
  assert.match(result.stderr, /STATECHART_ALLOW_INSTALL=1/);
  assert.deepEqual(result.files, []);
});

test('supplied local TLC and Java are returned without installing or writing state', () => {
  const module = new URL('../tlc-tools.mjs', import.meta.url).href;
  const result = isolated(`import {findTlc} from ${JSON.stringify(module)}; console.log(JSON.stringify(findTlc()));`,
    {TLA2TOOLS: path.join(scripts, 'tlc-tools.mjs'), JAVA: process.execPath});
  assert.equal(result.status, 0, result.stderr);
  const actual = JSON.parse(result.stdout);
  assert.equal(actual.java, process.execPath);
  assert.equal(actual.jar, path.join(scripts, 'tlc-tools.mjs'));
  assert.deepEqual(result.files, []);
  // This checks dependency resolution, not that the fixture is a runnable TLC jar.
});

test('missing TLC produces a specific error without a toolchain install', () => {
  const module = new URL('../tlc-tools.mjs', import.meta.url).href;
  const result = isolated(`import {findTlc} from ${JSON.stringify(module)}; findTlc();`, {PATH: ''});
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Cannot find TLC/);
  assert.doesNotMatch(result.stderr, /Installing TLC|Installing Java/);
  assert.deepEqual(result.files, []);
});
