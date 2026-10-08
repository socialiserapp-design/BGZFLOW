// skill-gate logic: read `claude plugin eval` results for one skill, compare candidate, previous and no-plugin
// runs, and stage plugin copies for a live run. Everything except runEval() works offline on saved files.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

export const TRIGGER_PREFIX = 'trigger-';
const EPS = 1e-9;
// Plan or rate limits make runs end early and score 0, which looks like a regression but is not one.
const LIMIT_ERROR = /usage limit|rate limit|rate-limit|quota|overloaded/i;

const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const num = (x) => (typeof x === 'number' && Number.isFinite(x) ? x : null);

// Output tokens of one run. The documented result schema does not name a usage field yet (unverified), so
// accept the shapes a run record is likely to carry and report "not in results" when none is present.
export function runOutputTokens(run) {
  if (!run || typeof run !== 'object') return null;
  const u = run.usage || run.tokenUsage || run.tokens || {};
  return num(u.output_tokens) ?? num(u.outputTokens) ?? num(u.output) ?? num(run.outputTokens) ?? num(run.output_tokens);
}

function armSummary(runs) {
  const list = Array.isArray(runs) ? runs : [];
  const scores = list.map((r) => num(r?.score)).filter((x) => x !== null);
  const tokens = list.map(runOutputTokens).filter((x) => x !== null);
  const errors = list.map((r) => r?.error).filter((e) => e !== null && e !== undefined && e !== '');
  return { runs: list.length, score: mean(scores), outputTokens: mean(tokens), errors: errors.map(String) };
}

// Parse one aggregate-result.json (schemaVersion 1) into { partial, partialReason, cases: Map }.
export function parseResult(doc, source = 'result') {
  if (!doc || typeof doc !== 'object' || !Array.isArray(doc.cases)) {
    throw new Error(`${source}: not a claude plugin eval result (no cases[])`);
  }
  if (doc.schemaVersion !== undefined && doc.schemaVersion !== 1) {
    throw new Error(`${source}: unsupported schemaVersion ${doc.schemaVersion} (expected 1)`);
  }
  const cases = new Map();
  for (const c of doc.cases) {
    if (!c || typeof c.name !== 'string') continue;
    const withArm = armSummary(c.arms?.with);
    const withoutArm = armSummary(c.arms?.without);
    const score = num(c.aggregates?.score) ?? withArm.score;
    const delta = num(c.aggregates?.delta);
    let without = withoutArm.score;
    if (without === null && delta !== null && score !== null) without = score - delta;
    cases.set(c.name, {
      name: c.name,
      trigger: c.name.startsWith(TRIGGER_PREFIX),
      score,
      without,
      outputTokens: withArm.outputTokens,
      withoutOutputTokens: withoutArm.outputTokens,
      errors: [...withArm.errors, ...withoutArm.errors],
      skippedPaidGraders: (c.arms?.with || []).some((r) => r?.skippedPaidGraders === true),
    });
  }
  return { source, partial: doc.partial === true, partialReason: doc.partialReason || null, cases };
}

export function loadResult(file) {
  let doc;
  try {
    doc = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    throw new Error(`${file}: cannot read result (${e.message})`);
  }
  return parseResult(doc, file);
}

const pct = (x) => (x === null ? 'n/a' : `${Math.round(x * 100)}%`);
const fmt = (x) => (x === null ? 'n/a' : Math.round(x).toLocaleString('en-US'));

