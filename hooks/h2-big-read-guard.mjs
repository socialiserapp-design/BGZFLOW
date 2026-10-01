// H2 map-first reading. Event: PreToolUse, matcher Read. Denies a whole-file read of a large notes file
// (.md .txt .log .json .jsonl .csv) and points to `notes-map ask` or a line range. Code files pass.
import path from 'node:path';
import { logLine, runHook, toolInput, toolName } from './lib/io.mjs';
import { bigReadViolation } from './lib/big-read.mjs';

await runHook('H2', async ({ input, projectDir, cfg }) => {
  const found = bigReadViolation({ toolName: toolName(input), toolInput: toolInput(input), cwd: input.cwd }, cfg);
  if (!found) return undefined;
  logLine(projectDir, 'H2', `deny whole read of ${path.basename(found.file)} (${Math.round(found.bytes / 1024)} KB)`);
  return {
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'deny',
      permissionDecisionReason: found.reason,
    },
  };
});
