// Level 7, "should I compact?". Thresholds and the final decision stay in code; Jev answers four questions about the
// moment (did the task switch, is this a boundary, how much history the next step needs, is the agent mid-edit).
// Result: 'silent' | 'notice' | 'recommend' | 'request'. Nothing is injected on silent. Fails open to the 0.5.0 rule
// (a line only when the chat is over the cap).
import fs from 'node:fs';
import path from 'node:path';
import { askDetailed, jevUsable, noul, safeText, sanitize, score } from '../../tools/jev/jev.mjs';
import { formatMb, transcriptBytes } from './chat-size.mjs';

export const NOTICE_AT = 0.4; // share of the cap where Jev is first asked
export const RECOMMEND_AT = 0.7;
export const JEV_AT = 0.7; // task switch / boundary
export const MIDEDIT_AT = 0.6;
export const TAIL_CHARS = 6000;
export const TIMEOUT_MS = 2500;
const ORDER = ['silent', 'notice', 'recommend', 'request'];
const HISTORY = [
  'the next step needs none of the earlier conversation',
  'the next step needs a little of the earlier conversation',
  'the next step depends on a lot of the earlier conversation',
];
export const QUESTIONS = {
  switched: noul('Does state.prompt start a different task from the one in state.recent?'),
  boundary: noul('Is this a natural boundary, with the previous piece of work finished and verified, so a fresh chat would lose nothing important?'),
  history: score('How much of state.recent does the work in state.prompt depend on?', HISTORY),
  midEdit: noul('Is the agent in the middle of a multi-step edit, test run or fix that a hand-over would interrupt?'),
};

// Bytes read from the end of the transcript. Tool output dominates a transcript, so the window is much larger than the
// text kept; only user and assistant text survives the filter below.
export const TAIL_WINDOW = 256 * 1024;
const TEXT_ITEM = /^(?:text|input_text|output_text)$/;

// User and assistant text from one transcript line (Claude Code or Codex JSONL). tool_use input, tool_result content,
// reasoning and every other item type are dropped. Returns '' for anything else.
export function lineText(line) {
  let row;
  try {
    row = JSON.parse(line);
  } catch {
    return '';
  }
  if (!row || typeof row !== 'object') return '';
  const msg = row.message && typeof row.message === 'object' ? row.message : row.payload && typeof row.payload === 'object' ? row.payload : row;
  if (msg.type && msg.type !== 'message' && !row.message) return '';
  const role = msg.role || row.type;
  if (role !== 'user' && role !== 'assistant') return '';
  const content = msg.content;
  if (typeof content === 'string') return `${role}: ${content}`;
  if (!Array.isArray(content)) return '';
  const parts = content.filter((c) => c && TEXT_ITEM.test(String(c.type)) && typeof c.text === 'string').map((c) => c.text);
  return parts.length ? `${role}: ${parts.join('\n')}` : '';
}

// The last `chars` characters of user and assistant text in the transcript.
export function tail(file, chars = TAIL_CHARS) {
  try {
    const fd = fs.openSync(file, 'r');
    try {
      const size = fs.fstatSync(fd).size;
      const len = Math.min(size, TAIL_WINDOW);
      const buf = Buffer.alloc(len);
      fs.readSync(fd, buf, 0, len, size - len);
      const lines = buf.toString('utf8').split(/\r?\n/);
      if (len < size) lines.shift(); // first line is cut
      return lines.map(lineText).filter(Boolean).join('\n').slice(-chars);
    } finally {
      fs.closeSync(fd);
    }
  } catch {
    return '';
  }
}

const shift = (level, by) => ORDER[Math.max(0, Math.min(ORDER.length - 1, ORDER.indexOf(level) + by))];

// Pure: sizes in, answers in, level out. No Jev inside, so it is easy to test.
export function decide({ ratio, answers }) {
  let level = ratio >= 1 ? 'request' : ratio >= RECOMMEND_AT ? 'recommend' : ratio >= NOTICE_AT ? 'notice' : 'silent';
  if (!answers || level === 'silent') return level;
  const floor = ratio >= 1 ? 'recommend' : 'notice';
  const boundary = answers.switched >= JEV_AT || answers.boundary >= JEV_AT;
  if (answers.midEdit >= MIDEDIT_AT) return ORDER.indexOf(level) > ORDER.indexOf(floor) ? floor : level;
  if (answers.history >= 2) level = ORDER.indexOf(shift(level, -1)) < ORDER.indexOf(floor) ? floor : shift(level, -1);
  else if (boundary && answers.history <= 1 && level !== 'request') level = shift(level, 1);
  return level;
}

export function lineFor(level, bytes, cfg) {
  const mb = formatMb(bytes);
  if (level === 'request') return `This chat is ${mb} MB. Write a handoff of ${cfg.handoffKb} KB or less (templates/HANDOFF.md) and continue in a fresh chat.`;
  if (level === 'recommend') return `This chat is ${mb} MB and this looks like a good break. Write a one-page handoff (templates/HANDOFF.md) and start fresh.`;
  if (level === 'notice') return `Chat size ${mb} MB. If the next piece of work is separate, a fresh chat would be cheaper.`;
  return undefined;
}

export function dedupeH3Level(projectDir, transcript, level) {
  if (!projectDir || !transcript || (level !== 'notice' && level !== 'recommend')) return level;
  try {
    const dir = path.join(projectDir, '.bgzflow');
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, 'h3-announced.json');
    let state = {};
    try {
      state = JSON.parse(fs.readFileSync(file, 'utf8')) || {};
    } catch {
      state = {};
    }
    const prev = state[transcript];
    if (prev === level || (prev === 'recommend' && level === 'notice')) {
      return 'silent';
    }
    state[transcript] = level;
    fs.writeFileSync(file, JSON.stringify(state, null, 2));
    return level;
  } catch {
    return level;
  }
}

export async function chatSizeDecision({ transcript, prompt, cfg, env = process.env, ask = askDetailed }) {
  const bytes = transcriptBytes(transcript);
  const cap = cfg.chatMb * 1024 * 1024;
  const ratio = bytes / cap;
  const fallback = ratio >= 1 ? 'request' : 'silent';
  if (!jevUsable(env) || ratio < NOTICE_AT || !String(prompt || '').trim()) return { level: fallback, bytes, jev: false };
  // sanitize() runs inside safeText: secrets, emails and phone numbers are masked before anything leaves the machine.
  const state = { prompt: safeText(sanitize(String(prompt)), 2000), recent: safeText(sanitize(tail(transcript)), TAIL_CHARS) };
  const r = await ask({ caller: 'h3-compact', state, questions: QUESTIONS, timeoutMs: TIMEOUT_MS, env });
  if (!r || !r.ok) return { level: fallback, bytes, jev: false };
  const a = r.answers;
  const answers = { switched: a.switched.noul, boundary: a.boundary.noul, history: a.history.score, midEdit: a.midEdit.noul };
  return { level: decide({ ratio, answers }), bytes, jev: true, answers };
}
