#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { main as lessons } from './lessons/lessons.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
// Each subcommand runs its own script in a child process, so its exit code and output pass through unchanged.
const SCRIPTS = {
  receipt: 'receipt/receipt.mjs',
  usage: 'usage/usage.mjs',
  'skill-gate': 'skill-gate/skill-gate.mjs',
};
const USAGE = [
  'usage: bgz <command> [options]',
  '  lessons <add|due|review|status>   record and review lessons',
  '  receipt <file-or-dir>... [--json] hashes, sizes and counts for a handback',
  '  usage [--since ISO] [--json]      where the tokens went, from local transcripts',
  '  skill-gate --run --previous <ref>  check each skill\'s evals match or beat the previous version',
].join('\n');

const [command, ...args] = process.argv.slice(2);
if (command === 'lessons') lessons(args);
else if (Object.hasOwn(SCRIPTS, command)) {
  const r = spawnSync(process.execPath, [path.join(here, SCRIPTS[command]), ...args], { stdio: 'inherit' });
  if (r.error) {
    console.error(`bgz ${command}: ${r.error.message}`);
    process.exitCode = 2;
  } else process.exitCode = r.status ?? 1;
} else {
  console.log(USAGE);
  if (command && !['--help', '-h'].includes(command)) process.exitCode = 2;
}
