import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { after, before, test } from 'node:test';
import { addFact as addFactRaw, factsForFiles, matchesGlob, parseProposedFacts, pathsFromBrief, readFacts } from '../facts.mjs';

const cli = fileURLToPath(new URL('../facts.mjs', import.meta.url));
const ENV = { ...process.env, BGZFLOW_PROJECT: '', CLAUDE_PROJECT_DIR: '', GROK_WORKSPACE_ROOT: '' };
const facts = (args, opts = {}) => spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8', env: ENV, ...opts });
const match = (glob, file) => matchesGlob(glob, file, { ignoreCase: false });
// addFact reports {added, existing} lists; most tests here care about one fact at a time.
const addFact = (dir, item) => {
  const r = addFactRaw(dir, item);
  return { added: r.added.length === 1, fact: r.added[0] || r.existing[0] };
};

let root;
let n = 0;
const project = () => {
  const dir = path.join(root, `p${(n += 1)}`);
  fs.mkdirSync(dir);
  return dir;
};
const stored = (dir) => JSON.parse(fs.readFileSync(path.join(dir, '.bgzflow', 'facts.json'), 'utf8'));

before(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'bgz-facts-'));
});
after(() => fs.rmSync(root, { recursive: true, force: true }));

test('glob: * and ? stay in one folder level, ** crosses folders', () => {
  assert.ok(match('src/*.ts', 'src/a.ts'));
  assert.ok(!match('src/*.ts', 'src/deep/a.ts'));
  assert.ok(match('src/**/*.ts', 'src/deep/er/a.ts'));
  assert.ok(match('src/**/*.ts', 'src/a.ts'), '** may match no folder at all');
  assert.ok(match('**/*.test.mjs', 'tools/x/test/a.test.mjs'));
  assert.ok(match('**/*.test.mjs', 'a.test.mjs'));
  assert.ok(match('file?.txt', 'file1.txt'));
  assert.ok(!match('file?.txt', 'file12.txt'));
  assert.ok(!match('file?.txt', 'file/.txt'));
  assert.ok(match('**', 'anything/at/all.md'));
  assert.ok(!match('src/a.ts', 'src/ab.ts'));
  assert.ok(!match('src/a.ts', 'srcxa.ts'), 'a dot in a glob is a dot, not a wildcard');
});

test('glob: slashes and backslashes are the same, ./ is ignored', () => {
  assert.ok(match('src\\auth\\*.ts', 'src/auth/login.ts'));
  assert.ok(match('src/auth/*.ts', 'src\\auth\\login.ts'));
  assert.ok(match('./src/a.ts', 'src/a.ts'));
  assert.ok(match('src/a.ts', './src/a.ts'));
});

test('glob: a folder covers what is inside it, /** also matches the folder itself', () => {
  assert.ok(match('src/auth', 'src/auth/login.ts'));
  assert.ok(match('src/auth/', 'src/auth/deep/login.ts'));
  assert.ok(match('src/auth/**', 'src/auth/login.ts'));
  assert.ok(match('src/auth/**', 'src/auth'));
  assert.ok(!match('src/auth/**', 'src/authors/a.ts'));
  assert.ok(!match('src/auth', 'src/authors/a.ts'));
});

test('glob: a glob with no slash is tried against names at any depth', () => {
  assert.ok(match('*.sql', 'db/old/001.sql'));
  assert.ok(match('README.md', 'docs/README.md'));
  assert.ok(match('migrations', 'db/migrations/001.sql'));
  assert.ok(!match('*.sql', 'db/old/001.txt'));
  assert.ok(!match('db/*.sql', 'other/db/001.sql'), 'a glob with a slash is anchored at the project root');
});

test('glob: case is ignored only when asked', () => {
  assert.ok(!matchesGlob('SRC/A.ts', 'src/a.ts', { ignoreCase: false }));
  assert.ok(matchesGlob('SRC/A.ts', 'src/a.ts', { ignoreCase: true }));
});

