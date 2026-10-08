#!/usr/bin/env node
// Reports where model tokens went (by project and model: output split, top tool spenders, cache share, what woke each turn).
//   node tools/usage/usage.mjs [--since <ISO>] [--until <ISO>] [--root <claude projects dir>] [--codex <codex sessions dir>] [--json]
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';

const CHARS_PER_TOKEN = 4; // used only when a thinking block exists but its token count was not recorded
const NOTES = [
  'A turn is one model response (one API call); repeated transcript lines for the same response are counted once.',
  'Thinking is measured where the transcript records it (Claude output_tokens_details.thinking_tokens, Codex reasoning_output_tokens); otherwise it is estimated.',
  'Visible output is split between reply text and each tool by character length within each response: an ESTIMATE.',
  'Codex visible output is not split (its token events do not say which tool spent it).',
  'Wakes count user entries: typed by a person, a task notice, or a message from another agent or session.',
];

function walk(dir, out = []) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, out);
    else if (e.isFile() && e.name.endsWith('.jsonl')) out.push(full);
  }
  return out;
}

async function* lines(file) {
  const rl = readline.createInterface({ input: fs.createReadStream(file, { encoding: 'utf8' }), crlfDelay: Infinity });
  for await (const line of rl) {
    if (!line.trim()) continue;
    try {
      yield JSON.parse(line);
    } catch {
      /* a torn or partial line is skipped */
    }
  }
}

function inWindow(ts, win) {
  if (!ts) return !win.since && !win.until;
  const t = Date.parse(ts);
  if (Number.isNaN(t)) return false;
  return (!win.since || t >= win.since) && (!win.until || t < win.until);
}

function modifiedBeforeWindow(file, win) {
  if (!win.since) return false;
  try {
    return fs.statSync(file).mtimeMs < win.since;
  } catch {
    return true;
  }
}

function newRow(source, project, model) {
  return {
    source, project, model, turns: 0, output: 0, input: 0, cacheRead: 0, cacheWrite: 0,
    thinking: 0, thinkingEstimated: 0, text: 0, toolInput: 0, unsplit: 0, perTurn: [], tools: {},
  };
}

function rowFor(rows, source, project, model) {
  const key = `${source}\u0000${project}\u0000${model}`;
  if (!rows.has(key)) rows.set(key, newRow(source, project, model));
  return rows.get(key);
}

function addTool(tools, name, tokens) {
  if (!tools[name]) tools[name] = { tokens: 0, calls: 0 };
  tools[name].tokens += tokens;
  tools[name].calls += 1;
}

// Splits one Claude response's output tokens into thinking, reply text and each tool's input.
export function splitOutput(msg) {
  const out = msg.output;
  let thinking;
  let estimated = false;
  if (Number.isFinite(msg.measuredThinking)) {
    thinking = Math.min(out, msg.measuredThinking);
  } else if (msg.hasThinking) {
    estimated = true;
    const visibleChars = msg.textChars + msg.tools.reduce((s, t) => s + t.chars, 0);
    if (msg.thinkingChars > 0) thinking = Math.round(out * (msg.thinkingChars / (msg.thinkingChars + visibleChars)));
    else thinking = Math.max(0, out - Math.ceil(visibleChars / CHARS_PER_TOKEN));
  } else {
    thinking = 0;
  }
  const visible = out - thinking;
  const toolChars = msg.tools.reduce((s, t) => s + t.chars, 0);
  const all = msg.textChars + toolChars;
  const tools = msg.tools.map((t) => ({ name: t.name, tokens: all ? visible * (t.chars / all) : 0 }));
  const text = all ? visible * (msg.textChars / all) : visible;
  return { thinking, estimated, text, tools };
}

function userText(content) {
  if (typeof content === 'string') return { text: content, toolResult: false };
  if (!Array.isArray(content)) return { text: '', toolResult: false };
  let toolResult = false;
  let text = '';
  for (const b of content) {
    if (b?.type === 'tool_result') toolResult = true;
    else if (b?.type === 'text' && typeof b.text === 'string') text += b.text;
  }
  return { text, toolResult };
}

