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
  jev: 'jev/cli.mjs',
  preflight: 'jev/preflight.mjs',
  setup: 'project-setup/project-setup.mjs',
  'start-now': 'start-now/start-now.mjs',
  facts: 'facts/facts.mjs',
  map: 'map/map.mjs',
};
const USAGE = [
  'usage: bgz <command> [options]',
  '  lessons <add|list|due|rework|review|status>   record, list and review lessons; count repeat fixes',
  '  receipt <file-or-dir>... [--json] hashes, sizes and counts for a handback',
  '  usage [--since ISO] [--json]      where the tokens went, from local transcripts',
  '  skill-gate --run --previous <ref>  check each skill\'s evals match or beat the previous version',
  '  jev <ask|file|files|score|route|skills|arch|unasked|plan|grade|league|outcomes|improve|bench|regress>  cheap Jev judgements (bgz jev --help)',
  '  preflight                         read-only worker-start check: stray skills, long plugin overviews, ANTHROPIC_API_KEY',
  '  setup [<project-dir>] [--dry]     detect build, test and lint commands into .bgzflow/project.json',
  '  start-now [<project-dir>] [--json] list work-graph tasks that are ready to start (dependencies done)',
  '  facts <for|add|accept|list>       per-project facts for the files a brief touches',
  '  map [<dir>] [--brief] [--json]    one system map: repos, services, deployments, and each change by stage (map record|live ... --as <role>)',
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
