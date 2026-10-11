// Grade by real outcomes. No model calls: git, review reports and lessons notes only.
//   bgz jev outcomes [--repo <dir>] [--reviews dir,dir] [--dry] [--max-jobs N] [--budget-ms MS] [--background=1]
// For each graded job it checks: were its commits reverted within 7 days, did a release review flag it,
// did it become a lessons entry. Result: an `outcome` field on the grade line and a `combined` score (weights below).
// A missing repo, or a commit that no branch holds and whose change is not found elsewhere (squash-merged, deleted
// branch, rewritten history), is "unknown": it never counts as reverted. Jobs that went bad are queued for a
// regression check (bgz jev regress), but only in a repo folder that still exists.
// The once-a-day session-start entry starts a detached background run with a time budget and a cap on jobs, so
// the hook returns at once; the day stamp is written only after a run that finished.
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { appendJsonl, bgzHome, csv, parseArgs, sanitizeRecord } from './jev.mjs';
import { performancePath } from './grade.mjs';

export const WEIGHTS = { grade: 0.6, outcome: 0.4 };
export const PENALTY = { reverted: 0.5, flagged: 0.3, lesson: 0.2 };
export const WINDOW_DAYS = 7;
export const BACKGROUND_BUDGET_MS = 120000;
export const BACKGROUND_MAX_JOBS = 40;
const r2 = (n) => Math.round(n * 100) / 100;
const DAY = 86400000;
const SELF = fileURLToPath(import.meta.url);

const git = (repo, args, input) => spawnSync('git', ['-C', repo, ...args], { encoding: 'utf8', timeout: 15000, maxBuffer: 32 * 1024 * 1024, ...(input === undefined ? {} : { input }) });

const isRepo = (repo) => {
  try {
    if (!fs.statSync(repo).isDirectory()) return false;
  } catch {
    return false;
  }
  return git(repo, ['rev-parse', '--git-dir']).status === 0;
};

const patchIds = (repo, text) =>
  String(text || '')
    .split('\n')
    .map((l) => l.trim().split(/\s+/))
    .filter((p) => p.length === 2 && /^[0-9a-f]{40}$/i.test(p[0]))
    .map(([id, sha]) => ({ id, sha }));

// The commit's change landed under another id on a branch (cherry-pick, rebase, or a one-commit squash merge).
function landedElsewhere(repo, full, sinceIso) {
  const show = git(repo, ['show', '--no-color', '--format=', full]);
  if (show.status !== 0 || !show.stdout.trim()) return false;
  const mine = patchIds(repo, git(repo, ['patch-id', '--stable'], `commit ${full}\n${show.stdout}`).stdout)[0];
  if (!mine) return false;
  const since = new Date(Date.parse(sinceIso) - DAY).toISOString();
  const log = git(repo, ['log', '--branches', '--remotes', '--no-merges', '--no-color', `--since=${since}`, '-p', '--format=commit %H']);
  if (log.status !== 0) return false;
  return patchIds(repo, git(repo, ['patch-id', '--stable'], log.stdout).stdout).some((p) => p.id === mine.id && p.sha !== full);
}

// { reverted, unknown, why }: reverted only on a real revert commit inside the window; anything git cannot settle is unknown.
export function commitSignals(repo, commits, sinceIso, days = WINDOW_DAYS) {
  const out = { reverted: false, unknown: false };
  const shas = (commits || []).filter((sha) => /^[0-9a-f]{4,40}$/i.test(String(sha)));
  if (!repo || !shas.length) return out;
  if (!isRepo(repo)) return { ...out, unknown: true, why: 'repo-missing' };
  const until = new Date(Date.parse(sinceIso) + days * DAY).toISOString();
  for (const sha of shas) {
    if (git(repo, ['cat-file', '-e', `${sha}^{commit}`]).status !== 0) {
      out.unknown = true; // squash-merged and collected, or history rewritten: git cannot say it was undone
      out.why = 'commit-gone';
      continue;
    }
    const full = git(repo, ['rev-parse', `${sha}^{commit}`]).stdout.trim();
    const rev = git(repo, ['log', '--all', '-F', `--grep=This reverts commit ${full}`, `--since=${sinceIso}`, `--until=${until}`, '--format=%H']);
    if (rev.status === 0 && rev.stdout.trim()) out.reverted = true;
    const on = git(repo, ['branch', '-a', '--contains', full]);
    if (on.status === 0 && !on.stdout.trim() && !landedElsewhere(repo, full, sinceIso)) {
      out.unknown = true; // no branch holds it and its change is not found elsewhere: deleted branch or squash merge
      out.why = out.why || 'not-on-a-branch';
    }
  }
  return out;
}

