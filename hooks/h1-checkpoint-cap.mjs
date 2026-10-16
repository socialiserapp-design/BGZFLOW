// H1 checkpoint cap. Event: PostToolUse, matcher Write|Edit|MultiEdit. When a CHECKPOINT or HANDOFF file
// is over its cap, returns a blocking decision that tells the agent to cut it back to one page.
import path from 'node:path';
import { logLine, runHook, toolInput } from './lib/io.mjs';
import { checkpointViolation, touchedFiles } from './lib/checkpoint-cap.mjs';

await runHook('H1', async ({ input, projectDir, cfg }) => {
  const found = checkpointViolation(touchedFiles(toolInput(input), input.cwd), cfg);
  if (!found) return undefined;
  logLine(projectDir, 'H1', `block ${path.basename(found.file)} ${(found.bytes / 1024).toFixed(1)} KB over ${found.capKb} KB`);
  return { decision: 'block', reason: found.reason };
});
