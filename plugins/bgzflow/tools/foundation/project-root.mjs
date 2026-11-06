import fs from 'node:fs';
import path from 'node:path';

const directory = value => {
  if (typeof value !== 'string' || !value) return null;
  const root = fs.realpathSync.native(value);
  if (!fs.statSync(root).isDirectory()) throw Error('Project must be a directory.');
  return root;
};
const inside = (root, value) => {
  const relative = path.relative(root, value);
  return !relative || (relative !== '..' && !relative.startsWith('..' + path.sep) && !path.isAbsolute(relative));
};

// A host's launch/workspace directory identifies the project; cwd identifies
// where this particular command runs. Keep them separate. Explicit embedding
// application scopes remain authoritative. Never merge a nested repository or
// an outside worktree into the launch checkout merely because the chat is shared.
export function resolveProjectRoot(input = {}, options = {}) {
  if (options.projectRoot) return directory(options.projectRoot);
  const current = directory(input.cwd || input.workspace_root || input.workspaceRoot || input.workspacePaths?.[0]);
  if (!current) return null;
  const hint = options.nativeProjectRoot || input.workspace_root || input.workspaceRoot || input.workspacePaths?.[0];
  if (!hint) return current;
  let launch;
  try { launch = directory(hint); } catch { return current; }
  if (!launch) return current;
  for (let cursor = current; ; cursor = path.dirname(cursor)) {
    if (cursor === launch) return launch;
    try {
      fs.lstatSync(path.join(cursor, '.git'));
      // A linked or unusual marker is still a boundary. Do not follow it or
      // import the parent's private records by assuming it is not a repository.
      return cursor;
    } catch (error) { if (error.code !== 'ENOENT') return current; }
    const parent = path.dirname(cursor);
    if (parent === cursor) break;
    // With no inner repository boundary, only a proven descendant shares the
    // launch project's records. Siblings and unrelated paths remain separate.
    if (inside(launch, current) && !inside(launch, parent)) break;
  }
  return current;
}