// Compare three sides for one skill. `none` defaults to the candidate's no-plugin arm, then the previous one's.
export function compare({ skill, candidate, previous, none = null, threshold = 1 }) {
  const reasons = [];
  const warnings = [];
  const passes = (s) => s !== null && s + EPS >= threshold;

  for (const [label, r] of [['candidate', candidate], ['previous', previous], ['none', none]]) {
    if (!r) continue;
    if (r.partial) reasons.push(`${label} run did not finish (${r.partialReason || 'partial'}); rerun it`);
    for (const c of r.cases.values()) {
      if (c.errors.some((e) => LIMIT_ERROR.test(e))) {
        reasons.push(`${label} case ${c.name} hit a usage or rate limit; rerun after the limit resets`);
      }
      if (c.skippedPaidGraders) reasons.push(`${label} case ${c.name} skipped judge graders (cost ceiling); not comparable`);
    }
  }

  const names = [...candidate.cases.keys()];
  if (!names.length) reasons.push('candidate result has no cases');
  const missing = names.filter((n) => !previous.cases.has(n));
  if (missing.length) reasons.push(`previous run is missing ${missing.length} case(s): ${missing.join(', ')}; run the same cases on both sides`);

  const baselineOf = (n) => {
    for (const r of [none, candidate, previous]) {
      if (!r) continue;
      const c = r.cases.get(n);
      if (!c) continue;
      if (r === none && c.without === null && c.score !== null) return c.score;
      if (c.without !== null) return c.without;
    }
    return null;
  };

  const rows = names.map((n) => {
    const c = candidate.cases.get(n);
    const p = previous.cases.get(n) || null;
    return {
      name: n,
      trigger: c.trigger,
      candidate: c.score,
      previous: p ? p.score : null,
      none: baselineOf(n),
      candidatePass: passes(c.score),
      previousPass: p ? passes(p.score) : null,
      candidateOutputTokens: c.outputTokens,
      previousOutputTokens: p ? p.outputTokens : null,
      noneOutputTokens: c.withoutOutputTokens ?? (p ? p.withoutOutputTokens : null),
    };
  });

  const compared = rows.filter((r) => r.previous !== null);
  const rate = (key) => (compared.length ? compared.filter((r) => r[key]).length / compared.length : null);
  const candidateRate = rate('candidatePass');
  const previousRate = rate('previousPass');
  if (candidateRate !== null && previousRate !== null && candidateRate + EPS < previousRate) {
    reasons.push(`candidate pass rate ${pct(candidateRate)} is below the previous version's ${pct(previousRate)}`);
  }

  for (const r of rows.filter((x) => x.trigger)) {
    if (r.none === null) reasons.push(`trigger case ${r.name} has no no-plugin score; run with the baseline arm on`);
    else if (r.candidate === null || r.candidate + EPS < r.none) {
      reasons.push(`trigger case ${r.name}: candidate ${r.candidate ?? 'n/a'} is worse than no plugin ${r.none}`);
    }
    if (r.previous !== null && r.candidate !== null && r.candidate + EPS < r.previous) {
      warnings.push(`trigger case ${r.name} fires less reliably than the previous version (${r.candidate} vs ${r.previous})`);
    }
  }
  for (const r of compared.filter((x) => x.previousPass && !x.candidatePass && !x.trigger)) {
    warnings.push(`case ${r.name} passed on the previous version and fails on the candidate`);
  }

  const tokenTotal = (key) => {
    const xs = rows.map((r) => r[key]).filter((x) => x !== null);
    return xs.length === rows.length && xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
  };
  const tokens = {
    candidatePerCase: tokenTotal('candidateOutputTokens'),
    previousPerCase: tokenTotal('previousOutputTokens'),
    nonePerCase: tokenTotal('noneOutputTokens'),
  };

  const pass = reasons.length === 0;
  const passedCount = (key) => compared.filter((r) => r[key]).length;
  const lines = [
    `${pass ? 'PASS' : 'FAIL'} ${skill}: candidate passed ${passedCount('candidatePass')}/${compared.length} cases (${pct(candidateRate)}), previous ${passedCount('previousPass')}/${compared.length} (${pct(previousRate)}).`,
  ];
  for (const r of reasons) lines.push(`  blocks: ${r}`);
  for (const w of warnings) lines.push(`  note: ${w}`);
  if (tokens.candidatePerCase !== null && tokens.previousPerCase !== null) {
    const change = tokens.previousPerCase ? (tokens.candidatePerCase - tokens.previousPerCase) / tokens.previousPerCase : null;
    lines.push(
      `  output tokens per case: candidate ${fmt(tokens.candidatePerCase)}, previous ${fmt(tokens.previousPerCase)}` +
        (change === null ? '' : ` (${change <= 0 ? '' : '+'}${Math.round(change * 100)}%)`) +
        (tokens.nonePerCase !== null ? `, no plugin ${fmt(tokens.nonePerCase)}` : '') + '.',
    );
  } else {
    lines.push('  output tokens: not in these results.');
  }

  return {
    skill,
    verdict: pass ? 'pass' : 'fail',
    threshold,
    passRate: { candidate: candidateRate, previous: previousRate },
    reasons,
    warnings,
    tokens,
    sources: { candidate: candidate.source, previous: previous.source, none: none ? none.source : null },
    cases: rows,
    summary: lines.join('\n'),
  };
}

// ---- live run support -------------------------------------------------------------------------------

const COPY_SKIP = new Set(['.git', 'node_modules', '.tmp', '.bgzflow', '.notes-map', '.codegraph', '__pycache__', 'evals']);

export function listSkillsWithEvals(root) {
  const dir = path.join(root, 'skills');
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && fs.existsSync(path.join(dir, e.name, 'evals')))
    .map((e) => e.name)
    .sort();
}

