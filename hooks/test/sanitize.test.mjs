// sanitize(text) / sanitizeRecord(obj): the one masker for everything that leaves the machine or lands in a ledger.
// Every fake secret below is built from pieces at run time, so no source line looks like a real secret to a scanner.
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { maskPemBlocks, maskSecrets, sanitize, sanitizeRecord } from '../lib/secrets.mjs';

const j = (...parts) => parts.join('');
const PW = j('pass', 'word'); // so no source line reads as a password assignment to the repo leak check
const at = (local, domain) => j(local, '@', domain);

// A multi-line RSA PEM block whose body lines hold two or more slashes (the shape that used to slip past the path
// exemption one word at a time).
const pemLines = [
  j('MIIEow', 'IBAAKCAQEA3x/Lq9vT2/kP8mN4r', 'S7wZ1cY6bF5dJ0gA3eU8iOq2Hk'),
  j('n4Rk/7sQ2/Vw9xYz3Lp8Mt6Jh1Gd', '5Fb0Nc2Xe4Wq/Za7Ub9Tr3Ys5Vo'),
  j('Pq1Rs2Tu3Vw4Xy5/Za6Bc7De8Fg9/', 'Hi0Jk1Lm2No3Pq4Rs5Tu6Vw7Xy8'),
  j('Kd8Lf3Mh7Nj2Pk6Ql1Rm5Sn9Tp4V', 'q/8Wr3Xs7Yt2Zu6Av1Bw5Cx9Dy=='),
];
const PEM_KIND = j('RSA ', 'PRIVATE ', 'KEY');
const pem = [j('-----BEGIN ', PEM_KIND, '-----'), ...pemLines, j('-----END ', PEM_KIND, '-----')].join('\n');

const v = {
  stripe: j('sk_', 'live_', '51Hx9y8Z7w6V5u4T3s2R1q0P'),
  awsId: j('AK', 'IA', 'Q7W3E9R2T5Y8U1I4'),
  awsSecret: j('Hq3vT9xK2mP8', '/Lw4nR7sZ1cY6/', 'bF5dJ0gA3eU8iO'),
  gh: j('gh', 'p_', 'a1B2c3D4e5F6g7H8i9J0k1L2m3N4o5P6q7R8'),
  jwt: j('eyJ', 'hbGciOiJIUzI1NiJ9', '.', 'eyJzdWIiOiIxMjM0NTY3ODkwIn0', '.', 'dBjftJeZ4CVPmB92K27uhbUJU1p1r_wW1gFWFOEjXk'),
  pgPass: j('Pg5ec', 'retVal9'),
  curlPass: j('Cu7lPa', 'ssW0rd'),
  mysqlPass: j('My5ql', 'Pa55wd'),
  assignPass: j('Hunter2', 'Hunter2'),
  email: j('jane.doe', '@', 'acme-corp.co.uk'),
  phoneLocal: j('07700 ', '900123'),
  phoneIntl: j('+44 ', '7700 ', '900456'),
};

const fixture = [
  `stripe key ${v.stripe} for billing`,
  `aws_access_key_id = ${v.awsId}`,
  `aws_secret_access_key = ${v.awsSecret}`,
  `bare pair: ${v.awsId} ${v.awsSecret}`,
  `remote token ${v.gh}`,
  `Authorization header was ${v.jwt}`,
  pem,
  `DATABASE_URL=postgres://app:${v.pgPass}@db.internal:5432/main`,
  `curl -u admin:${v.curlPass} https://api.internal/v1/items`,
  `mysql -u root -p${v.mysqlPass} shop < dump.sql`,
  `psql --${PW}=${v.pgPass} -h db.internal`,
  `${PW}=${v.assignPass}`,
  `contact ${v.email} or call ${v.phoneLocal} / ${v.phoneIntl}`,
].join('\n');

const secretValues = () => [v.stripe, v.awsId, v.awsSecret, v.gh, v.jwt, v.pgPass, v.curlPass, v.mysqlPass, v.assignPass, v.email, v.phoneLocal, v.phoneIntl, ...pemLines];

