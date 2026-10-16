// H3 chat size. Event: UserPromptSubmit. Level 7: once the transcript passes 40% of BGZFLOW_CHAT_MB, one Jev call decides
// between silent, a notice, a recommendation to hand over, and a request. Thresholds stay in code. Over the cap it
// always says something (the 0.5.0 line). Without Jev the behaviour is exactly 0.5.0.
import { contextOutput, eventName, logLine, runHook, transcriptPath } from './lib/io.mjs';
import { chatSizeDecision, dedupeH3Level, lineFor } from './lib/compact-judge.mjs';

await runHook('H3', async ({ input, projectDir, cfg }) => {
  const event = eventName(input) === 'SessionStart' ? 'SessionStart' : 'UserPromptSubmit';
  const transcript = transcriptPath(input);
  const d = await chatSizeDecision({ transcript, prompt: input.prompt ?? input.user_prompt, cfg });
  const level = dedupeH3Level(projectDir, transcript, d.level);
  const line = lineFor(level, d.bytes, cfg);
  if (!line) return undefined;
  logLine(projectDir, 'H3', `${level}${d.jev ? ' (jev)' : ''}: ${line.slice(0, 30)}`);
  return contextOutput(event, line);
});
