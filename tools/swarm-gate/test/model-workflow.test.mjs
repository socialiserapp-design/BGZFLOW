import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {after,test} from 'node:test';
import * as gate from '../swarm-gate.mjs';
const roots=[];after(()=>roots.forEach(r=>fs.rmSync(r,{recursive:true,force:true})));
function fixture({jobs=8,auto=true}={}) {
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'model-workflow-'));roots.push(root);
  const dir=path.join(root,'registry'),overlay=path.join(root,'overlay'),bin=path.join(root,'bin');
  for(const d of [dir,overlay,bin])fs.mkdirSync(d);
  fs.writeFileSync(path.join(bin,'grok'),'#!/bin/sh\nexit 99\n',{mode:0o755});
  fs.writeFileSync(path.join(overlay,'ROUTES.md'),'| Resource | Kind | CLI | Dispatch |\n|---|---|---|---|\n| grok-local | local | grok | supported task |\n');
  const scope=root.replace(/\\/g,'/').toLowerCase(),identity={id:'grok-local',account:'fixture',environment:scope,authenticated:true,source:'nonsecret fixture status',at:new Date().toISOString()};
  fs.writeFileSync(path.join(dir,'swarm-current-identities.json'),JSON.stringify({identities:[identity]}));
  const env={...process.env,BG_SWARM_DIR:dir,BGZFLOW_OVERLAY:overlay,PATH:bin+path.delimiter+process.env.PATH};
  const config={resources:['grok-local'],limit:{jobs,workerHours:4},reserve:{jobs:1,workerHours:1},wave0Sha:'a'.repeat(40),pieces:{p:{owns:['a.mjs'],goal:'Valid replies'}},policy:{modelUpdates:{enabled:true},providers:{'grok-local':{family:'fixture',qualificationCommand:['fixture-launch']}},preference:['grok-local'],autoAdoptNewFlagship:auto}};
  gate.startSwarm(root,'s',config,env);
  let launches=0;
  const runner=(cmd,args)=>({status:0,stdout:args.includes('--version')?'1.0':JSON.stringify({models:[{id:'new',flagship:true}],efforts:[{value:'strong'}]})});
  const launchRunner=()=>{launches++;return {status:0,stdout:JSON.stringify({jobId:'native-qualification'})};};
  return {root,dir,env,runner,launchRunner,launches:()=>launches};
}
function refresh(v,extra={}){assert.equal(typeof gate.refreshModels,'function');return gate.refreshModels(v.root,'s',{env:v.env,runner:v.runner,launchRunner:v.launchRunner,...extra});}
test('MW8 unfinished automatic model updates are off unless explicitly enabled',()=>{
  const v=fixture(),file=path.join(v.root,'.bgzflow/swarms/s.json'),s=JSON.parse(fs.readFileSync(file));delete s.policy.modelUpdates;fs.writeFileSync(file,JSON.stringify(s));
  const r=refresh(v);assert.equal(r.allowed,true);assert.equal(r.disabled,true);assert.equal(v.launches(),0);
});
test('MW1 phase-0 refresh queues an approved exact-flags qualification and charges its budget',()=>{
  const v=fixture(),r=refresh(v);assert.equal(v.launches(),1);assert.equal(r.qualifications.length,1);
  const s=gate.status(v.root,'s',v.env);assert.equal(s.used.jobs,1);assert.equal(s.dispatches[0].kind,'mechanical');assert.equal(s.dispatches[0].readOnly,true);assert.equal(s.dispatches[0].qualification,true);
  refresh(v);assert.equal(v.launches(),1,'a pending qualification is never replayed');
});
test('MW2 qualification bootstrap admits only its registered flags, scope and read-only header',()=>{
  const v=fixture();refresh(v);const j=gate.status(v.root,'s',v.env).dispatches[0];
  const command=`grok --model new --reasoning-effort strong --permission-mode plan --prompt-file "${j.promptFile}"`;
  const allowed=gate.checkDispatch(v.root,{jobId:j.id,command,promptFile:j.promptFile,resource:'grok-local',cwd:v.root},{env:v.env});
  assert.equal(allowed.allowed,true,allowed.reason);
  const wrong=gate.checkDispatch(v.root,{command:command.replace('strong','weaker'),promptFile:j.promptFile,resource:'grok-local',cwd:v.root},{env:v.env});assert.equal(wrong.allowed,false);
  fs.appendFileSync(path.join(v.root,'registry/swarm-current-identities.json'),' ');
  const data=JSON.parse(fs.readFileSync(path.join(v.root,'registry/swarm-current-identities.json')));data.identities[0].account='changed';fs.writeFileSync(path.join(v.root,'registry/swarm-current-identities.json'),JSON.stringify(data));
  assert.equal(gate.checkDispatch(v.root,{command,promptFile:j.promptFile,resource:'grok-local',cwd:v.root},{env:v.env}).allowed,false);
});
test('MW3 successful native qualification records observed flags and updates new dispatches without changing the swarm pin',()=>{
  const v=fixture();refresh(v);const before=gate.status(v.root,'s',v.env),j=before.dispatches[0];
  const r=gate.recordState(v.root,'qualification',{id:j.id,status:'completed',exitCode:0,model:'new',effort:'strong',evidence:'qualification.log',returnRef:'native-qualification'},'s',{env:v.env});assert.equal(r.allowed,true);
  const s=gate.status(v.root,'s',v.env);assert.deepEqual(s.modelMap,before.modelMap);assert.equal(s.modelUpdates.providers['grok-local'].mapping.standard.model,'new');assert.equal(s.modelUpdates.providers['grok-local'].autoAdopted,true);assert.equal(s.dispatches[0].status,'completed');
  const proofs=JSON.parse(fs.readFileSync(path.join(v.dir,'swarm-proven-routes.json'))).routes;assert.equal(proofs[0].observed.model,'new');
});
test('MW4 a wrong effective setting cannot qualify or open a provider tier',()=>{
  const v=fixture();refresh(v);const j=gate.status(v.root,'s',v.env).dispatches[0];
  const r=gate.recordState(v.root,'qualification',{id:j.id,status:'completed',exitCode:0,model:'wrong',effort:'strong',evidence:'qualification.log',returnRef:'native'},'s',{env:v.env});assert.equal(r.allowed,false);assert.equal(gate.status(v.root,'s',v.env).modelUpdates.providers['grok-local'].mapping.standard,null);
});
test('MW5 a qualification cannot consume the checks reserve or repeat an uncertain launch',()=>{
  const v=fixture({jobs:2});refresh(v);assert.equal(v.launches(),1);const w=fixture();let calls=0;refresh(w,{launchRunner:()=>{calls++;return {error:{code:'ETIMEDOUT'},status:null};}});refresh(w,{launchRunner:()=>{calls++;return {status:0};}});assert.equal(calls,1);assert.equal(gate.status(w.root,'s',w.env).dispatches[0].status,'uncertain');
});
test('MW6 the refresh CLI is wired and discovery outside a swarm launches no worker',()=>{
  const v=fixture();const r=gate.refreshModels(v.root,'absent',{env:v.env,runner:v.runner,launchRunner:v.launchRunner});assert.equal(r.allowed,false);assert.equal(v.launches(),0);
});
test('MW7 a model-not-found job forces phase-0 rediscovery before the seven-day expiry',()=>{
  const v=fixture();refresh(v);const j=gate.status(v.root,'s',v.env).dispatches[0];gate.recordState(v.root,'qualification',{id:j.id,status:'completed',exitCode:0,model:'new',effort:'strong',evidence:'probe.log',returnRef:'native'},'s',{env:v.env});
  const file=path.join(v.root,'build.md');fs.writeFileSync(file,'SWARM: s\nPIECE: p\nKIND: build\nOWNS: ["a.mjs"]\n\nRead bg-efficiency test-driven-development systematic-debugging verification-before-completion. Fast checks only. Proof handback. Done when replies validate.');
  assert.equal(gate.checkDispatch(v.root,{jobId:'build',resource:'grok-local',cwd:v.root,command:`grok --model new --reasoning-effort strong --prompt-file "${file}"`},{env:v.env,reserve:true}).allowed,true);
  gate.recordState(v.root,'job',{id:'build',status:'failed',error:'model not found',evidence:'failed.log'});
  const prior=gate.status(v.root,'s',v.env).modelUpdates.providers['grok-local'].verifiedOn,now=Date.parse(prior)+1000;refresh(v,{now});
  assert.equal(gate.status(v.root,'s',v.env).modelUpdates.providers['grok-local'].verifiedOn,new Date(now).toISOString());
});
