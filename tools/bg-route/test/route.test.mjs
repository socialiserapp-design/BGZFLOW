import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const cli = fileURLToPath(new URL('../bg-route.mjs', import.meta.url));

test('record and verify bind the observed provider and account without storing the account', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'bg-route-'));
  const file = path.join(directory, 'receipts.jsonl');
  const run = (args) => spawnSync(process.execPath, [cli, ...args, '--file', file], { encoding: 'utf8' });
  const recorded = run(['record', '--job', 'j', '--provider', 'codex', '--account', 'alias-a']);
  assert.equal(recorded.status, 0, recorded.stderr);
  const matched = run(['verify', '--job', 'j', '--provider', 'codex', '--account', 'alias-a']);
  assert.equal(matched.status, 0, matched.stderr);
  assert.equal(JSON.parse(matched.stdout).ok, true);
  const mismatch = run(['verify', '--job', 'j', '--provider', 'codex', '--account', 'alias-b']);
  assert.equal(mismatch.status, 4);
  assert.equal(JSON.parse(mismatch.stdout).ok, false);
  assert.equal(fs.readFileSync(file, 'utf8').includes('alias-a'), false);
  fs.rmSync(directory, { recursive: true, force: true });
});
