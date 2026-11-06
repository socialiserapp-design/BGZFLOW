#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { runFoundationCli } from './cli.mjs';
import { runJevJudgmentCli } from './jev-judgment.mjs';
const dir=path.dirname(fileURLToPath(import.meta.url));
const root=fs.existsSync(path.resolve(dir,'../skills'))?path.resolve(dir,'..'):path.resolve(dir,'../..');
const [command,...args]=process.argv.slice(2);
if(command==='--version')console.log(fs.readFileSync(path.join(root,'VERSION'),'utf8').trim());
else if(['route','catalog','context','learning'].includes(command)) {
  try {process.exitCode=await runFoundationCli([command,...args],{input:args.includes('--stdin')?fs.readFileSync(0,'utf8'):''});}
  catch {console.error('The requested operation could not complete. Use bgz --help and check local access.');process.exitCode=1;}
} else if(command==='judge') {
  try {process.exitCode=await runJevJudgmentCli(args,{input:args.includes('--stdin')?fs.readFileSync(0,'utf8'):''});}
  catch {console.error('Jev judgment could not complete. Continue with the main agent and original evidence.');process.exitCode=1;}
} else if(command==='jev') {
  // On-demand selection uses the same supported SDK as automatic routing.
  try {process.exitCode=await runFoundationCli(['route',...args],{input:args.includes('--stdin')?fs.readFileSync(0,'utf8'):''});}
  catch {console.error('Jev selection could not complete. The main agent can choose from bgz catalog.');process.exitCode=1;}
} else if(command==='mail'||command==='engine') {
  const target=command==='mail'?'bg-mail/bg-mail.mjs':'engine/cli.mjs';
  const run=spawnSync(process.execPath,[path.join(root,'tools',target),...args],{stdio:'inherit',windowsHide:true});
  process.exitCode=run.status??1;
} else {
  console.log('BGZFLOW: choose relevant methods, preserve intent and verify real outcomes.\n\nCommands: catalog, route, context, learning, jev (selection compatibility alias), judge (all Jev question types), mail, engine.\nUse bgz route --help for selection or bgz judge --help for judgments.\n\nThe old receipt, clarity-score, council and stop-gate commands are retired.\nNormal work does not require completing any BGZFLOW paperwork.');
  if(command&&!['--help','help'].includes(command))process.exitCode=2;
}