// Says what put a user entry into the transcript: typed, notice, agent, or other (system text); null for tool returns.
export function classifyUser(entry, firstInFile) {
  if (entry.isMeta || entry.isCompactSummary || entry.toolUseResult !== undefined) return null;
  const { text, toolResult } = userText(entry.message?.content);
  if (toolResult) return null;
  const head = text.trimStart().slice(0, 400);
  if (head.startsWith('<task-notification') || head.startsWith('<scheduled-task')) return 'notice';
  if (head.includes('<cross-session-message') || head.startsWith('<agent-message')) return 'agent';
  if (entry.isSidechain && firstInFile) return 'agent';
  if (/^<(system-reminder|local-command-|persisted-output)/.test(head) || !head) return 'other';
  return 'typed';
}

async function readClaudeFile(file, project, win, state) {
  const pending = new Map();
  let firstUser = true;
  for await (const e of lines(file)) {
    if (e.type === 'user') {
      const first = firstUser;
      firstUser = false;
      if (!inWindow(e.timestamp, win)) continue;
      const kind = classifyUser(e, first);
      if (kind) state.wakes[kind] += 1;
      continue;
    }
    if (e.type !== 'assistant' || !e.message) continue;
    const m = e.message;
    if (!m.model || m.model === '<synthetic>') continue;
    const id = `${m.id || e.uuid}\u0000${e.requestId || ''}`;
    let rec = pending.get(id);
    if (!rec) {
      rec = { ts: e.timestamp, model: m.model, usage: null, textChars: 0, thinkingChars: 0, hasThinking: false, tools: [], blocks: new Set() };
      pending.set(id, rec);
    }
    const u = m.usage;
    if (u && (!rec.usage || (u.output_tokens || 0) >= (rec.usage.output_tokens || 0))) rec.usage = u;
    const content = Array.isArray(m.content) ? m.content : [];
    content.forEach((b) => {
      const body = b?.text || b?.thinking || '';
      const sig = `${b?.type}:${b?.id || ''}:${body.length}:${body.slice(0, 64)}`;
      if (rec.blocks.has(sig)) return;
      rec.blocks.add(sig);
      if (b?.type === 'text') rec.textChars += (b.text || '').length;
      else if (b?.type === 'thinking' || b?.type === 'redacted_thinking') {
        rec.hasThinking = true;
        rec.thinkingChars += (b.thinking || '').length;
      } else if (b?.type === 'tool_use' || b?.type === 'server_tool_use') {
        rec.tools.push({ name: b.name || 'unknown', chars: JSON.stringify(b.input ?? {}).length });
      }
    });
  }
  for (const [id, rec] of pending) {
    if (state.seen.has(id) || !rec.usage || !inWindow(rec.ts, win)) continue;
    state.seen.add(id);
    const u = rec.usage;
    const output = u.output_tokens || 0;
    const row = rowFor(state.rows, 'claude', project, rec.model);
    const split = splitOutput({
      output,
      measuredThinking: u.output_tokens_details?.thinking_tokens,
      hasThinking: rec.hasThinking,
      thinkingChars: rec.thinkingChars,
      textChars: rec.textChars,
      tools: rec.tools,
    });
    row.turns += 1;
    row.output += output;
    row.input += u.input_tokens || 0;
    row.cacheRead += u.cache_read_input_tokens || 0;
    row.cacheWrite += u.cache_creation_input_tokens || 0;
    row.thinking += split.thinking;
    if (split.estimated) row.thinkingEstimated += split.thinking;
    row.text += split.text;
    for (const t of split.tools) {
      row.toolInput += t.tokens;
      addTool(row.tools, t.name, t.tokens);
    }
    row.perTurn.push(output);
  }
}

