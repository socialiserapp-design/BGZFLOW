// Every failure becomes a test. `bgz lessons add` and `bgz jev outcomes` queue a failure in <project>/.bgzflow/regression-queue.jsonl;
// `bgz jev regress` drafts one regression check per queued item, with a model other than the one that failed.
//   bgz jev regress [--repo <dir>] [--worker <model/tool that failed>] [--bad <ref> --fix <ref>] [--list] [--brief <brief.md>]
// A code check goes into tests/regressions/<slug>.test.mjs only when it is verified: it fails on the bad ref and passes
// on the fix. Until then it is a draft in .bgzflow/regression-drafts/, where the project's suite never runs it.
// Everything else gets checks/<slug>.md. When nothing can be drafted, a `needs-test` line goes to the lessons notes
// (.bgzflow/lessons-notes.md). The drafter is from a different vendor than the worker that failed (--worker, or the
// worker the queue item names); with no known worker the item is deferred to a needs-test note. --dry runs nothing.
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { safeText, sanitize, sanitizeRecord } from './jev.mjs';
import { pickDrafterDetailed } from './drafter.mjs';

export const queueFile = (repo) => path.join(repo, '.bgzflow', 'regression-queue.jsonl');
export const doneFile = (repo) => path.join(repo, '.bgzflow', 'regressions.jsonl');
export const notesFile = (repo) => path.join(repo, '.bgzflow', 'lessons-notes.md');
export const draftsDir = (repo) => path.join(repo, '.bgzflow', 'regression-drafts');

const readLines = (file) => {
  try {
    return fs.readFileSync(file, 'utf8').split('\n').map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
  } catch {
    return [];
  }
};
// File names never carry a word that mixes letters and digits and is 8+ long (a bare password or key the
// sanitizer cannot recognise without context); the rest of the slug stays readable.
const slugOf = (s) => String(s).replace(/(?=[^\s]*\d)(?=[^\s]*[A-Za-z])[^\s]{8,}/g, ' ').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || 'failure';
export const itemId = (item) => item.id || createHash('sha1').update(`${item.source}|${item.what || ''}|${item.jobId || ''}|${(item.commits || []).join(',')}`).digest('hex').slice(0, 10);

export function pending(repo) {
  const done = new Set(readLines(doneFile(repo)).map((d) => d.id));
  return readLines(queueFile(repo)).map((q) => ({ ...q, id: itemId(q) })).filter((q) => !done.has(q.id));
}

export function isCodeProject(repo) {
  return ['package.json', 'pyproject.toml', 'Cargo.toml', 'go.mod'].some((f) => fs.existsSync(path.join(repo, f)));
}

export function draftPrompt({ item, code, repo }) {
  const what = safeText(sanitize(item.what || `job ${item.jobId} was reverted, review-flagged or became a lesson`), 1500);
  const evidence = item.evidence ? `\nEvidence: ${safeText(sanitize(item.evidence), 1500)}` : '';
  const commits = item.commits && item.commits.length ? `\nCommits involved: ${sanitize(item.commits.join(', '))}` : '';
  if (code) {
    return [
      'Write ONE regression test as a single Node 20 ES module using node:test and node:assert/strict. No dependencies.',
      'It must FAIL on the bad version of the code and PASS once the failure is fixed. Test the behaviour, not the wording.',
      `Failure: ${what}${evidence}${commits}`,
      `Project folder (the test runs with this as the working directory): ${path.basename(repo)}`,
      'Reply with only the test file content, no explanation, no code fences.',
    ].join('\n');
  }
  return [
    'Write ONE short regression check in plain English as a markdown checklist (3 to 6 lines, each line a yes/no thing a reviewer can verify with evidence).',
    'A reviewer using it must catch this failure if it happens again.',
    `Failure: ${what}${evidence}${commits}`,
    'Reply with only the checklist.',
  ].join('\n');
}