test('project-wide facts always apply, path facts only when a file matches', () => {
  const list = [
    { id: 'F001', text: 'wide', paths: [] },
    { id: 'F002', text: 'auth', paths: ['src/auth/**'] },
    { id: 'F003', text: 'sql', paths: ['*.sql', 'db/**'] },
  ];
  const ids = (files) => factsForFiles(list, files, { ignoreCase: false }).map((f) => f.id);
  assert.deepEqual(ids([]), ['F001']);
  assert.deepEqual(ids(['src/ui/a.ts']), ['F001']);
  assert.deepEqual(ids(['src/auth/login.ts']), ['F001', 'F002']);
  assert.deepEqual(ids(['x/y.sql', 'src/auth/a.ts']), ['F001', 'F002', 'F003']);
});

test('brief paths: backticked, slashed and extension tokens, once each', () => {
  const brief = [
    '# Brief: J-1 fix the login',
    'OWNS: ["src/auth/**", "tools/facts/facts.mjs"]',
    'Read `src/auth/login.ts:10-40` and `.bgzflow/config.json`, then run `node --test tools/facts/test/`.',
    'See [the contract](../docs/swarm-gate.md#piece-admission) and package.json. Also src/auth/login.ts again.',
    'Windows style: src\\ui\\Button.tsx.',
  ].join('\n');
  assert.deepEqual(pathsFromBrief(brief), [
    'src/auth/**',
    'tools/facts/facts.mjs',
    'src/auth/login.ts',
    '.bgzflow/config.json',
    'tools/facts/test',
    '../docs/swarm-gate.md',
    'package.json',
    'src/ui/Button.tsx',
  ]);
});

test('brief paths: URLs, versions, flags, plain words and addresses are not paths', () => {
  const brief = 'Use https://example.com/a/b.html with v0.8.0 and 1.2.3, e.g. --files or --dir, node:fs/promises, ' +
    'bg-mail, yes/no, and/or, 10/12, mail me at noreply@example.com. Cost 3.5 ok. Done.';
  assert.deepEqual(pathsFromBrief(brief), []);
  assert.deepEqual(pathsFromBrief(''), []);
  assert.deepEqual(pathsFromBrief(undefined), []);
});

test('proposed facts: bullets under the heading, project-wide and with globs', () => {
  const handback = [
    'Result: completed.',
    '- an earlier bullet that is not a fact',
    '',
    'Proposed facts:',
    '- src/auth/**, `src/session.ts` :: Tokens are refreshed in the middleware, not in handlers.',
    '- Run the migrations before the seed script.',
    '* tools\\facts\\*.mjs :: Written with node:test only.',
    '- none',
    '- Haskell uses `a :: b` for types.',
    '',
    'Next: lead.',
    '- not part of the section',
  ].join('\n');
  assert.deepEqual(parseProposedFacts(handback), [
    { text: 'Tokens are refreshed in the middleware, not in handlers.', paths: ['src/auth/**', 'src/session.ts'] },
    { text: 'Run the migrations before the seed script.', paths: [] },
    { text: 'Written with node:test only.', paths: ['tools/facts/*.mjs'] },
    { text: 'Haskell uses `a :: b` for types.', paths: [] },
  ]);
});

test('proposed facts: a markdown heading works, the next heading ends it, no section means none', () => {
  const md = '## Result\nok\n\n## Proposed facts\n\n- one\n- two :: deux\n\n## Gaps\n- not a fact\n';
  assert.deepEqual(parseProposedFacts(md), [{ text: 'one', paths: [] }, { text: 'deux', paths: ['two'] }]);
  assert.deepEqual(parseProposedFacts('Result: ok\n- a bullet\n'), []);
  assert.deepEqual(parseProposedFacts('Proposed facts (optional): one line each\nNext: lead\n'), []);
});

