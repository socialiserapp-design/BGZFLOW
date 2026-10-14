import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { after, beforeEach, test } from 'node:test';

const cli = fileURLToPath(new URL('../bg-mail.mjs', import.meta.url));
const roots = [];
let env;

beforeEach(() => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'bg-mail-'));
  roots.push(directory);
  env = { ...process.env, BG_MAIL_DIR: directory, BG_MAIL_POLL_MS: '10' };
});

after(() => {
  for (const directory of roots) fs.rmSync(directory, { recursive: true, force: true });
});

function run(args, cwd) {
  return spawnSync(process.execPath, [cli, ...args], { env, cwd, encoding: 'utf8', timeout: 5000 });
}

function post(waitMinutes = '1') {
  const result = run([
    'post', '--project', 'p', '--from', 'worker', '--to', 'lead',
    '--body', 'choose', '--default', 'safe', '--wait-minutes', waitMinutes,
  ]);
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout);
}

function child(args) {
  return new Promise((resolve) => {
    const processHandle = spawn(process.execPath, [cli, ...args], { env });
    let stdout = '';
    let stderr = '';
    processHandle.stdout.on('data', (chunk) => { stdout += chunk; });
    processHandle.stderr.on('data', (chunk) => { stderr += chunk; });
    processHandle.on('exit', (status) => resolve({ status, stdout, stderr }));
  });
}

test('post creates a durable addressed question', () => {
  const message = post();
  const listed = run(['list', '--project', 'p', '--to', 'lead']);
  assert.equal(listed.status, 0, listed.stderr);
  assert.equal(JSON.parse(listed.stdout)[0].id, message.id);
});

test('reply makes wait return the answer', () => {
  const message = post();
  const reply = run(['reply', '--project', 'p', '--id', message.id, '--from', 'lead', '--body', 'go']);
  assert.equal(reply.status, 0, reply.stderr);
  const waited = run(['wait', '--project', 'p', '--id', message.id]);
  assert.equal(JSON.parse(waited.stdout).answer, 'go');
});

test('wait uses the safe default after its timeout', () => {
  const message = post('0');
  const waited = run(['wait', '--project', 'p', '--id', message.id]);
  assert.equal(waited.status, 0, waited.stderr);
  assert.equal(JSON.parse(waited.stdout).state, 'default');
  assert.equal(JSON.parse(waited.stdout).answer, 'safe');
});

test('a concurrent reply wakes wait without restarting the worker', async () => {
  const message = post('1');
  const waiting = child(['wait', '--project', 'p', '--id', message.id]);
  await new Promise((resolve) => setTimeout(resolve, 50));
  const reply = run(['reply', '--project', 'p', '--id', message.id, '--from', 'lead', '--body', 'continue']);
  assert.equal(reply.status, 0, reply.stderr);
  const result = await waiting;
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).answer, 'continue');
});

test('watch exits when a lead-bound question arrives', async () => {
  const watching = child(['watch', '--project', 'p', '--to', 'lead']);
  await new Promise((resolve) => setTimeout(resolve, 50));
  const message = post();
  const result = await watching;
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).id, message.id);
});

// A worker whose sandbox can write its own folder but not the shared inbox.
const sandboxSupported = spawnSync(process.execPath, ['--permission', '--allow-fs-read=*', '-e', '0']).status === 0;
const skip = !sandboxSupported && 'node --permission is not available';

function workFolder() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'bg-mail-work-'));
  roots.push(directory);
  return directory;
}

function sandboxed(cwd, args, writable = cwd) {
  return spawnSync(
    process.execPath,
    ['--permission', '--allow-fs-read=*', `--allow-fs-write=${writable}`, cli, ...args],
    { env, cwd, encoding: 'utf8', timeout: 15000 },
  );
}

