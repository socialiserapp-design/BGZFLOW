// Offline tests for the agentic `bgz jev ask` (tools/jev/agentic.mjs): evidence from --state / --paths / --cmd /
// --questions, and above all that `--cmd` goes through the level 6 gate first. A protected command is refused and never run.
//
// "Never run" is proved with a harmless sentinel: a scratch `git` shim (git.cmd on Windows, a shell script elsewhere) is put
// first on PATH. It only appends its arguments to a file. If the gate lets a `git ...` command through, the shim runs and
// the sentinel file appears; if the gate refuses it, the file never exists. No real git, no real push, no destructive
// command is ever used. Jev is a loopback mock; BGZFLOW_HOME is a scratch folder; nothing reaches the real Jev.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { after, describe, it } from 'node:test';
import { ROOT, fake, kb, makeProject, removeDir, runNode, startMockJev, write } from '../../../hooks/test/helpers.mjs';
import { ledgerPath } from '../jev.mjs';

const CLI = path.join(ROOT, 'tools', 'jev', 'cli.mjs');
const BLOCK_TEXT = 'blocked: final; ask the lead, rule 8';
const dirs = [];
const mocks = [];
after(async () => {
  for (const m of mocks) await m.close();
  for (const d of dirs) removeDir(d);
});
const scratch = () => {
  const d = makeProject('jevcli');
  dirs.push(d);
  return d;
};
const mock = async (reply, opts) => {
  const m = await startMockJev(reply, opts);
  mocks.push(m);
  return m;
};

