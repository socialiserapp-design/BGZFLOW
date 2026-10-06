import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { add, due, review } from '../lib.mjs';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const cli = path.join(root, 'tools/bgz.mjs');
const fixture = path.join(root, 'tools/lessons/test/fixtures/failures.jsonl');
function project(t) {
  fs.mkdirSync(path.join(root, '.tmp'), { recursive: true });
  const dir = fs.mkdtempSync(path.join(root, '.tmp/lessons space '));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return dir;
}
function run(dir, ...args) {
  return spawnSync(process.execPath, [cli, 'lessons', ...args], { cwd: dir, encoding: 'utf8' });
}
function json(dir, ...args) {
  const r = run(dir, ...args, '--json');
  assert.equal(r.status, 0, r.stderr);
  return JSON.parse(r.stdout);
}
const base = ['--project', 'example', '--stage', 'rehearsal', '--what', 'Rehearsal used old data.', '--key', 'stale-rehearsal-data'];
const log = dir => path.join(dir, '.bgzflow/lessons.jsonl');
function seed(dir) {
  fs.mkdirSync(path.dirname(log(dir)), { recursive: true });
  fs.copyFileSync(fixture, log(dir));
}

test('add appends validated records with unique IDs and ISO dates without changing history', t => {
  const dir = project(t);
  const a = json(dir, 'add', ...base, '--evidence', 'proof/rehearsal.txt');
  const before = fs.readFileSync(log(dir), 'utf8');
  const b = json(dir, 'add', ...base);
  assert.notEqual(a.id, b.id);
  assert.equal(new Date(a.date).toISOString(), a.date);
  assert.equal(a.project, 'example');
  assert.equal(a.evidence, 'proof/rehearsal.txt');
  assert.ok(fs.readFileSync(log(dir), 'utf8').startsWith(before));
  assert.equal(json(dir, 'status').open, 2);
});

test('invalid fields, unknown flags and credential-shaped values never reach storage or errors', t => {
  const dir = project(t);
  const cases = [
    ['--what', ''], ['--what', 'x'.repeat(201)], ['--key', 'Bad Key'],
    ['--stage', ''], ['--date', 'yesterday'], ['--date', '2026-02-30T00:00:00.000Z'],
    ['--severity', 'urgent'], ['--id', 'bad id'], ['--unknown', 'value'],
    ['--what', 'api_key=' + 'example-value'],
    ['--evidence', ['https://name:', 'fake-password', '@', 'example.invalid/proof'].join('')],
    ['--project', 'sk-' + 'aB3c'.repeat(10)],
    ['--stage', 'ghp_' + 'aB3c'.repeat(10)],
    ['--what', 'Bearer ' + 'aB3c'.repeat(10)],
    ['--evidence', 'https://example.invalid/?token=' + 'sample-value'],
    ['--what', '-----BEGIN ' + 'PRIVATE KEY-----'],
    ['--what', 'aB3c'.repeat(12)],
  ];
  for (const [flag, value] of cases) {
    const args = [...base];
    const i = args.indexOf(flag);
    if (i >= 0) args.splice(i, 2);
    const r = run(dir, 'add', ...args, flag, value);
    assert.equal(r.status, 2, `${flag}: expected validation failure`);
    if (value.length > 16) assert.ok(!r.stderr.includes(value), 'error echoed rejected input');
    assert.equal(fs.existsSync(log(dir)), false);
  }
  for (const field of ['--project', '--stage', '--what', '--key']) {
    const args = [...base]; args.splice(args.indexOf(field), 2);
    assert.equal(run(dir, 'add', ...args).status, 2);
  }
});

test('due uses exactly two open matches or one high severity, never semantic similarity', t => {
  const dir = project(t);
  json(dir, 'add', ...base);
  assert.deepEqual(json(dir, 'due').groups, []);
  json(dir, 'add', ...base.slice(0, -2), '--key', 'old-rehearsal-data');
  assert.deepEqual(json(dir, 'due').groups, []);
  json(dir, 'add', ...base);
  json(dir, 'add', ...base.slice(0, -2), '--key', 'unsafe-recovery', '--severity', 'high');
  assert.deepEqual(json(dir, 'due').groups.map(g => [g.key, g.count]), [['stale-rehearsal-data', 2], ['unsafe-recovery', 1]]);
});

