import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const root = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const cli = path.join(root, 'scripts', 'package-files.mjs');

test('public package list excludes private context, cloud brief and local overlays', () => {
  const result = spawnSync(process.execPath, [cli], { cwd: root, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  const files = result.stdout.trim().split('\n');
  assert.equal(files.some((file) => file.startsWith('context/')), false);
  assert.equal(files.some((file) => file.startsWith('overlays/')), false);
  assert.equal(files.includes('CLOUD-BRIEF.md'), false);
});
