import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { archiveResult, buildSlots, diskResult, parseProcesses } from '../bg-governor.mjs';

const cli = fileURLToPath(new URL('../bg-governor.mjs', import.meta.url));
const run = (args) => spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8' });

test('low disk fails the policy result and the CLI exits 4', () => {
  const result = diskResult('/output', 10, () => ({ bavail: 1, bsize: 1024, blocks: 2 }));
  assert.equal(result.ok, false);
  const cliResult = run(['disk', '--min-gb', '999999']);
  assert.equal(cliResult.status, 4);
});

test('Expo Starter has exactly one build slot', () => {
  assert.equal(buildSlots('starter', null).slots, 1);
  assert.equal(JSON.parse(run(['build-slots', '--plan', 'starter']).stdout).slots, 1);
});

test('archive-check permits 20 and blocks 21', () => {
  assert.equal(archiveResult(20).ok, true);
  assert.equal(run(['archive-check', '--count', '20']).status, 0);
  assert.equal(archiveResult(21).ok, false);
  assert.equal(run(['archive-check', '--count', '21']).status, 4);
});

test('reap inventories processes only and never treats AVD files as targets', () => {
  const listing = '101 emulator\n102 gradle\n103 Pixel_8.avd\n104 qemu-system-x86_64\n';
  assert.deepEqual(parseProcesses(listing, 'linux'), [
    { pid: 101, name: 'emulator' },
    { pid: 102, name: 'gradle' },
    { pid: 104, name: 'qemu-system-x86_64' },
  ]);
  const result = run(['reap']);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).avdFilesTouched, 0);
});
