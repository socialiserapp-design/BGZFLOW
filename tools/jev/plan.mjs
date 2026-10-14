// `bgz jev plan`: run the "unasked" check on a plan before the first dispatch, so an extra nobody asked for (a customer-facing
// stop, a new rule) is caught while it is still one line of text. The result is advice for the handback: it never blocks
// dispatch, adds no review round and asks nobody anything. A failed Jev call is reported as a gap, never as a clean pass.
import fs from 'node:fs';
import path from 'node:path';
import { pool } from './jev.mjs';
import { refuseSecret } from './secret-paths.mjs';
import { checkUnasked, decisionsFile, readAsks } from './review.mjs';

export const MIN_ITEM_CHARS = 12; // shorter lines are labels or noise, not plan items
export const MAX_ITEMS = 40; // a plan longer than this is checked up to here and the rest is counted as skipped
export const MAX_ITEM_CHARS = 1500;
export const PLAN_CONCURRENCY = 4;
const MAX_PLAN_CHARS = 60000;

const BULLET = /^\s*(?:[-*+]|\d+[.)])\s+(.*\S)\s*$/;
const HEADING = /^\s*#{1,6}\s+(.*\S)\s*$/;
const RULE_LINE = /^\s*(?:[-*_=]\s*){3,}$/;
const FENCE = /^\s*(?:```|~~~)/;
const CHECKBOX = /^\[[ xX]\]\s+/;

const oneLine = (text, max = 280) => text.replace(/\s+/g, ' ').trim().slice(0, max);

// Items of a plan: each numbered or bulleted line, each heading together with the text right under it, and each paragraph.
// A line that follows an item with no blank line between belongs to that item. Fenced code is an illustration, not an item.
// Returns [{ line, text }] in plan order, with the 1-based line each item starts on.
export function splitPlan(text) {
  const items = [];
  let cur = null;
  let fenced = false;
  const close = () => {
    if (cur) items.push(cur);
    cur = null;
  };
  String(text ?? '').replace(/\r\n?/g, '\n').split('\n').forEach((raw, i) => {
    if (FENCE.test(raw)) {
      close();
      fenced = !fenced;
      return;
    }
    if (fenced) return;
    if (!raw.trim() || RULE_LINE.test(raw)) {
      close();
      return;
    }
    let m = HEADING.exec(raw);
    if (!m) m = BULLET.exec(raw);
    if (m) {
      close();
      cur = { line: i + 1, text: m[1] };
      return;
    }
    if (cur) cur.text += ` ${raw.trim()}`;
    else cur = { line: i + 1, text: raw.trim() };
  });
  close();
  return items
    .map((it) => ({ line: it.line, text: oneLine(it.text.replace(CHECKBOX, ''), MAX_ITEM_CHARS) }))
    .filter((it) => it.text.length >= MIN_ITEM_CHARS);
}

// Checks every plan item for a stop or rule that `asks` never mentions. `deps.check` swaps in another judge (tests).
export async function checkPlan({ plan, asks, file = '', timeoutMs = 10000, env = process.env, deps = {} } = {}) {
  if (!String(asks ?? '').trim()) return { ok: false, err: 'no asks text (pass --asks <decisions file>,brief.md or set BGZFLOW_DECISIONS_FILE; an empty list would make everything look untraceable)' };
  const all = splitPlan(plan);
  if (!all.length) return { ok: true, note: 'no plan items to check', checked: 0, untraceable: [], gaps: [] };
  const items = all.slice(0, MAX_ITEMS);
  const skipped = all.length - items.length;
  const check = deps.check || checkUnasked;
  const results = await pool(items, PLAN_CONCURRENCY, async (it) => {
    try {
      return await check({ change: `Planned change: ${it.text}`, asks, file, quote: oneLine(it.text), timeoutMs, env, caller: 'jev-plan' });
    } catch (err) {
      return { ok: false, err: err && err.message ? err.message : String(err) };
    }
  });
  const untraceable = [];
  const gaps = [];
  results.forEach((r, i) => {
    const { line, text } = items[i];
    if (!r || !r.ok) gaps.push({ line, item: oneLine(text), error: (r && r.err) || 'no answer' });
    else if (r.untraceable) untraceable.push({ line, item: oneLine(text), kind: r.kind, confidence: r.confidence, hit: r.hit, traceable: r.traceable });
  });
  untraceable.sort((a, b) => b.confidence - a.confidence);
  const down = gaps.length === items.length;
  return {
    ok: !down,
    ...(down ? { err: `Jev gave no answer for any plan item (${gaps[0].error})` } : {}),
    note: 'Untraceable to the asks given. Advice for the handback and a warning for the lead; the lead decides. It never blocks dispatch.',
    checked: items.length,
    untraceable,
    gaps,
    ...(skipped ? { skipped } : {}),
  };
}

// CLI: bgz jev plan --plan <file> [--asks <decisions file|brief,...>] [--repo <dir>]. Asks are found the same way as for `unasked`.
export async function runPlan({ flags, timeoutMs, env }) {
  if (typeof flags.plan !== 'string') throw new Error('--plan <file> is required');
  const cwd = typeof flags.repo === 'string' ? path.resolve(flags.repo) : process.cwd();
  refuseSecret(flags.plan);
  let plan;
  try {
    plan = fs.readFileSync(path.resolve(cwd, flags.plan), 'utf8').slice(0, MAX_PLAN_CHARS);
  } catch {
    throw new Error(`cannot read --plan ${flags.plan}`);
  }
  let asksSpec = flags.asks;
  if (typeof asksSpec !== 'string') {
    const fallback = decisionsFile(env, cwd);
    if (fallback) asksSpec = fallback;
  }
  return checkPlan({ plan, asks: readAsks(asksSpec, cwd), file: path.basename(flags.plan), timeoutMs, env });
}
