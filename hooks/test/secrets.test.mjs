// Credential shapes in URLs. The rule from the field: a username alone is not a secret, a token or a password is.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  classifyUserinfo,
  findAllUrlCredentials,
  findQueryCredentials,
  findUrlCredentials,
  hasUrlCredentials,
  isSecretParam,
  isTokenShape,
  looksHighEntropy,
  redactSecrets,
} from '../lib/secrets.mjs';
import { fake } from './helpers.mjs';

describe('URL userinfo', () => {
  test('a user:password pair is flagged with its host, and the finding never carries the password', () => {
    const [f, ...rest] = findUrlCredentials(`remote = ${fake.passwordUrl()}`);
    assert.equal(rest.length, 0);
    assert.equal(f.kind, 'user:password');
    assert.equal(f.host, 'example.invalid');
    assert.equal(f.scheme, 'https');
    assert.ok(!JSON.stringify(f).includes(fake.password()));
  });

  test('a token in the user position is flagged', () => {
    const [f] = findUrlCredentials(fake.tokenUrl('github.com'));
    assert.equal(f.kind, 'token');
    assert.equal(f.host, 'github.com');
    assert.ok(!JSON.stringify(f).includes(fake.ghToken()));
  });

  test('a username alone is not a secret (the false alarm that started this rule)', () => {
    for (const url of [fake.userOnlyUrl('someuser'), fake.userOnlyUrl('git', 'github.com', 'ssh'), fake.scpUrl()]) {
      assert.deepEqual(findUrlCredentials(url), [], url);
      assert.equal(hasUrlCredentials(url), false, url);
    }
  });

  test('a reference or placeholder in the password position is not a secret', () => {
    for (const secret of ['${TOKEN}', '<token>', '%TOKEN%', '$TOKEN', '{{secret}}', '[redacted]']) {
      const url = `https://alice:${secret}@host.example/x`;
      assert.deepEqual(findUrlCredentials(url), [], url);
    }
  });

  test('a long username made of words is not a token, a long random string is', () => {
    assert.deepEqual(findUrlCredentials(fake.userOnlyUrl('a-really-long-team-member-name-with-many-words', 'host.example')), []);
    const [f] = findUrlCredentials(fake.userOnlyUrl(fake.longRandom(), 'host.example'));
    assert.equal(f.kind, 'token');
  });

  test('other known token shapes are recognised', () => {
    for (const token of [fake.awsKey(), fake.stripeKey(), ['xai', '-', 'abc123def456ghi789'].join(''), ['npm', '_', 'abc123def456ghi789jkl0'].join('')]) {
      assert.equal(isTokenShape(token), true, token.slice(0, 6));
    }
    for (const word of ['main', 'release-2026-09-29', 'a'.repeat(40), '1234567890'.repeat(4), '']) {
      assert.equal(isTokenShape(word), false, word.slice(0, 12));
    }
  });

  test('a password containing an at sign still reports the real host', () => {
    const url = ['https://alice:p', '@', 'ss', '@', 'host.example/x'].join('');
    const [f] = findUrlCredentials(url);
    assert.equal(f.kind, 'user:password');
    assert.equal(f.host, 'host.example');
  });

  test('start and end cover the userinfo only', () => {
    const text = `see <${fake.passwordUrl('host.example')}> now`;
    const [f] = findUrlCredentials(text);
    assert.equal(text.slice(f.start, f.end), `alice:${fake.password()}`);
    assert.equal(redactSecrets(text), 'see <https://[redacted]@host.example/team/repo.git> now');
  });

  test('harmless and harmful URLs in the same text are told apart', () => {
    const text = [fake.userOnlyUrl(), fake.passwordUrl(), fake.scpUrl(), 'https://example.com/a?b=c'].join('\n');
    const found = findUrlCredentials(text);
    assert.equal(found.length, 1);
    assert.equal(found[0].kind, 'user:password');
  });

  test('classifyUserinfo handles empty and odd input', () => {
    assert.equal(classifyUserinfo(''), null);
    assert.equal(classifyUserinfo(undefined), null);
    assert.equal(classifyUserinfo('someuser'), null);
    assert.equal(classifyUserinfo('someuser:'), null);
    assert.equal(classifyUserinfo(`someuser:${fake.password()}`), 'user:password');
  });

  test('looksHighEntropy needs length, a digit and a letter', () => {
    assert.equal(looksHighEntropy(fake.longRandom()), true);
    assert.equal(looksHighEntropy('short1'), false);
    assert.equal(looksHighEntropy('abcdefghijklmnopqrstuvwxyzabcdefgh'), false);
    assert.equal(looksHighEntropy(null), false);
  });
});

