#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { main as lessons } from './lessons/lessons.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const versionFile = path.join(here, '..', 'VERSION');
const BGZ_VERSION = fs.existsSync(versionFile) ? fs.readFileSync(versionFile, 'utf8').trim() : '0.9.10+20261027.1';
// Each subcommand runs its own script in a child process, so its exit code and output pass through unchanged.
const SCRIPTS = {
  engine: 'engine/cli.mjs',
  graph: 'graph/graph.mjs',
  receipt: 'receipt/receipt.mjs',
  usage: 'usage/usage.mjs',
  'skill-gate': 'skill-gate/skill-gate.mjs',
  jev: 'jev/cli.mjs',
  preflight: 'jev/preflight.mjs',
  setup: 'project-setup/project-setup.mjs',
  'start-now': 'start-now/start-now.mjs',
  facts: 'facts/facts.mjs',
  map: 'map/map.mjs',
  verify: 'verify/verify.mjs',
  scan: 'scan/scan.mjs',
  'review-pack': 'review-pack/review-pack.mjs',
  goal: 'goal/goal.mjs',
  'skill-forge': 'forge/forge.mjs',
  taste: 'taste/taste.mjs',
  eval: 'eval/eval.mjs',
  egm: 'egm/egm.mjs',
};
const USAGE = [
  'usage: bgz <command> [options]',
  '  lessons <add|list|due|rework|review|status>   record, list and review lessons; count repeat fixes',
  '  receipt <file-or-dir>... [--json] hashes, sizes and counts for a handback',
  '  usage [--since ISO] [--json]      where the tokens went, from local transcripts',
  '  skill-gate --run --previous <ref>  check each skill\'s evals match or beat the previous version',
  '  jev <ask|file|files|score|route|skills|arch|unasked|plan|grade|league|outcomes|improve|bench|regress>  cheap Jev judgements (bgz jev --help)',
  '  preflight [--harmony]             read-only worker-start & cross-skill harmony/sanitization check',
  '  setup [<project-dir>] [--dry]     detect build, test and lint commands into .bgzflow/project.json',
  '  start-now [<project-dir>] [--json] list work-graph tasks that are ready to start (dependencies done)',
  '  facts <for|search|add|accept|list> per-project facts (with FTS5 BM25 + recency decay search)',
  '  map [<dir>] [--brief] [--json]    one system map: repos, services, deployments, and each change by stage (map record|live ... --as <role>)',
  '  verify --file <spec.json>         verify served identity, verifier != builder, and effect read-back (BUILT vs USED)',
  '  scan [--base <ref>] [--file <p>]  deterministic security, SQL/IDOR, fake-effect and preview two-customer isolation scan',
  '  review-pack [--handback <f.json>] generate blind verifier pack (strips builder prose, keeps raw diff & comments)',
  '  goal <lock|status|set-wait|withdraw-item>  lock and inspect tamper-proof universal QA/QC checklist contracts',
  '  skill-forge <--from-rea|--from-book|--from-video|--from-paper|--from-teardown|--from-source> ...  forge & harmonize skills from deep sources & REA',
  '  taste <status|lock|unlock|verify-round|anti-slop>  mechanical LOCKED_IDENTITY protection & 10-project anti-repetition engine',
  '  eval <domains|codesign|research|claims|math|learn|status>  Universal 8-Domain Quality, Research, Architecture & Zero-Hallucination Eval Engine',
  '  egm <xray|mentor|goldfish|autosetup|drift>  Google Elephant-Goldfish Model (EGM), Whole-System X-Ray, Co-Architect Mentor & Zero-Bottleneck Engine',
  '  graph <init|compile|validate|status|transition|context|assess|precedent|advisory|stages>  Google Graph Engineering & Harness 2 SDLC controller',
  '  engine <start|resume|recover|status|truth>  durable goal engine with execution-graph & current-truth verification',
].join('\n');

const [command, ...args] = process.argv.slice(2);
if (command === '--version' || command === '-v' || command === 'version') {
  console.log(`BGZFLOW ${BGZ_VERSION} (EGM Co-Architect + 8-Domain Eval + 4x4 OSS Discovery + Graph Engineering)`);
} else if (command === 'lessons') lessons(args);
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