// Copy a plugin tree to dest, leaving out VCS, caches and every evals folder, then put the candidate's cases for
// one skill at dest/evals. `claude plugin eval` refuses an eval dir inside skills/, and a run must not be able to
// read its own cases, so the cases never stay under skills/ in the staged copy.
export function stagePlugin({ sourceRoot, casesDir, dest }) {
  if (!fs.existsSync(path.join(casesDir))) throw new Error(`no eval cases at ${casesDir}`);
  fs.rmSync(dest, { recursive: true, force: true });
  fs.cpSync(sourceRoot, dest, {
    recursive: true,
    filter: (src) => !COPY_SKIP.has(path.basename(src)) || path.resolve(src) === path.resolve(sourceRoot),
  });
  fs.cpSync(casesDir, path.join(dest, 'evals'), { recursive: true, filter: (src) => path.basename(src) !== 'results' });
  return dest;
}

// Materialise the previous version: an existing folder is used as is; anything else is a git ref of repoRoot.
export function materialisePrevious({ previous, repoRoot, workDir }) {
  if (fs.existsSync(previous) && fs.statSync(previous).isDirectory()) return path.resolve(previous);
  const out = path.join(workDir, 'previous-src');
  fs.rmSync(out, { recursive: true, force: true });
  fs.mkdirSync(out, { recursive: true });
  // Check the ref's files out through a throwaway index, so the repository's own index, HEAD and worktrees are
  // never touched and no archive tool is needed.
  const env = { ...process.env, GIT_INDEX_FILE: path.join(workDir, 'previous.index') };
  const git = (...a) => spawnSync('git', ['-C', repoRoot, ...a], { encoding: 'utf8', env });
  const v = git('rev-parse', '--verify', '--quiet', `${previous}^{tree}`);
  if (v.status !== 0) throw new Error(`previous "${previous}" is neither a folder nor a git ref of ${repoRoot}`);
  for (const step of [['read-tree', v.stdout.trim()], [`--work-tree=${out}`, 'checkout-index', '--all', '--force']]) {
    const r = git(...step);
    if (r.status !== 0) throw new Error(`could not check out ${previous}: ${(r.stderr || '').trim()}`);
  }
  fs.rmSync(env.GIT_INDEX_FILE, { force: true });
  return out;
}

const quoteForShell = (a) => (/[\s"&|<>^()%!]/.test(a) ? `"${a.replace(/"/g, '""')}"` : a);

// Build the `claude plugin eval` arguments for one staged side. The target comes first and list-taking flags
// last, as the command's help requires.
export function evalArgs({ target, jsonFile, outputDir, runs, threshold, model, judgeModel, maxCostUsd, concurrency, scaffold = true, allowTools = ['Write', 'Edit'] }) {
  const args = ['plugin', 'eval', target, '--eval-dir', 'evals', '--json', jsonFile, '--output-dir', outputDir,
    '--report', path.join(outputDir, 'report.html'), '--no-publish', '--trust-plugin', '--ablation', 'with-without'];
  if (scaffold) args.push('--scaffold');
  if (runs) args.push('--runs', String(runs));
  if (threshold !== undefined && threshold !== null) args.push('--threshold', String(threshold));
  if (model) args.push('--model', model);
  if (judgeModel) args.push('--judge-model', judgeModel);
  if (maxCostUsd) args.push('--max-cost-usd', String(maxCostUsd));
  if (concurrency) args.push('-j', String(concurrency));
  if (allowTools && allowTools.length) args.push('--allow-tools', ...allowTools);
  return args;
}

// Run `claude plugin eval` for one side. BGZFLOW_CLAUDE_BIN may name another binary, or a .mjs/.js file that is
// run with this Node (used by the tests). Exit 1 only means a case fell below the threshold, so success is
// judged by whether the JSON result was written.
export function runEval(args, { jsonFile, env = process.env, log = () => {} } = {}) {
  const bin = env.BGZFLOW_CLAUDE_BIN || 'claude';
  let r;
  if (/\.(?:m?js|cjs)$/.test(bin)) r = spawnSync(process.execPath, [bin, ...args], { encoding: 'utf8', env, stdio: ['ignore', 'pipe', 'pipe'] });
  else if (process.platform === 'win32') {
    r = spawnSync([bin, ...args].map(quoteForShell).join(' '), { encoding: 'utf8', env, shell: true, stdio: ['ignore', 'pipe', 'pipe'] });
  } else r = spawnSync(bin, args, { encoding: 'utf8', env, stdio: ['ignore', 'pipe', 'pipe'] });
  log(`claude plugin eval exit ${r.status}`);
  if (!fs.existsSync(jsonFile)) {
    const tail = `${r.stderr || ''}${r.stdout || ''}`.trim().split('\n').slice(-5).join('\n');
    throw new Error(`claude plugin eval wrote no result (exit ${r.status ?? r.error?.message}):\n${tail}`);
  }
  return { status: r.status };
}