test('a missing facts file means no facts, not an error', () => {
  const dir = project();
  assert.deepEqual(readFacts(dir), { schema_version: 1, facts: [] });
  const list = facts(['list', '--dir', dir]);
  assert.equal(list.status, 0, list.stderr);
  assert.match(list.stdout, /No facts recorded/);
  const none = facts(['for', '--files', 'src/a.ts', '--dir', dir]);
  assert.equal(none.status, 0, none.stderr);
  assert.equal(none.stdout, '');
  const json = facts(['for', '--files', 'src/a.ts', '--dir', dir, '--json']);
  assert.equal(json.status, 0);
  assert.deepEqual(JSON.parse(json.stdout), { files: ['src/a.ts'], facts: [] });
  assert.ok(!fs.existsSync(path.join(dir, '.bgzflow')), 'reading never creates the file');
});

test('add assigns ids, stores the documented shape and does not duplicate', () => {
  const dir = project();
  const first = addFact(dir, { text: '  Run the seed   twice. ', paths: 'db/**, scripts\\seed.mjs', source: 'job-7' });
  assert.equal(first.added, true);
  assert.equal(first.fact.id, 'F001');
  assert.deepEqual(first.fact.paths, ['db/**', 'scripts/seed.mjs']);
  assert.match(first.fact.added_at, /^\d{4}-\d\d-\d\dT.*Z$/);
  const again = addFact(dir, { text: 'Run the seed twice.', paths: ['scripts/seed.mjs', 'db/**'] });
  assert.equal(again.added, false);
  assert.equal(again.fact.id, 'F001');
  const other = addFact(dir, { text: 'Run the seed twice.' });
  assert.equal(other.added, true, 'same text with other paths is a different fact');
  assert.equal(other.fact.id, 'F002');
  const file = stored(dir);
  assert.equal(file.schema_version, 1);
  assert.equal(file.facts.length, 2);
  assert.deepEqual(Object.keys(file.facts[0]), ['id', 'text', 'paths', 'source', 'added_at']);
  assert.equal(file.facts[0].source, 'job-7');
  assert.deepEqual(file.facts[1].paths, []);
  assert.ok(!fs.readdirSync(path.join(dir, '.bgzflow')).some((f) => f.endsWith('.tmp')), 'no temporary file is left behind');
});

test('cli add, list and for work together and report duplicates', () => {
  const dir = project();
  const a = facts(['add', '--text', 'Tokens refresh in the middleware.', '--paths', 'src/auth/**', '--source', 'job-1', '--dir', dir]);
  assert.equal(a.status, 0, a.stderr);
  assert.match(a.stdout, /^Added F001: Tokens refresh in the middleware\. \(applies to: src\/auth\/\*\*\)/);
  const dup = facts(['add', '--text=Tokens refresh in the middleware.', '--paths=src/auth/**', `--dir=${dir}`]);
  assert.equal(dup.status, 0, dup.stderr);
  assert.match(dup.stdout, /^Already known F001/);
  assert.equal(facts(['add', '--text', 'Use node 18 or newer.', '--dir', dir]).status, 0);
  const hit = facts(['for', '--files', 'src/auth/login.ts,README.md', '--dir', dir]);
  assert.equal(hit.status, 0, hit.stderr);
  assert.match(hit.stdout, /^Known facts \(advice, not rules\):\n- Tokens refresh in the middleware\. \(applies to: src\/auth\/\*\*\) \[F001\]\n- Use node 18 or newer\. \[F002\]\n?$/);
  const miss = facts(['for', '--files', 'docs/a.md', '--dir', dir]);
  assert.doesNotMatch(miss.stdout, /middleware/);
  assert.match(miss.stdout, /Use node 18/);
  const listed = facts(['list', '--dir', dir]);
  assert.match(listed.stdout, /^Facts \(2\):/);
  assert.match(listed.stdout, /\[F001, added \d{4}-\d\d-\d\d, source: job-1\]/);
  const json = JSON.parse(facts(['list', '--json', '--dir', dir]).stdout);
  assert.equal(json.facts.length, 2);
});

