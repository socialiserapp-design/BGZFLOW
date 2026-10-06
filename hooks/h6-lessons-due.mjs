// H6: read-only SessionStart advice for this project's lessons, never a session gate.
import fs from 'node:fs';
import path from 'node:path';
import { contextOutput, parseInput, readStdin } from './lib/io.mjs';
import { findProjectDir } from './lib/project.mjs';
import { due } from '../tools/lessons/lib.mjs';

const watchdog = setTimeout(() => process.exit(0), 8000);
watchdog.unref();
process.stdout.on('error', () => process.exit(0));
let output = '';
try {
  const input = parseInput(await readStdin());
  const project = findProjectDir({ cwd: input.cwd, workspaceRoot: input.workspaceRoot ?? input.workspace_root });
  if (project) {
    const stat = fs.statSync(path.join(project, '.bgzflow/lessons.jsonl'));
    // Bound startup work; the explicit CLI remains available for larger histories.
    if (stat.isFile() && stat.size <= 1024 * 1024) {
      const count = due([project]).groups.length;
      if (count > 0) output = JSON.stringify(contextOutput('SessionStart', `Lessons due for review: ${count} (bgz lessons due)`));
    }
  }
} catch {
  // Missing, malformed or unreadable logs are silent. Do not create a hook log.
}
if (output) process.stdout.write(output, () => process.exit(0));
else process.exit(0);