const question = (waitMinutes = '1') => [
  'post', '--project', 'p', '--from', 'worker', '--to', 'lead',
  '--body', 'choose', '--default', 'safe', '--wait-minutes', waitMinutes,
];
const spoolOf = (work) => path.join(work, '.bgzflow', 'mail-spool');
const inboxFiles = () => {
  const folder = path.join(env.BG_MAIL_DIR, 'p');
  return fs.existsSync(folder) ? fs.readdirSync(folder).filter((name) => name.endsWith('.json')) : [];
};

test('an unwritable inbox spools the message in the working folder and says so in one line', { skip }, () => {
  const work = workFolder();
  const result = sandboxed(work, question('0'));
  assert.equal(result.status, 0, result.stderr);
  const message = JSON.parse(result.stdout);
  assert.equal(result.stderr.trim().split('\n').length, 1);
  assert.match(result.stderr, /inbox not writable; message spooled to \.bgzflow\/mail-spool\//);
  assert.ok(!result.stderr.includes(env.BG_MAIL_DIR) && !result.stderr.includes(work), 'notice printed a full path');
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(spoolOf(work), `${message.id}.json`), 'utf8')), message);
  assert.deepEqual(fs.readdirSync(env.BG_MAIL_DIR), []);
  // The worker can still wait on its own message and fall back to the default.
  const waited = sandboxed(work, ['wait', '--project', 'p', '--id', message.id]);
  assert.equal(waited.status, 0, waited.stderr);
  assert.equal(JSON.parse(waited.stdout).state, 'default');
  assert.equal(JSON.parse(waited.stdout).answer, 'safe');
});

test('a writable inbox never spools, and a spool that cannot be written fails with a plain message', { skip }, () => {
  const work = workFolder();
  const normal = run(question(), work);
  assert.equal(normal.status, 0, normal.stderr);
  assert.equal(normal.stderr, '');
  assert.equal(fs.existsSync(path.join(work, '.bgzflow')), false);
  const nowhere = sandboxed(work, question(), workFolder());
  assert.equal(nowhere.status, 2);
  assert.match(nowhere.stderr, /spool folder could not be written/);
  assert.ok(!nowhere.stderr.includes(work) && !nowhere.stderr.includes(env.BG_MAIL_DIR), 'error printed a full path');
  assert.equal(fs.existsSync(path.join(work, '.bgzflow')), false);
});

test('a linked inbox is still refused and never spooled around', () => {
  const work = workFolder();
  const outside = workFolder();
  const link = path.join(workFolder(), 'inbox-link');
  fs.symlinkSync(outside, link, process.platform === 'win32' ? 'junction' : 'dir');
  const result = spawnSync(process.execPath, [cli, ...question()], { env: { ...env, BG_MAIL_DIR: link }, cwd: work, encoding: 'utf8', timeout: 5000 });
  assert.notEqual(result.status, 0);
  assert.deepEqual(fs.readdirSync(outside), []);
  assert.equal(fs.existsSync(path.join(work, '.bgzflow')), false);
});

