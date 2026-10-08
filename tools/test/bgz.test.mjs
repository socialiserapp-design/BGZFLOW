// `bgz` is the one entry for the founder-facing tools: lessons, receipt, usage and skill-gate.
// Each subcommand must reach its own script and pass its exit code through.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const cli = path.join(root, 'tools/bgz.mjs');
const bgz = (args, opts = {}) => spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8', timeout: 60000, ...opts });

test('help lists every subcommand and an unknown one exits 2', () => {
  const help = bgz(['--help']);
  assert.equal(help.status, 0);
  for (const c of ['lessons', 'receipt', 'usage', 'skill-gate']) assert.match(help.stdout, new RegExp(`^  ${c} `, 'm'));
  assert.equal(bgz(['nope']).status, 2);
});

test('bgz lessons still runs the lessons tool', () => {
  const r = bgz(['lessons', '--help']);
  assert.match(r.stdout, /usage: bgz lessons/);
});

test('bgz receipt hashes a file and passes the missing-file exit code through', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bgz cli '));
  try {
    fs.writeFileSync(path.join(dir, 'a.txt'), 'one\ntwo\n');
    const ok = bgz(['receipt', 'a.txt', '--json'], { cwd: dir });
    assert.equal(ok.status, 0, ok.stderr);
    assert.equal(JSON.parse(ok.stdout).missing.length, 0);
    assert.equal(bgz(['receipt', 'missing.txt'], { cwd: dir }).status, 1);
    assert.equal(bgz(['receipt']).status, 2);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('bgz usage and bgz skill-gate reach their scripts', () => {
  const usage = bgz(['usage', '--help']);
  assert.equal(usage.status, 0);
  assert.match(usage.stdout, /usage: usage/);
  const gate = bgz(['skill-gate', '--help']);
  assert.equal(gate.status, 0);
  assert.match(gate.stdout, /usage: skill-gate/);
  assert.equal(bgz(['skill-gate', '--bogus']).status, 2);
});
