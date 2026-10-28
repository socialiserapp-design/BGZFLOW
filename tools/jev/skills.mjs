// `bgz jev skills --brief <brief.md> [--stage build|check|finish|ship|design] [--write]`
// Jev picks each job's skills, fairly liberally (the owner's call, 9 Oct): every installed skill that "could plausibly help" is kept.
// Code does the listing, pruning, batching, thresholds and the always-include rules; Jev only scores usefulness.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { askDetailed, bgzHome, pool, safeText, score, scoreOf, toolsRoot } from './jev.mjs';
import { refuseSecret } from './secret-paths.mjs';

/** Where promoted skills go when the plugin runs from an install: ~/.bgzflow/skills-overlay. Listed before everything else. */
export const overlayDir = (env = process.env) => path.join(bgzHome(env), 'skills-overlay');

export const KEEP_AT = 0.35; // a normalised score; "could plausibly help" sits at 0.5, "remote" at 0.25
export const MAX_PER_CALL = 255;
const BATCH_CHARS = 60000;
const DESC_CHARS = 220;
export const LEVELS = [
  'no use for this job',
  'remote: only touches the job by chance',
  'could plausibly help with some part of the job',
  'clearly helps with the main work',
  'essential: the job cannot be done well without it',
];
// BG skills the job's stage always needs (names without the plugin prefix).
export const STAGE_SKILLS = {
  build: ['bg-build-with-me', 'bg-egm-coarchitect', 'research-scout-ground-truth', 'bg-efficiency', 'bg-jev'],
  check: ['bg-check-it-before-release', 'bg-egm-coarchitect', 'bg-jev', 'bg-efficiency'],
  finish: ['bg-finish-the-whole-job', 'bg-check-it-before-release', 'bg-egm-coarchitect', 'bg-jev'],
  ship: ['bg-ship-and-recover', 'bg-check-it-before-release'],
  design: ['bg-plain-english-builder', 'bg-egm-coarchitect', 'research-scout-ground-truth', 'bg-personal-product-design', 'bg-efficiency', 'bg-jev'],
  continue: ['bg-continue-my-project', 'bg-egm-coarchitect', 'bg-efficiency'],
};

