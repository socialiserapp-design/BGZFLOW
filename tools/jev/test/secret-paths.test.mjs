// Offline tests for the 0.6.0 fix round, builder C:
//  - B2: secret files (.env*, Secrets/, *key*, *.pem, *credentials*, id_*) never reach Jev. A sweep skips them; a path named
//    on purpose gets a plain refusal; everything else goes through core's sanitize on the way out.
//  - Task 9: `bgz jev ask --cmd` children get an env with no TYPESAFE_API_KEY and no FAST_JEV_KEY_FILE.
//  - Task 22: the decisions file is configurable (BGZFLOW_DECISIONS_FILE). Task 24: STATUS default is the overlay.
// Every fake secret here is built from pieces at runtime, so the source holds no secret-shaped string.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { after, describe, it } from 'node:test';
import { ROOT, fake, makeProject, removeDir, runNode, startMockJev, write } from '../../../hooks/test/helpers.mjs';
import { KEY_ENV_NAMES, childEnv } from '../agentic.mjs';
import { collectFiles } from '../files.mjs';
import { statusPath } from '../rules.mjs';
import { changedUnits, decisionsFile, readAsks } from '../review.mjs';
import { dropSecretDiffs, isSecretPath, readEvidenceArg, secretRefusal } from '../secret-paths.mjs';

const CLI = path.join(ROOT, 'tools', 'jev', 'cli.mjs');
const dirs = [];
const mocks = [];
after(async () => {
  for (const m of mocks) await m.close();
  for (const d of dirs) removeDir(d);
});
const scratch = () => {
  const d = makeProject('jevsecret');
  dirs.push(d);
  return d;
};
const mock = async (reply) => {
  const m = await startMockJev(reply);
  mocks.push(m);
  return m;
};
const jev = (args, d, m, extra = {}) => runNode([CLI, ...args], { project: d, env: { ...(m ? m.env : {}), BGZFLOW_HOME: path.join(d, '.home'), FAST_JEV_KEY_FILE: path.join(d, 'no-such-key-file'), ...extra } });
const sent = (m) => JSON.stringify(m.calls.map((c) => c.body));
const envLine = (name, value) => [name, '=', value].join('');

describe('isSecretPath', () => {
  it('matches each secret kind in both slash styles, case-insensitive', () => {
    for (const p of ['.env', '.env.local', 'app/.ENV.production', 'Secrets/db.txt', 'a\\secrets\\b\\c.json', 'secrets', 'api_key.txt', 'my-KEY.json', 'server.pem', 'aws-credentials', 'C:\\x\\credentials.json', '~/.ssh/id_rsa', 'id_ed25519.pub', './keys/x.txt'.replace('keys/x.txt', 'apikey')]) {
      assert.equal(isSecretPath(p), true, p);
    }
  });

  it('leaves ordinary files alone, and only the parts inside the path count', () => {
    for (const p of ['src/app.js', 'README.md', 'docs/environment.md', 'monkey/../a.js'.replace('monkey/../', ''), 'pemberton.txt', 'identity.js', '', '   ', null, undefined, 42]) {
      assert.equal(isSecretPath(p), false, String(p));
    }
  });

  it('the refusal names the file and the kinds, and says it is never sent', () => {
    const msg = secretRefusal('.env');
    assert.match(msg, /^refused \.env: /);
    assert.match(msg, /never sent to Jev/);
    assert.match(msg, /\.env\*, Secrets\/, \*key\*, \*\.pem, \*credentials\*, id_\*/);
  });
});

describe('collectFiles: a sweep skips secret files, a named one is refused', () => {
  it('skips and counts secret files met inside folders', () => {
    const d = scratch();
    write(d, 'src/app.js', 'ok');
    write(d, '.env', envLine('TOKEN', fake.ghToken()));
    write(d, 'Secrets/db.txt', 'x');
    write(d, 'config/service-key.json', '{}');
    write(d, 'certs/server.pem', 'x');
    write(d, 'aws/credentials', 'x');
    write(d, 'ssh/id_rsa', 'x');
    const r = collectFiles(['.'], d);
    assert.deepEqual(r.files.map((f) => path.relative(d, f).split(path.sep).join('/')), ['src/app.js']);
    assert.equal(r.skipped.secret, 6);
    assert.deepEqual(r.refused, []);
  });

  it('a secret file named directly is listed in refused, never in files', () => {
    const d = scratch();
    write(d, 'src/app.js', 'ok');
    write(d, '.env', 'x');
    const r = collectFiles(['.env', 'src/app.js'], d);
    assert.deepEqual(r.refused, ['.env']);
    assert.equal(r.files.length, 1);
  });

  it('a parent folder outside the project that looks secret does not hide the project', () => {
    const outer = scratch();
    const d = path.join(outer, 'Secrets-are-elsewhere', 'proj');
    write(d, 'src/app.js', 'ok');
    assert.equal(collectFiles(['.'], d).files.length, 1);
  });
});

