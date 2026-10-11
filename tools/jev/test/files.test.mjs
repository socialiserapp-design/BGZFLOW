// Offline tests for tools/jev/files.mjs: the prune rules in code (no node_modules or .git, no binaries, nothing over 200 KB,
// at most 255 files), pickFirstFile, and `bgz jev file` / `bgz jev files` end to end through tools/bgz.mjs against a loopback mock.
// The file text goes to Jev (the mock) as data; only the answer may ever come back to the terminal.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { after, describe, it } from 'node:test';
import { ROOT, fake, makeProject, removeDir, runNode, startMockJev, write } from '../../../hooks/test/helpers.mjs';
import { MAX_FILES, MAX_FILE_BYTES, collectFiles, globToRegExp, looksBinary, pickFirstFile } from '../files.mjs';

const BGZ = path.join(ROOT, 'tools', 'bgz.mjs');
const dirs = [];
const mocks = [];
const scratch = (prefix = 'jevfiles') => {
  const d = makeProject(prefix);
  dirs.push(d);
  return d;
};
const mock = async (reply, opts) => {
  const m = await startMockJev(reply, opts);
  mocks.push(m);
  return m;
};
// `bgz jev ...` the way a worker runs it: a child process, a scratch home so no real ledger is touched.
const bgz = (args, { project, mockJev, extraEnv = {} }) => runNode([BGZ, 'jev', ...args], { project, env: { ...(mockJev ? mockJev.env : {}), BGZFLOW_HOME: path.join(project, '.home'), ...extraEnv } });
const rel = (dir, files) => files.map((f) => path.relative(dir, f).split(path.sep).join('/'));
const ledgerOf = (project) => {
  try {
    return fs.readFileSync(path.join(project, '.home', 'jev-ledger.jsonl'), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
  } catch {
    return [];
  }
};
after(async () => {
  for (const m of mocks) await m.close();
  for (const d of dirs) removeDir(d);
});

describe('the prune rules live in code', () => {
  it('the limits are 255 files and 200 KB', () => {
    assert.equal(MAX_FILES, 255);
    assert.equal(MAX_FILE_BYTES, 200 * 1024);
  });

  it('skips node_modules, .git, .tmp, dist, build and other generated folders at any depth, and counts them', () => {
    const d = scratch();
    write(d, 'src/keep.js', 'keep');
    write(d, 'src/deep/keep2.js', 'keep');
    for (const skipped of ['node_modules', '.git', '.hg', '.svn', '.tmp', 'dist', 'build', '.next', '.cache', '__pycache__', '.venv', 'coverage', '.codegraph', '.notes-map']) {
      write(d, `${skipped}/x.js`, 'skip me');
      write(d, `src/${skipped}/y.js`, 'skip me too');
    }
    const r = collectFiles(['.'], d);
    assert.deepEqual(rel(d, r.files), ['src/deep/keep2.js', 'src/keep.js']);
    assert.equal(r.skipped.dirs, 28);
  });

  it('skips binary files by extension and by a NUL byte in the first 4,000 bytes', () => {
    const d = scratch();
    write(d, 'a.txt', 'text');
    for (const ext of ['png', 'jpg', 'jpeg', 'gif', 'webp', 'pdf', 'zip', 'gz', 'exe', 'dll', 'wasm', 'mp4', 'woff2', 'sqlite', 'lock', 'map']) write(d, `bin.${ext}`, 'looks like text');
    write(d, 'UPPER.PNG', 'looks like text');
    fs.writeFileSync(path.join(d, 'data.dat'), Buffer.from([65, 66, 0, 67]));
    fs.writeFileSync(path.join(d, 'late-nul.dat'), Buffer.concat([Buffer.alloc(3990, 65), Buffer.from([0]), Buffer.alloc(100, 66)]));
    fs.writeFileSync(path.join(d, 'after-4000.dat'), Buffer.concat([Buffer.alloc(4100, 65), Buffer.from([0])]));
    const r = collectFiles(['.'], d);
    assert.deepEqual(rel(d, r.files), ['a.txt', 'after-4000.dat']);
    assert.equal(r.skipped.binary, 16 + 1 + 2);
    assert.equal(looksBinary(Buffer.from([1, 0])), true);
    assert.equal(looksBinary(Buffer.alloc(5000, 65)), false);
  });

  it('skips files over 200 KB, keeps a file of exactly 200 KB, and counts the large ones', () => {
    const d = scratch();
    write(d, 'exact.txt', 'x'.repeat(MAX_FILE_BYTES));
    write(d, 'over.txt', 'x'.repeat(MAX_FILE_BYTES + 1));
    write(d, 'huge.txt', 'x'.repeat(MAX_FILE_BYTES * 3));
    write(d, 'small.txt', 'x');
    const r = collectFiles(['.'], d);
    assert.deepEqual(rel(d, r.files), ['exact.txt', 'small.txt']);
    assert.equal(r.skipped.large, 2);
  });

  it('stops at 255 files by default and counts what it dropped', () => {
    const d = scratch();
    for (let i = 0; i < 260; i++) write(d, `f${String(i).padStart(3, '0')}.txt`, `file ${i}`);
    const r = collectFiles(['.'], d);
    assert.equal(r.files.length, 255);
    assert.equal(r.skipped.over_cap, 5);
    // the cap counts only files that survived the other rules: pruned files do not use up the 255
    const d2 = scratch();
    for (let i = 0; i < 30; i++) write(d2, `pic${i}.png`, 'x');
    for (let i = 0; i < 255; i++) write(d2, `ok${String(i).padStart(3, '0')}.txt`, 'x');
    const r2 = collectFiles(['.'], d2);
    assert.equal(r2.files.length, 255);
    assert.equal(r2.skipped.over_cap, 0);
    assert.equal(r2.skipped.binary, 30);
  });

  it('a lower cap is honoured and the result is sorted and has no duplicates', () => {
    const d = scratch();
    for (const n of ['c', 'a', 'b', 'e', 'd']) write(d, `${n}.txt`, n);
    const r = collectFiles(['.', 'a.txt', 'a.txt', './b.txt'], d, { maxFiles: 3 });
    assert.deepEqual(rel(d, r.files), ['a.txt', 'b.txt', 'c.txt']);
    assert.equal(r.skipped.over_cap, 2);
  });

  it('counts a missing target and carries on with the others', () => {
    const d = scratch();
    write(d, 'there.txt', 'x');
    const r = collectFiles(['nope.txt', 'there.txt', 'also-missing/**/*.js'], d);
    assert.deepEqual(rel(d, r.files), ['there.txt']);
    assert.equal(r.skipped.missing, 1);
  });

  it('globs: * stays inside one folder, ** crosses folders, ? is one character, and the match ignores case', () => {
    const d = scratch();
    write(d, 'a.js', '1');
    write(d, 'src/b.js', '2');
    write(d, 'src/deep/c.js', '3');
    write(d, 'src/deep/c.ts', '4');
    write(d, 'src/d1.js', '5');
    write(d, 'src/D2.JS', '6');
    assert.deepEqual(rel(d, collectFiles(['*.js'], d).files), ['a.js']);
    assert.deepEqual(rel(d, collectFiles(['src/*.js'], d).files), ['src/b.js', 'src/d1.js', 'src/D2.JS'].sort());
    assert.deepEqual(rel(d, collectFiles(['**/*.js'], d).files), ['a.js', 'src/D2.JS', 'src/b.js', 'src/d1.js', 'src/deep/c.js'].sort());
    assert.deepEqual(rel(d, collectFiles(['src/d?.js'], d).files), ['src/D2.JS', 'src/d1.js']);
    assert.deepEqual(rel(d, collectFiles(['src/d??.js'], d).files), [], '? is exactly one character');
    assert.deepEqual(rel(d, collectFiles(['src/**/*.ts'], d).files), ['src/deep/c.ts']);
    assert.ok(globToRegExp('**/*.js').test('a/b/c.js'));
    assert.ok(!globToRegExp('*.js').test('a/c.js'));
    assert.ok(globToRegExp('a.b').test('a.b') && !globToRegExp('a.b').test('axb'), 'a dot in a glob is a literal dot');
  });

  it('a glob never walks into node_modules or .git either', () => {
    const d = scratch();
    write(d, 'src/ok.js', 'ok');
    write(d, 'node_modules/pkg/index.js', 'no');
    write(d, 'src/node_modules/pkg/index.js', 'no');
    write(d, '.git/hooks/x.js', 'no');
    assert.deepEqual(rel(d, collectFiles(['**/*.js'], d).files), ['src/ok.js']);
  });

  it('a file named on its own is read even when its folder would have been pruned (an explicit choice)', () => {
    const d = scratch();
    write(d, 'node_modules/pkg/index.js', 'asked for by name');
    assert.deepEqual(rel(d, collectFiles(['node_modules/pkg/index.js'], d).files), ['node_modules/pkg/index.js']);
  });
});

describe('pickFirstFile names the file to open first', () => {
  const noulRes = (file, p) => ({ file, answer: { type: 'noul', p_yes: p } });
  it('a yes-probability ranks highest first, rounds the key to 3 places and skips files with no answer', () => {
    const r = pickFirstFile([noulRes('low', 0.1), noulRes('high', 0.91234), { file: 'broke', error: 'timeout' }, noulRes('mid', 0.5)], { type: 'noul' });
    assert.equal(r.first, 'high');
    assert.deepEqual(r.ranked.map((x) => x.file), ['high', 'mid', 'low']);
    assert.equal(r.ranked[0].key, 0.912);
  });

  it('a score ranks by score over its top level', () => {
    const res = [
      { file: 'a', answer: { type: 'score', score: 1, of: 3 } },
      { file: 'b', answer: { type: 'score', score: 2, of: 2 } },
      { file: 'c', answer: { type: 'score', score: 2, of: 4 } },
    ];
    assert.deepEqual(pickFirstFile(res, { type: 'score' }).ranked.map((x) => x.file), ['b', 'c', 'a']);
    assert.equal(pickFirstFile([{ file: 'x', answer: { type: 'score', score: 0.4 } }, { file: 'y', answer: { type: 'score', score: 0.8 } }], { type: 'score' }).first, 'y');
  });

  it('a choice ranks by the wanted option when --want is given, else by confidence', () => {
    const res = [
      { file: 'a', answer: { type: 'choice', choice: 'bug', confidence: 0.6, probabilities: { bug: 0.6, fine: 0.4 } } },
      { file: 'b', answer: { type: 'choice', choice: 'fine', confidence: 0.99, probabilities: { fine: 0.99 } } },
      { file: 'c', answer: { type: 'choice', choice: 'bug', confidence: 0.8 } },
      { file: 'd', answer: { type: 'choice', choice: 'fine', confidence: 0.7, probabilities: { fine: 0.7, bug: 0.3 } } },
    ];
    assert.deepEqual(pickFirstFile(res, { type: 'choice', want: 'bug' }).ranked.map((x) => x.file), ['c', 'a', 'd', 'b']);
    assert.equal(pickFirstFile(res, { type: 'choice' }).first, 'b');
  });

  it('with nothing usable, first is null and ranked is empty', () => {
    assert.deepEqual(pickFirstFile([], {}), { first: null, ranked: [] });
    assert.deepEqual(pickFirstFile([{ file: 'z', error: 'timeout' }], { type: 'noul' }), { first: null, ranked: [] });
  });
});

describe('bgz jev file, end to end through tools/bgz.mjs', () => {
  it('returns the answer, exits 0 and never prints the file text; the text reaches Jev as data and the ledger holds no text', async () => {
    const d = scratch();
    const body = `SECRET_MARKER_${'q'.repeat(40)} line two`;
    write(d, 'notes.txt', body);
    const m = await mock(() => ({ q: 0.77 }));
    const r = await bgz(['file', 'notes.txt', '--q', 'does it hold a marker?'], { project: d, mockJev: m });
    assert.equal(r.status, 0, r.stderr);
    assert.equal(r.json.ok, true);
    assert.equal(r.json.type, 'noul');
    assert.equal(r.json.p_yes, 0.77);
    assert.equal(path.resolve(r.json.file), path.join(d, 'notes.txt'));
    assert.doesNotMatch(r.stdout + r.stderr, /SECRET_MARKER/);
    assert.equal(m.calls.length, 1);
    assert.equal(m.calls[0].auth, 'Bearer test-key-not-real');
    assert.equal(m.calls[0].body.state.file, 'notes.txt');
    assert.equal(m.calls[0].body.state.text, body);
    const lines = ledgerOf(d);
    assert.equal(lines.length, 1);
    assert.equal(lines[0].caller, 'jev-file');
    assert.deepEqual(lines[0].ids, ['q']);
    assert.equal(lines[0].ok, true);
    assert.ok(!JSON.stringify(lines[0]).includes('SECRET_MARKER'));
  });

  it('answers a choice and a score question about a file', async () => {
    const d = scratch();
    write(d, 'a.js', 'code');
    const m = await mock((b) => (b.questions.q.type === 'choice' ? { q: { choice: 'risky', confidence: 0.8 } } : { q: { score: 2, confidence: 0.9 } }));
    const c = await bgz(['file', 'a.js', '--q', 'how risky?', '--type', 'choice', '--options', 'safe,risky,other'], { project: d, mockJev: m });
    assert.equal(c.json.choice, 'risky');
    assert.equal(c.json.confidence, 0.8);
    const s = await bgz(['file', 'a.js', '--q', 'how good?', '--type', 'score', '--levels', 'bad|ok|good'], { project: d, mockJev: m });
    assert.equal(s.json.score, 2);
    assert.equal(s.json.of, 2);
    assert.equal(m.calls[1].body.questions.q.criteria.length, 3);
  });

  it('sends the file with a URL password redacted', async () => {
    const d = scratch();
    write(d, 'deploy.sh', `git clone ${fake.passwordUrl()}`);
    const m = await mock(() => ({ q: 0.1 }));
    const r = await bgz(['file', 'deploy.sh', '--q', 'is there a secret?'], { project: d, mockJev: m });
    assert.equal(r.status, 0, r.stderr);
    assert.ok(!m.calls[0].body.state.text.includes(fake.password()), m.calls[0].body.state.text);
  });

  it('takes a file between 200 and 400 KB and refuses one over 400 KB with a next step, calling Jev not at all', async () => {
    const d = scratch();
    write(d, 'mid.txt', 'x'.repeat(300 * 1024));
    write(d, 'huge.txt', 'x'.repeat(401 * 1024));
    const m = await mock(() => ({ q: 0.2 }));
    const ok = await bgz(['file', 'mid.txt', '--q', 'anything?'], { project: d, mockJev: m });
    assert.equal(ok.status, 0, ok.stderr);
    assert.equal(m.calls.length, 1);
    const big = await bgz(['file', 'huge.txt', '--q', 'anything?'], { project: d, mockJev: m });
    assert.equal(big.status, 2);
    assert.match(big.stderr, /huge\.txt is 401 KB; a file question takes up to 400 KB\. Search it with rg first\./);
    assert.equal(m.calls.length, 1);
  });

  it('a missing file, a missing path and a missing question each fail with a plain message and no call', async () => {
    const d = scratch();
    write(d, 'a.txt', 'x');
    const m = await mock();
    const missing = await bgz(['file', 'nope.txt', '--q', 'hi?'], { project: d, mockJev: m });
    assert.equal(missing.status, 2);
    assert.match(missing.stderr, /cannot read nope\.txt/);
    const noPath = await bgz(['file', '--q', 'hi?'], { project: d, mockJev: m });
    assert.equal(noPath.status, 2);
    assert.match(noPath.stderr, /usage: bgz jev file <path>/);
    const noQ = await bgz(['file', 'a.txt'], { project: d, mockJev: m });
    assert.equal(noQ.status, 2);
    assert.match(noQ.stderr, /--q "<question>" is required/);
    assert.equal(m.calls.length, 0);
  });

  it('a Jev outage prints ok:false with the short code, exits 1, and still shows no file text', async () => {
    const d = scratch();
    write(d, 'a.txt', 'OUTAGE_MARKER text');
    const m = await mock(() => ({}), { status: 503 });
    const r = await bgz(['file', 'a.txt', '--q', 'ok?'], { project: d, mockJev: m });
    assert.equal(r.status, 1);
    assert.equal(r.json.ok, false);
    assert.equal(r.json.err, 'http_503');
    assert.doesNotMatch(r.stdout + r.stderr, /OUTAGE_MARKER/);
  });

  it('with no key it prints ok:false, exits 1 and sends nothing', async () => {
    const d = scratch();
    write(d, 'a.txt', 'x');
    const m = await mock();
    const r = await bgz(['file', 'a.txt', '--q', 'ok?'], { project: d, extraEnv: { BGZFLOW_JEV_URL: m.url } });
    assert.equal(r.status, 1);
    assert.equal(r.json.err, 'nokey');
    assert.equal(m.calls.length, 0);
  });
});

describe('bgz jev files, end to end through tools/bgz.mjs', () => {
  it('prunes, asks each remaining file once, names the first file and prints no file text', async () => {
    const d = scratch();
    write(d, 'src/a.js', 'ALPHA_TEXT calm code');
    write(d, 'src/b.js', 'BRAVO_TEXT has the bug');
    write(d, 'src/c.js', 'CHARLIE_TEXT calm code');
    write(d, 'node_modules/v/index.js', 'vendor bug');
    write(d, '.git/config', 'bug');
    write(d, 'logo.png', 'png bug');
    write(d, 'big.js', `${'y'.repeat(MAX_FILE_BYTES + 5)} bug`);
    const m = await mock((body) => ({ q: /bug/.test(body.state.text) ? 0.9 : 0.1 }));
    const r = await bgz(['files', '.', '--q', 'does this file hold the bug?'], { project: d, mockJev: m });
    assert.equal(r.status, 0, r.stderr);
    assert.equal(r.json.ok, true);
    assert.equal(r.json.asked, 3);
    assert.equal(r.json.answered, 3);
    assert.match(r.json.first, /b\.js$/);
    assert.deepEqual(r.json.ranked.map((x) => path.basename(x.file)), ['b.js', 'a.js', 'c.js']);
    assert.equal(r.json.ranked[0].key, 0.9);
    assert.deepEqual(r.json.failed, []);
    assert.ok(r.json.skipped.dirs >= 2 && r.json.skipped.binary === 1 && r.json.skipped.large === 1, JSON.stringify(r.json.skipped));
    assert.equal(m.calls.length, 3);
    assert.doesNotMatch(r.stdout + r.stderr, /ALPHA_TEXT|BRAVO_TEXT|CHARLIE_TEXT/);
    const lines = ledgerOf(d);
    assert.equal(lines.length, 3);
    assert.ok(lines.every((l) => l.caller === 'jev-files' && l.ok === true));
    assert.ok(!JSON.stringify(lines).match(/ALPHA_TEXT|BRAVO_TEXT|CHARLIE_TEXT/));
  });

  it('asks at most 255 files out of 260 and says how many it dropped', { timeout: 60000 }, async () => {
    const d = scratch();
    for (let i = 0; i < 260; i++) write(d, `many/f${String(i).padStart(3, '0')}.txt`, `file ${i}`);
    const m = await mock(() => ({ q: 0.5 }));
    const r = await bgz(['files', 'many', '--q', 'anything?'], { project: d, mockJev: m });
    assert.equal(r.status, 0, r.stderr);
    assert.equal(r.json.asked, 255);
    assert.equal(r.json.answered, 255);
    assert.equal(r.json.skipped.over_cap, 5);
    assert.equal(r.json.ranked.length, 15, 'only the top 15 are listed');
    assert.equal(m.calls.length, 255);
  });

  it('accepts a glob and ranks a choice question by --want', async () => {
    const d = scratch();
    write(d, 'src/one.js', 'ONE fine');
    write(d, 'src/two.js', 'TWO buggy');
    write(d, 'src/three.ts', 'THREE buggy but not matched by the glob');
    const m = await mock((body) => ({ q: { choice: /buggy/.test(body.state.text) ? 'bug' : 'fine', confidence: 0.9 } }));
    const r = await bgz(['files', 'src/*.js', '--q', 'bug or fine?', '--type', 'choice', '--options', 'bug,fine', '--want', 'bug'], { project: d, mockJev: m });
    assert.equal(r.status, 0, r.stderr);
    assert.equal(r.json.asked, 2);
    assert.match(r.json.first, /two\.js$/);
    assert.equal(r.json.ranked[0].key, 0.9);
    assert.equal(r.json.ranked[1].key, 0);
    assert.equal(m.calls.length, 2);
  });

  it('when Jev fails for some files they are listed as failed and the rest still rank', async () => {
    const d = scratch();
    write(d, 'a.txt', 'FAILME');
    write(d, 'b.txt', 'fine');
    const bodyBad = (body) => /FAILME/.test(body.state.text);
    // a raw server that returns 500 for one file only
    const http = await import('node:http');
    const hits = [];
    const server = http.createServer((req, res) => {
      const chunks = [];
      req.on('data', (c) => chunks.push(c));
      req.on('end', () => {
        const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        hits.push(body.state.file);
        if (bodyBad(body)) {
          res.writeHead(500);
          res.end('{}');
          return;
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ model: 'x', answers: { q: { type: 'noul', noul: 0.4 } }, usage: { input_tokens: 10, output_tokens: 1 } }));
      });
    });
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    mocks.push({ close: () => new Promise((resolve) => (server.closeAllConnections?.(), server.close(resolve))) });
    const env = { TYPESAFE_API_KEY: 'test-key-not-real', BGZFLOW_JEV_URL: `http://127.0.0.1:${server.address().port}/v1/systemone` };
    const r = await bgz(['files', '.', '--q', 'ok?'], { project: d, extraEnv: env });
    assert.equal(r.status, 0, r.stderr);
    assert.equal(r.json.ok, true);
    assert.equal(r.json.asked, 2);
    assert.equal(r.json.answered, 1);
    assert.deepEqual(r.json.failed.map((f) => [path.basename(f.file), f.err]), [['a.txt', 'http_500']]);
    assert.match(r.json.first, /b\.txt$/);
    assert.equal(hits.length, 2);
  });

  it('every file failing is ok:false with exit 1; nothing left after pruning is also ok:false', async () => {
    const d = scratch();
    write(d, 'a.txt', 'x');
    const down = await mock(() => ({}), { status: 500 });
    const r = await bgz(['files', '.', '--q', 'ok?'], { project: d, mockJev: down });
    assert.equal(r.status, 1);
    assert.equal(r.json.ok, false);
    assert.equal(r.json.answered, 0);
    assert.equal(r.json.first, null);
    const empty = scratch();
    write(empty, 'node_modules/x.js', 'x');
    write(empty, 'pic.png', 'x');
    const up = await mock();
    const none = await bgz(['files', '.', '--q', 'ok?'], { project: empty, mockJev: up });
    assert.equal(none.status, 1);
    assert.equal(none.json.err, 'no files left after pruning');
    assert.equal(up.calls.length, 0);
  });

  it('files without any target or question prints a usage line, exit 2, no call', async () => {
    const d = scratch();
    const m = await mock();
    const noTarget = await bgz(['files', '--q', 'ok?'], { project: d, mockJev: m });
    assert.equal(noTarget.status, 2);
    assert.match(noTarget.stderr, /usage: bgz jev files/);
    write(d, 'a.txt', 'x');
    const noQ = await bgz(['files', 'a.txt'], { project: d, mockJev: m });
    assert.equal(noQ.status, 2);
    assert.match(noQ.stderr, /--q "<question>" is required/);
    assert.equal(m.calls.length, 0);
  });
});
