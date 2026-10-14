import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { add, due, review, status } from '../lib.mjs';

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
  assert.throws(() => review([dir], { key: 'stale-rehearsal-data', outcome: 'promoted', to: 'tools/test/check.mjs' }));
  // Reading never writes, so it follows the link instead of refusing.
  assert.equal(due([dir]).groups.length, 2);
  assert.equal(fs.readFileSync(log(target), 'utf8'), before);
  fs.writeFileSync(log(target) + '.lock', 'owned by another writer');
  assert.throws(() => add(target, input));
  assert.throws(() => review([target], { key: 'stale-rehearsal-data', outcome: 'promoted', to: 'tools/test/check.mjs' }));
  assert.equal(fs.readFileSync(log(target), 'utf8'), before);
});

test('list shows id, date, project, stage, key, severity and status, with --open and --key filters', t => {
  const dir = project(t); seed(dir);
  json(dir, 'review', '--key', 'stale-rehearsal-data', '--outcome', 'promoted', '--to', 'tools/test/current-data.test.mjs');
  json(dir, 'add', '--project', 'example', '--stage', 'finish', '--what', 'nothing', '--key', 'no-incident', '--id', 'clean-1', '--date', '2026-10-06T08:00:00.000Z');
  const all = json(dir, 'list').lessons;
  assert.deepEqual(all.map(l => [l.id, l.status]), [
    ['lesson-1', 'closed'], ['lesson-2', 'open'], ['lesson-3', 'open'], ['lesson-4', 'open'],
    ['lesson-5', 'open'], ['lesson-6', 'closed'], ['clean-1', 'clean'],
  ]);
  const second = all[1];
  assert.deepEqual(
    ['id', 'date', 'project', 'stage', 'key', 'severity', 'status'].map(field => second[field]),
    ['lesson-2', '2026-10-05T10:00:00.000Z', 'example', 'check', 'demo-ui-proof', 'high', 'open'],
  );
  assert.equal(all[0].severity, 'normal');
  assert.deepEqual(json(dir, 'list', '--open').lessons.map(l => l.id), ['lesson-2', 'lesson-3', 'lesson-4', 'lesson-5']);
  assert.deepEqual(json(dir, 'list', '--key', 'stale-*').lessons.map(l => l.id), ['lesson-1', 'lesson-6']);
  assert.deepEqual(json(dir, 'list', '--key', 'demo-ui-proof').lessons.map(l => l.id), ['lesson-2']);
  assert.deepEqual(json(dir, 'list', '--open', '--key', 'stale-*').lessons, []);
  const text = run(dir, 'list');
  assert.equal(text.status, 0, text.stderr);
  assert.match(text.stdout, /^Lessons: 7\n/);
  assert.match(text.stdout, /lesson-2 {2}2026-10-05T10:00:00\.000Z {2}example {2}check {2}demo-ui-proof {2}high {2}open/);
  const bad = run(dir, 'list', '--key', 'Bad Key!');
  assert.equal(bad.status, 2);
  assert.ok(!bad.stderr.includes('Bad Key!'));
  const a = project(t), b = project(t);
  json(a, 'add', ...base, '--id', 'from-a'); json(b, 'add', ...base, '--id', 'from-b');
  assert.deepEqual(json(a, 'list', b, a, b).lessons.map(l => l.id).sort(), ['from-a', 'from-b']);
});

function sandboxed(dir, ...args) {
  return spawnSync(process.execPath, ['--permission', '--allow-fs-read=*', cli, 'lessons', ...args], { cwd: dir, encoding: 'utf8' });
}
const sandboxSupported = spawnSync(process.execPath, ['--permission', '--allow-fs-read=*', '-e', '0']).status === 0;

