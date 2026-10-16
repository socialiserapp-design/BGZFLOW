// Better workflows become skills on their own: `bgz jev improve [--dry] [--repo <dir>] [--asks <owner decisions file>,brief.md]`.
// No --asks: BGZFLOW_DECISIONS_FILE, else the owner's decisions file in the repo (see decisionsFile in review.mjs).
//   1. Code finds a workflow (same role, job type and skill set) that beats the other jobs of its role by >= MARGIN over >= MIN_JOBS jobs.
//   2. Jev judges which skill that workflow belongs to (update one, or "new").
//   3. A model from another vendor than the worker drafts the skill text (< 4,000 chars). An unknown vendor defers.
//   4. The unasked check (item 11) must find no new rule, gate or cap in it; code also refuses newly added "never/block/refuse" lines.
//   5. The fixed bench (item 15) must show new no worse on checks and better on average. No bench cards = deferred, not promoted.
//      --dry skips the bench (it runs model children) and reports what would be promoted.
//   6. The old text is backed up to ~/.bgzflow/skill-history/<skill>/<date>.md and the new text goes live straight away.
//      One promotion per skill per pass. A skill inside the installed plugin is never written: the new text goes to the
//      source repo, BGZFLOW_SKILLS_DIR or the overlay (~/.bgzflow/skills-overlay), which skill listing reads first.
//   7. The next WATCH_JOBS jobs that use it are watched; a lower average restores the backup and records why. Newest first;
//      the live file is copied to skill-history before a restore, and a file that changed since the promotion is a conflict
//      (recorded, left as it is).
// Every promotion, rejection and rollback is a line in ~/.bgzflow/skill-changes.jsonl. Public skill changes ship in the next
// release, where ops checks them for private details first.
// The asks for the unasked check default to the owner's decisions file named in BGZFLOW_DECISIONS_FILE.
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { askDetailed, appendJsonl, bgzHome, choice, csv, safeText, sanitize, toolsRoot } from './jev.mjs';
import { effective, readGrades } from './grade.mjs';
import { listSkills, overlayDir } from './skills.mjs';
import { pickDrafter, pickDrafterDetailed } from './drafter.mjs';
import { checkUnasked, decisionsFile, readAsks } from './review.mjs';
import { compare, listCards } from './bench.mjs';

export const MIN_JOBS = 3;
export const MARGIN = 0.1;
export const WATCH_JOBS = 5;
export const MAX_SKILL_CHARS = 4000;
export const MATCH_CONFIDENCE = 0.5; // below this Jev's match is not trusted and a new skill is proposed
const r2 = (n) => Math.round(n * 100) / 100;
const avg = (rows) => (rows.length ? rows.reduce((n, r) => n + effective(r), 0) / rows.length : null);

export const changesPath = (env = process.env) => path.join(bgzHome(env), 'skill-changes.jsonl');
export const historyDir = (skill, env = process.env) => path.join(bgzHome(env), 'skill-history', skill);

export const textHash = (text) => createHash('sha256').update(String(text)).digest('hex');
const readOrNull = (file) => {
  try {
    return fs.readFileSync(file, 'utf8');
  } catch {
    return null;
  }
};

function writeAtomic(file, text) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, text, 'utf8');
  fs.renameSync(tmp, file);
}

// A free path in skill-history: <day><tag>.md, then -2, -3 ... so no earlier copy is overwritten.
function historyCopy(skill, text, env, now, tag = '') {
  const dir = historyDir(skill, env);
  fs.mkdirSync(dir, { recursive: true });
  const day = now.toISOString().slice(0, 10);
  let target = path.join(dir, `${day}${tag}.md`);
  for (let i = 2; fs.existsSync(target); i++) target = path.join(dir, `${day}${tag}-${i}.md`);
  fs.writeFileSync(target, text, 'utf8');
  return target;
}