test('for --brief reads the paths out of a brief; absolute paths inside the project are made relative', () => {
  const dir = project();
  addFact(dir, { text: 'auth fact', paths: 'src/auth/**' });
  addFact(dir, { text: 'sql fact', paths: '*.sql' });
  addFact(dir, { text: 'wide fact' });
  const brief = path.join(dir, 'brief.md');
  fs.writeFileSync(brief, '# Brief: J-2\nOWNS: ["src/auth/**"]\nRead `docs/notes.md`.\n');
  const r = facts(['for', '--brief', brief, '--dir', dir, '--json']);
  assert.equal(r.status, 0, r.stderr);
  const out = JSON.parse(r.stdout);
  assert.deepEqual(out.files, ['src/auth/**', 'docs/notes.md']);
  assert.deepEqual(out.facts.map((f) => f.text), ['auth fact', 'wide fact']);
  const abs = JSON.parse(facts(['for', '--files', path.join(dir, 'db', 'x.sql'), '--dir', dir, '--json']).stdout);
  assert.deepEqual(abs.files, ['db/x.sql']);
  assert.deepEqual(abs.facts.map((f) => f.text), ['sql fact', 'wide fact']);
});

test('for --brief refuses obvious secret files with one plain line and exit 2', () => {
  const dir = project();
  const secrets = ['.env', '.env.local', '.env.production', 'server.pem', 'signing.KEY', 'id_rsa', 'id_rsa.pub', path.join('.ssh', 'config')];
  for (const name of secrets) {
    const file = path.join(dir, name);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, 'SOME_SETTING=example-not-real\nsrc/auth/**\n');
    const r = facts(['for', '--brief', file, '--dir', dir]);
    assert.equal(r.status, 2, name);
    assert.equal(r.stdout, '', name);
    assert.match(r.stderr, /looks like a secret file/, name);
    assert.equal(r.stderr.trim().split('\n').length, 1, `${name}: one line`);
    assert.ok(!r.stderr.includes('example-not-real'), `${name}: never prints the contents`);
  }
  // An ordinary brief with a similar-looking name still works.
  const ok = path.join(dir, 'environment-brief.md');
  fs.writeFileSync(ok, 'Touch `src/auth/login.ts`.\n');
  assert.equal(facts(['for', '--brief', ok, '--dir', dir]).status, 0);
});

test('accept adds every proposed fact, prints what it added, and a second run adds nothing', () => {
  const dir = project();
  addFact(dir, { text: 'Already here.' });
  const handback = path.join(dir, 'handback.md');
  fs.writeFileSync(handback, [
    'Result: completed.',
    '',
    'Proposed facts:',
    '- src/auth/** :: Tokens refresh in the middleware.',
    '- Already here.',
    '- Build output goes to dist/, never commit it.',
    '',
  ].join('\n'));
  const r = facts(['accept', '--handback', handback, '--dir', dir]);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /Added F002: Tokens refresh in the middleware\. \(applies to: src\/auth\/\*\*\)/);
  assert.match(r.stdout, /Added F003: Build output goes to dist\/, never commit it\./);
  assert.match(r.stdout, /Already known F001: Already here\./);
  assert.match(r.stdout, /2 added, 1 already known\./);
  const file = stored(dir);
  assert.equal(file.facts.length, 3);
  assert.equal(file.facts[1].source, 'handback handback.md');
  const again = facts(['accept', '--handback', handback, '--dir', dir]);
  assert.match(again.stdout, /0 added, 3 already known\./);
  assert.equal(stored(dir).facts.length, 3);
  const sourced = facts(['accept', '--handback', handback, '--source', 'job-9', '--dir', dir, '--json']);
  assert.equal(JSON.parse(sourced.stdout).added.length, 0);
});

