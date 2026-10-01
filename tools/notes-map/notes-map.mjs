#!/usr/bin/env node
// Launcher for notes-map.py on machines without a POSIX shell: finds a working Python 3.10 or newer
// (python3, python, or the py launcher) and runs notes-map.py with the same arguments.
//   node tools/notes-map/notes-map.mjs ask "what is blocked"
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const script = path.join(path.dirname(fileURLToPath(import.meta.url)), 'notes-map.py');
const candidates = [['python3'], ['python'], ['py', '-3']];
const probe = 'import sys; sys.exit(0 if sys.version_info >= (3, 10) else 1)';
const env = { ...process.env, PYTHONUTF8: '1', PYTHONIOENCODING: 'utf-8' };

for (const [cmd, ...pre] of candidates) {
  const check = spawnSync(cmd, [...pre, '-c', probe], { stdio: 'ignore', env });
  if (check.error || check.status !== 0) continue;
  const run = spawnSync(cmd, [...pre, script, ...process.argv.slice(2)], { stdio: 'inherit', env });
  process.exit(run.status === null ? 1 : run.status);
}
process.stderr.write('notes-map: Python 3.10 or newer was not found (tried python3, python, py -3)\n');
process.exit(127);
