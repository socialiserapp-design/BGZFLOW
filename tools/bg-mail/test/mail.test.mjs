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

function run(args) {
  return spawnSync(process.execPath, [cli, ...args], { env, encoding: 'utf8', timeout: 5000 });
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
