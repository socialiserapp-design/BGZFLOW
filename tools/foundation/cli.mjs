#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { discoverCatalog } from './catalog.mjs';
import { selectRoute, loadSelectedSkills } from './router.mjs';
import { readContinuity, renderContinuity, captureEvent } from './continuity.mjs';
import { isCommandEntry } from '../../hooks/lib/command-entry.mjs';
import { renderMethodDelivery } from './method-delivery.mjs';
import { createFoundationSession } from './session.mjs';
import {createNativeLearning} from './native-learning.mjs';

const entryDirectory=path.dirname(fileURLToPath(import.meta.url));
const pluginRoot=process.env.BGZFLOW_PLUGIN_ROOT||(fs.existsSync(path.resolve(entryDirectory,'../skills'))?path.resolve(entryDirectory,'..'):path.resolve(entryDirectory,'../..'));
const usage=`BGZFLOW foundation
  catalog [--project <directory>] [--json]     Discover all available skill metadata
  route --request <text> [--stage <stage>]     Select and read relevant methods
  route --stdin [--json]                      Read request/context/pool from JSON on stdin
  context --session <session> [--project <directory>]   Recover captured task context
  learning status|propose|evaluate|rollback --session <session> [--stdin]

Call route when the goal, stage, approach or available worker pool materially changes.
It uses your own Jev access or returns a main-agent fallback. It never executes a task,
grants permission, purchases capacity or certifies completion. Private context remains
local except the sanitised selection context sent to your configured Jev service.
`;

export async function runFoundationCli(args,{input='',decide,home,write=console.log}={}) {
  const [command,...rest]=args;
  if(!command||command==='--help'||command==='help'||rest.includes('--help')){write(usage);return 0;}
  const option=name=>{const i=rest.indexOf(name);return i<0?undefined:rest[i+1];};
  const projectRoot=path.resolve(option('--project')||process.cwd());
  if(command==='learning'){
    const sessionId=option('--session');
    const bridge=createNativeLearning({projectRoot,sessionId,home});
    const action=rest[0]||'status';
    if(!['status','propose','evaluate','rollback'].includes(action))throw Error('Unknown learning operation.');
    const payload=rest.includes('--stdin')?JSON.parse(input||'{}'):{};
    write(JSON.stringify(await bridge[action](payload)));return 0;
  }
  if(command==='context') {
    const session=option('--session');if(!session) throw new Error('A session is required to recover its context.');
    write(renderContinuity(readContinuity({cwd:projectRoot,session_id:session})));return 0;
  }
  if(command!=='catalog'&&command!=='route')throw new Error('Unknown foundation command. Use --help.');
  const catalog=discoverCatalog({pluginRoot,projectRoot,home});
  if(command==='catalog') {
    write(rest.includes('--json')?JSON.stringify(catalog):catalog.map(e=>`${e.id}\t${e.name}\t${e.description}\t${e.path}`).join('\n'));return 0;
  }
  const payload=rest.includes('--stdin')?JSON.parse(input||'{}'):{};
  const request=option('--request')||payload.request;
  if(typeof request!=='string'||!request.trim())throw new Error('Provide the current request, with relevant decisions, using --request or --stdin.');
  const session=createFoundationSession({projectRoot,sessionId:payload.sessionId||'cli-selection',host:{capabilities:async()=>({models:payload.availableModels||[],tools:payload.policy?.availableTools})}});
  const selection=await session.select({...payload,request,stage:option('--stage')||payload.stage||'work',catalog,decide});
  if(payload.sessionId)captureEvent({cwd:projectRoot,session_id:payload.sessionId,hook_event_name:'RouteSelected',selection},{internal:true});
  if(rest.includes('--json'))write(JSON.stringify({...selection,delivery:renderMethodDelivery(selection,{loadSelectedSkills})}));
  else {
    write(`Method selection: ${selection.status}. Suggested arrangement: ${selection.strategy}.\n${selection.reason}`);
    if(selection.missing.length)write(JSON.stringify(selection.missing));
    write(renderMethodDelivery(selection,{loadSelectedSkills}));
    if(selection.status==='fallback')write('Use catalog to inspect the complete available library and select with the current main agent. No task has been blocked.');
  }
  return 0;
}

if(isCommandEntry(import.meta.url)) {
  try {process.exitCode=await runFoundationCli(process.argv.slice(2),{input:process.argv.includes('--stdin')?fs.readFileSync(0,'utf8'):''});}
  catch {console.error('The foundation command could not complete. Check its arguments and available local files; ordinary agent work remains available.');process.exitCode=1;}
}
