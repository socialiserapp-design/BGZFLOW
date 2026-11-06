import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {cases} from './cases.mjs';
import {prepare,snapshot} from './prepare.mjs';
import {buildConfig} from '../foundation/config.mjs';
import {readNativeHookStatus,candidateCliConfig,livePluginId} from '../foundation/native-hooks.mjs';
import {clearInheritedHostIdentity} from '../foundation/native-environment.mjs';

export function parseArguments(args){
  if(!args.includes('--live'))throw Error('No model calls made: --live is required.');
  const result={};for(let i=0;i<args.length;i++){if(args[i]==='--live')continue;if(!['--output','--plugin','--plugin-id','--cases'].includes(args[i])||!args[i+1]||args[i+1].startsWith('--'))throw Error('Supply --live --plugin <reviewed build> --output <fresh directory> [--plugin-id <exact-id>] [--cases <ids>].');if(result[args[i]])throw Error('Duplicate argument.');result[args[i]]=args[++i];}
  if(!result['--output']||!result['--plugin'])throw Error('A reviewed built --plugin and fresh --output are required.');
  const selected=result['--cases']?.split(',')||cases.map(c=>c.id);if(new Set(selected).size!==selected.length||selected.some(id=>!cases.some(c=>c.id===id)))throw Error('Unknown or duplicate case.');
  const pluginId=result['--plugin-id']||livePluginId;candidateCliConfig(pluginId);
  return {output:path.resolve(result['--output']),plugin:path.resolve(result['--plugin']),pluginId,selected};
}
export function applyCandidateConfig(config,{pluginId,plugin,run,workerProvider,judgeProvider,codexHome=process.env.CODEX_HOME}){
  const overrides=candidateCliConfig(pluginId),judge=config.tests[0].assert[1].provider;
  if(workerProvider==='codex'){
    config.providers[0].config.cli_config={...overrides};
    if(codexHome)config.providers[0].config.cli_env={...(config.providers[0].config.cli_env||{}),CODEX_HOME:codexHome};
  }
  if(workerProvider==='claude')config.providers[0].config.plugins=[{type:'local',path:plugin}];
  if(judgeProvider==='codex'){
    judge.config.cli_config={...overrides};judge.config.cli_env={...(judge.config.cli_env||{}),...(codexHome?{CODEX_HOME:codexHome}:{}),BGZFLOW_CONTINUITY_HOME:path.join(run,'judge-continuity')};
  }
  if(judgeProvider==='claude')judge.config.plugins=[{type:'local',path:plugin}];
  return overrides;
}
export async function main(args=process.argv.slice(2)){
  const {output,plugin,pluginId,selected}=parseArguments(args);
  for(const key of ['BGZ_EVAL_PROVIDER','BGZ_EVAL_MODEL','BGZ_EVAL_JUDGE_PROVIDER','BGZ_EVAL_JUDGE_MODEL'])if(!process.env[key])throw Error('Set '+key+' explicitly.');
  if(selected.includes('follow-up-recovery')&&process.env.BGZ_EVAL_PROVIDER!=='codex')throw Error('The real resume adapter in this suite currently supports Codex only; do not simulate another host.');
  if(!fs.statSync(path.join(plugin,'plugin.json')).isFile()||JSON.parse(fs.readFileSync(path.join(plugin,'plugin.json'))).name!=='bgzflow')throw Error('A complete reviewed BGZFLOW build is required.');
  if(fs.existsSync(output))throw Error('Output exists; preserve earlier evidence.');
  fs.mkdirSync(output,{recursive:true});clearInheritedHostIdentity();
  const parent=path.resolve(process.env.BGZ_EVAL_WORK_ROOT||os.tmpdir());fs.mkdirSync(parent,{recursive:true});
  const nativeRoot=fs.mkdtempSync(path.join(parent,'bgzflow-automatic-use-'));
  const reference=name=>'file://'+path.relative(process.cwd(),fileURLToPath(new URL(name,import.meta.url))).replaceAll('\\','/');
  fs.writeFileSync(path.join(output,'invocation.json'),JSON.stringify({selected,plugin,pluginId,cliConfig:candidateCliConfig(pluginId),nativeRoot,provider:process.env.BGZ_EVAL_PROVIDER,model:process.env.BGZ_EVAL_MODEL,judgeProvider:process.env.BGZ_EVAL_JUDGE_PROVIDER,judgeModel:process.env.BGZ_EVAL_JUDGE_MODEL},null,2),{flag:'wx'});
  const summaries=[];
  try{
    const {evaluate}=await import('promptfoo');
    for(const testcase of cases.filter(c=>selected.includes(c.id))){
      const run=path.join(output,testcase.id),workspace=path.join(nativeRoot,testcase.id);fs.mkdirSync(run);
      const before=prepare(workspace,testcase.id);fs.writeFileSync(path.join(run,'workspace-before.json'),JSON.stringify(before),{flag:'wx'});
      const config=buildConfig({provider:process.env.BGZ_EVAL_PROVIDER,model:process.env.BGZ_EVAL_MODEL,judgeProvider:process.env.BGZ_EVAL_JUDGE_PROVIDER,judgeModel:process.env.BGZ_EVAL_JUDGE_MODEL,fixture:workspace,runDirectory:run,effort:process.env.BGZ_EVAL_EFFORT||'medium',codexPath:process.env.BGZ_EVAL_CODEX_PATH,caseIds:['interview-only']});
      const cliConfig=applyCandidateConfig(config,{pluginId,plugin,run,workerProvider:process.env.BGZ_EVAL_PROVIDER,judgeProvider:process.env.BGZ_EVAL_JUDGE_PROVIDER});
      if([process.env.BGZ_EVAL_PROVIDER,process.env.BGZ_EVAL_JUDGE_PROVIDER].includes('codex')){
        const status=await readNativeHookStatus({executable:process.env.BGZ_EVAL_CODEX_PATH,cwd:workspace,pluginId,pluginRoot:plugin,cliConfig});fs.writeFileSync(path.join(run,'hook-preflight.json'),JSON.stringify(status),{flag:'wx'});if(!status.ready)throw Error(status.reason);
      }
      if(testcase.recovery){
        // Existing installed provider exposes supported native thread resume.
        // No forged prompt concatenation or fabricated compaction event.
        config.providers[0].config.ephemeral=false;
        const setup={...structuredClone(config),tests:[{description:testcase.id+'-pause',vars:{request:testcase.setupRequest},assert:[]}]};
        const first=await(await evaluate(setup,{cache:false,maxConcurrency:1,sharing:false})).toEvaluateSummary();
        fs.writeFileSync(path.join(run,'setup-result.json'),JSON.stringify(first,null,2),{flag:'wx'});
        if(JSON.stringify(snapshot(workspace))!==JSON.stringify(before))throw Error('Paused setup changed the fixture; first failure preserved.');
        const thread=first.results?.[0]?.response?.metadata?.codexAppServer?.threadId;
        if(typeof thread!=='string'||!thread)throw Error('Native provider returned no resumable thread identity; recovery unverified.');
        config.providers[0].config.thread_id=thread;
      }
      config.tests=[{description:testcase.id,vars:{caseId:testcase.id,request:testcase.request,setupRequest:testcase.setupRequest,runDirectory:run,pluginRoot:plugin,pluginId,workerProvider:process.env.BGZ_EVAL_PROVIDER},assert:[{type:'javascript',value:reference('assertion.cjs')},{...config.tests[0].assert[1],value:testcase.rubric,transform:reference('judge-context.cjs')}]}];
      const started=Date.now(),result=await(await evaluate(config,{cache:false,maxConcurrency:1,sharing:false})).toEvaluateSummary();
      const record={elapsedMs:Date.now()-started,result};fs.writeFileSync(path.join(run,'result.json'),JSON.stringify(record,null,2),{flag:'wx'});
      const passed=result.results?.length>0&&result.results.every(r=>r.success);summaries.push({case:testcase.id,passed,elapsedMs:record.elapsedMs});
      if(!passed&&!fs.existsSync(path.join(output,'first-failure.json')))fs.writeFileSync(path.join(output,'first-failure.json'),JSON.stringify({case:testcase.id,run},null,2),{flag:'wx'});
    }
    fs.writeFileSync(path.join(output,'summary.json'),JSON.stringify({results:summaries,limitation:'Native outcome checks plus independent semantic judgment; no controlled baseline or guarantee of cognitive method use.'},null,2),{flag:'wx'});
    return summaries.every(r=>r.passed)?0:1;
  }catch(error){fs.writeFileSync(path.join(output,'failure.txt'),String(error.stack||error),{flag:'wx'});throw error;}
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url)main().then(code=>{process.exitCode=code}).catch(error=>{console.error(error.message);process.exitCode=2});
