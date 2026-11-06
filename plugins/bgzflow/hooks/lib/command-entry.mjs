import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

// Compare file identities, not the spelling of a documented shortcut path.
// Importing a command as a library must never execute its CLI.
export function isCommandEntry(moduleUrl, entryPath = process.argv[1]) {
  if (!entryPath) return false;
  try {
    return fs.realpathSync(entryPath) === fs.realpathSync(fileURLToPath(moduleUrl));
  } catch {
    return false;
  }
}