async function readCodexFile(file, win, state) {
  let project = path.basename(file, '.jsonl');
  let model = 'unknown';
  let lastTotal = -1;
  for await (const e of lines(file)) {
    const p = e.payload;
    if (!p) continue;
    if (e.type === 'session_meta' && p.cwd) project = String(p.cwd).replace(/[\\/]+$/, '').split(/[\\/]/).pop() || project;
    else if (e.type === 'turn_context' && p.model) model = p.model;
    else if (e.type === 'event_msg' && p.type === 'token_count' && p.info?.last_token_usage) {
      const total = p.info.total_token_usage?.total_tokens;
      if (Number.isFinite(total)) {
        if (total <= lastTotal) continue; // a repeated count is not a new call
        lastTotal = total;
      }
      if (!inWindow(e.timestamp, win)) continue;
      const u = p.info.last_token_usage;
      const row = rowFor(state.rows, 'codex', project, model);
      const output = u.output_tokens || 0;
      const cached = u.cached_input_tokens || 0;
      const thinking = Math.min(output, u.reasoning_output_tokens || 0);
      row.turns += 1;
      row.output += output;
      row.input += Math.max(0, (u.input_tokens || 0) - cached);
      row.cacheRead += cached;
      row.cacheWrite += u.cache_write_input_tokens || 0;
      row.thinking += thinking;
      row.unsplit += output - thinking;
      row.perTurn.push(output);
    }
  }
}

export function percentile(sorted, p) {
  if (!sorted.length) return 0;
  const i = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[i];
}

function finishRow(r) {
  const sorted = [...r.perTurn].sort((a, b) => a - b);
  const inputAll = r.input + r.cacheRead + r.cacheWrite;
  const share = (x) => (r.output ? x / r.output : 0);
  const tools = Object.entries(r.tools)
    .map(([name, t]) => ({ name, tokens: Math.round(t.tokens), calls: t.calls }))
    .sort((a, b) => b.tokens - a.tokens);
  return {
    source: r.source, project: r.project, model: r.model, turns: r.turns,
    output: r.output, input: r.input, cacheRead: r.cacheRead, cacheWrite: r.cacheWrite,
    cacheReadShare: inputAll ? r.cacheRead / inputAll : 0,
    split: {
      thinking: Math.round(r.thinking), thinkingEstimated: Math.round(r.thinkingEstimated),
      text: Math.round(r.text), toolInput: Math.round(r.toolInput), unsplit: Math.round(r.unsplit),
      thinkingShare: share(r.thinking), textShare: share(r.text), toolShare: share(r.toolInput), unsplitShare: share(r.unsplit),
    },
    outputPerTurn: { median: percentile(sorted, 50), p90: percentile(sorted, 90) },
    tools,
  };
}

export async function collectUsage({ root, codex, since, until } = {}) {
  const win = { since: since ? Date.parse(since) : null, until: until ? Date.parse(until) : null };
  for (const [k, v] of [['--since', since], ['--until', until]]) if (v && Number.isNaN(Date.parse(v))) throw new Error(`${k} is not a date: ${v}`);
  const state = { rows: new Map(), seen: new Set(), wakes: { typed: 0, notice: 0, agent: 0, other: 0 } };
  const files = { claude: 0, codex: 0, skippedOld: 0 };
  if (root) {
    for (const file of walk(root).sort()) {
      if (modifiedBeforeWindow(file, win)) { files.skippedOld += 1; continue; }
      const project = path.relative(root, file).split(path.sep)[0];
      files.claude += 1;
      await readClaudeFile(file, project, win, state);
    }
  }
  if (codex) {
    for (const file of walk(codex).sort()) {
      if (modifiedBeforeWindow(file, win)) { files.skippedOld += 1; continue; }
      files.codex += 1;
      await readCodexFile(file, win, state);
    }
  }
  const rows = [...state.rows.values()].map(finishRow).sort((a, b) => b.output - a.output);
  const total = finishRow(rows.reduce((t, r) => {
    const raw = state.rows.get(`${r.source}\u0000${r.project}\u0000${r.model}`);
    for (const k of ['turns', 'output', 'input', 'cacheRead', 'cacheWrite', 'thinking', 'thinkingEstimated', 'text', 'toolInput', 'unsplit']) t[k] += raw[k];
    t.perTurn.push(...raw.perTurn);
    for (const [name, v] of Object.entries(raw.tools)) {
      if (!t.tools[name]) t.tools[name] = { tokens: 0, calls: 0 };
      t.tools[name].tokens += v.tokens;
      t.tools[name].calls += v.calls;
    }
    return t;
  }, newRow('all', 'all', 'all')));
  const toolTotal = total.split.toolInput;
  const topTools = total.tools.slice(0, 10).map((t) => ({ ...t, shareOfToolInput: toolTotal ? t.tokens / toolTotal : 0, shareOfOutput: total.output ? t.tokens / total.output : 0 }));
  const w = state.wakes;
  const prompts = w.typed + w.notice + w.agent;
  return {
    generated: new Date().toISOString(),
    window: { since: since || null, until: until || null },
    sources: { root: root || null, codex: codex || null, ...files },
    rows: rows.map(({ tools, ...r }) => ({ ...r, topTools: tools.slice(0, 5) })),
    total: (({ tools, ...r }) => r)(total),
    topTools,
    wakes: { ...w, wokenShare: prompts ? (w.notice + w.agent) / prompts : 0 },
    notes: NOTES,
  };
}

