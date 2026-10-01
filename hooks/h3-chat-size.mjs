// H3 chat size. Event: UserPromptSubmit. When the transcript is over BGZFLOW_CHAT_MB, adds one line
// telling the agent to write a short handoff and continue in a fresh chat.
import { contextOutput, eventName, logLine, runHook, transcriptPath } from './lib/io.mjs';
import { chatSizeLine } from './lib/chat-size.mjs';

await runHook('H3', async ({ input, projectDir, cfg }) => {
  const line = chatSizeLine(transcriptPath(input), cfg);
  if (!line) return undefined;
  logLine(projectDir, 'H3', line.slice(0, 40));
  const event = eventName(input) === 'SessionStart' ? 'SessionStart' : 'UserPromptSubmit';
  return contextOutput(event, line);
});