test('accept with no proposed facts section is fine and changes nothing', () => {
  const dir = project();
  const handback = path.join(dir, 'handback.md');
  fs.writeFileSync(handback, 'Result: completed.\nNext: lead.\n');
  const r = facts(['accept', '--handback', handback, '--dir', dir]);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /No proposed facts found/);
  assert.ok(!fs.existsSync(path.join(dir, '.bgzflow')));
});

test('without --dir the project is found from the current folder', () => {
  const dir = project();
  fs.mkdirSync(path.join(dir, '.bgzflow'));
  fs.mkdirSync(path.join(dir, 'sub'));
  const add = facts(['add', '--text', 'Found from a subfolder.'], { cwd: path.join(dir, 'sub') });
  assert.equal(add.status, 0, add.stderr);
  assert.equal(stored(dir).facts[0].text, 'Found from a subfolder.');
});

test('bad usage and unreadable files exit 2 with one line, and never touch the file', () => {
  const dir = project();
  const bad = (args, pattern) => {
    const r = facts(args);
    assert.equal(r.status, 2, `${args.join(' ')}: ${r.stdout}${r.stderr}`);
    assert.match(r.stderr, pattern);
    assert.equal(r.stderr.trim().split('\n').length, 1, 'one line on stderr');
  };
  assert.equal(facts([]).status, 2);
  assert.equal(facts(['--help']).status, 0);
  assert.match(facts(['--help']).stdout, /usage:/);
  bad(['nope'], /unknown command "nope"/);
  bad(['list', '--wat'], /unknown option --wat/);
  bad(['list', 'extra', '--dir', dir], /unexpected argument "extra"/);
  bad(['for', '--dir', dir], /for needs --files/);
  bad(['for', '--files'], /--files needs a value/);
  bad(['for', '--brief', path.join(dir, 'missing.md'), '--dir', dir], /cannot read brief/);
  bad(['add', '--dir', dir], /add needs --text/);
  bad(['add', '--text', '   ', '--dir', dir], /add needs --text/);
  bad(['accept', '--dir', dir], /accept needs --handback/);
  bad(['accept', '--handback', path.join(dir, 'missing.md'), '--dir', dir], /cannot read handback/);
  bad(['list', '--dir', path.join(dir, 'nope')], /project folder not found/);

  fs.mkdirSync(path.join(dir, '.bgzflow'));
  const file = path.join(dir, '.bgzflow', 'facts.json');
  fs.writeFileSync(file, '{ not json');
  bad(['list', '--dir', dir], /not valid JSON/);
  bad(['add', '--text', 'x', '--dir', dir], /not valid JSON/);
  assert.equal(fs.readFileSync(file, 'utf8'), '{ not json', 'a damaged file is left exactly as it was');
  fs.writeFileSync(file, '{"schema_version":1,"facts":"nope"}');
  bad(['for', '--files', 'a.ts', '--dir', dir], /no "facts" list/);
  fs.writeFileSync(file, '{"schema_version":2,"facts":[]}');
  bad(['list', '--dir', dir], /schema_version 2/);
  fs.writeFileSync(file, '{"schema_version":1,"facts":[{"id":"F001"}]}');
  bad(['list', '--dir', dir], /fact 1 has no text/);
});

test('a file saved with a byte-order mark and hand-written facts is read', () => {
  const dir = project();
  fs.mkdirSync(path.join(dir, '.bgzflow'));
  fs.writeFileSync(path.join(dir, '.bgzflow', 'facts.json'), '﻿{"schema_version":1,"facts":[{"id":"F007","text":"Typed by hand."}]}');
  const r = facts(['for', '--files', 'any.txt', '--dir', dir]);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /Typed by hand\. \[F007\]/);
  assert.equal(addFact(dir, { text: 'Next one.' }).fact.id, 'F008');
});