test('status, due, list and rework read a root nobody may write to', { skip: !sandboxSupported && 'node --permission is not available' }, t => {
  const dir = project(t); seed(dir);
  const before = fs.readFileSync(log(dir), 'utf8');
  // The sandbox grants read access only, so a write inside it must be denied.
  const probe = path.join(dir, 'probe.txt');
  const attempt = spawnSync(process.execPath, ['--permission', '--allow-fs-read=*', '-e', `require('node:fs').writeFileSync(${JSON.stringify(probe)}, 'x')`], { encoding: 'utf8' });
  assert.notEqual(attempt.status, 0);
  assert.match(attempt.stderr, /ERR_ACCESS_DENIED/);
  assert.equal(fs.existsSync(probe), false);
  for (const command of ['status', 'due', 'list', 'rework']) {
    const result = sandboxed(dir, command, '--json');
    assert.equal(result.status, 0, `${command}: ${result.stderr}`);
    JSON.parse(result.stdout);
  }
  assert.equal(JSON.parse(sandboxed(dir, 'status', '--json').stdout).total, 6);
  assert.equal(JSON.parse(sandboxed(dir, 'due', '--json').stdout).groups.length, 2);
  assert.equal(JSON.parse(sandboxed(dir, 'list', '--json').stdout).lessons.length, 6);
  assert.equal(JSON.parse(sandboxed(dir, 'rework', '--json').stdout).incidents, 6);
  // The same read works from another folder when the root is named explicitly.
  assert.equal(JSON.parse(sandboxed(root, 'status', dir, '--json').stdout).total, 6);
  // Writes keep their protection, and the sandbox leaves the log untouched.
  for (const command of [['add', ...base], ['review', '--key', 'demo-ui-proof', '--outcome', 'dismissed', '--reason', 'Duplicate.']]) {
    assert.equal(sandboxed(dir, ...command).status, 2);
  }
  assert.equal(fs.readFileSync(log(dir), 'utf8'), before);
});

