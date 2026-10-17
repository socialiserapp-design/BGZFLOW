// Jev judges performance: `bgz jev grade` scores one finished job; `bgz jev league` averages the scores per role and worker.
//   bgz jev grade <job-output-file> --brief <brief.md> --role <role> --worker <model/tool> [--cost-usd N]
//   bgz jev league [--json] [--since ISO]
// The rubric uses described situations; the weights live here. Each grade is one line in ~/.bgzflow/performance.jsonl
// (no file content). Leads use the league to reorder the STATUS fallbacks; a grade is a lead, not a verdict.
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { appendJsonl, askDetailed, bgzHome, csv, readTextArg, safeText, sanitize, score, scoreOf } from './jev.mjs';
import { refuseSecret } from './secret-paths.mjs';

export const WEIGHTS = { checks: 0.35, scope: 0.25, proof: 0.25, cost: 0.15 };
export const RUBRIC = {
  checks: score('Did the finished output meet the checks listed in the brief, with evidence shown for each?', [
    'most checks are not met or not mentioned',
    'some checks met, the rest unclear',
    'every check met, evidence for only some',
    'every check met, each with evidence',
  ]),
  scope: score('Did the worker stay inside the brief (goal, inputs, limits) without adding things nobody asked for?', [
    'broke a limit or added a lot nobody asked for',
    'added a few unrequested things',
    'kept to the brief with a small extra',
    'kept exactly to the brief and its limits',
  ]),
  proof: score('Are the claims in the output backed by proof (test results, command output, numbers) rather than assertion?', [
    'claims with no proof',
    'a few claims backed, many not',
    'most claims backed by proof',
    'every claim backed, with limits stated honestly',
  ]),
  cost: score('For the work shown and the stated cost, was the effort proportionate (no waste, no padding, no needless retries)?', [
    'very wasteful for what was done',
    'noticeably more than needed',
    'reasonable',
    'lean: no more than the job needed',
  ]),
};

// A grade line's score once real outcomes are known (bgz jev outcomes), else the grade itself.
export const effective = (row) => (Number.isFinite(row.combined) ? row.combined : row.value);
export const performancePath = (env = process.env) => path.join(bgzHome(env), 'performance.jsonl');
const r2 = (n) => Math.round(n * 100) / 100;

