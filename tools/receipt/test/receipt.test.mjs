import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { after, before, test } from 'node:test';
import { buildReceipt, formatReceipt } from '../receipt.mjs';

const cli = fileURLToPath(new URL('../receipt.mjs', import.meta.url));
let dir;
const sha = (s) => createHash('sha256').update(s).digest('hex');

before(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bgz-receipt-'));
  fs.writeFileSync(path.join(dir, 'a.txt'), 'one\ntwo\n');
  fs.mkdirSync(path.join(dir, 'sub', '.git'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'sub', 'b.log'), 'x\r\ny');
  fs.writeFileSync(path.join(dir, 'sub', 'empty.txt'), '');
  fs.writeFileSync(path.join(dir, 'sub', '.git', 'HEAD'), 'ignored\n');
});

after(() => fs.rmSync(dir, { recursive: true, force: true }));

test('measures size, lines and sha256 for a file and walks folders, skipping .git', async () => {
  const r = await buildReceipt(['a.txt', 'sub'], { cwd: dir });
  assert.deepEqual(r.files.map((f) => f.path), ['a.txt', 'sub/b.log', 'sub/empty.txt']);
  const [a, b, e] = r.files;
  assert.equal(a.bytes, 8);
  assert.equal(a.lines, 2);
  assert.equal(a.sha256, sha('one\ntwo\n'));
  assert.equal(b.lines, 2, 'a last line without a newline still counts');
  assert.equal(b.sha256, sha('x\r\ny'));
  assert.equal(e.lines, 0);
  assert.match(a.modified, /^\d{4}-\d\d-\d\dT.*Z$/);
  assert.deepEqual(r.total, { files: 3, bytes: 12, lines: 4 });
  assert.deepEqual(r.missing, []);
});

test('the same file named twice is listed once', async () => {
  const r = await buildReceipt(['a.txt', dir], { cwd: dir });
  assert.equal(r.files.length, 3);
});

test('short text output carries the total line', async () => {
  const text = formatReceipt(await buildReceipt(['a.txt'], { cwd: dir }));
  assert.match(text, /^a\.txt {2}8 B {2}2 lines {2}sha256 [0-9a-f]{64} {2}/);
  assert.match(text, /total: 1 files, 8 B, 2 lines/);
});

test('cli --json works and a missing path exits 1', () => {
  const ok = spawnSync(process.execPath, [cli, 'a.txt', '--json'], { cwd: dir, encoding: 'utf8' });
  assert.equal(ok.status, 0, ok.stderr);
  assert.equal(JSON.parse(ok.stdout).files[0].sha256, sha('one\ntwo\n'));
  const bad = spawnSync(process.execPath, [cli, 'nope.txt'], { cwd: dir, encoding: 'utf8' });
  assert.equal(bad.status, 1);
  assert.match(bad.stdout, /MISSING: nope\.txt/);
});