function filesUnder(dir, exts, depth = 2, acc = []) {
  let entries = [];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return acc;
  }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory() && depth > 0 && e.name !== 'node_modules' && e.name !== '.git') filesUnder(full, exts, depth - 1, acc);
    else if (e.isFile() && exts.test(e.name)) acc.push(full);
  }
  return acc;
}

const needlesOf = (row) => [row.id, ...(row.commits || []).map((c) => c.slice(0, 7)), row.output].filter((n) => n && String(n).length >= 6);

// A review report mentions the job (id, a commit, or its output file) on or beside a line that sounds like a finding.
export function reviewFlag(row, dirs) {
  const needles = needlesOf(row);
  if (!needles.length) return false;
  for (const dir of dirs) {
    for (const file of filesUnder(dir, /\.(?:md|json|txt)$/i)) {
      let text;
      try {
        if (fs.statSync(file).size > 400000) continue;
        text = fs.readFileSync(file, 'utf8');
      } catch {
        continue;
      }
      const lines = text.split(/\r?\n/);
      for (let i = 0; i < lines.length; i++) {
        if (!needles.some((n) => lines[i].includes(n))) continue;
        const near = lines.slice(Math.max(0, i - 1), i + 2).join(' ');
        if (/\b(?:block(?:er|s|ed)?|flag(?:ged)?|finding|fail(?:s|ed|ure)?|wrong|leak|missing|regress)/i.test(near) && !/\b(?:no|zero|none|without)\s+(?:blockers?|findings?|flags?)\b/i.test(near)) return true;
      }
    }
  }
  return false;
}

export function lessonFlag(row, roots) {
  const needles = needlesOf(row);
  if (!needles.length) return false;
  for (const root of roots) {
    let text = '';
    try {
      text = fs.readFileSync(path.join(root, '.bgzflow', 'lessons.jsonl'), 'utf8');
    } catch {
      continue;
    }
    for (const l of text.split('\n')) {
      try {
        const o = JSON.parse(l);
        if (o && o.what && needles.some((n) => `${o.what} ${o.evidence || ''}`.includes(n))) return true;
      } catch {
        // not a lesson line
      }
    }
  }
  return false;
}

export function outcomeFor(row, { now = Date.now(), reviewDirs = [], env = process.env } = {}) {
  const ageDays = (now - Date.parse(row.t)) / DAY;
  const repo = row.repo;
  const sig = commitSignals(repo, row.commits, row.t);
  const dirs = [...reviewDirs, ...(repo ? [path.join(repo, '.bgzflow', 'reviews'), path.join(repo, 'reviews')] : []), path.join(bgzHome(env), 'reviews')];
  const reverted = sig.reverted;
  const flagged = reviewFlag(row, dirs);
  const lesson = lessonFlag(row, repo ? [repo] : []);
  const bad = reverted || flagged || lesson;
  if (!bad && ageDays < WINDOW_DAYS) return { pending: true, ageDays: r2(ageDays) };
  const checked = new Date(now).toISOString();
  const final = ageDays >= WINDOW_DAYS;
  // Nothing bad was seen but git could not settle the commits: no score, so the plain grade stands.
  if (!bad && sig.unknown) return { reverted: false, flagged: false, lesson: false, unknown: true, why: sig.why, checked, final };
  const score = Math.max(0, 1 - (reverted ? PENALTY.reverted : 0) - (flagged ? PENALTY.flagged : 0) - (lesson ? PENALTY.lesson : 0));
  return { reverted, flagged, lesson, ...(sig.unknown ? { unknown: true, why: sig.why } : {}), score: r2(score), checked, final };
}

export const combine = (value, outcome) => r2(WEIGHTS.grade * value + WEIGHTS.outcome * outcome.score);

const repoExists = (repo) => {
  try {
    return fs.statSync(repo).isDirectory();
  } catch {
    return false;
  }
};