const stripFences = (t) => String(t).replace(/^```[a-z]*\n?/i, '').replace(/\n?```\s*$/i, '').trim();

// Runs a test file against a ref in a throwaway worktree. Returns true (passes), false (fails) or null (cannot tell).
export function runAtRef(repo, ref, testRel, testText) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bgz-reg-'));
  try {
    const add = spawnSync('git', ['-C', repo, 'worktree', 'add', '--detach', dir, ref], { encoding: 'utf8' });
    if (add.status !== 0) return null;
    const target = path.join(dir, testRel);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, testText, 'utf8');
    const r = spawnSync(process.execPath, ['--test', target], { cwd: dir, encoding: 'utf8', timeout: 120000 });
    return r.status === 0;
  } catch {
    return null;
  } finally {
    spawnSync('git', ['-C', repo, 'worktree', 'remove', '--force', dir], {});
    try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* temp folder */ }
  }
}

export function noteNeedsTest(repo, item, why) {
  try {
    fs.mkdirSync(path.dirname(notesFile(repo)), { recursive: true });
    fs.appendFileSync(notesFile(repo), `- needs-test ${new Date().toISOString().slice(0, 10)}: ${sanitize(String(item.what || item.jobId || item.id)).slice(0, 160)} (${why})\n`, 'utf8');
  } catch { /* notes are best-effort */ }
}

