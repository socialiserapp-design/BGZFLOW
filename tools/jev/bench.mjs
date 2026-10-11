// A fixed test set, run only before a skill promotion or a change of which model fills a role. Never routine.
//   bgz jev bench list | seed [--n 10] | add --brief <brief.md> [--title t] [--checks "a;b"] | remove <id>
//   bgz jev bench run --skill <name> --new <file> [--old <file>] [--runner claude|codex] [--max-cards N]   old vs new skill text
//   bgz jev bench run --old-runner claude --new-runner codex [--skill-file <file>]                           old vs new model
// Cards live in ~/.bgzflow/bench/<id>.json: a frozen brief and its checks. A check is a sentence (Jev says whether the
// output shows it met) or {"contains": "x"}, {"regex": "x"}, {"not": "x"} (code). Both variants run on the same cards;
// they are scored by the checks first, then by Jev grades. New wins only if no worse on checks and better on average.
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { askDetailed, bgzHome, csv, noul, readTextArg, safeText, sanitize, sanitizeRecord } from './jev.mjs';
import { refuseSecret } from './secret-paths.mjs';
import { RUBRIC, composite } from './grade.mjs';
import { pickDrafter } from './drafter.mjs';
import { scoreOf } from './jev.mjs';

export const MAX_CARDS = 10;
export const benchDir = (env = process.env) => path.join(bgzHome(env), 'bench');
const r2 = (n) => Math.round(n * 100) / 100;

export function listCards(env = process.env) {
  let names = [];
  try {
    names = fs.readdirSync(benchDir(env)).filter((f) => f.endsWith('.json')).sort();
  } catch {
    return [];
  }
  const cards = [];
  for (const n of names) {
    try {
      const c = JSON.parse(fs.readFileSync(path.join(benchDir(env), n), 'utf8'));
      if (c && c.id && c.brief && Array.isArray(c.checks)) cards.push(c);
    } catch { /* skip a bad card */ }
  }
  return cards;
}