test('collect imports spooled messages once, never overwrites a reply and never deletes what it did not import', { skip }, () => {
  const work = workFolder();
  const first = JSON.parse(sandboxed(work, question()).stdout);
  const spool = spoolOf(work);
  const copy = path.join(spool, `${first.id}.json`);
  const firstRun = run(['collect', '--from', spool]);
  assert.equal(firstRun.status, 0, firstRun.stderr);
  assert.deepEqual(JSON.parse(firstRun.stdout), { imported: [first.id], skipped: [], removed: [], invalid: [], failed: [] });
  assert.deepEqual(JSON.parse(run(['list', '--project', 'p']).stdout), [first]);
  // A second run changes nothing and reports the message as already present.
  const again = JSON.parse(run(['collect', '--from', spool]).stdout);
  assert.deepEqual([again.imported, again.skipped], [[], [first.id]]);
  assert.equal(inboxFiles().length, 1);
  // The lead answers; a later collect leaves the answered copy alone.
  assert.equal(run(['reply', '--project', 'p', '--id', first.id, '--from', 'lead', '--body', 'go']).status, 0);
  const afterReply = JSON.parse(run(['collect', '--from', spool]).stdout);
  assert.deepEqual(afterReply.skipped, [first.id]);
  const stored = JSON.parse(run(['list', '--project', 'p']).stdout);
  assert.equal(stored.length, 1);
  assert.equal(stored[0].state, 'answered');
  assert.equal(stored[0].reply.body, 'go');
  // Spool files stay unless --remove is given, and then only for a message this run imported.
  assert.ok(fs.existsSync(copy));
  const second = JSON.parse(sandboxed(work, question()).stdout);
  fs.writeFileSync(path.join(spool, 'notes.json'), '{"not":"a message"}\n');
  fs.writeFileSync(path.join(spool, 'readme.txt'), 'keep me\n');
  const moved = JSON.parse(run(['collect', '--from', spool, '--remove']).stdout);
  assert.deepEqual(moved, { imported: [second.id], skipped: [first.id], removed: [second.id], invalid: ['notes.json'], failed: [] });
  assert.ok(fs.existsSync(copy), 'a message already in the inbox was deleted from the spool');
  assert.ok(!fs.existsSync(path.join(spool, `${second.id}.json`)));
  assert.ok(fs.existsSync(path.join(spool, 'notes.json')) && fs.existsSync(path.join(spool, 'readme.txt')));
  assert.equal(inboxFiles().length, 2);
});

test('collect rejects messages that name another folder, and repeated or parallel runs leave one copy', async () => {
  const work = workFolder();
  const spool = spoolOf(work);
  fs.mkdirSync(spool, { recursive: true });
  const good = post();
  fs.copyFileSync(path.join(env.BG_MAIL_DIR, 'p', `${good.id}.json`), path.join(spool, `${good.id}.json`));
  fs.rmSync(path.join(env.BG_MAIL_DIR, 'p'), { recursive: true });
  fs.writeFileSync(path.join(spool, 'escape-1.json'), JSON.stringify({ ...good, id: 'escape-1', project: '../escape' }));
  fs.writeFileSync(path.join(spool, 'other-name.json'), JSON.stringify({ ...good, id: 'renamed-1' }));
  const reply = { from: 'x', body: 'y', at: good.createdAt };
  fs.writeFileSync(path.join(spool, 'answered-1.json'), JSON.stringify({ ...good, id: 'answered-1', state: 'answered', reply }));
  const results = await Promise.all([child(['collect', '--from', spool]), child(['collect', '--from', spool])]);
  for (const result of results) assert.ok(result.status === 0 || result.status === 2, result.stderr);
  const final = JSON.parse(run(['collect', '--from', spool]).stdout);
  assert.deepEqual(final, { imported: [], skipped: [good.id], removed: [], invalid: ['answered-1.json', 'escape-1.json', 'other-name.json'], failed: [] });
  assert.deepEqual(inboxFiles(), [`${good.id}.json`]);
  assert.equal(fs.existsSync(path.join(env.BG_MAIL_DIR, 'escape')), false);
  assert.equal(fs.existsSync(path.join(path.dirname(env.BG_MAIL_DIR), 'escape')), false);
});

test('collect needs a folder and names the failed check without printing the path', () => {
  const none = run(['collect']);
  assert.equal(none.status, 2);
  assert.match(none.stderr, /collect needs --from/);
  const missing = path.join(workFolder(), 'private-spool-name');
  const result = run(['collect', '--from', missing]);
  assert.equal(result.status, 2);
  assert.match(result.stderr, /collect --from folder does not exist or cannot be read/);
  assert.ok(!result.stderr.includes('private-spool-name'));
  const file = path.join(workFolder(), 'private-file-name');
  fs.writeFileSync(file, 'x');
  const notFolder = run(['collect', '--from', file]);
  assert.equal(notFolder.status, 2);
  assert.match(notFolder.stderr, /collect --from must be a folder/);
  assert.ok(!notFolder.stderr.includes('private-file-name'));
});