describe('bgz jev file / files / ask / score / skills / grade never send a secret file', () => {
  it('jev file .env is refused with a clear message, and Jev is never called', async () => {
    const d = scratch();
    const secret = fake.ghToken();
    write(d, '.env', envLine('GH_TOKEN', secret));
    const m = await mock(() => ({}));
    const r = await jev(['file', '.env', '--q', 'what is in it?'], d, m);
    assert.equal(r.status, 2);
    assert.match(r.stderr, /refused \.env: it looks like a secret file/);
    assert.equal(m.calls.length, 0);
    assert.ok(!r.stdout.includes(secret) && !r.stderr.includes(secret));
  });

  it('jev files . skips secret files; their text never reaches Jev, and the rest is sanitized', async () => {
    const d = scratch();
    const token = fake.ghToken();
    const aws = fake.awsKey();
    write(d, 'src/app.js', `const url = '${fake.tokenUrl()}';\n`);
    write(d, '.env.local', envLine('AWS', aws));
    write(d, 'Secrets/notes.txt', 'private notes');
    const m = await mock(() => ({ q: 0.2 }));
    const r = await jev(['files', '.', '--q', 'any bugs?'], d, m);
    assert.equal(r.status, 0, r.stderr);
    assert.ok(m.calls.length >= 1);
    const body = sent(m);
    assert.ok(!body.includes(aws), 'the .env text is not sent');
    assert.ok(!body.includes('private notes'), 'the Secrets/ text is not sent');
    assert.ok(!body.includes(token), 'a token inside an ordinary file is masked by sanitize');
  });

  it('jev files with only a named secret file is refused and Jev is never called', async () => {
    const d = scratch();
    write(d, 'deploy-key.pem', 'x');
    const m = await mock(() => ({}));
    const r = await jev(['files', 'deploy-key.pem', '--q', 'ok?'], d, m);
    assert.equal(r.status, 1);
    assert.equal(r.json.err, 'refused: secret files only');
    assert.match(r.json.refused[0], /^refused deploy-key\.pem: /);
    assert.equal(m.calls.length, 0);
  });

  it('ask --paths refuses a secret path by name and still sends the other files', async () => {
    const d = scratch();
    const pw = fake.password();
    write(d, '.env', envLine('DB_PASSWORD', pw));
    write(d, 'src/app.js', 'const a = 1;\n');
    const m = await mock(() => ({ q: 0.9 }));
    const r = await jev(['ask', '--q', 'is app.js fine?', '--paths', '.env,src/app.js'], d, m);
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.json.refused[0], /^refused \.env: /);
    assert.equal(m.calls.length, 1);
    assert.ok(sent(m).includes('const a = 1;'));
    assert.ok(!sent(m).includes(pw));
  });

  it('ask --paths with only a secret path is refused and Jev is never called', async () => {
    const d = scratch();
    write(d, 'credentials.json', '{}');
    const m = await mock(() => ({}));
    const r = await jev(['ask', '--q', 'ok?', '--paths', 'credentials.json'], d, m);
    assert.equal(r.status, 2);
    assert.match(r.stderr, /refused credentials\.json: /);
    assert.equal(m.calls.length, 0);
  });

  it('--state @.env, score --state @Secrets/x and route --job @id_rsa are refused; plain text still works', async () => {
    const d = scratch();
    write(d, '.env', 'x');
    write(d, 'Secrets/x.txt', 'x');
    write(d, 'id_rsa', 'x');
    const m = await mock(() => ({}));
    for (const args of [['ask', '--q', 'ok?', '--state', '@.env'], ['score', '--q', 'ok?', '--state', '@Secrets/x.txt'], ['route', '--job', '@id_rsa']]) {
      const r = await jev(args, d, m);
      assert.equal(r.status, 2, args.join(' '));
      assert.match(r.stderr, /refused .*: it looks like a secret file/, args.join(' '));
    }
    assert.equal(m.calls.length, 0);
    assert.equal(readEvidenceArg('plain text, not a file'), 'plain text, not a file');
  });

  it('skills --brief, grade --brief and grade <output> refuse a secret file by name', async () => {
    const d = scratch();
    write(d, '.env.brief', 'x');
    write(d, 'out.txt', 'done');
    write(d, 'brief.md', 'brief');
    const m = await mock(() => ({}));
    const runs = [
      ['skills', '--brief', '.env.brief'],
      ['grade', 'out.txt', '--brief', '.env.brief', '--role', 'builder', '--worker', 'w'],
      ['grade', '.env.brief', '--brief', 'brief.md', '--role', 'builder', '--worker', 'w'],
      ['bench', 'add', '--brief', '.env.brief'],
    ];
    for (const args of runs) {
      const r = await jev(args, d, m);
      assert.equal(r.status, 2, `${args.join(' ')}: ${r.stdout}${r.stderr}`);
      assert.match(r.stderr, /refused \.env\.brief: /, args.join(' '));
    }
    assert.equal(m.calls.length, 0);
  });

  it('readAsks refuses a secret asks file by name', () => {
    const d = scratch();
    write(d, '.env', 'x');
    assert.throws(() => readAsks('.env', d), /refused \.env: /);
  });
});