describe('sanitize', () => {
  it('leaves none of the fixture secrets in the output', () => {
    const out = sanitize(fixture);
    for (const s of secretValues()) assert.ok(!out.includes(s), `survived: ${s.slice(0, 6)}... (${s.length} chars)`);
    // no long fragment of a PEM body or AWS secret survives either
    for (const s of [...pemLines, v.awsSecret]) for (const part of s.split('/')) if (part.length >= 12) assert.ok(!out.includes(part), `fragment survived: ${part.slice(0, 6)}...`);
    assert.ok(!out.includes('-----BEGIN'), 'PEM header survived');
  });

  it('masks a whole PEM block as one unit, before any word pass (lines with 2+ slashes included)', () => {
    const text = `before\n${pem}\nafter`;
    assert.equal(maskPemBlocks(text), 'before\n[rsa private key block]\nafter');
    assert.equal(sanitize(text), 'before\n[rsa private key block]\nafter');
    // the word pass alone would keep path-like PEM lines; sanitize must not depend on it
    const truncated = `${j('-----BEGIN ', 'OPENSSH ', 'PRIVATE KEY', '-----')}\n${pemLines[0]}\n${pemLines[1]}`;
    const out = sanitize(truncated);
    for (const l of pemLines.slice(0, 2)) assert.ok(!out.includes(l));
  });

  it('keeps the kind and length of a hidden value, never the value', () => {
    assert.match(sanitize(`pushed with ${v.gh}`), /^pushed with <token starting ghp_, 40 chars>$/);
    assert.match(sanitize(`token ${v.gh}`), /^token <value, 40 chars, random-looking>$/);
  });

  it('leaves normal code, paths and prose unchanged', () => {
    const samples = [
      'const total = items.reduce((a, b) => a + b, 0);',
      "import { sanitize, sanitizeRecord } from '../../hooks/lib/secrets.mjs';",
      'C:\\Users\\alex\\Documents\\AI working principles\\skill-packs\\bgzflow-jev\\tools\\jev\\jev.mjs',
      '/usr/local/lib/node_modules/typescript/lib/tsserver.js',
      'skill-packs/bgzflow-jev/hooks/lib/secrets.mjs and tools/jev/test/client.test.mjs',
      'node --test tools/jev/test/client.test.mjs',
      'The judge reads the state and answers in under a second; tokens cost very little.',
      'if (maxTokens > 4000) return { ok: false, err: "toolarge" };',
      'const tokenCount = 12000; const passwordMinLength = 12;',
      'docker run -u 1000:1000 node:22 node --version',
      'Released 0.6.0 on 2026-10-09T12:40:00Z after commit 706d76c.',
      `Write to ${at('noreply', 'example.com')} or ${at('git', 'github.com')}:team/repo.git`,
      `Use \${TYPESAFE_API_KEY} or ${PW}=<your ${PW} here> in the example.`,
      `if (${PW} === confirm) save(); const secret = getSecret(name);`,
      'C:\\Users\\alex\\AppData\\Local\\Temp\\claude\\356ab900-6c34-4434-b6ad-aa87698dfa35\\scratchpad\\fix-060',
      'commit 9f2c1e7b4a6d8e0f1a3b5c7d9e1f2a4b6c8d0e2f merged',
    ];
    for (const s of samples) assert.equal(sanitize(s), s);
  });

  it('is idempotent and handles empty input', () => {
    const once = sanitize(fixture);
    assert.equal(sanitize(once), once);
    assert.equal(sanitize(undefined), '');
    assert.equal(sanitize(null), '');
    assert.equal(sanitize(42), '42');
  });

  it('runs in linear time on a long base64 blob', () => {
    const blob = 'QUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVo0NTY3ODkwYWJjZGVmZ2hpams/'.repeat(1000);
    const t0 = Date.now();
    sanitize(blob);
    assert.ok(Date.now() - t0 < 2000, `took ${Date.now() - t0} ms`);
  });

  it('maskSecrets keeps its own contract (named values and token words)', () => {
    const out = maskSecrets(`api_key=${v.stripe}`);
    assert.ok(!out.includes(v.stripe));
    assert.match(out, /^api_key=/);
  });
});

describe('sanitizeRecord', () => {
  it('deep-sanitizes every string field and keeps the shape', () => {
    const rec = { t: '2026-10-09', n: 3, ok: true, none: null, nested: { cmd: `curl -u admin:${v.curlPass} x`, list: [v.email, { pem }] } };
    const out = sanitizeRecord(rec);
    const text = JSON.stringify(out);
    for (const s of [v.curlPass, v.email, ...pemLines]) assert.ok(!text.includes(s));
    assert.equal(out.n, 3);
    assert.equal(out.ok, true);
    assert.equal(out.none, null);
    assert.equal(out.t, '2026-10-09');
    assert.ok(Array.isArray(out.nested.list));
    assert.equal(rec.nested.list[0], v.email, 'the input is not changed');
  });

  it('survives a cycle', () => {
    const a = { s: `${PW}=${v.assignPass}` };
    a.self = a;
    const out = sanitizeRecord(a);
    assert.equal(out.self, '[cycle]');
    assert.ok(!JSON.stringify(out).includes(v.assignPass));
  });
});
