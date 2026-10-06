import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { ROOT, makeProject, removeDir, runHook, write } from './helpers.mjs';

const script = 'h6-lessons-due.mjs';
function project(t) {
  const dir = makeProject('h6');
  t.after(() => removeDir(dir));
  return dir;
}
function seed(dir) {
  fs.copyFileSync(path.join(ROOT, 'tools/lessons/test/fixtures/failures.jsonl'), path.join(dir, '.bgzflow/lessons.jsonl'));
}

test('H6 sends one SessionStart context line for due lessons, without writes', t => {
  const dir = project(t); seed(dir);
  const file = path.join(dir, '.bgzflow/lessons.jsonl');
  const before = fs.readFileSync(file, 'utf8');
  // Invalid configuration would cause runHook's usual wrapper to write a warning log.
  write(dir, '.bgzflow/config.json', '{broken');
  const r = runHook(script, { hook_event_name: 'SessionStart', cwd: dir });
  assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(r.json, { hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: 'Lessons due for review: 2 (bgz lessons due)' } });
  assert.equal(r.stdout.trim().split('\n').length, 1);
  assert.equal(fs.readFileSync(file, 'utf8'), before);
  assert.deepEqual(fs.readdirSync(path.join(dir, '.bgzflow')).sort(), ['config.json', 'lessons.jsonl']);
});

test('H6 is silent for no log or no due group and does not inspect a neighbouring project', t => {
  const dir = project(t), other = project(t); seed(other);
  for (const contents of [undefined, '']) {
    if (contents !== undefined) write(dir, '.bgzflow/lessons.jsonl', contents);
    const r = runHook(script, { hookEventName: 'SessionStart', workspaceRoot: dir, cwd: other });
    assert.equal(r.status, 0, r.stderr);
    assert.equal(r.stdout, '');
    assert.equal(fs.existsSync(path.join(dir, '.bgzflow/hooks.log')), false);
  }
});

test('H6 malformed and oversized logs fail open without contents or writes', t => {
  const dir = project(t);
  for (const content of ['{broken\n', ' '.repeat(1024 * 1024 + 1)]) {
    write(dir, '.bgzflow/lessons.jsonl', content);
    const r = runHook(script, { hook_event_name: 'SessionStart', cwd: dir });
    assert.equal(r.status, 0, r.stderr);
    assert.ok(r.stdout === '' || r.json?.hookSpecificOutput.additionalContext.startsWith('Lessons log unreadable'));
    assert.doesNotMatch(r.stdout + r.stderr, /\{broken/);
    assert.equal(fs.readFileSync(path.join(dir, '.bgzflow/lessons.jsonl'), 'utf8'), content);
    assert.deepEqual(fs.readdirSync(path.join(dir, '.bgzflow')), ['lessons.jsonl']);
  }
});

test('H6 uses the same explicit project override as other hooks', t => {
  const dir = project(t), other = project(t); seed(dir);
  const r = runHook(script, { hook_event_name: 'SessionStart', cwd: other }, { env: { BGZFLOW_PROJECT: dir } });
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.json?.hookSpecificOutput.additionalContext, 'Lessons due for review: 2 (bgz lessons due)');
});