// One item. `drafter` has run(prompt) -> {ok,text}. `runner(ref, rel, text)` -> true|false|null (injectable for tests).
export function draftOne({ repo, item, drafter, bad, fix, runner = (ref, rel, text) => runAtRef(repo, ref, rel, text) }) {
  const code = isCodeProject(repo);
  // The slug is built from sanitized text: file names must not carry emails, phones, passwords or keys.
  const slug = `${slugOf(sanitize(String(item.key || item.what || item.jobId)))}-${item.id.slice(0, 6)}`;
  const rel = code ? path.join('tests', 'regressions', `${slug}.test.mjs`) : path.join('checks', `${slug}.md`);
  if (!drafter) {
    noteNeedsTest(repo, item, 'no second model available to draft it');
    return { id: item.id, status: 'needs-test', why: 'no drafter' };
  }
  const r = drafter.run(draftPrompt({ item, code, repo }));
  // The draft is sanitized before it is run or written, so the file on disk is exactly what was verified.
  const text = r.ok ? sanitize(stripFences(r.text)) : '';
  if (!text || text.length < 20 || (code && !/node:test|\btest\(/.test(text))) {
    noteNeedsTest(repo, item, r.ok ? 'draft was empty or not a test' : `drafter failed: ${r.err}`);
    return { id: item.id, status: 'needs-test', why: r.ok ? 'unusable draft' : r.err };
  }
  let status = 'draft';
  if (code && bad && fix) {
    const onBad = runner(bad, rel, text);
    const onFix = runner(fix, rel, text);
    if (onBad === false && onFix === true) status = 'verified';
    else if (onBad === null || onFix === null) status = 'draft-unverified';
    else {
      noteNeedsTest(repo, item, `draft did not fail on the bad version and pass on the fix (bad=${onBad}, fix=${onFix})`);
      return { id: item.id, status: 'needs-test', why: 'draft failed verification', drafter: drafter.name };
    }
  }
  // Only a verified test enters tests/; an unverified one waits in .bgzflow/regression-drafts/ so the suite stays green.
  const keepRel = code && status !== 'verified' ? path.relative(repo, path.join(draftsDir(repo), `${slug}.test.mjs`)) : rel;
  writeAtomic(path.join(repo, keepRel), `${text}\n`);
  return { id: item.id, status, file: keepRel.split(path.sep).join('/'), drafter: drafter.name };
}

function writeAtomic(target, text) {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const tmp = `${target}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, text, 'utf8');
  fs.renameSync(tmp, target);
}

function appendDone(repo, res) {
  fs.mkdirSync(path.dirname(doneFile(repo)), { recursive: true });
  fs.appendFileSync(doneFile(repo), `${JSON.stringify(sanitizeRecord({ ...res, t: new Date().toISOString() }))}\n`, 'utf8');
}

const workerOf = (worker, item) => String(worker || item.worker || '').trim();
const UNKNOWN_WORKER = 'the failing worker is not known, so a drafter from another vendor cannot be chosen';

export function runRegressSync({ repo, worker = '', bad, fix, drafter, env = process.env, runner } = {}) {
  const items = pending(repo);
  const results = [];
  for (const item of items) {
    let d = drafter;
    if (d === undefined) {
      const w = workerOf(worker, item);
      const pick = w ? pickDrafterDetailed({ exclude: w, env }) : { drafter: null, why: UNKNOWN_WORKER };
      d = pick.drafter;
      if (!d) {
        noteNeedsTest(repo, item, `deferred: ${pick.why}`);
        const res = { id: item.id, status: 'needs-test', why: 'deferred', worker: w || null };
        results.push(res);
        appendDone(repo, res);
        continue;
      }
    }
    const res = draftOne({ repo, item, drafter: d, bad, fix, runner });
    results.push(res);
    appendDone(repo, res);
  }
  return { ok: true, repo, drafted: results.filter((r) => r.file).length, needsTest: results.filter((r) => r.status === 'needs-test').length, results };
}

// The checks that belong in the next brief for this project.
export function regressionList(repo) {
  return readLines(doneFile(repo)).filter((d) => d.file);
}

export function regressionsSection(repo) {
  const rows = regressionList(repo);
  const lines = ['## Regression checks', '', 'Drafted from past failures. The lead adds these to the suite; each must keep passing.', ''];
  if (!rows.length) lines.push('- none yet');
  for (const r of rows) lines.push(`- ${r.file} (${r.status})`);
  return lines.join('\n');
}

// Puts the section in place of an old one (or at the end). Running it again with the same section changes nothing.
export function regressionSectionText(text, section) {
  const at = text.search(/(?:^|\n)## Regression checks[ \t]*(?:\r?\n|$)/);
  if (at < 0) return `${text.trimEnd()}\n\n${section.trimEnd()}\n`;
  const head = text.slice(0, at).trimEnd();
  const from = text.slice(at).replace(/^\n/, '');
  const next = from.slice(1).search(/\n## /);
  const tail = next < 0 ? '' : from.slice(next + 1);
  return `${head ? `${head}\n\n` : ''}${section.trimEnd()}\n${tail}`;
}

export function writeRegressionSection(briefPath, section) {
  const text = fs.readFileSync(briefPath, 'utf8');
  const next = regressionSectionText(text, section);
  if (next !== text) writeAtomic(briefPath, next);
}

export async function runRegress({ flags, env }) {
  const repo = path.resolve(typeof flags.repo === 'string' ? flags.repo : process.cwd());
  if (flags.list) return { ok: true, repo, checks: regressionList(repo), pending: pending(repo).length };
  const worker = typeof flags.worker === 'string' ? flags.worker : '';
  if (flags.dry) {
    // Says what would happen; runs no drafter and writes no file.
    const items = pending(repo).map((item) => {
      const w = workerOf(worker, item);
      const pick = w ? pickDrafterDetailed({ exclude: w, env }) : { drafter: null, why: UNKNOWN_WORKER };
      return { id: item.id, worker: w || null, drafter: pick.drafter ? pick.drafter.name : null, ...(pick.why ? { why: pick.why } : {}) };
    });
    return { ok: true, dry: true, repo, pending: items.length, items };
  }
  const out = runRegressSync({ repo, worker, bad: flags.bad, fix: flags.fix, env });
  if (typeof flags.brief === 'string') writeRegressionSection(path.resolve(flags.brief), regressionsSection(repo));
  return out;
}