// maxJobs and budgetMs bound one run; `cursor` (a job id) starts after that job so a capped run never starves later rows.
export function runOutcomesSync({ env = process.env, now = Date.now(), reviewDirs = [], dry = false, repoFilter, maxJobs = Infinity, budgetMs = Infinity, cursor = null, clock = Date.now } = {}) {
  const file = performancePath(env);
  let text = '';
  try {
    text = fs.readFileSync(file, 'utf8');
  } catch {
    return { ok: true, checked: 0, updated: 0, bad: [], note: 'no grades yet' };
  }
  const started = clock();
  const lines = text.split('\n');
  const rows = lines.map((l) => {
    try {
      return JSON.parse(l);
    } catch {
      return null;
    }
  });
  let todo = rows
    .map((o, i) => i)
    .filter((i) => {
      const o = rows[i];
      if (!o || typeof o.value !== 'number' || !o.t) return false;
      if (o.outcome && o.outcome.final) return false; // settled
      return !(repoFilter && o.repo !== repoFilter);
    });
  if (cursor) {
    const at = todo.findIndex((i) => rows[i].id === cursor);
    if (at >= 0) todo = [...todo.slice(at + 1), ...todo.slice(0, at + 1)];
  }
  let checked = 0;
  let updated = 0;
  let last = null;
  let partial = false;
  const bad = [];
  for (const i of todo) {
    if (checked >= maxJobs || clock() - started > budgetMs) {
      partial = true;
      break;
    }
    const o = rows[i];
    checked += 1;
    last = o.id || null;
    const had = o.outcome && !o.outcome.pending ? o.outcome : null;
    const outcome = outcomeFor(o, { now, reviewDirs, env });
    if (outcome.pending) continue;
    const isBad = outcome.reverted || outcome.flagged || outcome.lesson;
    if (isBad && !(had && (had.reverted || had.flagged || had.lesson))) {
      bad.push({ id: o.id, role: o.role, worker: o.worker, repo: o.repo || null, commits: o.commits || [], outcome: { reverted: outcome.reverted, flagged: outcome.flagged, lesson: outcome.lesson } });
    }
    updated += 1;
    const { combined, ...rest } = o;
    // Every rewritten ledger line goes through sanitizeRecord, so a line written raw by an older version is cleaned too.
    lines[i] = JSON.stringify(sanitizeRecord(typeof outcome.score === 'number' ? { ...rest, outcome, combined: combine(o.value, outcome) } : { ...rest, outcome }));
  }
  if (!dry && updated) {
    // A grade line appended while this run worked is carried over, never lost.
    let tail = '';
    try {
      const nowText = fs.readFileSync(file, 'utf8');
      if (nowText.length > text.length && nowText.startsWith(text)) tail = nowText.slice(text.length);
    } catch {
      // the file went away; write what we have
    }
    const tmp = `${file}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, lines.join('\n') + tail, 'utf8');
    fs.renameSync(tmp, file);
  }
  if (!dry) {
    for (const b of bad) {
      // Never recreate a repo folder that was moved or deleted.
      if (b.repo && repoExists(b.repo)) appendJsonl(path.join(b.repo, '.bgzflow', 'regression-queue.jsonl'), { t: new Date(now).toISOString(), source: 'outcomes', jobId: b.id, commits: b.commits, outcome: b.outcome });
    }
  }
  return { ok: true, checked, updated, bad, dry, ...(partial ? { partial: true, cursor: last } : {}) };
}

const stampPath = (env) => path.join(bgzHome(env), 'outcomes.stamp');
const lockPath = (env) => path.join(bgzHome(env), 'outcomes.lock');
const cursorPath = (env) => path.join(bgzHome(env), 'outcomes-cursor.json');
const lastPath = (env) => path.join(bgzHome(env), 'outcomes-last.json');
// Read by the SessionStart hook (h8): it shows the notice once and deletes it; the spawn guard stops a second start.
const noticePath = (env) => path.join(bgzHome(env), 'outcomes-notice.txt');
const spawnGuardPath = (env) => path.join(bgzHome(env), 'outcomes-spawn.json');
export const badLine = (n) => `BGZFLOW: ${n} graded job${n === 1 ? '' : 's'} got a bad outcome (reverted, review-flagged or became a lesson). Draft regression checks with: bgz jev regress`;
// Adds this run's bad jobs to a notice the hook has not shown yet.
function writeNotice(env, bad) {
  if (!(bad > 0)) return;
  let unseen = 0;
  try {
    unseen = Number((fs.readFileSync(noticePath(env), 'utf8').match(/^BGZFLOW: (\d+) /) || [])[1]) || 0;
  } catch {
    // no earlier notice
  }
  fs.writeFileSync(noticePath(env), `${badLine(unseen + bad)}\n`, 'utf8');
}
const dayOf = (now) => new Date(now).toISOString().slice(0, 10);

const readJson = (file) => {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
};
const writeJson = (file, value) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(value), 'utf8');
  fs.renameSync(tmp, file);
};

const stampToday = (env, now) => {
  try {
    return fs.readFileSync(stampPath(env), 'utf8').trim() === dayOf(now);
  } catch {
    return false;
  }
};

const lockHeld = (env, budgetMs, wall = Date.now()) => {
  const lock = readJson(lockPath(env));
  return Boolean(lock && Number.isFinite(lock.at) && wall - lock.at < budgetMs + 60000);
};

// One bounded run. Writes the day stamp only when every due job was checked; a capped run leaves a cursor for the next.
export function runOutcomesBackground({ env = process.env, now = Date.now(), budgetMs = BACKGROUND_BUDGET_MS, maxJobs = BACKGROUND_MAX_JOBS, reviewDirs = [], clock = Date.now } = {}) {
  if (lockHeld(env, budgetMs, clock())) return { ok: true, skipped: 'running' };
  try {
    writeJson(lockPath(env), { pid: process.pid, at: clock() });
  } catch {
    return { ok: false, err: 'nolock' };
  }
  try {
    const cur = readJson(cursorPath(env));
    const r = runOutcomesSync({ env, now, reviewDirs, maxJobs, budgetMs, cursor: cur && cur.id, clock });
    const prev = readJson(lastPath(env));
    const carried = prev && !prev.reported ? prev.bad || 0 : 0;
    writeJson(lastPath(env), { t: new Date(now).toISOString(), bad: carried + r.bad.length, reported: false, partial: Boolean(r.partial) });
    if (r.partial) writeJson(cursorPath(env), { id: r.cursor });
    else {
      fs.rmSync(cursorPath(env), { force: true });
      fs.writeFileSync(stampPath(env), dayOf(now), 'utf8');
    }
    writeNotice(env, r.bad.length);
    fs.rmSync(spawnGuardPath(env), { force: true });
    return { ...r, background: true };
  } finally {
    fs.rmSync(lockPath(env), { force: true });
  }
}

const numberFlag = (v, fallback) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : fallback);

export async function runOutcomes({ flags, env }) {
  const reviewDirs = csv(flags.reviews);
  if (flags.background) return runOutcomesBackground({ env, reviewDirs, budgetMs: numberFlag(flags['budget-ms'], BACKGROUND_BUDGET_MS), maxJobs: numberFlag(flags['max-jobs'], BACKGROUND_MAX_JOBS) });
  return runOutcomesSync({
    env,
    dry: Boolean(flags.dry),
    reviewDirs,
    repoFilter: typeof flags.repo === 'string' ? path.resolve(flags.repo) : undefined,
    maxJobs: numberFlag(flags['max-jobs'], Infinity),
    budgetMs: numberFlag(flags['budget-ms'], Infinity),
  });
}

// Starts the bounded run as a detached child that outlives the session-start hook. The child gets no Jev key.
export function startDetached(env = process.env) {
  const childEnv = { ...env };
  delete childEnv.TYPESAFE_API_KEY;
  delete childEnv.FAST_JEV_KEY_FILE;
  const child = spawn(process.execPath, [SELF, '--background=1'], { detached: true, stdio: 'ignore', env: childEnv, cwd: bgzHome(env) }); // No windowsHide (av-safe rule).
  child.on('error', () => {});
  child.unref();
}

// The once-a-day SessionStart entry. Returns at once: it starts the bounded run when one is due (default: detached),
// then reports, once, the bad outcomes a finished run found. Returns '' when there is nothing new.
export function dailyOutcomes({ env = process.env, now = Date.now(), run } = {}) {
  try {
    if (!stampToday(env, now) && !lockHeld(env, BACKGROUND_BUDGET_MS)) {
      fs.mkdirSync(bgzHome(env), { recursive: true });
      if (run) run({ env, now });
      else startDetached(env);
    }
    const last = readJson(lastPath(env));
    if (!last || last.reported || !(last.bad > 0)) return '';
    writeJson(lastPath(env), { ...last, reported: true });
    return badLine(last.bad);
  } catch {
    return '';
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === SELF) {
  const { flags } = parseArgs(process.argv.slice(2));
  try {
    const r = await runOutcomes({ flags, env: process.env });
    if (!flags.background) console.log(JSON.stringify(r, null, 2));
  } catch {
    process.exitCode = 1;
  }
}
