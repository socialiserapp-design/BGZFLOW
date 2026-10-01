// H4 clock. Events: SessionStart, UserPromptSubmit. Adds one line with the real local date, time and timezone.
import { contextOutput, eventName, runHook } from './lib/io.mjs';
import { clockLine } from './lib/clock.mjs';

await runHook('H4', async ({ input }) => {
  const event = eventName(input) === 'SessionStart' ? 'SessionStart' : 'UserPromptSubmit';
  return contextOutput(event, clockLine());
});