describe('query parameters', () => {
  test('a token-shaped value in a token parameter is flagged, by name only', () => {
    const [f, ...rest] = findQueryCredentials(fake.queryUrl('token', fake.longRandom()));
    assert.equal(rest.length, 0);
    assert.equal(f.kind, 'query-token');
    assert.equal(f.param, 'token');
    assert.equal(f.host, 'mcp.example.invalid');
    assert.ok(!JSON.stringify(f).includes(fake.longRandom()));
  });

  test('ordinary and short parameters are not flagged', () => {
    for (const url of [
      'https://example.com/list?page=2&sort=asc',
      fake.queryUrl('key', 'short'),
      fake.queryUrl('apikey', 'abc'),
      fake.queryUrl('token', '${TOKEN}'),
      fake.queryUrl('token', '<token>'),
      fake.queryUrl('secret', 'abc'),
      'https://example.com/x?tokens=2',
    ]) {
      assert.deepEqual(findQueryCredentials(url), [], url);
    }
  });

  test('a password or secret parameter is a credential whatever its length', () => {
    assert.equal(findQueryCredentials(fake.queryUrl('password', 'hunter22')).length, 1);
    assert.equal(findQueryCredentials(fake.queryUrl('client_secret', 'abcdef')).length, 1);
    assert.equal(isSecretParam('password', ''), false);
    assert.equal(isSecretParam('page', fake.longRandom()), false);
  });

  test('known token prefixes are flagged in api key parameters', () => {
    assert.equal(findQueryCredentials(fake.queryUrl('api_key', fake.ghToken())).length, 1);
    assert.equal(findQueryCredentials(fake.queryUrl('x-api-key', fake.stripeKey())).length, 1);
  });

  test('positions cover the value only and redaction keeps the other parameters', () => {
    const url = `${fake.queryUrl('token', fake.longRandom())}&page=2`;
    const [f] = findQueryCredentials(url);
    assert.equal(url.slice(f.start, f.end), fake.longRandom());
    assert.equal(redactSecrets(url), 'https://mcp.example.invalid/sse?token=[redacted]&page=2');
  });

  test('two secret parameters in one URL are both found', () => {
    const url = `https://host.example/x?token=${fake.longRandom()}&${['pass', 'word'].join('')}=hunter22&ok=1`;
    assert.deepEqual(findQueryCredentials(url).map((f) => f.param), ['token', 'password']);
  });
});

describe('all shapes together', () => {
  test('userinfo and query in one URL are both redacted, and redaction is idempotent', () => {
    const url = `https://alice:${fake.password()}@host.example/x?token=${fake.longRandom()}`;
    assert.equal(findAllUrlCredentials(url).length, 2);
    const once = redactSecrets(url);
    assert.equal(once, 'https://[redacted]@host.example/x?token=[redacted]');
    assert.equal(redactSecrets(once), once);
  });

  test('text without URLs, and non-strings, pass through unchanged', () => {
    assert.equal(redactSecrets('nothing to see here'), 'nothing to see here');
    assert.equal(redactSecrets(undefined), undefined);
    assert.equal(redactSecrets(42), 42);
    assert.deepEqual(findAllUrlCredentials('no url'), []);
    assert.deepEqual(findAllUrlCredentials(undefined), []);
  });
});
