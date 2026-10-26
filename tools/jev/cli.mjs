#!/usr/bin/env node
import { isCommandEntry } from '../../hooks/lib/command-entry.mjs';
// CLI for the Jev client: bgz jev <command>. Kept apart from jev.mjs so that library users (hooks, tests) never wait on it.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULT_TIMEOUT_MS, parseArgs } from './jev.mjs';

const USAGE = [
  'usage: bgz jev <command> [options]   (a failed or unavailable Jev prints {"ok":false,...} and exits 1: fall back to the main model once)',
  '  ask   --q "<question>" [--type noul|choice|score] [--options a,b,c | --levels "l0|l1|l2"]',
  '        [--state <text|@file>] [--paths a,b] [--cmd "<command>"] [--questions @file.json]   state, files and one gated command',
  '  file  <path> --q "..." [--type ...] [--options ...|--levels ...]   one file question; the answer comes back, never the file',
  '  files <globs|dirs...> --q "..." [--type ...]                        prune, ask per file in parallel, then pick the first file to open',
  '  score --preset diff-risk|goal-clarity [--state <text|@file> | --diff <ref>]   composite score with weights kept in code',
  '  route --job "<text|@file>"                                           role, model tier and effort for a job (code then applies STATUS limits)',
  '  skills --brief <brief.md> [--stage <stage>] [--write|--dry]          liberal skill list for a job (keeps score >= 0.35 and anything the brief names)',
  '  arch --base <ref> [--files a,b] [--brief <brief.md>]                  architecture and logic leads on a diff, per file and over the whole diff',
  '  unasked --base <ref> [--asks <decisions file|brief,...>]               changes that add a customer-facing stop or a new rule nobody asked for',
  '        (no --asks: $BGZFLOW_DECISIONS_FILE, else the overlay config.json decisionsFile, else DECISIONS.md, in the repo or .bgzflow/)',
  '  plan --plan <plan file> [--asks <decisions file|brief,...>]            before the first dispatch: plan items that add a customer-facing stop or a new rule nobody asked for',
  '        (advice for the handback, never a block; no --asks: the same lookup as unasked)',
  '  grade <job-output-file> --brief <brief.md> --role <role> --worker <model/tool> [--cost-usd N]   score a finished job',
  '  league [--json] [--since ISO]                                        average grade per role and worker',
  '  outcomes [--dry] [--max-jobs N] [--budget-ms MS] [--background=1]   adjust grades by real outcomes (reverts, review flags, lessons); no model calls',
  '  improve [--dry] [--asks <decisions file|brief>] [--worker <id>]    promote a proven workflow into a skill, with bench, backup and watch (--dry skips the bench)',
  '  bench [list|add|remove|seed|run] ...                                 fixed job cards; run only before a promotion or a model swap',
  '  regress [--dry] [--worker <id>]                                      draft regression checks for recorded failures (drafts go to .bgzflow/regression-drafts/)',
  'Secret files (.env*, Secrets/, *key*, *.pem, *credentials*, id_*) are never sent: skipped in folders, refused when named.',
  'Common: --timeout <seconds> (default 3). Ledger: ~/.bgzflow/jev-ledger.jsonl. Key: TYPESAFE_API_KEY or ~/.typesafe_key (never printed).',
].join('\n');

const fail = (message, code = 2) => {
  console.error(`bgz jev: ${message}`);
  process.exitCode = code;
};

export async function main(argv = process.argv.slice(2), env = process.env) {
  const [sub, ...args] = argv;
  if (!sub || sub === '--help' || sub === '-h' || sub === 'help') {
    console.log(USAGE);
    if (sub && !['--help', '-h', 'help'].includes(sub)) process.exitCode = 2;
    return;
  }
  const { flags, rest } = parseArgs(args);
  const timeoutMs = flags.timeout ? Math.max(500, Number(flags.timeout) * 1000) || DEFAULT_TIMEOUT_MS : DEFAULT_TIMEOUT_MS;
  const out = (obj) => {
    console.log(JSON.stringify(obj, null, 2));
    if (obj && obj.ok === false) process.exitCode = 1;
  };
  try {
    if (sub === 'ask') {
      const { runAsk } = await import('./agentic.mjs');
      return out(await runAsk({ flags, timeoutMs, env }));
    }
    if (sub === 'file') {
      const { runFile } = await import('./files.mjs');
      return out(await runFile({ flags, rest, timeoutMs, env }));
    }
    if (sub === 'files') {
      const { runFiles } = await import('./files.mjs');
      return out(await runFiles({ flags, rest, timeoutMs: flags.timeout ? timeoutMs : 8000, env }));
    }
    if (sub === 'score' || sub === 'route') {
      const { runScore, runRoute } = await import('./rules.mjs');
      return out(await (sub === 'score' ? runScore : runRoute)({ flags, timeoutMs, env }));
    }
    if (sub === 'skills') {
      const { runSkills } = await import('./skills.mjs');
      return out(await runSkills({ flags, rest, timeoutMs: flags.timeout ? timeoutMs : 30000, env }));
    }
    if (sub === 'arch' || sub === 'unasked') {
      const r = await import('./review.mjs');
      return out(await (sub === 'arch' ? r.runArch : r.runUnasked)({ flags, rest, timeoutMs: flags.timeout ? timeoutMs : 15000, env }));
    }
    if (sub === 'plan') {
      const p = await import('./plan.mjs');
      return out(await p.runPlan({ flags, rest, timeoutMs: flags.timeout ? timeoutMs : 10000, env }));
    }
    if (sub === 'grade' || sub === 'league') {
      const g = await import('./grade.mjs');
      if (sub === 'grade') return out(await g.runGrade({ flags, rest, timeoutMs: flags.timeout ? timeoutMs : 10000, env }));
      return g.runLeague({ flags, env });
    }
    if (sub === 'outcomes') {
      const o = await import('./outcomes.mjs');
      return out(await o.runOutcomes({ flags, rest, env }));
    }
    if (sub === 'improve') {
      const m = await import('./improve.mjs');
      return out(await m.runImprove({ flags, rest, env }));
    }
    if (sub === 'bench') {
      const b = await import('./bench.mjs');
      return out(await b.runBench({ flags, rest, env }));
    }
    if (sub === 'regress') {
      const r = await import('./regress.mjs');
      return out(await r.runRegress({ flags, rest, env }));
    }
    console.log(USAGE);
    process.exitCode = 2;
  } catch (err) {
    fail(err && err.message ? err.message : String(err));
  }
  if (process.exitCode === undefined) process.exitCode = 0;
}

// Run as a script (not when imported by a hook or a test).
if (isCommandEntry(import.meta.url)) await main();