// ---------- where promotions may write ----------
const homeOf = (env) => env.USERPROFILE || env.HOME || os.homedir();
const norm = (p) => (process.platform === 'win32' ? path.resolve(p).toLowerCase() : path.resolve(p));
const VERSION_DIR = /^v?\d+\.\d+\.\d+(?:[-+][\w.-]*)?$/;

/** True for anything inside an installed plugin: ~/.claude/bgzflow-plugin, plugin caches, BGZFLOW_INSTALL_DIRS, or a versioned folder. */
export function isInstalled(file, env = process.env) {
  if (!file) return false;
  const home = homeOf(env);
  const roots = [path.join(home, '.claude', 'bgzflow-plugin'), path.join(home, '.claude', 'plugins'), path.join(home, '.codex', 'plugins'), ...csv(env.BGZFLOW_INSTALL_DIRS)].map(norm);
  const f = norm(file);
  if (roots.some((r) => f === r || f.startsWith(r + path.sep))) return true;
  return path.resolve(file).split(/[\\/]/).some((s) => VERSION_DIR.test(s));
}

/** The folder promoted skills are written to: BGZFLOW_SKILLS_DIR, else this plugin's source repo, else the overlay. Never an install. */
export function skillsTarget(env = process.env) {
  if (env.BGZFLOW_SKILLS_DIR && !isInstalled(env.BGZFLOW_SKILLS_DIR, env)) return { dir: path.resolve(env.BGZFLOW_SKILLS_DIR), kind: 'configured' };
  const source = path.resolve(toolsRoot, '..');
  if (fs.existsSync(path.join(source, '.git')) && !isInstalled(source, env)) return { dir: path.join(source, 'skills'), kind: 'source' };
  return { dir: overlayDir(env), kind: 'overlay' };
}

export function readChanges(env = process.env) {
  try {
    return fs.readFileSync(changesPath(env), 'utf8').split('\n').map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
  } catch {
    return [];
  }
}

// ---------- 1. promotion candidates (code only) ----------
export const workflowKey = (row) => `${row.role}|${row.jobType}|${(row.skills || []).join(',')}`;

export function findCandidates(rows, changes = []) {
  const usable = rows.filter((r) => r.jobType && Array.isArray(r.skills) && r.skills.length && Array.isArray(r.steps) && r.steps.length);
  const done = new Set(changes.filter((c) => c.workflow).map((c) => c.workflow));
  const groups = new Map();
  for (const r of usable) {
    const k = workflowKey(r);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(r);
  }
  const out = [];
  for (const [key, g] of groups) {
    if (g.length < MIN_JOBS || done.has(key)) continue;
    const others = rows.filter((r) => r.role === g[0].role && !g.includes(r));
    const base = avg(others);
    const mine = avg(g);
    // Round before comparing: 0.5 - 0.4 is 0.0999... in floating point, and the rule is "at least 0.1".
    if (base === null || r2(mine - base) < MARGIN) continue;
    out.push({ key, role: g[0].role, jobType: g[0].jobType, skills: g[0].skills, jobs: g.length, average: r2(mine), baseline: r2(base), gain: r2(mine - base), workers: [...new Set(g.map((r) => r.worker))], rows: g });
  }
  return out.sort((a, b) => b.gain - a.gain);
}

// ---------- 2. which skill ----------
export function writableSkills(env = process.env) {
  return listSkills({ env }).filter((s) => s.source === 'folder');
}