export function addCard({ brief, title = '', checks = [], from = 'manual', env = process.env }) {
  const text = sanitize(String(brief)).slice(0, 12000);
  const id = createHash('sha1').update(text).digest('hex').slice(0, 8);
  const card = sanitizeRecord({ id, title: title || text.split('\n').find((l) => l.trim())?.replace(/^#+\s*/, '').slice(0, 80) || id, brief: text, checks, from, added: new Date().toISOString() });
  fs.mkdirSync(benchDir(env), { recursive: true });
  fs.writeFileSync(path.join(benchDir(env), `${id}.json`), JSON.stringify(card, null, 2), 'utf8');
  return card;
}

export function removeCard(id, env = process.env) {
  const f = path.join(benchDir(env), `${String(id).replace(/[^a-z0-9]/gi, '')}.json`);
  if (!fs.existsSync(f)) return false;
  fs.unlinkSync(f);
  return true;
}

// The brief's own "Checks" lines (numbered or bulleted under a heading that says checks / done).
export function checksFromBrief(text) {
  const out = [];
  let inside = false;
  for (const line of String(text).split(/\r?\n/)) {
    if (/^#{1,4}\s/.test(line)) inside = /check|definition of done|done when/i.test(line);
    else if (inside && /^\s*(?:\d+[.)]|[-*])\s+\S/.test(line)) out.push(line.replace(/^\s*(?:\d+[.)]|[-*])\s+/, '').replace(/[`*]/g, '').trim().slice(0, 240));
  }
  return out.slice(0, 6);
}

// Seed from past graded jobs whose brief file still exists: best-spread by score, newest first.
export function seedFromGrades({ env = process.env, n = MAX_CARDS, rows }) {
  const have = new Set(listCards(env).map((c) => c.id));
  const room = Math.max(0, MAX_CARDS - have.size);
  const added = [];
  const seen = new Set();
  for (const row of rows.slice().sort((a, b) => String(b.t).localeCompare(String(a.t)))) {
    if (added.length >= Math.min(n, room)) break;
    const p = row.briefPath;
    if (!p || seen.has(p)) continue;
    seen.add(p);
    let text;
    try {
      text = fs.readFileSync(p, 'utf8');
    } catch { continue; }
    const checks = checksFromBrief(text);
    if (!checks.length) continue;
    const card = addCard({ brief: text, checks, from: `grade ${row.id}`, env });
    if (!have.has(card.id)) added.push(card.id);
  }
  return added;
}

// ---------- scoring one output ----------
const codeCheck = (c, out) => (c.contains ? out.includes(c.contains) : c.regex ? new RegExp(c.regex, 'i').test(out) : c.not ? !out.includes(c.not) : null);

export async function scoreOutput({ card, output, ask = askDetailed, env, timeoutMs = 20000 }) {
  const sentences = card.checks.filter((c) => typeof c === 'string');
  const questions = {};
  sentences.forEach((c, i) => { questions[`c${i}`] = noul(`Does state.output show this check as met, with evidence in the output: ${c}`); });
  Object.entries(RUBRIC).filter(([id]) => id !== 'cost').forEach(([id, q]) => { questions[id] = q; });
  // Worker output goes through the full sanitize before it is cut to size, so a cut never splits a secret past the mask.
  const state = { brief: safeText(sanitize(card.brief), 6000), output: safeText(sanitize(output), 16000) };
  const r = await ask({ caller: 'jev-bench', state, questions, timeoutMs, env });
  let passed = 0;
  let total = card.checks.length || 1;
  let cost = 0;
  let grade = null;
  if (r && r.ok) {
    cost = r.cost || 0;
    sentences.forEach((_, i) => { if (r.answers[`c${i}`].noul >= 0.5) passed += 1; });
    const ids = Object.keys(RUBRIC).filter((id) => id !== 'cost');
    const parts = Object.fromEntries(ids.map((id) => [id, scoreOf(r, id, RUBRIC[id].criteria)]));
    grade = composite(parts, ids);
  }
  card.checks.filter((c) => typeof c !== 'string').forEach((c) => { if (codeCheck(c, output)) passed += 1; });
  return { checks: r2(passed / total), grade, cost, judged: Boolean(r && r.ok) };
}

// ---------- one variant over all cards ----------
export async function runVariant({ label, skillText = '', runner, cards, ask, env, timeoutMs }) {
  const per = [];
  let chars = 0;
  for (const card of cards) {
    // Cards and skill text are read back from disk, so they are sanitized again before they reach a model.
    const prompt = `${skillText ? `Follow this skill while doing the job:\n\n${sanitize(skillText)}\n\n---\n\n` : ''}Do this job. Reply with your report only.\n\n${sanitize(card.brief)}`;
    const res = runner.run(prompt, 240000);
    chars += prompt.length + (res.ok ? res.text.length : 0);
    if (!res.ok) { per.push({ card: card.id, ok: false, err: res.err }); continue; }
    per.push({ card: card.id, ok: true, ...(await scoreOutput({ card, output: res.text, ask, env, timeoutMs })) });
  }
  const done = per.filter((p) => p.ok && p.judged);
  const avg = (f) => (done.length ? r2(done.reduce((n, p) => n + f(p), 0) / done.length) : null);
  return { label, runs: per.length, failedRuns: per.filter((p) => !p.ok).length, checks: avg((p) => p.checks), grade: avg((p) => p.grade ?? 0), cost_usd: r2(done.reduce((n, p) => n + p.cost, 0) * 1e4) / 1e4, est_tokens: Math.round(chars / 4), per };
}

export function verdict(oldRes, newRes) {
  if (oldRes.checks === null || newRes.checks === null) return { pass: false, why: 'could not score a variant (no cards ran, a runner failed, or Jev was unavailable)' };
  if (newRes.checks < oldRes.checks) return { pass: false, why: `new is worse on checks (${newRes.checks} vs ${oldRes.checks})` };
  if (!(newRes.grade > oldRes.grade)) return { pass: false, why: `new is not better on Jev grade (${newRes.grade} vs ${oldRes.grade})` };
  return { pass: true, why: `no worse on checks (${newRes.checks} vs ${oldRes.checks}), better on grade (${newRes.grade} vs ${oldRes.grade})` };
}

export async function compare({ oldVariant, newVariant, cards, ask = askDetailed, env = process.env, timeoutMs }) {
  if (!cards.length) return { ok: false, err: 'no bench cards (bgz jev bench seed, or bench add)', pass: false };
  const oldRes = await runVariant({ ...oldVariant, cards, ask, env, timeoutMs });
  const newRes = await runVariant({ ...newVariant, cards, ask, env, timeoutMs });
  const v = verdict(oldRes, newRes);
  return { ok: true, pass: v.pass, why: v.why, old: oldRes, new: newRes, cards: cards.length, cost_usd: r2((oldRes.cost_usd + newRes.cost_usd) * 1e4) / 1e4, est_tokens: oldRes.est_tokens + newRes.est_tokens };
}

export async function runBench({ flags, rest, env }) {
  const sub = rest[0] || 'list';
  if (sub === 'list') return { ok: true, dir: benchDir(env), cards: listCards(env).map((c) => ({ id: c.id, title: c.title, checks: c.checks.length, from: c.from })) };
  if (sub === 'remove') return { ok: removeCard(rest[1], env), removed: rest[1] };
  if (sub === 'add') {
    if (typeof flags.brief !== 'string') throw new Error('usage: bgz jev bench add --brief <brief.md> [--title t] [--checks "a;b"]');
    refuseSecret(flags.brief);
    const brief = readTextArg(`@${path.resolve(flags.brief)}`, 12000);
    const checks = typeof flags.checks === 'string' ? flags.checks.split(';').map((s) => s.trim()).filter(Boolean) : checksFromBrief(brief);
    if (!checks.length) throw new Error('no checks found in the brief; pass --checks "a;b"');
    const c = addCard({ brief, title: typeof flags.title === 'string' ? flags.title : '', checks, env });
    return { ok: true, id: c.id, checks: c.checks.length };
  }
  if (sub === 'seed') {
    const { readGrades } = await import('./grade.mjs');
    const added = seedFromGrades({ env, n: Number(flags.n) || MAX_CARDS, rows: readGrades(env) });
    return { ok: true, added, total: listCards(env).length, note: added.length ? 'seeded from past graded jobs whose brief file still exists' : 'nothing to seed: grade jobs with --brief pointing at a kept brief first' };
  }
  if (sub === 'run') {
    const cards = listCards(env).slice(0, Number(flags['max-cards']) || MAX_CARDS);
    const textOf = (f) => (typeof f === 'string' ? fs.readFileSync(path.resolve(f), 'utf8') : '');
    const mk = (name) => pickDrafter({ only: name, env }) || pickDrafter({ env });
    const baseRunner = mk(typeof flags.runner === 'string' ? flags.runner : undefined);
    if (!baseRunner) return { ok: false, err: 'no model runner available (install claude or codex, or set BGZFLOW_DRAFTER_CMD)' };
    const modelSwap = typeof flags['old-runner'] === 'string' || typeof flags['new-runner'] === 'string';
    const skill = textOf(flags['skill-file']);
    const oldV = modelSwap ? { label: `old runner ${flags['old-runner']}`, runner: mk(flags['old-runner']), skillText: skill } : { label: 'old skill', runner: baseRunner, skillText: textOf(flags.old) };
    const newV = modelSwap ? { label: `new runner ${flags['new-runner']}`, runner: mk(flags['new-runner']), skillText: skill } : { label: 'new skill', runner: baseRunner, skillText: textOf(flags.new) };
    const out = await compare({ oldVariant: oldV, newVariant: newV, cards, env });
    return out.ok ? { ...out, old: { ...out.old, per: undefined }, new: { ...out.new, per: undefined } } : out;
  }
  throw new Error('usage: bgz jev bench list|seed|add|remove|run');
}

export { csv };