test('review appends closure, is retry safe, and new occurrences can become due again', t => {
  const dir = project(t); seed(dir);
  const before = fs.readFileSync(log(dir), 'utf8');
  assert.equal(json(dir, 'due').groups.length, 2);
  json(dir, 'review', '--key', 'stale-rehearsal-data', '--outcome', 'promoted', '--to', 'tools/test/current-data.test.mjs');
  assert.ok(fs.readFileSync(log(dir), 'utf8').startsWith(before));
  const reviewed = fs.readFileSync(log(dir), 'utf8');
  json(dir, 'review', '--key', 'stale-rehearsal-data', '--outcome', 'promoted', '--to', 'tools/test/current-data.test.mjs');
  assert.equal(fs.readFileSync(log(dir), 'utf8'), reviewed);
  assert.deepEqual(json(dir, 'due').groups.map(g => g.key), ['demo-ui-proof']);
  json(dir, 'add', ...base);
  assert.deepEqual(json(dir, 'due').groups.map(g => g.key), ['demo-ui-proof']);
  json(dir, 'add', ...base);
  assert.equal(json(dir, 'due').groups.length, 2);
  assert.equal(run(dir, 'review', '--key', 'demo-ui-proof', '--outcome', 'dismissed').status, 2);
  json(dir, 'review', '--key', 'demo-ui-proof', '--outcome', 'dismissed', '--reason', 'Superseded by the current result check.');
  assert.equal(json(dir, 'status').closed, 3);
});

test('multiple explicit roots group and close together; duplicate roots do not inflate counts', t => {
  const a = project(t), b = project(t);
  json(a, 'add', ...base); json(b, 'add', ...base);
  assert.equal(json(a, 'due', a, a).groups.length, 0);
  const due = json(a, 'due', b, a, b);
  assert.equal(due.groups[0].count, 2);
  json(a, 'review', a, b, '--key', 'stale-rehearsal-data', '--outcome', 'promoted', '--to', 'skills/check/SKILL.md');
  assert.equal(json(a, 'due', a, b).groups.length, 0);
  assert.equal(json(a, 'status', a, b).closed, 2);
});

test('clean finish reports are retained but never become due', t => {
  const dir = project(t);
  for (let i = 0; i < 2; i++) json(dir, 'add', '--project', 'example', '--stage', 'finish', '--what', 'nothing', '--key', 'no-incident');
  assert.equal(json(dir, 'status').total, 2);
  assert.equal(json(dir, 'status').open, 0);
  assert.deepEqual(json(dir, 'due').groups, []);
});

