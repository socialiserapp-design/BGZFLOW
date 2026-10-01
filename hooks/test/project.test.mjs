import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';

const lib = pathToFileURL(fileURLToPath(new URL('../lib/project.mjs', import.meta.url))).href;

test('the home folder user settings never make home the project', () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'bg-home-'));
  try {
    fs.mkdirSync(path.join(home, '.bgzflow'));
    fs.writeFileSync(path.join(home, '.bgzflow', 'swarm-policy.json'), '{}');
    const project = path.join(home, 'work', 'app');
    fs.mkdirSync(path.join(project, '.git'), { recursive: true });
    const nested = path.join(project, 'src');
    fs.mkdirSync(nested);
    const script = `import { walkUp } from ${JSON.stringify(lib)}; console.log(walkUp(${JSON.stringify(nested)}));`;
    const r = spawnSync(process.execPath, ['--input-type=module', '-e', script], {
      env: { ...process.env, HOME: home, USERPROFILE: home },
      encoding: 'utf8',
    });
    assert.equal(r.status, 0, r.stderr);
    assert.equal(path.resolve(r.stdout.trim()), path.resolve(project));
  } finally {
    fs.rmSync(home, { recursive: true, force: true });
  }
});
