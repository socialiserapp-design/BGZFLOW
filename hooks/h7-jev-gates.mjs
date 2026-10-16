// H7 Jev guardrails (level 6). Events: PreToolUse (Bash/Shell, Write/Edit) and PostToolUse (result screen).
// One script so the three gates load together. Every Jev path fails open; BGZFLOW_JEV_GATES=off = 0.5.0 behaviour.
// The owner runs in bypass mode, so there is never an "ask": a gate blocks (final), warns in context, or stays silent.
// Pre and Post each cap Jev at GATE_TIMEOUT_MS (750 ms), so one tool call adds at most about 1.5 s even when Jev hangs.
import path from 'node:path';
import { contextOutput, eventName, logLine, runHook, toolFilePath, toolInput, toolName } from './lib/io.mjs';
import { isInstructionFile, judgeBash, judgeInstructionEdit, judgeWrite, outputText, screenOutput, writeText } from './lib/jev-gates.mjs';
import { gatesOff } from '../tools/jev/jev.mjs';

const BASH = /^(?:bash|shell|exec_command)$/i;
const WRITE = /^(?:write|edit|multiedit|notebookedit)$/i;

const deny = (reason) => ({ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: reason } });
const commandOf = (ti) => {
  const c = ti.command ?? ti.cmd ?? '';
  return Array.isArray(c) ? c.join(' ') : String(c);
};

await runHook('H7', async ({ input, projectDir }) => {
  // Kill switch: exactly the 0.5.0 behaviour (no gate at all, no output).
  if (gatesOff()) return undefined;
  const event = eventName(input);
  const name = toolName(input) || '';
  const ti = toolInput(input);
  const cwd = input.cwd || projectDir || process.cwd();
  if (event === 'PreToolUse') {
    if (BASH.test(name)) {
      const v = await judgeBash({ command: commandOf(ti), cwd });
      if (v.action === 'deny') {
        logLine(projectDir, 'H7', `deny bash (${v.protected ? 'protected target' : `irreversible ${v.p}`})`);
        return deny(v.reason);
      }
      if (v.override) logLine(projectDir, 'H7', `override bash (${String(v.protected || 'jev').slice(0, 40)})`);
      if (v.action === 'warn') {
        logLine(projectDir, 'H7', `warn bash ${v.p}`);
        return contextOutput('PreToolUse', v.warning);
      }
      return undefined;
    }
    if (WRITE.test(name)) {
      const file = toolFilePath(ti);
      const v = await judgeWrite({ file, content: writeText(ti), projectDir: projectDir || cwd, cwd });
      if (v.action === 'deny') {
        logLine(projectDir, 'H7', `deny write ${String(v.reason).slice(0, 40)}`);
        return deny(v.reason);
      }
      if (v.action === 'warn') {
        logLine(projectDir, 'H7', `warn write ${path.basename(String(file || ''))}`);
        return contextOutput('PreToolUse', v.warning);
      }
    }
    return undefined;
  }
  if (event === 'PostToolUse') {
    if (WRITE.test(name)) {
      const file = toolFilePath(ti);
      if (!isInstructionFile(file)) return undefined;
      const e = await judgeInstructionEdit({ file, content: writeText(ti), projectDir: projectDir || cwd });
      if (e.action === 'warn') {
        logLine(projectDir, 'H7', `unasked ${path.basename(String(file))} ${e.p}`);
        return contextOutput('PostToolUse', e.warning);
      }
      return undefined;
    }
    const v = await screenOutput({ toolName: name, command: commandOf(ti), filePath: toolFilePath(ti), text: outputText(input) });
    if (v.action === 'warn') {
      logLine(projectDir, 'H7', `screen ${name} ${v.p}`);
      return contextOutput('PostToolUse', v.warning);
    }
  }
  return undefined;
});
