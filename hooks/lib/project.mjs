// Where is "the project"? The folder that owns (or will own) <project>/.bgzflow/.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

function isDir(p) {
  try {
    return fs.statSync(p).isDirectory();
  } catch {
    return false;
  }
}

function exists(p) {
  try {
    fs.statSync(p);
    return true;
  } catch {
    return false;
  }
}

// Nearest ancestor (starting at `start`) holding .bgzflow/, else one holding .git, else `start`.
export function walkUp(start) {
  if (!start) return undefined;
  let dir = path.resolve(start);
  const first = dir;
  // The home folder holds user-level settings (~/.bgzflow/swarm-policy.json); it is never a project.
  const home = path.resolve(os.homedir()).toLowerCase();
  for (let i = 0; i < 40; i++) {
    if (dir.toLowerCase() === home) break;
    if (isDir(path.join(dir, '.bgzflow'))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  dir = first;
  for (let i = 0; i < 40; i++) {
    if (exists(path.join(dir, '.git'))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return first;
}

// Ordered, de-duplicated candidates: explicit override, host-provided root, then the walk up from cwd.
export function projectCandidates(input = {}, env = process.env) {
  const list = [];
  const push = (p) => {
    if (typeof p !== 'string' || !p.trim()) return;
    const abs = path.resolve(p);
    if (!isDir(abs)) return;
    if (!list.includes(abs)) list.push(abs);
  };
  push(env.BGZFLOW_PROJECT);
  push(env.CLAUDE_PROJECT_DIR);
  push(env.GROK_WORKSPACE_ROOT);
  push(input.workspaceRoot);
  push(walkUp(input.cwd || process.cwd()));
  return list;
}

export function findProjectDir(input = {}, env = process.env) {
  return projectCandidates(input, env)[0];
}
