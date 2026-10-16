// Jev outage breaker and fully sanitized outbound paths. Loopback mocks only, a fake key, a scratch BGZFLOW_HOME.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import net from 'node:net';
import path from 'node:path';
import { after, describe, it } from 'node:test';
import { makeProject, removeDir, startMockJev } from '../../../hooks/test/helpers.mjs';
import * as jev from '../jev.mjs';

const FAKE_KEY = ['fake', '-key-', 'not-real-0000'].join('');
const PW = ['pass', 'word'].join(''); // so no source line reads as a password assignment to the repo leak check
const noulQ = { q: { type: 'noul', question: 'is it fine?' } };
const dirs = [];
const home = () => {
  const d = makeProject('brk');
  dirs.push(d);
  return d;
};
after(() => dirs.forEach(removeDir));
const envFor = (d, url, extra = {}) => ({ TYPESAFE_API_KEY: FAKE_KEY, BGZFLOW_JEV_URL: url, BGZFLOW_HOME: d, FAST_JEV_KEY_FILE: path.join(d, 'no-such-key-file'), ...extra });
const stampExists = (d) => fs.existsSync(path.join(d, jev.JEV_DOWN_FILE));

// A server that answers every request with a fixed status and body.
async function rawServer(status, body) {
  const server = http.createServer((req, res) => {
    req.resume();
    req.on('end', () => {
      res.writeHead(status, { 'Content-Type': 'application/json' });
      res.end(body);
    });
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  return { url: `http://127.0.0.1:${server.address().port}/v1/systemone`, close: () => new Promise((r) => (server.closeAllConnections?.(), server.close(r))) };
}

// A port nothing listens on.
async function deadPort() {
  const s = net.createServer();
  await new Promise((r) => s.listen(0, '127.0.0.1', r));
  const port = s.address().port;
  await new Promise((r) => s.close(r));
  return `http://127.0.0.1:${port}/v1/systemone`;
}

describe('Jev outage breaker', () => {
  it('a timeout writes the stamp; the next call skips the network and returns in under 50 ms', async () => {
    const d = home();
    const m = await startMockJev(() => ({ q: 1 }), { delayMs: 10000 });
    try {
      const env = envFor(d, m.url);
      const t0 = Date.now();
      const first = await jev.askDetailed({ caller: 'brk', state: {}, questions: noulQ, timeoutMs: 200, env });
      const firstMs = Date.now() - t0;
      assert.deepEqual(first, { ok: false, err: 'timeout' });
      assert.ok(firstMs < 2000, `first call took ${firstMs} ms`);
      assert.ok(stampExists(d));
      const stamp = JSON.parse(fs.readFileSync(path.join(d, jev.JEV_DOWN_FILE), 'utf8'));
      assert.ok(stamp.until - Date.now() > jev.JEV_DOWN_MS - 5000 && stamp.until - Date.now() <= jev.JEV_DOWN_MS);
      assert.ok(jev.jevDownUntil(env) > Date.now());

      const t1 = Date.now();
      const second = await jev.askDetailed({ caller: 'brk', state: {}, questions: noulQ, timeoutMs: 5000, env });
      const secondMs = Date.now() - t1;
      assert.deepEqual(second, { ok: false, err: 'jevdown' });
      assert.ok(secondMs < 50, `second call took ${secondMs} ms`);
      assert.equal(await jev.ask({ caller: 'brk', state: {}, questions: noulQ, env }), null, 'ask fails open with null');
      assert.equal(m.calls.length, 1, 'the network was used once');
    } finally {
      await m.close();
    }
  });

  it('a refused connection is a network error, fails open and writes the stamp', async () => {
    const d = home();
    const r = await jev.askDetailed({ state: {}, questions: noulQ, timeoutMs: 2000, env: envFor(d, await deadPort()) });
    assert.deepEqual(r, { ok: false, err: 'network' });
    assert.ok(stampExists(d));
  });

  it('an expired stamp lets the call through, and a later success leaves no new stamp', async () => {
    const d = home();
    const m = await startMockJev(() => ({ q: 1 }));
    try {
      const env = envFor(d, m.url);
      jev.markJevDown(env, 'timeout', Date.now() - jev.JEV_DOWN_MS - 1000);
      assert.equal(jev.jevDownUntil(env), 0);
      const r = await jev.askDetailed({ state: {}, questions: noulQ, env });
      assert.equal(r.ok, true);
      assert.equal(m.calls.length, 1);
    } finally {
      await m.close();
    }
  });

  it('fails open without a stamp on no key, HTTP 5xx and bad JSON', async () => {
    const d = home();
    assert.deepEqual(await jev.askDetailed({ state: {}, questions: noulQ, env: { BGZFLOW_HOME: d, FAST_JEV_KEY_FILE: path.join(d, 'none'), HOME: d, USERPROFILE: d } }), { ok: false, err: 'nokey' });
    const s5 = await rawServer(503, '{"error":"down"}');
    const bad = await rawServer(200, 'not json {');
    try {
      assert.deepEqual(await jev.askDetailed({ state: {}, questions: noulQ, env: envFor(d, s5.url) }), { ok: false, err: 'http_503' });
      assert.deepEqual(await jev.askDetailed({ state: {}, questions: noulQ, env: envFor(d, bad.url) }), { ok: false, err: 'badanswer' });
      assert.equal(stampExists(d), false);
    } finally {
      await s5.close();
      await bad.close();
    }
  });

  it('a caller abort is not an outage; BGZFLOW_JEV_BREAKER=off neither writes nor obeys the stamp', async () => {
    const d = home();
    const m = await startMockJev(() => ({ q: 1 }), { delayMs: 10000 });
    try {
      const ac = new AbortController();
      setTimeout(() => ac.abort(), 100);
      assert.deepEqual(await jev.askDetailed({ state: {}, questions: noulQ, timeoutMs: 5000, signal: ac.signal, env: envFor(d, m.url) }), { ok: false, err: 'timeout' });
      assert.equal(stampExists(d), false);
      const off = envFor(d, m.url, { BGZFLOW_JEV_BREAKER: 'off' });
      assert.deepEqual(await jev.askDetailed({ state: {}, questions: noulQ, timeoutMs: 150, env: off }), { ok: false, err: 'timeout' });
      assert.equal(stampExists(d), false);
      jev.markJevDown(off);
      assert.deepEqual(await jev.askDetailed({ state: {}, questions: noulQ, timeoutMs: 150, env: off }), { ok: false, err: 'timeout' }, 'the network is still tried');
      jev.clearJevDown(off);
      assert.equal(stampExists(d), false);
    } finally {
      await m.close();
    }
  });

  it('timeoutMs is a hard ceiling even when the server sends headers and then stalls', async () => {
    const d = home();
    const server = http.createServer((req, res) => {
      req.resume();
      req.on('end', () => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.write('{"answers":'); // and never finishes
      });
    });
    await new Promise((r) => server.listen(0, '127.0.0.1', r));
    try {
      const t0 = Date.now();
      const r = await jev.askDetailed({ state: {}, questions: noulQ, timeoutMs: 200, env: envFor(d, `http://127.0.0.1:${server.address().port}/x`) });
      assert.deepEqual(r, { ok: false, err: 'timeout' });
      assert.ok(Date.now() - t0 < 2000);
    } finally {
      await new Promise((r) => (server.closeAllConnections?.(), server.close(r)));
    }
  });
});

describe('outbound and ledger text is sanitized', () => {
  const ghp = ['gh', 'p_', 'a1B2c3D4e5F6g7H8i9J0k1L2m3N4o5P6q7R8'].join('');
  const pw = ['Hunter2', 'Hunter2'].join('');
  const email = ['jane.doe', '@', 'acme-corp.co.uk'].join('');

  it('safeText and maskSecrets apply the full sanitize', () => {
    const t = `curl -u admin:${pw} x; mail ${email}; token ${ghp}`;
    for (const f of [jev.safeText, jev.maskSecrets, jev.sanitize]) {
      const out = f(t);
      for (const s of [pw, email, ghp]) assert.ok(!out.includes(s));
    }
  });

  it('the request body and the ledger line carry no secret, even when the caller passes raw state', async () => {
    const d = home();
    const m = await startMockJev(() => ({ q: 1 }));
    try {
      const env = envFor(d, m.url);
      const r = await jev.askDetailed({ caller: `deploy ${email}`, state: { cmd: `mysql -p${pw} db`, notes: [`token ${ghp}`] }, questions: { q: { type: 'noul', question: `is ${PW}=${pw} safe?` } }, env });
      assert.equal(r.ok, true);
      const sent = JSON.stringify(m.calls[0].body);
      const ledger = fs.readFileSync(jev.ledgerPath(env), 'utf8');
      for (const s of [pw, email, ghp, FAKE_KEY]) {
        assert.ok(!sent.includes(s), 'request body leaked');
        assert.ok(!ledger.includes(s), 'ledger leaked');
      }
    } finally {
      await m.close();
    }
  });

  it('appendJsonl sanitizes every string field', () => {
    const d = home();
    const file = path.join(d, 'bench.jsonl');
    jev.appendJsonl(file, { card: { text: `${PW}=${pw}`, who: email } });
    const text = fs.readFileSync(file, 'utf8');
    assert.ok(!text.includes(pw) && !text.includes(email));
  });

  it('sanitizeRecord is exported from jev.mjs', () => {
    assert.equal(typeof jev.sanitizeRecord, 'function');
    assert.ok(!JSON.stringify(jev.sanitizeRecord({ a: [{ b: `token ${ghp}` }] })).includes(ghp));
  });
});