// A fixture: project folder, scratch BGZFLOW_HOME, and a git shim that records every run in sentinel.txt.
function fixture() {
  const d = scratch();
  const bin = path.join(d, 'bin');
  const sentinel = path.join(d, 'sentinel.txt');
  fs.mkdirSync(bin);
  write(bin, 'git.cmd', '@echo off\r\necho shim-ran %* >> "%BGZ_SENTINEL%"\r\necho shim-ran %*\r\n');
  if (process.platform !== 'win32') {
    const sh = write(bin, 'git', '#!/bin/sh\necho "shim-ran $*" >> "$BGZ_SENTINEL"\necho "shim-ran $*"\n');
    fs.chmodSync(sh, 0o755);
  }
  const pathKey = Object.keys(process.env).find((k) => k.toLowerCase() === 'path') || 'PATH';
  const home = path.join(d, 'home');
  const base = { [pathKey]: `${bin}${path.delimiter}${process.env[pathKey] || ''}`, BGZ_SENTINEL: sentinel, BGZFLOW_HOME: home };
  return {
    d,
    home,
    sentinel,
    ran: () => (fs.existsSync(sentinel) ? fs.readFileSync(sentinel, 'utf8') : ''),
    env: (m, extra = {}) => ({ ...base, ...(m ? m.env : {}), ...extra }),
  };
}
const ask = (fx, args, m, extra) => runNode([CLI, 'ask', ...args], { project: fx.d, env: fx.env(m, extra) });
const ledgerLines = (fx) => {
  try {
    return fs.readFileSync(ledgerPath({ BGZFLOW_HOME: fx.home }), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
  } catch {
    return [];
  }
};

describe('ask --cmd: a protected command is refused by the gate and never run', () => {
  it('git push --force origin main: err command_blocked, the rule 8 reason, exit 1, no model call, the command never ran', async () => {
    const fx = fixture();
    const m = await mock(() => ({ irreversible: 0, q: 0 }));
    const r = await ask(fx, ['--q', 'did the push work?', '--cmd', 'git push --force origin main'], m);
    assert.equal(r.status, 1, r.stderr);
    assert.equal(r.json.ok, false);
    assert.equal(r.json.err, 'command_blocked');
    assert.ok(r.json.reason.startsWith(BLOCK_TEXT), r.json.reason);
    assert.match(r.json.reason, /force push/);
    assert.equal(fx.ran(), '', 'the shim must not have run: the command was executed');
    assert.equal(fs.existsSync(fx.sentinel), false);
    assert.equal(m.calls.length, 0, 'a protected target is caught in code: not even the question is sent');
    assert.equal(r.json.answers, undefined);
  });

  it('other protected pushes are refused the same way: -f to master, a +main refspec, --mirror, deleting main', async () => {
    const fx = fixture();
    const m = await mock(() => ({ irreversible: 0, q: 0 }));
    for (const cmd of ['git push -f origin master', 'git push origin +main', 'git push --mirror origin', 'git push origin --delete main']) {
      const r = await ask(fx, ['--q', 'ok?', '--cmd', cmd], m);
      assert.equal(r.status, 1, `${cmd}: ${r.stderr}`);
      assert.equal(r.json.err, 'command_blocked', cmd);
      assert.ok(r.json.reason.startsWith(BLOCK_TEXT), cmd);
    }
    assert.equal(fx.ran(), '', 'none of the four may have run');
    assert.equal(m.calls.length, 0);
  });

  it('a protected segment hidden behind && is refused as a whole: the harmless first part does not run either', async () => {
    const fx = fixture();
    const m = await mock(() => ({ irreversible: 0, q: 0 }));
    const r = await ask(fx, ['--q', 'ok?', '--cmd', 'git status && git push --force origin main'], m);
    assert.equal(r.json.err, 'command_blocked');
    assert.equal(fx.ran(), '', 'nothing of the chained command may run');
  });

  it('a push that is not a force or a delete is not "protected": it runs (this is the control for the tests above)', async () => {
    const fx = fixture();
    const m = await mock(() => ({ irreversible: 0, q: 0.1 }));
    const r = await ask(fx, ['--q', 'ok?', '--cmd', 'git push origin feature-branch'], m);
    assert.equal(r.status, 0, r.stderr + r.stdout);
    assert.equal(r.json.ok, true);
    assert.match(fx.ran(), /shim-ran push origin feature-branch/, 'the shim proves a permitted command does run');
  });

  // X1 (fixed in 0.6.0): protectedTarget() runs in code before the key check, so with no key a protected command is
  // still refused and never run, and no Jev call is made.
  it('X1: with no key at all, a protected command is still refused and never run', async () => {
    const fx = fixture();
    const m = await mock(() => ({ irreversible: 0, q: 0 }));
    const r = await ask(fx, ['--q', 'ok?', '--cmd', 'git push --force origin main'], null, { BGZFLOW_JEV_URL: m.url });
    assert.equal(r.json.ok, false);
    assert.equal(fx.ran(), '', 'the protected command was executed although no key was available to judge it');
    assert.equal(m.calls.length, 0);
  });
});

describe('ask --cmd: Jev judges the rest (block at 0.9, warn from 0.5, never an ask prompt)', () => {
  const judge = (p) => (body) => (body.questions && body.questions.irreversible ? { irreversible: p } : { q: 0.2 });

  it('irreversible at exactly 0.9: refused with the confidence in the reason, never run, only the gate call was made', async () => {
    const fx = fixture();
    const m = await mock(judge(0.9));
    const r = await ask(fx, ['--q', 'did it work?', '--cmd', 'git reset --hard HEAD~3'], m);
    assert.equal(r.status, 1, r.stderr);
    assert.equal(r.json.err, 'command_blocked');
    assert.equal(r.json.reason, `${BLOCK_TEXT} (irreversible, 0.9)`);
    assert.equal(fx.ran(), '');
    assert.equal(m.calls.length, 1, 'the gate call only; the question is never sent');
    assert.deepEqual(Object.keys(m.calls[0].body.questions), ['irreversible']);
  });

  it('irreversible at 0.89 (a warning in the hook, a pass here): the command runs and the question is answered', async () => {
    const fx = fixture();
    const m = await mock(judge(0.89));
    const r = await ask(fx, ['--q', 'did it work?', '--cmd', 'git reset --hard HEAD~3'], m);
    assert.equal(r.status, 0, r.stderr + r.stdout);
    assert.equal(r.json.ok, true);
    assert.equal(r.json.command_exit, 0);
    assert.match(fx.ran(), /shim-ran reset --hard HEAD~3/);
    assert.equal(m.calls.length, 2, 'the gate question, then the real question');
    assert.deepEqual(Object.keys(m.calls[1].body.questions), ['q']);
  });

  it('the question carries the command, its exit code and its output as evidence', async () => {
    const fx = fixture();
    const m = await mock(judge(0.1));
    const r = await ask(fx, ['--q', 'did it work?', '--cmd', 'git reset --soft HEAD~1'], m);
    assert.equal(r.status, 0, r.stderr);
    const evidence = m.calls[1].body.state.command;
    assert.equal(evidence.run, 'git reset --soft HEAD~1');
    assert.equal(evidence.exit_code, 0);
    assert.match(evidence.output, /shim-ran reset --soft HEAD~1/);
  });

  it('a plainly read-only command skips the gate: one call, the question', async () => {
    const fx = fixture();
    const m = await mock(judge(0.99));
    const r = await ask(fx, ['--q', 'is it clean?', '--cmd', 'git status'], m);
    assert.equal(r.status, 0, r.stderr + r.stdout);
    assert.equal(m.calls.length, 1);
    assert.match(fx.ran(), /shim-ran status/);
  });

  it('Jev down at the gate fails open (the command runs); the question then fails and the exit code is still reported', async () => {
    const fx = fixture();
    const m = await mock(judge(0.99), { status: 500 });
    const r = await ask(fx, ['--q', 'did it work?', '--cmd', 'git reset --hard HEAD~1'], m);
    assert.equal(r.status, 1);
    assert.deepEqual(r.json, { ok: false, err: 'http_500', command_exit: 0 });
    assert.match(fx.ran(), /shim-ran reset --hard HEAD~1/, 'fail-open: the gate let it through');
    assert.equal(m.calls.length, 2);
  });

  it('the ledger keeps only ids, answers and timing for the gate call and the question: never the command or its output', async () => {
    const fx = fixture();
    const token = fake.ghToken();
    const m = await mock(judge(0.2));
    const r = await ask(fx, ['--q', 'did it work?', '--cmd', `git reset --hard HEAD~3 ${token}`], m);
    assert.equal(r.status, 0, r.stderr + r.stdout);
    const lines = ledgerLines(fx);
    assert.deepEqual(lines.map((l) => l.caller), ['h7-bash', 'jev-ask']);
    assert.deepEqual(lines[0].ids, ['irreversible']);
    assert.deepEqual(lines[1].ids, ['q']);
    for (const l of lines) {
      assert.equal(l.ok, true);
      assert.equal(typeof l.ms, 'number');
      assert.equal(typeof l.t, 'string');
    }
    const raw = fs.readFileSync(ledgerPath({ BGZFLOW_HOME: fx.home }), 'utf8');
    for (const secret of [token, 'reset --hard', 'shim-ran', 'test-key-not-real']) assert.ok(!raw.includes(secret), `ledger holds ${secret}`);
    assert.ok(!JSON.stringify(m.calls.map((c) => c.body)).includes(token), 'the token must be masked before it is sent');
  });
});

describe('ask --paths: files are evidence; the answer never echoes them', () => {
  it('sends the file name (not its folder) and text; skips a file over 200 KB and an unreadable one; prints only the answer', async () => {
    const fx = fixture();
    write(fx.d, 'notes.txt', 'the launch plan says freeze on friday\n');
    write(fx.d, path.join('deep', 'big.log'), kb(201));
    const m = await mock(() => ({ q: 0.8 }));
    const r = await ask(fx, ['--q', 'is there a freeze?', '--paths', `notes.txt,${path.join('deep', 'big.log')},missing.txt`], m);
    assert.equal(r.status, 0, r.stderr + r.stdout);
    const files = m.calls[0].body.state.files;
    assert.deepEqual(files.map((f) => f.path), ['notes.txt', 'big.log', 'missing.txt']);
    assert.match(files[0].text, /freeze on friday/);
    assert.deepEqual([files[1].skipped, files[1].text], ['over 200 KB', undefined]);
    assert.deepEqual([files[2].skipped, files[2].text], ['unreadable', undefined]);
    assert.ok(!r.stdout.includes('freeze on friday'), 'the file text must not be printed back');
    assert.deepEqual(r.json.answers.map((a) => [a.id, a.type, a.p_yes]), [['q', 'noul', 0.8]]);
  });

  it('a file longer than 20,000 characters keeps its start and end, drops the middle, and says so', async () => {
    const fx = fixture();
    // safeText(text, 20000) keeps the first 60% and the last 40% around a "...[cut]..." marker.
    write(fx.d, 'long.txt', `START-MARKER ${'word '.repeat(10000)}MIDDLE-MARKER ${'word '.repeat(10000)} END-MARKER`);
    const m = await mock(() => ({ q: 0.1 }));
    const r = await ask(fx, ['--q', 'anything?', '--paths', 'long.txt'], m);
    assert.equal(r.status, 0, r.stderr);
    const text = m.calls[0].body.state.files[0].text;
    assert.ok(text.length <= 20100, `sent ${text.length} chars`);
    assert.ok(text.startsWith('START-MARKER'));
    assert.ok(text.endsWith('END-MARKER'));
    assert.match(text, /\.\.\.\[cut\]\.\.\./);
    assert.ok(!text.includes('MIDDLE-MARKER'), 'the middle of a long file must not be sent');
  });

  it('--state @file is read from the file', async () => {
    const fx = fixture();
    write(fx.d, 'state.txt', 'build failed on step three\n');
    const m = await mock(() => ({ q: 0.4 }));
    const r = await ask(fx, ['--q', 'real failure?', '--state', `@${path.join(fx.d, 'state.txt')}`], m);
    assert.equal(r.status, 0, r.stderr);
    assert.match(m.calls[0].body.state.text, /build failed on step three/);
  });
});

describe('ask --questions @file.json: several questions in one call', () => {
  const spec = {
    risk: { type: 'noul', instructions: 'Is the change risky?' },
    kind: { type: 'choice', instructions: 'What kind of failure is it?', criteria: ['flaky', 'real', 'environment'] },
    sev: { type: 'score', instructions: 'How severe is it?', criteria: ['none', 'low', 'high'] },
  };

  it('sends all three in one request and prints each answer, with a band for the ones that carry a confidence', async () => {
    const fx = fixture();
    const file = write(fx.d, 'questions.json', JSON.stringify(spec));
    const m = await mock(() => ({ risk: 0.2, kind: { choice: 'real', confidence: 0.95 }, sev: { score: 2, confidence: 0.6 } }));
    const r = await ask(fx, ['--questions', `@${file}`, '--state', 'npm test failed twice with the same assertion'], m);
    assert.equal(r.status, 0, r.stderr + r.stdout);
    assert.equal(m.calls.length, 1, 'one request for all the questions');
    assert.deepEqual(Object.keys(m.calls[0].body.questions), ['risk', 'kind', 'sev']);
    assert.deepEqual(Object.values(m.calls[0].body.questions).map((q) => q.type), ['noul', 'choice', 'score']);
    assert.deepEqual(Object.keys(m.calls[0].body.questions.kind.criteria), ['flaky', 'real', 'environment']);
    const byId = Object.fromEntries(r.json.answers.map((a) => [a.id, a]));
    assert.equal(byId.risk.p_yes, 0.2);
    assert.equal(byId.risk.band, undefined, 'a noul answer has no confidence, so no band');
    assert.equal(byId.kind.choice, 'real');
    assert.equal(byId.kind.band, 'act', '0.95 confidence may act');
    assert.equal(byId.sev.score, 2);
    assert.equal(byId.sev.of, 2);
    assert.equal(byId.sev.band, 'confirm', '0.6 confidence is a confirm');
    assert.equal(typeof r.json.cost_usd, 'number');
    assert.equal(typeof r.json.ms, 'number');
  });

  it('a question with no instructions, and a file that is not JSON, are rejected with exit 2 and no call', async () => {
    const fx = fixture();
    const m = await mock(() => ({}));
    const bad = write(fx.d, 'bad.json', JSON.stringify({ a: { type: 'noul' } }));
    const r1 = await ask(fx, ['--questions', `@${bad}`, '--state', 'x'], m);
    assert.equal(r1.status, 2);
    assert.match(r1.stderr, /question "a" needs instructions/);
    const junk = write(fx.d, 'junk.json', 'not json at all');
    const r2 = await ask(fx, ['--questions', `@${junk}`, '--state', 'x'], m);
    assert.equal(r2.status, 2);
    assert.match(r2.stderr, /^bgz jev: /);
    assert.equal(m.calls.length, 0);
  });
});

describe('ask: the key and the answer', () => {
  it('with no key it fails fast with err nokey, exit 1 and makes no call', async () => {
    const fx = fixture();
    const m = await mock(() => ({ q: 0.5 }));
    const r = await ask(fx, ['--q', 'is it ok?', '--state', 'some evidence'], null, { BGZFLOW_JEV_URL: m.url });
    assert.equal(r.status, 1);
    assert.deepEqual(r.json, { ok: false, err: 'nokey' });
    assert.equal(m.calls.length, 0);
  });

  it('an answer that is not valid for its question is reported as badanswer, not trusted', async () => {
    // The shared mock always builds a valid answer from the request's own options, so use a raw server that lies.
    const server = http.createServer((req, res) => {
      req.resume();
      req.on('end', () => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ model: 'jev-mock', answers: { q: { type: 'choice', choice: 'not-an-option', confidence: 0.99 } }, usage: { input_tokens: 5, output_tokens: 1 } }));
      });
    });
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    try {
      const fx = fixture();
      const env = { TYPESAFE_API_KEY: 'test-key-not-real', BGZFLOW_JEV_URL: `http://127.0.0.1:${server.address().port}/v1/systemone` };
      const r = await ask(fx, ['--q', 'what kind?', '--type', 'choice', '--options', 'flaky,real', '--state', 'x'], { env });
      assert.equal(r.status, 1);
      assert.deepEqual(r.json, { ok: false, err: 'badanswer' });
      assert.equal(ledgerLines(fx).at(-1).err, 'badanswer');
    } finally {
      await new Promise((resolve) => (server.closeAllConnections?.(), server.close(resolve)));
    }
  });
});