function frontmatter(text) {
  const head = String(text).slice(0, 4000);
  const name = /^name:\s*["']?([^\r\n"']+)["']?\s*$/m.exec(head);
  const d = /^description:\s*(?:[>|][+-]?\s*\r?\n((?:[ \t]+.*\r?\n?)+)|["']?(.*?)["']?\s*$)/m.exec(head);
  const description = d ? String(d[1] || d[2] || '').replace(/\s+/g, ' ').trim() : '';
  return { name: name ? name[1].trim() : '', description };
}

function walkForSkills(root, depth, found) {
  let entries;
  try {
    entries = fs.readdirSync(root, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    if (!e.isDirectory() || ['node_modules', '.git', 'dist', 'assets'].includes(e.name)) continue;
    const full = path.join(root, e.name);
    if (e.name === 'skills') found.push(full);
    else if (depth > 0) walkForSkills(full, depth - 1, found);
  }
}

// Every installed skill: the promoted-skill overlay and BGZFLOW_SKILLS_DIR first (so a promoted version wins), this
// plugin's, the three personal skill folders, and installed plugins. Name + description only.
export function listSkills({ env = process.env, extraRoots = [] } = {}) {
  const home = env.USERPROFILE || env.HOME || os.homedir();
  const roots = [overlayDir(env), ...(env.BGZFLOW_SKILLS_DIR ? [path.resolve(env.BGZFLOW_SKILLS_DIR)] : []), path.join(toolsRoot, '..', 'skills'), path.join(home, '.claude', 'skills'), path.join(home, '.codex', 'skills'), path.join(home, '.agents', 'skills'), ...extraRoots];
  const pluginRoot = path.join(home, '.claude', 'plugins');
  const found = [];
  walkForSkills(pluginRoot, 7, found);
  const seen = new Map();
  for (const dir of [...roots, ...found]) {
    let kids;
    try {
      kids = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const k of kids) {
      if (!k.isDirectory() && !k.isSymbolicLink()) continue;
      const file = path.join(dir, k.name, 'SKILL.md');
      let text;
      try {
        text = fs.readFileSync(file, 'utf8');
      } catch {
        continue;
      }
      const fm = frontmatter(text);
      const name = fm.name || k.name;
      if (!fm.description || seen.has(name)) continue;
      seen.set(name, { name, description: fm.description.slice(0, DESC_CHARS), source: dir.startsWith(pluginRoot) ? 'plugin' : 'folder', file });
    }
  }
  return [...seen.values()].sort((a, b) => a.name.localeCompare(b.name));
}

// Names the brief spells out (as a whole word, with or without a plugin prefix). Never dropped.
export function namedInBrief(brief, skills) {
  const text = String(brief).toLowerCase();
  const out = new Set();
  for (const s of skills) {
    const n = s.name.toLowerCase().split(':').pop();
    if (n.length < 4) continue;
    const re = new RegExp(`(^|[^a-z0-9_-])${n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[^a-z0-9_-])`);
    if (re.test(text)) out.add(s.name);
  }
  return out;
}

// One score question per skill. Each question carries the five level descriptions, so its real size (not name + description
// alone) is what limits how many fit in one request.
export const skillQuestion = (s) => score(`Skill "${s.name}": ${s.description} How much would this skill help with the job described in state.brief?`, LEVELS);

export function batches(skills) {
  const out = [];
  let cur = [];
  let size = 0;
  for (const s of skills) {
    const len = JSON.stringify(skillQuestion(s)).length + 12;
    if (cur.length && (cur.length >= MAX_PER_CALL || size + len > BATCH_CHARS)) {
      out.push(cur);
      cur = [];
      size = 0;
    }
    cur.push(s);
    size += len;
  }
  if (cur.length) out.push(cur);
  return out;
}

export async function pickSkills({ brief, stage = 'build', skills, env = process.env, timeoutMs = 30000 }) {
  const named = namedInBrief(brief, skills);
  const always = new Set((STAGE_SKILLS[stage] || STAGE_SKILLS.build).filter((n) => skills.some((s) => s.name === n || s.name.endsWith(`:${n}`))));
  const groups = batches(skills);
  const results = await pool(groups, 6, async (group) => {
    const questions = {};
    group.forEach((s, i) => {
      questions[`s${i}`] = skillQuestion(s);
    });
    const r = await askDetailed({ caller: 'jev-skills', state: { brief: safeText(brief, 6000) }, questions, timeoutMs, env });
    return r.ok ? group.map((s, i) => ({ name: s.name, norm: scoreOf(r, `s${i}`, LEVELS).norm })) : { error: r.err, size: group.length };
  });
  const scored = results.filter(Array.isArray).flat();
  const gaps = results.filter((r) => !Array.isArray(r));
  const keep = [];
  for (const s of scored) {
    const forced = named.has(s.name) ? 'named in the brief' : [...always].some((n) => s.name === n || s.name.endsWith(`:${n}`)) ? `needed for ${stage}` : '';
    if (s.norm >= KEEP_AT || forced) keep.push({ name: s.name, score: Math.round(s.norm * 100) / 100, why: forced || 'rated plausible or better' });
  }
  // A forced skill whose batch failed is still kept (score unknown).
  const have = new Set(keep.map((k) => k.name));
  for (const n of [...named, ...always]) {
    const full = skills.find((s) => s.name === n || s.name.endsWith(`:${n}`));
    if (full && !have.has(full.name)) keep.push({ name: full.name, score: null, why: named.has(n) ? 'named in the brief' : `needed for ${stage}` });
  }
  keep.sort((a, b) => (b.score ?? 1) - (a.score ?? 1));
  return { skills: keep, considered: skills.length, scored: scored.length, gaps };
}

export function skillsSection(keep) {
  const lines = ['## Skills to load', '', 'Chosen by `bgz jev skills` (liberal: anything that could plausibly help). Load these before starting.', ''];
  for (const k of keep) lines.push(`- ${k.name}${k.score === null ? '' : ` (${k.score})`}${k.why === 'rated plausible or better' ? '' : `: ${k.why}`}`);
  return lines.join('\n');
}

export function writeSection(briefPath, section) {
  const text = fs.readFileSync(briefPath, 'utf8');
  const re = /\n## Skills to load[\s\S]*?(?=\n## |\s*$)/;
  const next = re.test(text) ? text.replace(re, `\n${section}\n`) : `${text.trimEnd()}\n\n${section}\n`;
  fs.writeFileSync(briefPath, next, 'utf8');
}

export async function runSkills({ flags, timeoutMs, env }) {
  if (typeof flags.brief !== 'string') throw new Error('usage: bgz jev skills --brief <brief.md> [--stage build|check|finish|ship|design|continue] [--write]');
  refuseSecret(flags.brief);
  const brief = fs.readFileSync(path.resolve(flags.brief), 'utf8');
  const stage = typeof flags.stage === 'string' ? flags.stage : 'build';
  if (!STAGE_SKILLS[stage]) throw new Error(`unknown --stage ${stage} (${Object.keys(STAGE_SKILLS).join(', ')})`);
  const all = listSkills({ env });
  if (!all.length) return { ok: false, err: 'no installed skills found' };
  const started = Date.now();
  const res = await pickSkills({ brief, stage, skills: all, env, timeoutMs });
  const ok = res.scored > 0 || res.skills.length > 0;
  const section = skillsSection(res.skills);
  if (flags.write && ok) writeSection(path.resolve(flags.brief), section);
  return {
    ok,
    stage,
    considered: res.considered,
    scored: res.scored,
    kept: res.skills.length,
    wrote: Boolean(flags.write && ok),
    gaps: res.gaps.length ? `${res.gaps.length} batch(es) failed (${[...new Set(res.gaps.map((g) => g.error))].join(', ')}); only forced skills kept for them` : undefined,
    skills: res.skills,
    ms: Date.now() - started,
  };
}