test('malformed logs fail without hiding evidence or echoing contents; add preserves bytes', t => {
  const dir = project(t); seed(dir);
  fs.appendFileSync(log(dir), '{broken\n');
  const before = fs.readFileSync(log(dir), 'utf8');
  for (const cmd of [['due'], ['status'], ['add', ...base], ['review', '--key', 'demo-ui-proof', '--outcome', 'dismissed', '--reason', 'Duplicate.']]) {
    const r = run(dir, ...cmd);
    assert.equal(r.status, 2);
    assert.doesNotMatch(r.stderr, /\{broken/);
    assert.equal(fs.readFileSync(log(dir), 'utf8'), before);
  }
});

test('a valid final record without a newline remains separate after append', t => {
  const dir = project(t); seed(dir);
  const before = fs.readFileSync(log(dir), 'utf8').trimEnd();
  fs.writeFileSync(log(dir), before);
  add(dir, { project: 'example', stage: 'build', what: 'Another launcher ended early.', key: 'launcher-false-finish' });
  assert.ok(fs.readFileSync(log(dir), 'utf8').startsWith(before + '\n'));
  assert.equal(due([dir]).groups.length, 3);
});

test('linked storage and writer locks refuse mutation without touching protected bytes', t => {
  const dir = project(t), target = project(t);
  seed(target);
  fs.symlinkSync(path.join(target, '.bgzflow'), path.join(dir, '.bgzflow'), process.platform === 'win32' ? 'junction' : 'dir');
  const before = fs.readFileSync(log(target), 'utf8');
  const input = { project: 'example', stage: 'build', what: 'A failure.', key: 'some-failure' };
  assert.throws(() => add(dir, input));
  assert.throws(() => due([dir]));
  assert.equal(fs.readFileSync(log(target), 'utf8'), before);
  fs.writeFileSync(log(target) + '.lock', 'owned by another writer');
  assert.throws(() => add(target, input));
  assert.throws(() => review([target], { key: 'stale-rehearsal-data', outcome: 'promoted', to: 'tools/test/check.mjs' }));
  assert.equal(fs.readFileSync(log(target), 'utf8'), before);
});

test('review rejects credential-shaped destinations and reasons before appending', t => {
  const dir = project(t); seed(dir);
  const before = fs.readFileSync(log(dir), 'utf8');
  for (const input of [
    { outcome: 'promoted', to: 'https://example.invalid/?api_key=' + 'fake-value' },
    { outcome: 'dismissed', reason: ['pass', 'word=', 'fake-value'].join('') },
  ]) assert.throws(() => review([dir], { key: 'stale-rehearsal-data', ...input }), /Credential-shaped/);
  assert.equal(fs.readFileSync(log(dir), 'utf8'), before);
});

test('short provider tokens and later opaque tokens in text are refused', t => {
  const dir = project(t);
  for (const what of [ ['sk', '_live_', 'a'.repeat(18)].join(''), 'a'.repeat(35) + ' ' + 'bC4d'.repeat(10) ]) {
    assert.throws(() => add(dir, { project: 'example', stage: 'check', key: 'some-failure', what }), /Credential-shaped/);
  }
});

test('quoted credential assignments are rejected across lesson and review fields without persistence', t => {
  const dir = project(t); seed(dir);
  const before = fs.readFileSync(log(dir), 'utf8');
  const secret = JSON.stringify({ password: 'invented-sensitive-value' });
  for (const field of ['project', 'stage', 'what', 'evidence']) {
    assert.throws(() => add(dir, { project: 'example', stage: 'check', key: 'quoted-credential', what: 'A problem.', [field]: secret }), /Credential-shaped/);
  }
  for (const field of ['to', 'reason']) {
    assert.throws(() => review([dir], { key: 'stale-rehearsal-data', outcome: 'dismissed', reason: 'Duplicate.', [field]: secret }), /Credential-shaped/);
  }
  const r = run(dir, 'add', ...base.slice(0, 4), '--key', 'quoted-credential', '--what', secret);
  assert.equal(r.status, 2);
  assert.ok(!(r.stdout + r.stderr).includes('invented-sensitive-value'));
  assert.equal(fs.readFileSync(log(dir), 'utf8'), before);
});

test('URL query credentials are rejected in every free-text and review field without echo or append', t => {
  const dir = project(t); seed(dir);
  const before = fs.readFileSync(log(dir), 'utf8');
  const value = 'https://example.invalid/?' + 'pwd=not-a-real-password';
  for (const field of ['project', 'stage', 'what', 'evidence']) {
    const args = [...base];
    const index = args.indexOf('--' + field);
    if (index >= 0) args.splice(index, 2);
    const result = run(dir, 'add', ...args, '--' + field, value);
    assert.equal(result.status, 2, field);
    assert.match(result.stderr, /Credential-shaped/);
    assert.ok(!(result.stdout + result.stderr).includes(value));
    assert.equal(fs.readFileSync(log(dir), 'utf8'), before);
  }
  for (const field of ['to', 'reason']) {
    const args = field === 'to' ? ['--outcome', 'promoted'] : ['--outcome', 'dismissed'];
    const result = run(dir, 'review', '--key', 'stale-rehearsal-data', ...args, '--' + field, value);
    assert.equal(result.status, 2, field);
    assert.match(result.stderr, /Credential-shaped/);
    assert.ok(!(result.stdout + result.stderr).includes(value));
    assert.equal(fs.readFileSync(log(dir), 'utf8'), before);
  }
});

test('startup prints exactly one reminder only for due groups and preserves JSON output', t => {
  const dir = project(t);
  fs.writeFileSync(path.join(dir, 'AGENTS.md'), '# Test project\n');
  const startup = (...args) => spawnSync(process.execPath, [path.join(root, 'tools/startup-check/startup-check.mjs'), dir, ...args], { encoding: 'utf8' });
  assert.doesNotMatch(startup().stdout, /Lessons due/);
  seed(dir);
  const result = startup();
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(result.stdout.split('\n').filter(l => l.includes('Lessons due')), ['Lessons due for review: 2 (bgz lessons due)']);
  assert.equal(JSON.parse(startup('--json').stdout).lessonsDue, 2);
});

test('finish, check and ship require all three verification levels and actionable reports', () => {
  for (const name of ['bg-finish-the-whole-job', 'bg-check-it-before-release', 'bg-ship-and-recover']) {
    const body = fs.readFileSync(path.join(root, 'skills', name, 'SKILL.md'), 'utf8');
    for (const pattern of [/BUILT/, /REACHED/, /USED/, /Only USED.*working/, /data copy.*date/i, /numbered.*Confirm by:/i, /All objectives complete\./, /What went wrong/, /lessons add/]) {
      assert.match(body, pattern, `${name}: missing report requirement`);
    }
  }
});
