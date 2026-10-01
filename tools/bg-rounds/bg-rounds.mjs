#!/usr/bin/env node
// bg-rounds: a ledger of repair rounds per work package (<project>/.bgzflow/rounds.json).
//
//   bg-rounds open <package> <finding-id>...      open findings (an existing ID keeps its identity)
//   bg-rounds close <package> <finding-id>...     mark findings resolved
//   bg-rounds next <package> [--approved-by "<who, when>"] [--dry-run]
//                                                 start the next repair round; refuses round 3 or later
//   bg-rounds status [<package>] [--json]         show the ledger
//
// Options: --project <dir> (default: the nearest folder with .bgzflow or .git, from the current folder)
// Exit codes: 0 ok, 1 usage or ledger error, 2 refused: the next round would be round 3 or later without approval.
import path from 'node:path';
import { findProjectDir } from '../../hooks/lib/project.mjs';
import { FREE_ROUNDS, LedgerError, closeFindings, nextRound, openFindings, readLedger, summarize } from './lib.mjs';

const HELP = `usage:
  bg-rounds open <package> <finding-id>...
  bg-rounds close <package> <finding-id>...
  bg-rounds next <package> [--approved-by "<who, when>"] [--dry-run]
  bg-rounds status [<package>] [--json]
options: --project <dir>
Repair rounds are capped at ${FREE_ROUNDS}. "next" exits 2 when the next round would be round ${FREE_ROUNDS + 1} or later,
unless --approved-by "<who, when>" is given; the approval is recorded in the ledger.
exit codes: 0 ok, 1 usage or ledger error, 2 refused (round cap)`;

function parse(argv) {
  const out = { positional: [], flags: {} };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--json' || a === '--dry-run' || a === '-h' || a === '--help') out.flags[a.replace(/^-+/, '')] = true;
    else if (a === '--project' || a === '--approved-by') {
      if (i + 1 >= argv.length) throw new LedgerError(`${a} needs a value`);
      out.flags[a.replace(/^-+/, '')] = argv[++i];
    } else if (a.startsWith('--approved-by=')) out.flags['approved-by'] = a.slice('--approved-by='.length);
    else if (a.startsWith('--project=')) out.flags.project = a.slice('--project='.length);
    else if (a.startsWith('-') && a !== '-') throw new LedgerError(`unknown option ${a}`);
    else out.positional.push(a);
  }
  return out;
}

function show(summary) {
  const lines = [];
  for (const s of summary) {
    const next = s.nextRound === undefined ? 'no open findings' : `next repair round ${s.nextRound}${s.nextNeedsApproval ? ' (needs --approved-by)' : ''}`;
    lines.push(`${s.package}: round ${s.round} of ${FREE_ROUNDS} free; ${s.open.length} open, ${s.closed.length} closed; ${next}`);
    for (const id of Object.keys(s.findings)) {
      const f = s.findings[id];
      lines.push(`  ${id.padEnd(14)} ${f.status.padEnd(7)} opened in round ${f.openedRound}; seen in rounds ${f.seenInRounds.join(',')}${f.reopened ? `; reopened ${f.reopened}x` : ''}`);
    }
    for (const h of s.history) {
      lines.push(`  round ${h.round} started ${h.at} with ${h.open.length} open${h.approvedBy ? `; approved by ${h.approvedBy}` : ''}`);
    }
  }
  return lines.length ? lines.join('\n') : 'ledger is empty';
}

function main(argv) {
  const { positional, flags } = parse(argv);
  const [command, pkg, ...rest] = positional;
  if (flags.h || flags.help || !command) {
    process.stdout.write(HELP + '\n');
    return command || flags.h || flags.help ? 0 : 1;
  }
  const projectDir = flags.project ? path.resolve(flags.project) : findProjectDir({ cwd: process.cwd() });
  if (command === 'open') {
    if (!pkg) throw new LedgerError('open needs a package and at least one finding ID');
    const r = openFindings(projectDir, pkg, rest);
    for (const x of r.report) process.stdout.write(`${x.id} ${x.change}\n`);
    process.stdout.write(`${pkg}: round ${r.round}; open: ${r.open.join(', ')}\n`);
    return 0;
  }
  if (command === 'close') {
    if (!pkg) throw new LedgerError('close needs a package and at least one finding ID');
    const r = closeFindings(projectDir, pkg, rest);
    process.stdout.write(`${pkg}: round ${r.round}; open: ${r.open.length ? r.open.join(', ') : 'none'}\n`);
    return 0;
  }
  if (command === 'next') {
    if (!pkg) throw new LedgerError('next needs a package');
    if (rest.length) throw new LedgerError(`unexpected argument "${rest[0]}"`);
    const r = nextRound(projectDir, pkg, { approvedBy: flags['approved-by'], dryRun: Boolean(flags['dry-run']) });
    if (r.status === 'nothing-to-repair') {
      process.stdout.write(`${pkg}: no open findings, no repair round needed (round ${r.round})\n`);
      return 0;
    }
    if (r.status === 'refused') {
      process.stderr.write(
        `refused: repair round ${r.round} of ${pkg} is past the ${FREE_ROUNDS}-round cap. Open findings: ${r.open.join(', ')}.\n` +
          `Report them as unresolved and get the founder's explicit approval, then run:\n` +
          `  bg-rounds next ${pkg} --approved-by "<who, when>"\n`,
      );
      return 2;
    }
    process.stdout.write(`round ${r.round}\n${pkg}: ${r.status === 'would-start' ? 'would start' : 'started'} repair round ${r.round}; open: ${r.open.join(', ')}${r.approved ? `; approved by ${r.approved}` : ''}\n`);
    return 0;
  }
  if (command === 'status') {
    const summary = summarize(readLedger(projectDir), pkg);
    process.stdout.write((flags.json ? JSON.stringify(summary, null, 2) : show(summary)) + '\n');
    return 0;
  }
  throw new LedgerError(`unknown command "${command}"`);
}

try {
  process.exitCode = main(process.argv.slice(2));
} catch (err) {
  process.stderr.write(`bg-rounds: ${err && err.message ? err.message : err}\n`);
  if (err instanceof LedgerError && /needs|unknown|not valid|unexpected/.test(err.message)) process.stderr.write('run: bg-rounds --help\n');
  process.exitCode = 1;
}
