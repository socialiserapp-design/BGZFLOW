import { checkCurrentTruth, truthGuidance } from '../tools/engine/current-truth.mjs';
import { runHook, contextOutput } from './lib/io.mjs';

await runHook('h11-current-truth', async ({ input, projectDir }) => {
  const report = await checkCurrentTruth({ projectRoot: projectDir });
  const guidance = truthGuidance(report);
  if (guidance) return contextOutput(input.hook_event_name ?? input.hookEventName ?? 'PreToolUse', guidance);
});
