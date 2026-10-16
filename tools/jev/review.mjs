// Jev reviews of a diff: `bgz jev arch` (architecture and logic leads) and `bgz jev unasked` (changes nobody asked for).
// Both are leads for the lead and the single reviewer, never verdicts. Each question is one snap judgment (noul);
// the thresholds live here in code. A failed Jev call is reported as a gap, never as a clean pass.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { askDetailed, csv, noul, pool, safeText } from './jev.mjs';
import { isSecretPath, refuseSecret } from './secret-paths.mjs';
import { decisionsFileName } from '../../hooks/lib/jev-gates.mjs';

export const FLAG_AT = 0.6;
const MAX_UNIT_CHARS = 6000;
const MAX_WHOLE_CHARS = 30000;
const SKIP_FILE = /(?:^|\/)(?:package-lock\.json|yarn\.lock|pnpm-lock\.yaml|.*\.lock)$|\.(?:png|jpe?g|gif|webp|ico|pdf|zip|gz|mp[34]|woff2?|ttf|svg|map|min\.js)$/i;

// ---------- git diff into units ----------
function git(args, cwd) {
  const r = spawnSync('git', args, { cwd, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (r.error || r.status !== 0) throw new Error(`git ${args[0]} failed${r.stderr ? `: ${r.stderr.trim().split('\n')[0].slice(0, 160)}` : ''}`);
  return r.stdout;
}

// One unit = one hunk (or a whole small file). Lines are on the new side of the diff.
export function parseHunks(file, diffText) {
  const units = [];
  const re = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@.*$/gm;
  const heads = [];
  let m;
  while ((m = re.exec(diffText))) heads.push({ index: m.index, end: re.lastIndex, start: Number(m[1]), len: m[2] === undefined ? 1 : Number(m[2]) });
  heads.forEach((h, i) => {
    const body = diffText.slice(h.end, i + 1 < heads.length ? heads[i + 1].index : diffText.length).replace(/^\r?\n/, '');
    // The "+++ b/file" header sits before the first "@@", never inside a hunk body, so every "+" line here is an added line
    // (including one whose own text starts with "++", like "++counter;").
    const added = body.split('\n').filter((l) => l.startsWith('+')).map((l) => l.slice(1));
    units.push({ file, from: h.start, to: Math.max(h.start, h.start + h.len - 1), diff: body, added });
  });
  return units;
}

// Secret files (.env, keys, Secrets/) never travel: they are left out and named in `skippedSecret` when one is given.
export function changedUnits({ base, files = [], cwd = process.cwd(), includeUntracked = true, skippedSecret = [] }) {
  const names = git(['diff', '--name-only', base, '--', ...files], cwd).split('\n').map((s) => s.trim()).filter(Boolean);
  const units = [];
  for (const file of names) {
    if (SKIP_FILE.test(file)) continue;
    if (isSecretPath(file)) {
      skippedSecret.push(file);
      continue;
    }
    const diff = git(['diff', '--unified=3', base, '--', file], cwd);
    if (!diff.trim() || /^Binary files /m.test(diff)) continue;
    units.push(...parseHunks(file, diff));
  }
  if (includeUntracked) {
    const extra = git(['ls-files', '--others', '--exclude-standard', '--', ...files], cwd).split('\n').map((s) => s.trim()).filter(Boolean);
    for (const file of extra) {
      if (SKIP_FILE.test(file)) continue;
      if (isSecretPath(file)) {
        skippedSecret.push(file);
        continue;
      }
      let text;
      try {
        const buf = fs.readFileSync(path.join(cwd, file));
        if (buf.length > 200 * 1024 || buf.subarray(0, 4000).includes(0)) continue;
        text = buf.toString('utf8');
      } catch {
        continue;
      }
      const lines = text.split('\n');
      units.push({ file, from: 1, to: Math.max(1, lines.length), diff: lines.map((l) => `+${l}`).join('\n'), added: lines, untracked: true });
    }
  }
  return units;
}

// Several small hunks of one file travel together (one request per file); a large file is split per hunk.
export function groupUnits(units) {
  const byFile = new Map();
  for (const u of units) {
    if (!byFile.has(u.file)) byFile.set(u.file, []);
    byFile.get(u.file).push(u);
  }
  const out = [];
  for (const [file, list] of byFile) {
    const total = list.reduce((n, u) => n + u.diff.length, 0);
    if (total <= MAX_UNIT_CHARS) {
      out.push({ file, from: Math.min(...list.map((u) => u.from)), to: Math.max(...list.map((u) => u.to)), diff: list.map((u) => u.diff).join('\n'), added: list.flatMap((u) => u.added), hunks: list.length });
    } else {
      for (const u of list) out.push({ ...u, hunks: 1 });
    }
  }
  return out;
}

const failNote = (unit, err) => ({ file: unit.file, lines: `${unit.from}-${unit.to}`, error: err });

// ---------- architecture and logic ----------
export const ARCH_QUESTIONS = {
  contradiction: noul('Does the changed code in state.diff contain a contradictory or unreachable condition or branch (a test that can never be true, two conditions that exclude each other, code after a return)?'),
  duplication: noul('Does the changed code in state.diff copy logic that already exists elsewhere in it or is clearly a second implementation of the same thing?'),
  error_path: noul('Does the changed code in state.diff have a broken error path or a silent failure (an error swallowed, ignored, logged and then treated as success, or a missing check on a result)?'),
  state_race: noul('Does the changed code in state.diff have a state or race problem (shared state changed without care, check-then-act gaps, ordering assumptions, missing cleanup)?'),
  layering: noul('Does the changed code in state.diff break layering or ownership (a low-level part reaching into a higher one, one component writing another one\'s data, a hidden dependency)?'),
  dead_code: noul('Does the changed code in state.diff add a dead or unused path (a function, branch, option or variable nothing uses)?'),
};
const BRIEF_Q = noul('Does the changed code in state.diff do something different from, or beyond, what state.brief asks for?');

export const ARCH_LABELS = {
  contradiction: 'contradictory or unreachable logic',
  duplication: 'duplicated logic',
  error_path: 'broken error path or silent failure',
  state_race: 'state or race problem',
  layering: 'layering or ownership violation',
  dead_code: 'dead or unused path',
  brief_mismatch: 'mismatch with the brief',
};

async function archOne(unit, whole, brief, timeoutMs, env) {
  const questions = { ...ARCH_QUESTIONS };
  if (brief) questions.brief_mismatch = BRIEF_Q;
  const state = { file: whole ? '(whole diff)' : unit.file, diff: safeText(unit.diff, whole ? MAX_WHOLE_CHARS : MAX_UNIT_CHARS) };
  if (brief) state.brief = safeText(brief, 4000);
  const r = await askDetailed({ caller: 'jev-arch', state, questions, timeoutMs, env });
  if (!r.ok) return { error: r.err };
  const flags = [];
  for (const id of Object.keys(questions)) {
    const p = r.answers[id].noul;
    if (p >= FLAG_AT) flags.push({ file: unit.file, lines: `${unit.from}-${unit.to}`, check: ARCH_LABELS[id], confidence: Math.round(p * 100) / 100, scope: whole ? 'whole-diff' : 'unit' });
  }
  return { flags, cost: r.cost, ms: r.ms };
}

export async function arch({ base, files = [], brief = '', cwd = process.cwd(), timeoutMs = 15000, env = process.env }) {
  const skippedSecret = [];
  const units = groupUnits(changedUnits({ base, files, cwd, skippedSecret }));
  const secretNote = skippedSecret.length ? { skipped_secret_files: skippedSecret } : {};
  if (!units.length) return { ok: true, note: 'no changed text files against the base', leads: [], gaps: [], ...secretNote };
  const wholeDiff = units.map((u) => `--- ${u.file} (${u.from}-${u.to})\n${u.diff}`).join('\n');
  const jobs = units.map((u) => ({ unit: u, whole: false }));
  if (units.length > 1) jobs.push({ unit: { file: '(whole diff)', from: 0, to: 0, diff: wholeDiff }, whole: true });
  const results = await pool(jobs, 6, (j) => archOne(j.unit, j.whole, brief, timeoutMs, env));
  const leads = [];
  const gaps = [];
  let cost = 0;
  results.forEach((r, i) => {
    if (r.error) gaps.push(failNote(jobs[i].unit, r.error));
    else {
      leads.push(...r.flags);
      cost += r.cost || 0;
    }
  });
  leads.sort((a, b) => b.confidence - a.confidence);
  return { ok: gaps.length < jobs.length, note: 'Leads, not verdicts: send to the lead and the single reviewer.', checked: jobs.length, leads, gaps, ...secretNote, cost_usd: Math.round(cost * 1e7) / 1e7 };
}

// ---------- changes nobody asked for ----------
export const UNASKED_QUESTIONS = {
  customer_stop: noul('Does the change in state.change add something a customer or end user would run into: a block, cap, limit, expiry, gate, hold, refusal or forced wait that stops or delays them? Answer no for logging, tests, internal tooling and developer-only code.'),
  new_rule: noul('Does the change in state.change add a new rule, policy, limit or prohibition to an instruction file (a new "never", "must", "always" or "at most" that did not exist)? Answer no for plain facts, examples and rewording.'),
  traceable: noul('Is every block, cap, limit, gate, wait or rule added in state.change something the owner asked for, in words found in state.asks (or a plain necessity of what they asked)? Answer no when state.asks never mentions it.'),
};
export const UNASKED_HIT_AT = FLAG_AT;
export const TRACEABLE_BELOW = 0.5;

const quoteOf = (lines) => lines.map((l) => l.trim()).filter(Boolean).slice(0, 3).join(' / ').slice(0, 280);

// Core used by the CLI and by the instruction-file hook. `change` is the added text only.
export async function checkUnasked({ change, asks, file = '', quote, timeoutMs = 2500, env = process.env, caller = 'jev-unasked' }) {
  const state = { change: safeText(change, 5000), asks: safeText(asks, 9000) };
  const r = await askDetailed({ caller, state, questions: UNASKED_QUESTIONS, timeoutMs, env });
  if (!r.ok) return { ok: false, err: r.err };
  const a = r.answers;
  const hitStop = a.customer_stop.noul;
  const hitRule = a.new_rule.noul;
  const traceable = a.traceable.noul;
  const hit = Math.max(hitStop, hitRule);
  const untraceable = hit >= UNASKED_HIT_AT && traceable < TRACEABLE_BELOW;
  return {
    ok: true,
    untraceable,
    kind: hitStop >= hitRule ? 'customer-facing stop' : 'new rule',
    hit: Math.round(hit * 100) / 100,
    traceable: Math.round(traceable * 100) / 100,
    confidence: Math.round(Math.min(hit, 1 - traceable) * 100) / 100,
    file,
    quote: quote ?? quoteOf(String(change).split('\n')),
    cost: r.cost,
    ms: r.ms,
  };
}

// The owner's decisions file: BGZFLOW_DECISIONS_FILE (a path, relative to the repo or absolute) when set; otherwise the
// overlay config's "decisionsFile" (decisionsFileName), found in the repo or its .bgzflow folder, with DECISIONS.md last.
// Used when --asks is not given.
export function decisionsFile(env = process.env, cwd = process.cwd()) {
  const named = env.BGZFLOW_DECISIONS_FILE && env.BGZFLOW_DECISIONS_FILE.trim();
  const name = decisionsFileName(env);
  // A file named in BGZFLOW_DECISIONS_FILE is the only one read; a missing one leaves no asks.
  const candidates = named ? [named] : [...new Set([name, path.join('.bgzflow', name), 'DECISIONS.md', path.join('.bgzflow', 'DECISIONS.md')])];
  for (const c of candidates) {
    const abs = path.resolve(cwd, c);
    if (fs.existsSync(abs)) return abs;
  }
  return null;
}

export function readAsks(spec, cwd = process.cwd()) {
  const parts = [];
  for (const p of csv(spec)) {
    refuseSecret(p);
    try {
      parts.push(`# ${path.basename(p)}\n${fs.readFileSync(path.resolve(cwd, p), 'utf8').slice(0, 8000)}`);
    } catch {
      // a missing asks file is reported by the caller as empty asks
    }
  }
  return parts.join('\n\n');
}

export async function unasked({ base, asks, files = [], cwd = process.cwd(), timeoutMs = 15000, env = process.env }) {
  if (!asks.trim()) return { ok: false, err: 'no asks text (pass --asks <decisions file>,brief.md or set BGZFLOW_DECISIONS_FILE; an empty list would make everything look untraceable)' };
  const skippedSecret = [];
  const units = groupUnits(changedUnits({ base, files, cwd, skippedSecret })).filter((u) => u.added.some((l) => l.trim()));
  const secretNote = skippedSecret.length ? { skipped_secret_files: skippedSecret } : {};
  if (!units.length) return { ok: true, note: 'no added text against the base', untraceable: [], gaps: [], ...secretNote };
  const results = await pool(units, 6, (u) => checkUnasked({ change: u.added.join('\n'), asks, file: u.file, timeoutMs, env }));
  const items = [];
  const gaps = [];
  results.forEach((r, i) => {
    if (!r.ok) gaps.push(failNote(units[i], r.err));
    else if (r.untraceable) items.push({ file: r.file, lines: `${units[i].from}-${units[i].to}`, kind: r.kind, quote: r.quote, confidence: r.confidence, hit: r.hit, traceable: r.traceable });
  });
  items.sort((a, b) => b.confidence - a.confidence);
  return { ok: gaps.length < units.length, note: 'Untraceable to the asks given. A warning for the lead and the reviewer; the reviewer decides.', checked: units.length, untraceable: items, gaps, ...secretNote };
}

// ---------- CLI ----------
export async function runArch({ flags, timeoutMs, env }) {
  if (!flags.base || flags.base === true) throw new Error('--base <ref> is required');
  let brief = '';
  if (typeof flags.brief === 'string') {
    refuseSecret(flags.brief);
    try {
      brief = fs.readFileSync(flags.brief, 'utf8');
    } catch {
      throw new Error(`cannot read --brief ${flags.brief}`);
    }
  }
  return arch({ base: String(flags.base), files: csv(flags.files), brief, cwd: typeof flags.repo === 'string' ? path.resolve(flags.repo) : process.cwd(), timeoutMs, env });
}

export async function runUnasked({ flags, timeoutMs, env }) {
  if (!flags.base || flags.base === true) throw new Error('--base <ref> is required');
  const cwd = typeof flags.repo === 'string' ? path.resolve(flags.repo) : process.cwd();
  let asksSpec = flags.asks;
  if (typeof asksSpec !== 'string') {
    const fallback = decisionsFile(env, cwd);
    if (fallback) asksSpec = fallback;
  }
  return unasked({ base: String(flags.base), asks: readAsks(asksSpec, cwd), files: csv(flags.files), cwd, timeoutMs, env });
}
