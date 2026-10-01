// H3 chat size: when the chat transcript is over BGZFLOW_CHAT_MB, tell the agent to hand over and start fresh.
// Chats of 40 to 216 MB crashed the host on open; the cap is set well below that.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

function expandHome(p) {
  if (p === '~') return os.homedir();
  if (p.startsWith('~/') || p.startsWith('~\\')) return path.join(os.homedir(), p.slice(2));
  return p;
}

export function transcriptBytes(transcriptPath) {
  if (typeof transcriptPath !== 'string' || !transcriptPath.trim()) return 0;
  try {
    const stat = fs.statSync(expandHome(transcriptPath.trim()));
    return stat.isFile() ? stat.size : 0;
  } catch {
    return 0;
  }
}

export function formatMb(bytes) {
  const mb = bytes / (1024 * 1024);
  return mb >= 100 ? String(Math.round(mb)) : mb.toFixed(1);
}

// Returns the one context line, or undefined when the chat is within the cap.
export function chatSizeLine(transcriptPath, cfg) {
  const bytes = transcriptBytes(transcriptPath);
  if (bytes <= cfg.chatMb * 1024 * 1024) return undefined;
  return `This chat is ${formatMb(bytes)} MB. Write a handoff of ${cfg.handoffKb} KB or less (templates/HANDOFF.md) and continue in a fresh chat.`;
}