export async function matchSkill({ cand, skills, ask = askDetailed, env, timeoutMs = 15000 }) {
  const pool = skills.slice(0, 254);
  const options = Object.fromEntries([...pool.map((s) => [s.name, s.description]), ['new', 'none of these fits: create a new skill for this workflow']]);
  const steps = [...new Set(cand.rows.flatMap((r) => r.steps))].slice(0, 12).join(' | ');
  const state = { job_type: cand.jobType, role: cand.role, skills_used: cand.skills.join(', '), steps: safeText(steps, 2500) };
  const r = await ask({ caller: 'jev-improve-match', state, questions: { skill: choice('Which skill does this workflow of steps belong to, so that the skill can be improved with it? Pick "new" only when no listed skill covers this kind of job.', options) }, timeoutMs, env });
  if (!r || !r.ok) return { ok: false, err: r && r.err };
  const a = r.answers.skill;
  const isNew = a.choice === 'new' || a.confidence < MATCH_CONFIDENCE;
  return { ok: true, skill: isNew ? 'new' : a.choice, confidence: r2(a.confidence), file: isNew ? null : (pool.find((s) => s.name === a.choice) || {}).file || null };
}

// ---------- 3. draft ----------
export function draftPrompt({ cand, name, oldText }) {
  // Steps and the current skill text are read back from ledgers and disk, so both are sanitized again for the drafter.
  const steps = cand.rows.slice(0, 5).map((r, i) => `Run ${i + 1} (score ${r2(effective(r))}): ${r.steps.map((s) => sanitize(s)).join(' -> ')}`).join('\n');
  return [
    oldText ? `Update this skill so it also captures the workflow below. Keep its name, its format and everything that still matters; fold the steps in, do not append a diary.` : `Write a new skill named "${name}" that captures the workflow below.`,
    `Format: a markdown file that starts with a frontmatter block (--- / name: ${name} / description: one sentence --- ) then plain-English steps. Under ${MAX_SKILL_CHARS} characters in total (hard limit).`,
    'Do not add any new rule, ban, gate, cap, expiry or refusal. Describe how to do the work, not what is forbidden.',
    `Job type: ${cand.jobType}. These runs scored ${cand.average} against ${cand.baseline} for other jobs of the same role.`,
    steps,
    oldText ? `--- current skill ---\n${sanitize(oldText)}` : '',
    'Reply with only the full skill file, no code fences, no commentary.',
  ].filter(Boolean).join('\n\n');
}