// Steps the worker took, read from its report: numbered or bulleted lines under a heading that names steps, workflow or
// what was done. At most 8 short lines, secrets masked. An explicit --steps "a;b;c" wins.
export function extractSteps(output, explicit) {
  const clean = (s) => sanitize(String(s)).replace(/[`*_]/g, '').replace(/\s+/g, ' ').trim().slice(0, 120);
  if (typeof explicit === 'string' && explicit.trim()) return explicit.split(';').map(clean).filter(Boolean).slice(0, 8);
  const steps = [];
  let inside = false;
  for (const line of String(output).split(/\r?\n/)) {
    if (/^#{1,4}\s/.test(line) || /^\*\*[^*]+\*\*:?\s*$/.test(line)) inside = /step|workflow|what (?:i|was) (?:did|done)|how (?:i|it)|approach|process/i.test(line);
    else if (inside && /^\s*(?:\d+[.)]|[-*])\s+\S/.test(line)) steps.push(clean(line.replace(/^\s*(?:\d+[.)]|[-*])\s+/, '')));
    if (steps.length >= 8) break;
  }
  return steps.filter(Boolean);
}

export function composite(parts, usedIds) {
  const total = usedIds.reduce((n, id) => n + WEIGHTS[id] * parts[id].norm, 0);
  const w = usedIds.reduce((n, id) => n + WEIGHTS[id], 0) || 1;
  return r2(total / w);
}

export async function runGrade({ flags, rest, timeoutMs, env }) {
  const outFile = rest[0];
  if (!outFile || typeof flags.brief !== 'string' || typeof flags.role !== 'string' || typeof flags.worker !== 'string') {
    throw new Error('usage: bgz jev grade <job-output-file> --brief <brief.md> --role <role> --worker <model/tool> [--cost-usd N] [--job-type <type>] [--skills a,b] [--steps "a;b;c"] [--repo <dir> --commits sha,sha]');
  }
  refuseSecret(outFile);
  refuseSecret(flags.brief);
  const output = readTextArg(`@${path.resolve(outFile)}`, 60000);
  const brief = readTextArg(`@${path.resolve(flags.brief)}`, 20000);
  if (!output.trim()) throw new Error(`cannot read ${outFile}`);
  const cost = flags['cost-usd'] !== undefined ? Number(flags['cost-usd']) : null;
  const costKnown = Number.isFinite(cost);
  const ids = costKnown ? Object.keys(RUBRIC) : Object.keys(RUBRIC).filter((id) => id !== 'cost');
  const questions = Object.fromEntries(ids.map((id) => [id, RUBRIC[id]]));
  // The worker output goes through the full sanitize before it is cut to size and sent.
  const state = { brief: safeText(sanitize(brief), 8000), output: safeText(sanitize(output), 24000), ...(costKnown ? { cost_usd: cost, output_chars: output.length } : {}) };
  const r = await askDetailed({ caller: 'jev-grade', state, questions, timeoutMs: timeoutMs < 8000 ? 8000 : timeoutMs, env });
  if (!r.ok) return { ok: false, err: r.err };
  const parts = {};
  for (const id of ids) {
    const s = scoreOf(r, id, RUBRIC[id].criteria);
    parts[id] = { score: r2(s.score), norm: r2(s.norm), confidence: r2(s.confidence) };
  }
  const value = composite(parts, ids);
  const now = new Date().toISOString();
  const line = {
    id: createHash('sha1').update(`${now}|${flags.worker}|${outFile}`).digest('hex').slice(0, 10),
    t: now,
    role: flags.role.toLowerCase().slice(0, 60),
    worker: flags.worker.slice(0, 80),
    value,
    parts: Object.fromEntries(ids.map((id) => [id, parts[id].norm])),
    brief: path.basename(String(flags.brief)),
    // The full path lets `bgz jev bench seed` turn a kept brief into a bench card.
    briefPath: path.resolve(String(flags.brief)),
    output: path.basename(outFile),
    ...(costKnown ? { cost_usd: cost } : {}),
    jobType: typeof flags['job-type'] === 'string' ? flags['job-type'].toLowerCase().slice(0, 60) : null,
    skills: csv(flags.skills).map((s) => s.slice(0, 80)).slice(0, 40).sort(),
    steps: extractSteps(output, flags.steps),
    ...(typeof flags.repo === 'string' ? { repo: path.resolve(flags.repo) } : {}),
    ...(flags.commits ? { commits: csv(flags.commits).map((c) => c.slice(0, 40)).slice(0, 20) } : {}),
  };
  appendJsonl(performancePath(env), line);
  return { ok: true, id: line.id, value, role: line.role, worker: line.worker, parts, weights: WEIGHTS, logged: true, ms: r.ms, cost_usd: r.cost };
}

export function readGrades(env = process.env, since) {
  let text = '';
  try {
    text = fs.readFileSync(performancePath(env), 'utf8');
  } catch {
    return [];
  }
  const rows = [];
  for (const l of text.split('\n')) {
    try {
      const o = JSON.parse(l);
      if (o && typeof o.value !== 'number' && typeof o.total === 'number') o.value = o.total;
      if (o && typeof o.value === 'number' && o.role && o.worker && (!since || !o.t || o.t >= since)) rows.push(o);
    } catch {
      // skip a bad line
    }
  }
  return rows;
}

export function league(rows) {
  const groups = new Map();
  for (const r of rows) {
    const key = `${r.role}\u0000${r.worker}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(r);
  }
  const out = [...groups.entries()].map(([key, g]) => {
    const [role, worker] = key.split('\u0000');
    const avg = (f) => r2(g.reduce((n, x) => n + f(x), 0) / g.length);
    const costed = g.filter((x) => Number.isFinite(x.cost_usd));
    const average = avg(effective);
    return { role, worker, jobs: g.length, average, leagueScore: average, ...(costed.length ? { avg_cost_usd: r2(costed.reduce((n, x) => n + x.cost_usd, 0) / costed.length) } : {}) };
  });
  out.sort((a, b) => a.role.localeCompare(b.role) || b.average - a.average);
  return out;
}

export function runLeague({ flags, env }) {
  const rows = league(readGrades(env, typeof flags.since === 'string' ? flags.since : undefined));
  if (flags.json) {
    console.log(JSON.stringify(rows, null, 2));
    return;
  }
  if (!rows.length) {
    console.log('No grades yet. Run: bgz jev grade <job-output-file> --brief <brief.md> --role <role> --worker <model/tool>');
    return;
  }
  let role = '';
  for (const r of rows) {
    if (r.role !== role) {
      role = r.role;
      console.log(`\n${role}`);
    }
    console.log(`  ${r.worker.padEnd(28)} ${r.average.toFixed(2)}  (${r.jobs} job${r.jobs === 1 ? '' : 's'}${r.avg_cost_usd !== undefined ? `, avg $${r.avg_cost_usd}` : ''})`);
  }
  console.log('\nBest first within each role. Few jobs means a weak signal; use it to reorder STATUS fallbacks, not as a verdict.');
}