const n = (x) => (x >= 1e6 ? `${(x / 1e6).toFixed(2)}M` : x >= 1e3 ? `${(x / 1e3).toFixed(1)}k` : String(Math.round(x)));
const pc = (x) => `${Math.round(x * 100)}%`;

export function formatUsage(r) {
  const head = ['source', 'project', 'model', 'turns', 'output', 'input', 'cache-rd', 'cache-wr', 'rd%', 'think', 'text~', 'tools~', 'med', 'p90'];
  const cells = (x) => [
    x.source, x.project.length > 40 ? `…${x.project.slice(-39)}` : x.project, x.model, String(x.turns), n(x.output), n(x.input),
    n(x.cacheRead), n(x.cacheWrite), pc(x.cacheReadShare), pc(x.split.thinkingShare),
    x.split.unsplit && !x.split.text ? '-' : pc(x.split.textShare), x.split.unsplit && !x.split.toolInput ? '-' : pc(x.split.toolShare),
    n(x.outputPerTurn.median), n(x.outputPerTurn.p90),
  ];
  const table = [head, ...r.rows.map(cells), cells(r.total)];
  const widths = head.map((_, i) => Math.max(...table.map((row) => row[i].length)));
  const out = [`usage ${r.window.since || 'start'} to ${r.window.until || 'now'}: ${r.sources.claude} Claude files, ${r.sources.codex} Codex files`];
  table.forEach((row, i) => {
    if (i === table.length - 1) out.push(widths.map((w) => '-'.repeat(w)).join('  '));
    out.push(row.map((c, j) => (j < 3 ? c.padEnd(widths[j]) : c.padStart(widths[j]))).join('  '));
  });
  out.push('~ = estimate from character length; think is measured where recorded; "-" = Codex output not split by tool.');
  if (r.topTools.length) out.push(`top tool input (estimate): ${r.topTools.map((t) => `${t.name} ${n(t.tokens)} (${pc(t.shareOfOutput)} of output, ${t.calls} calls)`).join(', ')}`);
  const w = r.wakes;
  out.push(`wakes: typed ${w.typed}, notices ${w.notice}, agent messages ${w.agent} (${pc(w.wokenShare)} not typed), system entries ${w.other}`);
  return out.join('\n');
}

function parseArgs(argv) {
  const o = { root: path.join(os.homedir(), '.claude', 'projects'), codex: path.join(os.homedir(), '.codex', 'sessions'), json: false };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    const val = () => {
      const v = argv[++i];
      if (v === undefined) throw new Error(`${a} needs a value`);
      return v;
    };
    if (a === '--json') o.json = true;
    else if (a === '--since') o.since = val();
    else if (a === '--until') o.until = val();
    else if (a === '--root') o.root = val();
    else if (a === '--codex') o.codex = val();
    else if (a === '--no-codex') o.codex = null;
    else if (a === '--help' || a === '-h') o.help = true;
    else throw new Error(`unknown argument: ${a}`);
  }
  return o;
}

async function main(argv) {
  const o = parseArgs(argv);
  if (o.help) {
    console.log('usage: usage [--since ISO] [--until ISO] [--root dir] [--codex dir | --no-codex] [--json]');
    return 0;
  }
  const r = await collectUsage(o);
  console.log(o.json ? JSON.stringify(r, null, 2) : formatUsage(r));
  return 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).then((code) => { process.exitCode = code; }, (err) => {
    console.error(`usage: ${err.message}`);
    process.exitCode = 2;
  });
}