test('reading accepts a root whose path looks like a credential to the write-side screen', t => {
  fs.mkdirSync(path.join(root, '.tmp'), { recursive: true });
  const dir = fs.mkdtempSync(path.join(root, '.tmp', 'Aa1' + 'x'.repeat(40) + '-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  seed(dir);
  for (const spelling of [dir, dir.split(path.sep).join('/')]) {
    for (const command of ['status', 'due', 'list', 'rework']) {
      const result = run(root, command, spelling, '--json');
      assert.equal(result.status, 0, `${command}: ${result.stderr}`);
    }
    assert.equal(json(root, 'status', spelling).total, 6);
  }
});

test('add accepts an ordinary forward-slash root and still refuses a token-shaped segment', t => {
  const dir = path.join(project(t), 'Company', 'Operations', 'Work', 'bgzflow');
  fs.mkdirSync(dir, { recursive: true });
  const input = { project: 'example', stage: 'build', what: 'A long root was refused.', key: 'long-root-refused' };
  add(dir.split(path.sep).join('/'), input);
  assert.equal(status([dir]).total, 1);
  const tokenish = path.join(project(t), 'Aa1' + 'x'.repeat(40));
  fs.mkdirSync(tokenish);
  assert.throws(() => add(tokenish.split(path.sep).join('/'), input), /Credential-shaped root/);
});

test('read failures name the failing check without printing paths or stored values', t => {
  const dir = project(t);
  const missing = path.join(dir, 'private-folder-name');
  const file = path.join(dir, 'private-file-name');
  fs.writeFileSync(file, 'x');
  const unreadable = path.join(dir, 'private-unreadable');
  fs.mkdirSync(path.join(unreadable, '.bgzflow/lessons.jsonl'), { recursive: true });
  const cases = [
    [missing, /root does not exist/i],
    [file, /root is not a directory/i],
    [unreadable, /lessons file is unreadable/i],
  ];
  for (const command of ['status', 'due', 'list', 'rework']) {
    for (const [target, pattern] of cases) {
      const result = run(dir, command, target);
      assert.equal(result.status, 2, `${command} ${path.basename(target)}`);
      assert.match(result.stderr, pattern);
      assert.ok(!result.stderr.includes('private-'), 'error printed part of the path');
      assert.ok(!result.stderr.includes(dir), 'error printed the full path');
    }
  }
  // A project that has never recorded a lesson is an empty result, not a failure.
  const empty = project(t);
  assert.equal(json(empty, 'status').total, 0);
  assert.deepEqual(json(empty, 'list').lessons, []);
});

test('system, cause and release round-trip through add, storage and list; older records still load', t => {
  const dir = project(t); seed(dir);
  const added = json(dir, 'add', ...base, '--id', 'fields-1', '--system', 'mail-spool', '--cause', 'sandbox-write', '--release', '0.6.0');
  assert.deepEqual([added.system, added.cause, added.release], ['mail-spool', 'sandbox-write', '0.6.0']);
  const lines = fs.readFileSync(log(dir), 'utf8').trim().split('\n').map(line => JSON.parse(line));
  assert.equal(lines.length, 7);
  assert.deepEqual(lines.slice(0, 6).map(l => l.id), ['lesson-1', 'lesson-2', 'lesson-3', 'lesson-4', 'lesson-5', 'lesson-6']);
  assert.ok(lines.slice(0, 6).every(l => l.system === undefined && l.cause === undefined && l.release === undefined));
  const stored = lines[6];
  assert.deepEqual([stored.system, stored.cause, stored.release], ['mail-spool', 'sandbox-write', '0.6.0']);
  const listed = json(dir, 'list').lessons;
  assert.equal(listed.length, 7);
  assert.deepEqual(listed.find(l => l.id === 'fields-1'), { ...stored, severity: 'normal', status: 'open' });
  assert.equal(json(dir, 'status').total, 7);
  // Each field is optional on its own.
  const partial = json(dir, 'add', ...base, '--id', 'fields-2', '--system', 'lessons-cli');
  assert.deepEqual([partial.system, partial.cause, partial.release], ['lessons-cli', undefined, undefined]);
});

test('invalid incident fields are refused without echoing the value or touching storage', t => {
  const dir = project(t); seed(dir);
  const before = fs.readFileSync(log(dir), 'utf8');
  const cases = [
    ['--system', 'Bad System'], ['--system', 'under_score'], ['--cause', 'has space'], ['--cause', 'x'.repeat(65)],
    ['--release', '1.0 beta'], ['--release', '-1.0'], ['--release', 'a'.repeat(65)],
    ['--cause', 'api_key=' + 'example-value'], ['--release', 'sk-' + 'aB3c'.repeat(10)],
  ];
  for (const [flag, value] of cases) {
    const result = run(dir, 'add', ...base, flag, value);
    assert.equal(result.status, 2, `${flag} ${value}`);
    if (value.length > 8) assert.ok(!(result.stdout + result.stderr).includes(value), `${flag}: error echoed the value`);
    assert.equal(fs.readFileSync(log(dir), 'utf8'), before);
  }
  // A clean finish report records no incident, so it cannot carry incident fields.
  const clean = run(dir, 'add', '--project', 'example', '--stage', 'finish', '--what', 'nothing', '--key', 'no-incident', '--system', 'mail-spool');
  assert.equal(clean.status, 2);
  assert.equal(fs.readFileSync(log(dir), 'utf8'), before);
});

test('rework groups repeat fixes by system and cause, counts the repeat share and never invents deploy metrics', t => {
  const dir = project(t);
  const record = (id, date, ...fields) => json(dir, 'add', ...base, '--id', id, '--date', date, ...fields);
  record('i1', '2026-10-01T09:00:00.000Z', '--system', 'mail-cli', '--cause', 'sandbox-write', '--release', '0.5.0');
  record('i2', '2026-10-05T10:00:00.000Z', '--system', 'mail-cli', '--cause', 'sandbox-write', '--release', '0.6.0');
  record('i3', '2026-10-09T11:00:00.000Z', '--system', 'mail-cli', '--cause', 'sandbox-write', '--release', '0.6.0');
  record('i4', '2026-10-06T12:00:00.000Z', '--system', 'lessons-cli', '--cause', 'root-refused', '--release', '0.6.0');
  record('i5', '2026-10-07T13:00:00.000Z');
  record('i6', '2026-10-08T14:00:00.000Z', '--system', 'hooks');
  json(dir, 'add', '--project', 'example', '--stage', 'finish', '--what', 'nothing', '--key', 'no-incident', '--date', '2026-10-08T15:00:00.000Z');

  const result = json(dir, 'rework');
  assert.deepEqual(Object.keys(result).sort(), [
    'causes', 'classified', 'groups', 'incidents', 'notComputed', 'repeatCauses', 'repeatFixes', 'repeatShare', 'since', 'unclassified',
  ]);
  assert.deepEqual(
    [result.since, result.incidents, result.classified, result.unclassified, result.causes, result.repeatCauses, result.repeatFixes, result.repeatShare],
    [null, 6, 4, 2, 2, 1, 2, 0.5],
  );
  assert.deepEqual(result.groups[0], {
    system: 'mail-cli', cause: 'sandbox-write', count: 3, repeat: true,
    first: '2026-10-01T09:00:00.000Z', last: '2026-10-09T11:00:00.000Z',
    dates: ['2026-10-01T09:00:00.000Z', '2026-10-05T10:00:00.000Z', '2026-10-09T11:00:00.000Z'],
    releases: ['0.5.0', '0.6.0'],
  });
  assert.deepEqual(result.groups[1], {
    system: 'lessons-cli', cause: 'root-refused', count: 1, repeat: false,
    first: '2026-10-06T12:00:00.000Z', last: '2026-10-06T12:00:00.000Z', dates: ['2026-10-06T12:00:00.000Z'], releases: ['0.6.0'],
  });
  assert.deepEqual(result.notComputed.metrics, ['deploy frequency', 'change failure rate', 'time to restore']);
  assert.match(result.notComputed.reason, /deploy and restore records/);

  const text = run(dir, 'rework');
  assert.equal(text.status, 0, text.stderr);
  assert.match(text.stdout, /Incidents: 6; 4 name a system and a cause, 2 do not\./);
  assert.match(text.stdout, /Repeat fixes: 2 of 4 classified incidents \(50%\), across 1 repeated cause\./);
  assert.match(text.stdout, /mail-cli \/ sandbox-write: 3 \(repeat\) {2}2026-10-01, 2026-10-05, 2026-10-09 {2}releases 0\.5\.0, 0\.6\.0/);
  assert.match(text.stdout, /lessons-cli \/ root-refused: 1 {2}2026-10-06/);
  assert.match(text.stdout, /Not computed: deploy frequency, change failure rate, time to restore\. They need deploy and restore records, which this tool does not have\.\s*$/);

  // --since drops older incidents; a review closes a lesson but never removes it from the count.
  const recent = json(dir, 'rework', '--since', '2026-10-05');
  assert.deepEqual(
    [recent.since, recent.incidents, recent.classified, recent.repeatFixes, recent.repeatShare],
    ['2026-10-05T00:00:00.000Z', 5, 3, 1, 0.333],
  );
  assert.equal(recent.groups[0].count, 2);
  json(dir, 'review', '--key', 'stale-rehearsal-data', '--outcome', 'dismissed', '--reason', 'Counted as history.');
  assert.deepEqual(json(dir, 'rework'), result);
  const bad = run(dir, 'rework', '--since', 'yesterday');
  assert.equal(bad.status, 2);
  assert.ok(!bad.stderr.includes('yesterday'));
});

test('rework without system and cause fields finds no repeats, reports a null share and still says what it cannot compute', t => {
  const dir = project(t); seed(dir);
  const result = json(dir, 'rework');
  assert.deepEqual([result.incidents, result.classified, result.groups.length, result.repeatShare], [6, 0, 0, null]);
  const text = run(dir, 'rework');
  assert.match(text.stdout, /No repeat fixes can be found yet/);
  assert.match(text.stdout, /Not computed: deploy frequency, change failure rate, time to restore\./);
  const empty = json(project(t), 'rework');
  assert.deepEqual([empty.incidents, empty.repeatShare], [0, null]);
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