describe('diffs: secret files are left out of score --diff, arch and unasked', () => {
  it('dropSecretDiffs removes whole sections for secret files and names them', () => {
    const aws = fake.awsKey();
    const diff = [
      'diff --git a/src/a.js b/src/a.js\n--- a/src/a.js\n+++ b/src/a.js\n@@ -1 +1 @@\n-a\n+b\n',
      `diff --git a/.env b/.env\n--- a/.env\n+++ b/.env\n@@ -1 +1 @@\n-x\n+${envLine('AWS', aws)}\n`,
      'diff --git a/certs/x.pem b/certs/x.pem\n--- a/certs/x.pem\n+++ b/certs/x.pem\n@@ -1 +1 @@\n-x\n+y\n',
    ].join('');
    const r = dropSecretDiffs(diff);
    assert.deepEqual(r.dropped, ['.env', 'certs/x.pem']);
    assert.ok(r.text.includes('src/a.js'));
    assert.ok(!r.text.includes(aws));
  });

  it('changedUnits leaves out tracked and untracked secret files and lists them', () => {
    const d = scratch();
    const git = (...a) => spawnSync('git', a, { cwd: d, encoding: 'utf8' });
    git('init', '-q');
    git('config', 'user.email', 'noreply@example.invalid');
    git('config', 'user.name', 'Test');
    write(d, 'a.js', 'one\n');
    write(d, '.env', 'A=1\n');
    git('add', '-A');
    git('commit', '-qm', 'base');
    write(d, 'a.js', 'two\n');
    write(d, '.env', 'A=2\n');
    write(d, 'Secrets/new.txt', 'fresh\n');
    const skipped = [];
    const units = changedUnits({ base: 'HEAD', cwd: d, skippedSecret: skipped });
    assert.deepEqual([...new Set(units.map((u) => u.file))], ['a.js']);
    assert.deepEqual(skipped.sort(), ['.env', 'Secrets/new.txt']);
  });
});

describe('task 9: ask --cmd children never see the Jev key', () => {
  it('childEnv drops TYPESAFE_API_KEY and FAST_JEV_KEY_FILE in any case and keeps the rest', () => {
    const out = childEnv({ TYPESAFE_API_KEY: 'k', typesafe_api_key: 'k', FAST_JEV_KEY_FILE: 'f', PATH: 'p', OTHER: 'o' });
    assert.deepEqual(out, { PATH: 'p', OTHER: 'o' });
    assert.deepEqual(KEY_ENV_NAMES, ['TYPESAFE_API_KEY', 'FAST_JEV_KEY_FILE']);
  });

  it('a real ask --cmd run reports both names unset inside the command', async () => {
    const d = scratch();
    write(d, 'probe.js', "console.log('PROBE key=' + (process.env.TYPESAFE_API_KEY ? 'set' : 'unset') + ' file=' + (process.env.FAST_JEV_KEY_FILE ? 'set' : 'unset'));\n");
    const m = await mock(() => ({ q: 0.9 }));
    const r = await jev(['ask', '--q', 'did it print?', '--cmd', 'node probe.js', '--timeout', '20'], d, m);
    assert.equal(r.status, 0, r.stderr);
    const body = sent(m);
    assert.match(body, /PROBE key=unset file=unset/);
  });
});

describe('task 22 and 24: configurable decisions file and STATUS default', () => {
  it('decisionsFile: BGZFLOW_DECISIONS_FILE first, else DECISIONS.md, else .bgzflow/DECISIONS.md, else null', () => {
    const d = scratch();
    assert.equal(decisionsFile({}, d), null);
    write(d, '.bgzflow/DECISIONS.md', 'x');
    assert.equal(decisionsFile({}, d), path.join(d, '.bgzflow', 'DECISIONS.md'));
    write(d, 'DECISIONS.md', 'x');
    assert.equal(decisionsFile({}, d), path.join(d, 'DECISIONS.md'));
    write(d, 'docs/calls.md', 'x');
    assert.equal(decisionsFile({ BGZFLOW_DECISIONS_FILE: 'docs/calls.md' }, d), path.join(d, 'docs', 'calls.md'));
    assert.equal(decisionsFile({ BGZFLOW_DECISIONS_FILE: 'missing.md' }, d), null, 'a named file that is missing never falls back silently');
  });

  it('statusPath: BGZFLOW_STATUS, else $BGZFLOW_OVERLAY/STATUS.md, else ~/.bgzflow/overlay/STATUS.md', () => {
    assert.equal(statusPath({ BGZFLOW_STATUS: 'C:/x/STATUS.md', BGZFLOW_OVERLAY: 'C:/o' }), 'C:/x/STATUS.md');
    assert.equal(statusPath({ BGZFLOW_OVERLAY: path.join(os.tmpdir(), 'ov') }), path.join(os.tmpdir(), 'ov', 'STATUS.md'));
    assert.equal(statusPath({}), path.join(os.homedir(), '.bgzflow', 'overlay', 'STATUS.md'));
    assert.equal(statusPath({ BGZFLOW_STATUS: '  ', BGZFLOW_OVERLAY: ' ' }), path.join(os.homedir(), '.bgzflow', 'overlay', 'STATUS.md'));
  });
});