const stripFences = (t) => String(t).replace(/^```[a-z]*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
const STOP_WORDS = /\b(?:never|must not|forbidden|prohibited|refuse[sd]?|blocked?|do not ever|at most|cannot ever)\b/i;

export function validateDraft({ text, name, oldText }) {
  if (!text || text.length < 80) return 'draft is empty';
  if (text.length > MAX_SKILL_CHARS) return `draft is ${text.length} chars (limit ${MAX_SKILL_CHARS})`;
  if (!/^---\r?\n[\s\S]*?\bname:\s*\S+[\s\S]*?\r?\n---/.test(text)) return 'draft has no frontmatter';
  if (!new RegExp(`name:\\s*["']?${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["']?\\s*$`, 'm').test(text)) return 'draft changed the skill name';
  if (/^```/.test(text)) return 'draft is wrapped in a code fence';
  const oldLines = new Set(String(oldText || '').split('\n').map((l) => l.trim()));
  const added = text.split('\n').filter((l) => l.trim() && !oldLines.has(l.trim()));
  const rule = added.find((l) => STOP_WORDS.test(l));
  if (rule && !STOP_WORDS.test(oldText || '')) return `draft adds a stop word line: "${rule.trim().slice(0, 80)}"`;
  if (rule && added.filter((l) => STOP_WORDS.test(l)).length > (String(oldText || '').split('\n').filter((l) => STOP_WORDS.test(l)).length)) return `draft adds more stop-word lines than the old skill: "${rule.trim().slice(0, 80)}"`;
  return null;
}

// ---------- 6. swap ----------
// Writes the new text to `file` (temp file + rename). The text it replaces (`oldText`, or the file itself) is copied to
// skill-history first; the new text is copied there too, so every promoted version can be found by its hash.
// Returns { backup, promotedCopy, hash, created }.
export function swapIn({ file, text, skill, env = process.env, now = new Date(), oldText = null }) {
  if (isInstalled(file, env)) throw new Error('a promotion never writes into an installed plugin folder');
  const live = readOrNull(file);
  const before = live !== null ? live : oldText;
  const backup = before !== null && before !== '' ? historyCopy(skill, before, env, now) : null;
  const body = `${text.trimEnd()}\n`;
  writeAtomic(file, body);
  const promotedCopy = historyCopy(skill, body, env, now, '-promoted');
  return { backup, promotedCopy, hash: textHash(body), created: live === null };
}

// Puts a promotion back. Never overwrites a file that changed after the promotion: that is recorded as a conflict.
function rollBack(p, env, now) {
  const live = readOrNull(p.file);
  if (live === null) return { restored: false, why: 'the skill file is gone' };
  if (p.hash && textHash(live) !== p.hash) return { restored: false, conflict: true, why: 'the skill file changed after the promotion, so it was left as it is' };
  if (isInstalled(p.file, env)) return { restored: false, why: 'the skill file is inside an installed plugin folder' };
  const saved = historyCopy(p.skill, live, env, now, '-before-rollback');
  if (p.backup && fs.existsSync(p.backup)) {
    writeAtomic(p.file, fs.readFileSync(p.backup, 'utf8'));
    return { restored: true, saved };
  }
  if (p.created) {
    fs.renameSync(p.file, `${p.file}.rolled-back`);
    return { restored: true, saved };
  }
  return { restored: false, saved, why: 'no backup of the old text' };
}

// ---------- 7. watch ----------
export function watchResults({ changes, rows, env = process.env, now = new Date() }) {
  const settled = new Set(changes.filter((c) => ['confirm', 'rollback', 'conflict'].includes(c.action)).map((c) => c.promotionId));
  const out = [];
  // Newest first, so a later promotion of the same skill is undone before an earlier one is looked at.
  const open = changes.filter((c) => c.action === 'promote' && !settled.has(c.id)).sort((a, b) => String(b.t).localeCompare(String(a.t)));
  for (const p of open) {
    const after = rows.filter((r) => r.t > p.t && (r.skills || []).includes(p.skill)).sort((a, b) => a.t.localeCompare(b.t)).slice(0, WATCH_JOBS);
    if (after.length < WATCH_JOBS) {
      out.push({ id: p.id, skill: p.skill, state: 'watching', jobs: after.length });
      continue;
    }
    const newAvg = avg(after);
    if (newAvg < p.oldAverage) {
      const reason = `next ${WATCH_JOBS} jobs averaged ${r2(newAvg)}, below the old ${r2(p.oldAverage)}`;
      const res = rollBack(p, env, now);
      const action = res.conflict ? 'conflict' : 'rollback';
      const row = { t: now.toISOString(), action, promotionId: p.id, skill: p.skill, restored: res.restored, reason, ...(res.why ? { why: res.why } : {}), ...(res.saved ? { saved: res.saved } : {}) };
      appendJsonl(changesPath(env), row);
      out.push({ id: p.id, skill: p.skill, state: res.conflict ? 'conflict' : 'rolled-back', reason, ...(res.why ? { why: res.why } : {}) });
    } else {
      appendJsonl(changesPath(env), { t: now.toISOString(), action: 'confirm', promotionId: p.id, skill: p.skill, average: r2(newAvg), oldAverage: r2(p.oldAverage) });
      out.push({ id: p.id, skill: p.skill, state: 'confirmed', average: r2(newAvg) });
    }
  }
  return out;
}

// ---------- weekly summary (one line in the lessons notes) ----------
export function isoWeek(date) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const y0 = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return `${d.getUTCFullYear()}-W${String(Math.ceil(((d - y0) / 86400000 + 1) / 7)).padStart(2, '0')}`;
}

export function writeWeeklySummary({ repo, changes, now = new Date() }) {
  if (!repo) return false;
  const week = isoWeek(now);
  const since = new Date(now.getTime() - 7 * 86400000).toISOString();
  const recent = changes.filter((c) => c.t >= since);
  if (!recent.length) return false;
  const count = (a) => recent.filter((c) => c.action === a).length;
  const file = path.join(repo, '.bgzflow', 'lessons-notes.md');
  try {
    const text = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
    if (text.includes(`skills ${week}:`)) return false;
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.appendFileSync(file, `- skills ${week}: ${count('promote')} promoted, ${count('reject')} rejected, ${count('rollback')} rolled back, ${count('confirm')} confirmed\n`, 'utf8');
    return true;
  } catch {
    return false;
  }
}

// ---------- the whole pass ----------
export async function improve({ env = process.env, repo, asks = '', dry = false, deps = {}, now = new Date(), worker = '' } = {}) {
  const rows = readGrades(env);
  const changes = readChanges(env);
  const out = { ok: true, watched: [], candidates: 0, promoted: [], rejected: [], deferred: [], dry };
  if (!dry) out.watched = watchResults({ changes, rows, env, now });
  const cands = findCandidates(rows, changes);
  out.candidates = cands.length;
  const skills = (deps.skills || writableSkills)(env);
  const log = (row) => { if (!dry) appendJsonl(changesPath(env), { t: now.toISOString(), ...row }); };
  const target = deps.target || skillsTarget(env);
  const promotedThisPass = new Set();
  for (const cand of cands) {
    const head = { workflow: cand.key, jobType: cand.jobType, role: cand.role, jobs: cand.jobs, average: cand.average, baseline: cand.baseline };
    const m = await (deps.match || matchSkill)({ cand, skills, env });
    if (!m.ok) { out.deferred.push({ ...head, why: `Jev match unavailable (${m.err})` }); continue; }
    const isNew = m.skill === 'new';
    const name = isNew ? `bg-${cand.jobType.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-workflow`.slice(0, 60) : m.skill;
    // One promotion per skill per pass: a second workflow for the same skill waits for the next pass, after this one is watched.
    if (promotedThisPass.has(name)) { out.deferred.push({ ...head, skill: name, why: 'this skill was already promoted in this pass' }); continue; }
    const source = isNew ? null : m.file;
    // The live file is read where it is; the new text is written to the source repo or overlay, never into an install.
    const file = !source || isInstalled(source, env) ? path.join(target.dir, name, 'SKILL.md') : source;
    if (isNew && (skills.some((s) => s.name === name) || fs.existsSync(file))) { out.deferred.push({ ...head, skill: name, why: 'a skill with the generated name already exists' }); continue; }
    if (isInstalled(file, env)) { out.deferred.push({ ...head, skill: name, why: 'the only place to write this skill is an installed plugin folder; set BGZFLOW_SKILLS_DIR' }); continue; }
    const oldText = readOrNull(file) ?? (source ? readOrNull(source) : null) ?? '';
    let drafter = deps.drafter;
    if (drafter === undefined) {
      const pick = pickDrafterDetailed({ exclude: [worker, ...cand.workers].filter(Boolean).join(' '), env });
      drafter = pick.drafter;
      if (!drafter) { out.deferred.push({ ...head, skill: name, why: `no drafter from another vendor: ${pick.why}` }); continue; }
    }
    if (!drafter) { out.deferred.push({ ...head, skill: name, why: 'no second model available to draft the text' }); continue; }
    const res = drafter.run(draftPrompt({ cand, name, oldText }));
    const text = res.ok ? sanitize(stripFences(res.text)) : '';
    const bad = res.ok ? validateDraft({ text, name, oldText }) : `drafter failed: ${res.err}`;
    if (bad) { const row = { ...head, skill: name, action: 'reject', why: bad }; log(row); out.rejected.push(row); continue; }

    // unasked check (item 11): only the lines that are new
    const oldLines = new Set(oldText.split('\n').map((l) => l.trim()));
    const added = text.split('\n').filter((l) => l.trim() && !oldLines.has(l.trim())).join('\n');
    const asksText = asks || readAsks(deps.asksSpec || '', repo || process.cwd());
    if (!asksText.trim()) { out.deferred.push({ ...head, skill: name, why: 'no asks text for the unasked check (pass --asks <decisions file>,brief.md or set BGZFLOW_DECISIONS_FILE)' }); continue; }
    const u = await (deps.unasked || checkUnasked)({ change: added, asks: asksText, file: `${name}/SKILL.md`, env, timeoutMs: 8000, caller: 'jev-improve-unasked' });
    if (!u.ok) { out.deferred.push({ ...head, skill: name, why: `unasked check unavailable (${u.err})` }); continue; }
    if (u.untraceable) { const row = { ...head, skill: name, action: 'reject', why: `adds a ${u.kind} nobody asked for: ${u.quote}` }; log(row); out.rejected.push(row); continue; }

    // A dry pass stops before the bench: the bench runs model children, and a dry pass runs none of them.
    if (dry) { out.promoted.push({ ...head, skill: name, file, would: true, bench: 'skipped (dry run)' }); continue; }

    // bench (item 15): old against new, same cards
    const cards = (deps.cards || listCards)(env);
    if (!cards.length) { out.deferred.push({ ...head, skill: name, why: 'no bench cards yet (bgz jev bench seed); a promotion needs old-versus-new on the fixed set' }); continue; }
    const runner = deps.runner || pickDrafter({ env });
    if (!runner) { out.deferred.push({ ...head, skill: name, why: 'no model runner for the bench' }); continue; }
    const bench = await (deps.bench || compare)({ oldVariant: { label: 'old skill', runner, skillText: oldText }, newVariant: { label: 'new skill', runner, skillText: text }, cards, env });
    if (!bench.ok) { out.deferred.push({ ...head, skill: name, why: bench.err || 'bench could not run' }); continue; }
    if (!bench.pass) { const row = { ...head, skill: name, action: 'reject', why: `bench: ${bench.why}`, bench_cost_usd: bench.cost_usd }; log(row); out.rejected.push(row); continue; }

    const swap = swapIn({ file, text, skill: name, env, now, oldText: oldText || null });
    promotedThisPass.add(name);
    const id = `${now.getTime().toString(36)}-${name}`.slice(0, 80);
    const usedBefore = rows.filter((r) => (r.skills || []).includes(name));
    // hash + text of the promoted version: a rollback restores only while the live file still has this hash.
    const row = { ...head, id, action: 'promote', skill: name, file, source: source || null, created: swap.created, backup: swap.backup, hash: swap.hash, text: `${text.trimEnd()}\n`, promotedCopy: swap.promotedCopy, oldAverage: r2(avg(usedBefore) ?? cand.baseline), bench: bench.why, bench_cost_usd: bench.cost_usd, drafter: drafter.name };
    log(row);
    out.promoted.push({ ...head, skill: name, file, backup: swap.backup, bench: bench.why });
  }
  if (!dry) out.summary_written = writeWeeklySummary({ repo, changes: readChanges(env), now });
  return out;
}

/** The asks files for the unasked check: --asks wins; otherwise the owner's decisions file from BGZFLOW_DECISIONS_FILE. */
export const asksSpec = (flags = {}, env = process.env, repo = '') =>
  csv(flags.asks).join(',') || String(env.BGZFLOW_DECISIONS_FILE || '').trim() || (repo ? decisionsFile(env, repo) || '' : '');

export async function runImprove({ flags, env }) {
  const repo = typeof flags.repo === 'string' ? path.resolve(flags.repo) : process.cwd();
  return improve({ env, repo, asks: readAsks(asksSpec(flags, env, repo), repo), dry: Boolean(flags.dry), worker: typeof flags.worker === 'string' ? flags.worker : '' });
}
