#!/usr/bin/env node
// startup-check: fail before dispatch when a project's start-up reading is too big, points nowhere,
// or its checkpoint has grown or names an undefined role.
//
//   startup-check [<project-dir>] [--json] [--budget <words>]
//
// Exit 0: all checks pass.  Exit 1: at least one check failed.  Exit 2: bad usage or an unexpected error.
import path from 'node:path';
import { avSafeFailures, checkStartup } from './lib.mjs';
import { due } from '../lessons/lib.mjs';

function usage() {
  return [
    'usage: startup-check [<project-dir>] [--json] [--budget <words>]',
    '       startup-check --av-safe [<dir>]     lint shipped files only (for CI); exit 1 on any finding',
    '',
    'Measures the compulsory start-up chain (AGENTS.md, CLAUDE.md and the files they mark as required',
    'reading) and checks the checkpoint. Limits: BGZFLOW_STARTUP_WORDS (3000), BGZFLOW_CHECKPOINT_KB (8),',
    'BGZFLOW_BIG_READ_KB (64); environment variables override <project>/.bgzflow/config.json.',
    'Exit 0 = pass, 1 = failed a check, 2 = bad usage.',
  ].join('\n');
}

function parseArgs(argv) {
  const opts = { json: false, dir: undefined, budget: undefined, avSafe: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--json') opts.json = true;
    else if (a === '--av-safe') opts.avSafe = true;
    else if (a === '--budget') {
      const n = Number(argv[++i]);
      if (!Number.isFinite(n) || n <= 0) throw new Error('--budget needs a number above 0');
      opts.budget = n;
    } else if (a === '-h' || a === '--help') opts.help = true;
    else if (a.startsWith('-')) throw new Error(`unknown option ${a}`);
    else if (opts.dir === undefined) opts.dir = a;
    else throw new Error('only one project folder can be given');
  }
  return opts;
}

function render(result) {
  const lines = [];
  lines.push(`startup-check ${result.projectDir.split(path.sep).join('/')}`);
  lines.push(`  chain: ${result.files.length} file(s), ${result.words} of ${result.budget} words`);
  for (const f of result.files) {
    lines.push(`    ${String(f.words).padStart(6)}  ${f.path}${f.via === 'root' ? '' : `  (${f.via})`}`);
  }
  for (const c of result.checkpoints) lines.push(`  checkpoint: ${c.path} ${(c.bytes / 1024).toFixed(1)} KB, ${c.words} words`);
  for (const w of result.warnings) lines.push(`  warn: ${w.message}`);
  for (const f of result.failures) lines.push(`  FAIL [${f.code}] ${f.message}`);
  if (result.lessonsDue > 0) lines.push(`Lessons due for review: ${result.lessonsDue} (bgz lessons due)`);
  if (result.lessonsWarning) lines.push(result.lessonsWarning);
  lines.push(result.ok ? 'PASS' : `FAIL (${result.failures.length} problem${result.failures.length === 1 ? '' : 's'})`);
  return lines.join('\n');
}

try {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) {
    process.stdout.write(usage() + '\n');
    process.exitCode = 0;
  } else if (opts.avSafe) {
    const dir = path.resolve(opts.dir || process.cwd());
    const failures = avSafeFailures(dir);
    if (opts.json) process.stdout.write(JSON.stringify({ ok: failures.length === 0, dir, failures }, null, 2) + '\n');
    else process.stdout.write(failures.length ? failures.map((f) => `FAIL [av-safe] ${f.message}`).join('\n') + `\nFAIL (${failures.length} av-safe finding${failures.length === 1 ? '' : 's'})\n` : `av-safe PASS ${dir.split(path.sep).join('/')}\n`);
    process.exitCode = failures.length ? 1 : 0;
  } else {
    const result = checkStartup(opts.dir || process.cwd(), { budgetOverride: opts.budget });
    try {
      result.lessonsDue = due([result.projectDir]).groups.length;
    } catch (error) {
      // Optional lessons advice must not change the startup verdict or expose log contents.
      const line = Number.isInteger(error.lineNumber) && error.lineNumber > 0 ? ` line ${error.lineNumber}` : '';
      result.lessonsWarning = `Lessons log unreadable: .bgzflow/lessons.jsonl${line}`;
    }
    process.stdout.write((opts.json ? JSON.stringify(result, null, 2) : render(result)) + '\n');
    process.exitCode = result.ok ? 0 : 1;
  }
} catch (err) {
  process.stderr.write(`startup-check: ${err && err.message ? err.message : err}\n${usage()}\n`);
  process.exitCode = 2;
}
