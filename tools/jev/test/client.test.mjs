// Offline tests for the Jev client (tools/jev/jev.mjs): fail-open on every error, the ledger line, masking, argument parsing.
// Nothing here reaches the real Jev: calls go to a loopback mock or to a raw loopback server, with a fake key and an explicit env.
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import fs from 'node:fs';
import http from 'node:http';
import https from 'node:https';
import path from 'node:path';
import { after, describe, it } from 'node:test';
import { ROOT, fake, makeProject, removeDir, runNode, startMockJev, write } from '../../../hooks/test/helpers.mjs';
import * as jev from '../jev.mjs';

// Secret-looking fixtures are built from pieces at runtime so no source line trips the leak check.
const PW = ['pass', 'word'].join('');
const PW_ENV = `DB_${PW.toUpperCase()}`;

const CLI = path.join(ROOT, 'tools', 'jev', 'cli.mjs');
const FAKE_KEY = 'test-key-not-real';
const dirs = [];
const servers = [];
const scratch = () => {
  const d = makeProject('jevclient');
  dirs.push(d);
  return d;
};
const mock = async (reply, opts) => {
  const m = await startMockJev(reply, opts);
  servers.push(m);
  return m;
};
// A raw loopback server that answers with whatever the test says (the mock only ever returns well-formed answers).
async function raw(respond) {
  const hits = [];
  const server = http.createServer((req, res) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      hits.push(Buffer.concat(chunks).toString('utf8'));
      const r = respond(hits.length);
      res.writeHead(r.status ?? 200, { 'Content-Type': 'application/json' });
      res.end(typeof r.body === 'string' ? r.body : JSON.stringify(r.body));
    });
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const handle = { url: `http://127.0.0.1:${server.address().port}/v1/systemone`, hits, close: () => new Promise((resolve) => (server.closeAllConnections?.(), server.close(resolve))) };
  servers.push(handle);
  return handle;
}
const envFor = (home, url, extra = {}) => ({ TYPESAFE_API_KEY: FAKE_KEY, BGZFLOW_JEV_URL: url, BGZFLOW_HOME: home, FAST_JEV_KEY_FILE: path.join(home, 'no-such-key-file'), ...extra });
const ledgerOf = (home) => {
  try {
    return fs.readFileSync(jev.ledgerPath({ BGZFLOW_HOME: home }), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
  } catch {
    return [];
  }
};
const noulQ = { q: jev.noul('Is it so?') };
after(async () => {
  for (const s of servers) await s.close();
  for (const d of dirs) removeDir(d);
});

describe('key and kill switch', () => {
  it('reads TYPESAFE_API_KEY first, then the key file, and trims both', () => {
    const d = scratch();
    const file = write(d, 'key.txt', `  file-key-not-real \n`);
    assert.equal(jev.resolveKey({ TYPESAFE_API_KEY: '  env-key-not-real ', FAST_JEV_KEY_FILE: file }), 'env-key-not-real');
    assert.equal(jev.resolveKey({ FAST_JEV_KEY_FILE: file }), 'file-key-not-real');
    assert.equal(jev.resolveKey({ TYPESAFE_API_KEY: '   ', FAST_JEV_KEY_FILE: file }), 'file-key-not-real');
    assert.equal(jev.resolveKey({ FAST_JEV_KEY_FILE: path.join(d, 'missing') }), null);
    write(d, 'empty.txt', '  \n');
    assert.equal(jev.resolveKey({ FAST_JEV_KEY_FILE: path.join(d, 'empty.txt') }), null);
  });

  it('BGZFLOW_JEV_GATES=off (and 0, false, no) switches Jev use off even with a key', () => {
    for (const v of ['off', 'OFF', '0', 'false', 'no', ' off ']) assert.equal(jev.jevUsable({ TYPESAFE_API_KEY: FAKE_KEY, BGZFLOW_JEV_GATES: v }), false, v);
    assert.equal(jev.jevUsable({ TYPESAFE_API_KEY: FAKE_KEY, BGZFLOW_JEV_GATES: 'on' }), true);
    assert.equal(jev.jevUsable({ TYPESAFE_API_KEY: FAKE_KEY }), true);
    assert.equal(jev.jevUsable({ FAST_JEV_KEY_FILE: path.join(scratch(), 'nope') }), false);
  });

  it('BGZFLOW_HOME moves the ledger folder', () => {
    const d = scratch();
    assert.equal(jev.bgzHome({ BGZFLOW_HOME: d }), path.resolve(d));
    assert.equal(jev.ledgerPath({ BGZFLOW_HOME: d }), path.join(path.resolve(d), 'jev-ledger.jsonl'));
  });
});

describe('ask fails open (returns null) and askDetailed names why', () => {
  it('no key: null, nothing sent, no ledger line', async () => {
    const d = scratch();
    const m = await mock(() => ({ q: 1 }));
    const env = { BGZFLOW_JEV_URL: m.url, BGZFLOW_HOME: d, FAST_JEV_KEY_FILE: path.join(d, 'no-such-key-file') };
    assert.equal(await jev.ask({ caller: 't', state: { a: 1 }, questions: noulQ, env }), null);
    assert.deepEqual(await jev.askDetailed({ caller: 't', state: {}, questions: noulQ, env }), { ok: false, err: 'nokey' });
    assert.equal(m.calls.length, 0);
    assert.deepEqual(ledgerOf(d), []);
  });

  it('no questions: nothing is sent', async () => {
    const d = scratch();
    const m = await mock();
    assert.deepEqual(await jev.askDetailed({ state: {}, questions: {}, env: envFor(d, m.url) }), { ok: false, err: 'noquestions' });
    assert.deepEqual(await jev.askDetailed({ state: {}, env: envFor(d, m.url) }), { ok: false, err: 'noquestions' });
    assert.equal(m.calls.length, 0);
  });

  it('a timeout returns null, leaves one ledger line saying timeout, and returns near the caller timeout', async () => {
    const d = scratch();
    const m = await mock(() => ({ q: 1 }), { delayMs: 3000 });
    const t0 = Date.now();
    assert.equal(await jev.ask({ caller: 'slow', state: {}, questions: noulQ, timeoutMs: 300, env: envFor(d, m.url) }), null);
    assert.ok(Date.now() - t0 < 2000, `took ${Date.now() - t0} ms`);
    const lines = ledgerOf(d);
    assert.equal(lines.length, 1);
    assert.equal(lines[0].caller, 'slow');
    assert.equal(lines[0].ok, false);
    assert.equal(lines[0].err, 'timeout');
  });

  it('an abort signal from the caller also ends the call as a timeout', async () => {
    const d = scratch();
    const m = await mock(() => ({ q: 1 }), { delayMs: 3000 });
    const ac = new AbortController();
    setTimeout(() => ac.abort(), 150);
    const r = await jev.askDetailed({ state: {}, questions: noulQ, timeoutMs: 5000, signal: ac.signal, env: envFor(d, m.url) });
    assert.deepEqual(r, { ok: false, err: 'timeout' });
  });

  it('an HTTP error returns null with an http_<status> code and never the body', async () => {
    const d = scratch();
    for (const status of [500, 401, 429]) {
      const m = await mock(() => ({}), { status });
      const r = await jev.askDetailed({ state: {}, questions: noulQ, env: envFor(d, m.url) });
      assert.deepEqual(r, { ok: false, err: `http_${status}` });
      assert.equal(await jev.ask({ state: {}, questions: noulQ, env: envFor(d, m.url) }), null);
    }
    assert.ok(ledgerOf(d).every((l) => l.ok === false && /^http_/.test(l.err)));
  });

  it('a refused connection is a network error', async () => {
    const d = scratch();
    const gone = await raw(() => ({ body: {} }));
    const url = gone.url;
    await gone.close();
    const r = await jev.askDetailed({ state: {}, questions: noulQ, timeoutMs: 1000, env: envFor(d, url) });
    assert.deepEqual(r, { ok: false, err: 'network' });
  });

  it('malformed or invalid answers are all badanswer: not JSON, no answers, wrong type, out of range, unknown option', async () => {
    const d = scratch();
    const cases = [
      ['not json', { body: 'this is not json {' }],
      ['null body', { body: 'null' }],
      ['no answers', { body: { model: 'x' } }],
      ['missing id', { body: { answers: {} } }],
      ['wrong type', { body: { answers: { q: { type: 'score', score: 1, confidence: 0.9 } } } }],
      ['noul above 1', { body: { answers: { q: { type: 'noul', noul: 1.5 } } } }],
      ['noul negative', { body: { answers: { q: { type: 'noul', noul: -0.1 } } } }],
      ['noul string', { body: { answers: { q: { type: 'noul', noul: '0.5' } } } }],
    ];
    for (const [name, resp] of cases) {
      const s = await raw(() => resp);
      const r = await jev.askDetailed({ state: {}, questions: noulQ, env: envFor(d, s.url) });
      assert.deepEqual(r, { ok: false, err: 'badanswer' }, name);
    }
    const choiceQ = { c: jev.choice('Which?', { a: 'A', b: 'B' }) };
    const scoreQ = { s: jev.score('How much?', ['l0', 'l1', 'l2']) };
    const other = [
      [choiceQ, { c: { type: 'choice', choice: 'zzz', confidence: 0.9 } }],
      [choiceQ, { c: { type: 'choice', choice: 'a' } }],
      [scoreQ, { s: { type: 'score', score: 3, confidence: 0.9 } }],
      [scoreQ, { s: { type: 'score', score: 1 } }],
      [scoreQ, { s: { type: 'score', score: -1, confidence: 0.9 } }],
    ];
    for (const [questions, answers] of other) {
      const s = await raw(() => ({ body: { answers } }));
      assert.deepEqual(await jev.askDetailed({ state: {}, questions, env: envFor(d, s.url) }), { ok: false, err: 'badanswer' }, JSON.stringify(answers));
    }
    assert.ok(ledgerOf(d).every((l) => l.ok === false));
  });

  it('a state that cannot be serialised is badstate, and an oversize state is toolarge, both without a call', async () => {
    const d = scratch();
    const m = await mock();
    const circular = {};
    circular.self = circular;
    assert.deepEqual(await jev.askDetailed({ state: circular, questions: noulQ, env: envFor(d, m.url) }), { ok: false, err: 'badstate' });
    assert.deepEqual(await jev.askDetailed({ state: { n: 1n }, questions: noulQ, env: envFor(d, m.url) }), { ok: false, err: 'badstate' });
    assert.deepEqual(await jev.askDetailed({ state: { text: 'x'.repeat(90000) }, questions: noulQ, env: envFor(d, m.url) }), { ok: false, err: 'toolarge' });
    assert.equal(m.calls.length, 0);
  });

  it('BGZFLOW_JEV_URL is honoured only for loopback hosts: a remote override falls back to the real endpoint, so the key never goes elsewhere', async () => {
    // https.request is replaced for this test only, so nothing leaves the machine and the real Jev is never contacted.
    const orig = https.request;
    const seen = [];
    https.request = (u, opts) => {
      seen.push({ host: u.hostname, protocol: u.protocol });
      const req = new EventEmitter();
      req.end = () => process.nextTick(() => req.emit('error', new Error('blocked in test')));
      return req;
    };
    const origHttp = http.request;
    http.request = () => { throw new Error('http must not be used for a remote override'); };
    try {
      const d = scratch();
      for (const url of ['http://evil.example/v1/systemone', 'https://evil.example/v1/systemone', 'not a url', 'http://127.0.0.1.evil.example/x']) {
        seen.length = 0;
        // The breaker is off here: each URL is a separate network failure, not an outage that pauses the next call.
        const r = await jev.askDetailed({ state: {}, questions: noulQ, env: envFor(d, url, { BGZFLOW_JEV_BREAKER: 'off' }) });
        assert.deepEqual(r, { ok: false, err: 'network' }, url);
        assert.deepEqual(seen, [{ host: 'api.typesafe.ai', protocol: 'https:' }], url);
      }
    } finally {
      https.request = orig;
      http.request = origHttp;
    }
  });
});

describe('a good call', () => {
  it('fans several questions out in ONE request with the key, the model and the state', async () => {
    const d = scratch();
    const m = await mock(() => ({ a: 0.7, b: { choice: 'y', confidence: 0.8 }, c: { score: 2, confidence: 0.6 } }));
    const questions = { a: jev.noul('Is a?'), b: jev.choice('Which?', { x: 'X', y: 'Y' }), c: jev.score('How much?', ['l0', 'l1', 'l2']) };
    const r = await jev.ask({ caller: 'multi', state: { hello: 'world' }, questions, env: envFor(d, m.url) });
    assert.equal(m.calls.length, 1);
    assert.equal(m.calls[0].auth, `Bearer ${FAKE_KEY}`);
    assert.equal(m.calls[0].body.model, jev.MODEL);
    assert.deepEqual(Object.keys(m.calls[0].body.questions), ['a', 'b', 'c']);
    assert.deepEqual(m.calls[0].body.state, { hello: 'world' });
    assert.equal(r.ok, true);
    assert.equal(jev.pYes(r, 'a'), 0.7);
    assert.equal(jev.pick(r, 'b').choice, 'y');
    assert.equal(jev.scoreOf(r, 'c', questions.c.criteria).norm, 1);
    assert.equal(r.model, 'jev-mock');
    assert.equal(r.usage.input, 100);
  });

  it('the cost estimate is input tokens times the vendor price (output is free)', async () => {
    const d = scratch();
    const m = await mock(() => ({ q: 0.5 }));
    const r = await jev.ask({ state: {}, questions: noulQ, env: envFor(d, m.url) });
    assert.ok(Math.abs(r.cost - 100 * jev.INPUT_USD_PER_TOKEN) < 1e-9, String(r.cost));
    assert.equal(jev.DEFAULT_TIMEOUT_MS, 3000);
  });

  it('the ledger line holds time, caller, question ids, answers, latency and cost, and never the state text or the key', async () => {
    const d = scratch();
    const m = await mock(() => ({ a: 0.25, b: { choice: 'y', confidence: 0.8 }, c: { score: 2, confidence: 0.6 } }));
    const questions = { a: jev.noul('INSTRUCTION_TEXT_MARKER one?'), b: jev.choice('Which?', { x: 'X', y: 'Y' }), c: jev.score('How much?', ['l0', 'l1', 'l2']) };
    const r = await jev.ask({ caller: 'ledger-test', state: { text: 'STATE_TEXT_MARKER_9917 and more evidence' }, questions, env: envFor(d, m.url) });
    assert.equal(r.ok, true);
    const lines = ledgerOf(d);
    assert.equal(lines.length, 1);
    const l = lines[0];
    assert.match(l.t, /^\d{4}-\d\d-\d\dT/);
    assert.equal(l.caller, 'ledger-test');
    assert.deepEqual(l.ids, ['a', 'b', 'c']);
    assert.equal(typeof l.ms, 'number');
    assert.equal(l.ok, true);
    assert.equal(l.in, 100);
    assert.equal(l.out, 10);
    assert.equal(typeof l.cost, 'number');
    assert.deepEqual(l.answers, { a: 0.25, b: { c: 'y', conf: 0.8 }, c: { s: 2, conf: 0.6 } });
    const text = fs.readFileSync(jev.ledgerPath({ BGZFLOW_HOME: d }), 'utf8');
    assert.doesNotMatch(text, /STATE_TEXT_MARKER_9917/);
    assert.doesNotMatch(text, /INSTRUCTION_TEXT_MARKER/);
    assert.ok(!text.includes(FAKE_KEY));
  });

  it('every call that reaches the network gets exactly one ledger line, including failures', async () => {
    const d = scratch();
    const ok = await mock(() => ({ q: 0.5 }));
    const bad = await mock(() => ({}), { status: 500 });
    await jev.ask({ caller: 'one', state: {}, questions: noulQ, env: envFor(d, ok.url) });
    await jev.ask({ caller: 'two', state: {}, questions: noulQ, env: envFor(d, bad.url) });
    const lines = ledgerOf(d);
    assert.deepEqual(lines.map((l) => [l.caller, l.ok]), [['one', true], ['two', false]]);
  });

  it('a ledger that cannot be written never breaks the caller', async () => {
    const d = scratch();
    const m = await mock(() => ({ q: 0.5 }));
    const blocker = write(d, 'blocker', 'a file where the home folder should be');
    const r = await jev.ask({ state: {}, questions: noulQ, env: envFor(path.join(blocker, 'sub'), m.url) });
    assert.equal(r.ok, true);
    assert.doesNotThrow(() => jev.appendJsonl(path.join(blocker, 'sub', 'x.jsonl'), { a: 1 }));
  });

  it('a ledger over 1 MB is cut to its newest half and still ends on whole lines', () => {
    const d = scratch();
    const file = path.join(d, 'home', 'jev-ledger.jsonl');
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const line = (i) => JSON.stringify({ i, pad: 'p'.repeat(200) });
    let body = '';
    for (let i = 0; i < 5200; i++) body += `${line(i)}\n`;
    fs.writeFileSync(file, body);
    assert.ok(fs.statSync(file).size > 1024 * 1024);
    jev.appendJsonl(file, { i: 'last' });
    const size = fs.statSync(file).size;
    assert.ok(size <= 512 * 1024 + 1000 && size > 100 * 1024, String(size));
    const rows = fs.readFileSync(file, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
    assert.equal(rows.at(-1).i, 'last');
    assert.equal(rows.at(-2).i, 5199);
  });

  it('summarizeAnswers keeps the shape only and skips junk', () => {
    const out = jev.summarizeAnswers({ a: { type: 'noul', noul: 0.12345 }, b: { type: 'choice', choice: 'x'.repeat(100), confidence: 0.5 }, c: { type: 'score', score: 3, confidence: 0.9 }, d: null, e: 'str', f: { type: 'other' } });
    assert.deepEqual(Object.keys(out), ['a', 'b', 'c']);
    assert.equal(out.a, 0.123);
    assert.equal(out.b.c.length, 60);
  });
});

describe('text that leaves the machine', () => {
  it('safeText redacts a password or token inside a URL and keeps the head and tail of long text', () => {
    const pw = fake.password();
    const t = jev.safeText(`clone ${fake.passwordUrl()} now`);
    assert.ok(!t.includes(pw), t);
    assert.match(t, /\[redacted\]/);
    const long = jev.safeText(`HEAD${'m'.repeat(5000)}TAIL`, 1000);
    assert.ok(long.startsWith('HEAD') && long.endsWith('TAIL') && long.includes('...[cut]...'));
    assert.ok(long.length < 1100);
    assert.equal(jev.safeText(null), '');
    assert.equal(jev.safeText(undefined), '');
    assert.equal(jev.safeText('plain'), 'plain');
  });

  it('maskSecrets turns a token-shaped word into a marker with only the kind and length', () => {
    const token = fake.ghToken();
    assert.equal(jev.maskSecrets(`see ${token} for details`), 'see <token starting ghp_, 40 chars> for details');
    // Glued to a name with = the whole word is still hidden: the token value never survives in any spelling.
    for (const text of [`export API_TOKEN=${token}`, `API_TOKEN = ${token}`, `TOKEN: ${token}`, `export MY_API_KEY=${token}`, `${fake.awsKey()} and ${fake.stripeKey()}`]) {
      const masked = jev.maskSecrets(text);
      assert.ok(!masked.includes(token) && !masked.includes(fake.awsKey()) && !masked.includes(fake.stripeKey()), masked);
      assert.match(masked, /<(?:token starting [^,]+, \d+ chars|secret-shaped token, \d+ chars|value, \d+ chars, [a-z -]+)>/, masked);
    }
  });

  it('maskSecrets tells a generated-looking value from an example without showing either', () => {
    assert.match(jev.maskSecrets(`${PW_ENV}=${['Xk3jL9q', 'Rt7Wm2PzA'].join('')}`), /<value, 16 chars, random-looking>/);
    assert.match(jev.maskSecrets('STRIPE_SECRET_KEY=replace-this-with-your-key'), /<value, \d+ chars, placeholder-like>/);
    assert.match(jev.maskSecrets('password: correcthorsebattery'), /<value, 19 chars, plain text>/);
  });

  // BUG (jev.mjs line 49): the SECRET_NAME_VALUE regex has a raw 0x08 character at the start and a raw 0x03 at the end,
  // so it never matches and `password: <value>` goes out unmasked. This documents the correct behaviour.
  it('maskSecrets hides the value of a secret-named setting (password: x, secret=x), keeping only its length', () => {
    const pw = fake.password();
    for (const text of [`${PW}: ${pw}`, `${PW}=${pw}`, `login ${PW}=${pw} ok`, `${PW_ENV}="${pw}"`, `client_secret ${pw}`]) {
      const masked = jev.maskSecrets(text);
      assert.ok(!masked.includes(pw), masked);
      assert.match(masked, /<value, 11 chars, [a-z -]+>/, masked);
    }
  });

  it('maskSecrets leaves placeholders, short values, plain prose and file paths alone', () => {
    for (const s of [`${PW}=$${PW_ENV}`, 'token: <your-token-here>', 'api_key=process.env.KEY_NAME', `${PW}=short`, 'the quick brown fox', 'tools/jev/some-long-file-name.mjs', ['C:', 'Users', 'x', 'Documents/some/long/path/segment/file.json'].join('/'), 'secret=changeme-please-now']) {
      assert.equal(jev.maskSecrets(s), s, s);
    }
    assert.equal(jev.maskSecrets(null), '');
  });
});

describe('secrets in state are masked before sending (CLI, end to end)', () => {
  it('ask --state, --paths and --cmd never put a token or a URL password in the request, and the key is never printed', async () => {
    const d = scratch();
    const token = fake.ghToken();
    const pw = fake.password();
    write(d, 'notes.txt', `config\nremote ${fake.passwordUrl()}\nbody text\n`);
    const m = await mock(() => ({ q: 0.1 }));
    const home = path.join(d, 'home');
    const env = { ...m.env, BGZFLOW_HOME: home };
    const r = await runNode([CLI, 'ask', '--q', 'does it hold a secret?', '--state', `login with ${token} please`, '--paths', 'notes.txt', '--cmd', `echo API_TOKEN=${token}`], { project: d, env });
    assert.equal(r.status, 0, r.stderr + r.stdout);
    assert.equal(r.json.ok, true);
    assert.equal(r.json.command_exit, 0);
    assert.equal(m.calls.length, 1, 'a plain echo skips the gate, so one call: the question');
    const sent = JSON.stringify(m.calls[0].body);
    assert.ok(!sent.includes(token), 'token went out');
    assert.ok(!sent.includes(pw), 'URL password went out');
    assert.match(sent, /body text/);
    assert.match(sent, /token starting ghp_/);
    assert.ok(!(r.stdout + r.stderr).includes(FAKE_KEY));
    assert.ok(!(r.stdout + r.stderr).includes(token));
    assert.ok(!fs.readFileSync(jev.ledgerPath({ BGZFLOW_HOME: home }), 'utf8').includes(FAKE_KEY));
  });

  it('ask --state hides a password written as name=value', async () => {
    const d = scratch();
    const pw = fake.password();
    const m = await mock(() => ({ q: 0.1 }));
    const r = await runNode([CLI, 'ask', '--q', 'does it hold a secret?', '--state', `login ${PW}=${pw}`], { project: d, env: { ...m.env, BGZFLOW_HOME: path.join(d, 'home') } });
    assert.equal(r.status, 0, r.stderr);
    assert.ok(!JSON.stringify(m.calls[0].body).includes(pw), 'password went out');
  });
});

describe('pool', () => {
  it('keeps result order and never runs more than the limit at once', async () => {
    let running = 0;
    let peak = 0;
    const out = await jev.pool([5, 1, 4, 2, 3, 0, 6], 3, async (n, i) => {
      running++;
      peak = Math.max(peak, running);
      await new Promise((r) => setTimeout(r, n * 5));
      running--;
      return `${i}:${n}`;
    });
    assert.deepEqual(out, ['0:5', '1:1', '2:4', '3:2', '4:3', '5:0', '6:6']);
    assert.ok(peak <= 3 && peak >= 2, `peak ${peak}`);
    assert.deepEqual(await jev.pool([], 4, async () => 1), []);
  });
});

describe('parseArgs, csv, readTextArg', () => {
  it('parses --a b, --a=b, boolean flags, repeated flags and positionals', () => {
    const { flags, rest } = jev.parseArgs(['file.txt', '--q', 'why?', '--type=noul', '--json', '--x', '1', '--x', '2', '--x=3', 'other', '--last']);
    assert.deepEqual(rest, ['file.txt', 'other']);
    assert.equal(flags.q, 'why?');
    assert.equal(flags.type, 'noul');
    assert.equal(flags.json, true);
    assert.deepEqual(flags.x, ['1', '2', '3']);
    assert.equal(flags.last, true);
    assert.equal(jev.parseArgs(['--json', 'positional']).rest[0], 'positional');
    assert.equal(jev.parseArgs(['--', 'a']).rest.length, 2);
  });

  it('list and csv split, trim and drop empties', () => {
    assert.deepEqual(jev.list(undefined), []);
    assert.deepEqual(jev.list(true), []);
    assert.deepEqual(jev.list('a'), ['a']);
    assert.deepEqual(jev.csv('a, b ,,c'), ['a', 'b', 'c']);
    assert.deepEqual(jev.csv(['a,b', 'c']), ['a', 'b', 'c']);
    assert.deepEqual(jev.csv(undefined), []);
  });

  it('readTextArg reads @file, cuts to the limit, and returns empty for a missing file or a non-string', () => {
    const d = scratch();
    const f = write(d, 't.txt', 'abcdefghij');
    assert.equal(jev.readTextArg(`@${f}`, 4), 'abcd');
    assert.equal(jev.readTextArg('plain text'), 'plain text');
    assert.equal(jev.readTextArg('plain text', 5), 'plain');
    assert.equal(jev.readTextArg(`@${path.join(d, 'nope.txt')}`), '');
    assert.equal(jev.readTextArg(undefined), '');
    assert.equal(jev.readTextArg(true), '');
  });
});

describe('questionFromFlags', () => {
  it('builds noul by default, choice with options, score with levels', () => {
    assert.deepEqual(jev.questionFromFlags({ q: ' is it? ' }), { type: 'noul', instructions: 'is it?' });
    const c = jev.questionFromFlags({ q: 'which', type: 'choice', options: 'a, b,c' });
    assert.equal(c.type, 'choice');
    assert.deepEqual(Object.keys(c.criteria), ['a', 'b', 'c']);
    const s = jev.questionFromFlags({ q: 'how much', type: 'score', levels: 'low | mid | high' });
    assert.deepEqual(s.criteria, ['low', 'mid', 'high']);
    assert.equal(jev.questionFromFlags({ q: 'x' }, 'noul').type, 'noul');
  });

  it('errors plainly: no question, bad type, too few or too many options, too few or too many levels', () => {
    assert.throws(() => jev.questionFromFlags({}), /--q .* is required/);
    assert.throws(() => jev.questionFromFlags({ q: '   ' }), /required/);
    assert.throws(() => jev.questionFromFlags({ q: 'x', type: 'maybe' }), /unknown --type maybe/);
    assert.throws(() => jev.questionFromFlags({ q: 'x', type: 'choice' }), /at least two/);
    assert.throws(() => jev.questionFromFlags({ q: 'x', type: 'choice', options: 'only' }), /at least two/);
    assert.throws(() => jev.questionFromFlags({ q: 'x', type: 'choice', options: Array.from({ length: 256 }, (_, i) => `o${i}`).join(',') }), /at most 255/);
    assert.doesNotThrow(() => jev.questionFromFlags({ q: 'x', type: 'choice', options: Array.from({ length: 255 }, (_, i) => `o${i}`).join(',') }));
    assert.throws(() => jev.questionFromFlags({ q: 'x', type: 'score' }), /2 to 10/);
    assert.throws(() => jev.questionFromFlags({ q: 'x', type: 'score', levels: 'one' }), /2 to 10/);
    assert.throws(() => jev.questionFromFlags({ q: 'x', type: 'score', levels: Array.from({ length: 11 }, (_, i) => `l${i}`).join('|') }), /2 to 10/);
    assert.doesNotThrow(() => jev.questionFromFlags({ q: 'x', type: 'score', levels: Array.from({ length: 10 }, (_, i) => `l${i}`).join('|') }));
  });

  it('the CLI turns those errors into a plain message and exit 2, with no call made', async () => {
    const d = scratch();
    const m = await mock();
    const env = { ...m.env, BGZFLOW_HOME: path.join(d, 'home') };
    const r = await runNode([CLI, 'ask', '--q', 'x', '--type', 'choice', '--options', 'only', '--state', 'evidence'], { project: d, env });
    assert.equal(r.status, 2);
    assert.match(r.stderr, /at least two/);
    const none = await runNode([CLI, 'ask', '--type', 'noul', '--state', 'evidence'], { project: d, env });
    assert.equal(none.status, 2);
    assert.match(none.stderr, /--q/);
    const noEvidence = await runNode([CLI, 'ask', '--q', 'x'], { project: d, env });
    assert.equal(noEvidence.status, 2);
    assert.match(noEvidence.stderr, /give evidence/);
    assert.equal(m.calls.length, 0);
  });
});

describe('scoreOf, pYes, pick, shape', () => {
  it('scoreOf is 0-based over the described levels and clamps norm to 0..1', () => {
    const res = { answers: { s: { score: 2, confidence: 0.7 }, hi: { score: 9, confidence: 0.7 }, lo: { score: -3, confidence: 0.7 } } };
    assert.deepEqual(jev.scoreOf(res, 's', ['a', 'b', 'c', 'd', 'e']), { score: 2, norm: 0.5, confidence: 0.7 });
    assert.equal(jev.scoreOf(res, 'hi', ['a', 'b', 'c']).norm, 1);
    assert.equal(jev.scoreOf(res, 'lo', ['a', 'b', 'c']).norm, 0);
  });

  it('shape gives the compact form the CLI prints', () => {
    assert.deepEqual(jev.shape(jev.noul('q'), { noul: 0.4567 }, 'q'), { id: 'q', type: 'noul', p_yes: 0.457 });
    const c = jev.shape(jev.choice('q', { a: '', b: '' }), { choice: 'a', confidence: 0.91234, probabilities: { a: 0.9 } }, 'q');
    assert.deepEqual([c.type, c.choice, c.confidence], ['choice', 'a', 0.912]);
    const s = jev.shape(jev.score('q', ['l0', 'l1', 'l2']), { score: 1.5, confidence: 0.8 }, 'q');
    assert.deepEqual([s.type, s.score, s.of], ['score', 1.5, 2]);
  });
});
