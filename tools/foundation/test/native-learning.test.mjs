import {realpathSync as canonicalTestPath} from 'node:fs'; // Resolve OS temp aliases before testing descendant link protection.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {captureEvent,readContinuity} from '../continuity.mjs';
import {createNativeLearning} from '../native-learning.mjs';
import {createFoundationSession} from '../session.mjs';
import {loadSelectedSkills} from '../router.mjs';
import {renderMethodDelivery} from '../method-delivery.mjs';
import {handleFoundationEvent} from '../../../hooks/foundation.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex');
function fixture(t){const base=fs.mkdtempSync(path.join(canonicalTestPath.native(os.tmpdir()),'bgz-native-learning-'));t.after(()=>fs.rmSync(base,{recursive:true,force:true}));const projectRoot=path.join(base,'project'),home=path.join(base,'home'),storageRoot=path.join(base,'records');fs.mkdirSync(projectRoot);fs.mkdirSync(home);const input={cwd:projectRoot,session_id:'native'};captureEvent({...input,hook_event_name:'UserPromptSubmit',prompt:'Repair event ordering and retain the latest actual status.'},{storageRoot});const failure=captureEvent({...input,hook_event_name:'PostToolUse',tool_name:'Bash',tool_use_id:'failed-test',tool_response:{exit_code:1}},{storageRoot});return {base,projectRoot,home,storageRoot,sessionId:'native',input,failure};}
function owner(f){
  const script=path.join(f.base,'owner-check.mjs');
  fs.writeFileSync(script,`import fs from 'node:fs';let input='';for await(const part of process.stdin)input+=part;const {candidate}=JSON.parse(input);const unseen=process.argv[2]==='unseen';const rows=unseen?[{sequence:18,status:'closed'},{sequence:2,status:'open'}]:[{sequence:7,status:'paused'},{sequence:1,status:'open'}];const rule=JSON.parse(candidate.body);const selected=rule.strategy==='highest-sequence'?rows.reduce((a,b)=>a.sequence>b.sequence?a:b):rows.at(-1);fs.writeFileSync(${JSON.stringify(path.join(f.projectRoot,'observed-'))}+(unseen?'unseen':'regression')+'.json',JSON.stringify(selected));console.log(JSON.stringify({matches:selected.status===(unseen?'closed':'paused')}));`);
  const checks=['regression','unseen'].map(kind=>({id:kind,kind,command:{file:process.execPath,args:[script,kind]},sources:[script],sourceDigests:{[script]:hash(fs.readFileSync(script))}}));
  const file=path.join(f.home,'.bgzflow/native-learning/checks.json');fs.mkdirSync(path.dirname(file),{recursive:true});
  const config={projectRoot:fs.realpathSync.native(f.projectRoot),improvementChecks:checks,baselineCandidate:{body:JSON.stringify({strategy:'last-array-row'})}};
  fs.writeFileSync(file,JSON.stringify({schema:1,projects:{[hash(config.projectRoot)]:config}}));return {file,script};
}
const proposal=f=>({name:'latest-status',description:'Recover event status by authoritative sequence',body:JSON.stringify({strategy:'highest-sequence'}),evidenceEventId:f.failure.event.id});
test('actual failed commands are captured automatically; absent checks retain a proposal without self-certification',async t=>{
  const f=fixture(t),bridge=createNativeLearning(f);assert.equal(bridge.status().failures.length,1);
  const result=await bridge.propose({...proposal(f),checks:{matches:true},improvementChecks:[{passed:true}]});assert.equal(result.status,'proposed');assert.equal(bridge.status().adopted.length,0);assert.equal((await bridge.evaluate({id:result.id})).status,'unverified');
  assert.equal(createFoundationSession(f).current().request,null);
  assert.equal(createFoundationSession(f).current().improvements[0].evidenceEventId,f.failure.event.id);
  assert.equal((await bridge.propose(proposal(f))).reused,true);
  await assert.rejects(bridge.propose({...proposal(f),evidenceEventId:'invented'}),/actual captured/);
});
test('configured baseline/regression/unseen effects adopt privately and deliver the whole method in a later session',async t=>{
  const f=fixture(t);owner(f);const bridge=createNativeLearning(f),result=await bridge.propose(proposal(f));assert.equal(result.status,'adopted');
  assert.equal(JSON.parse(fs.readFileSync(path.join(f.projectRoot,'observed-unseen.json'))).status,'open'); // baseline runs last; its failure is retained
  const next=createFoundationSession({...f,sessionId:'later'}),catalog=next.privateCatalogue();assert.equal(catalog.length,1);
  const selection=await next.select({request:'Recover the newest event status',catalog,explicitSkills:[catalog[0].id],decide:async item=>({selectedIds:item.candidates.map(x=>x.id),strategy:'single'})});
  const bodies=loadSelectedSkills(selection);assert.equal(bodies[0].body,proposal(f).body);assert.match(renderMethodDelivery(selection,{loadSelectedSkills}),/highest-sequence/);
  bridge.rollback({id:result.id});assert.equal(next.privateCatalogue().length,0);
});
test('changed owner checker is rejected before any execution or adoption',async t=>{
  const f=fixture(t),configured=owner(f);fs.appendFileSync(configured.script,'\n// altered checker');const result=await createNativeLearning(f).propose(proposal(f));assert.equal(result.status,'proposed');assert.equal(fs.existsSync(path.join(f.projectRoot,'observed-unseen.json')),false);
});
test('native failures are captured without repeated prompts or reply gates',async t=>{
  const f=fixture(t);const result=await handleFoundationEvent({...f.input,hook_event_name:'PostToolUseFailure',tool_name:'Bash',tool_use_id:'second',tool_response:{exit_code:1}},{storageRoot:f.storageRoot,route:false,recall:false});assert.deepEqual(result,{});assert.equal(createNativeLearning(f).status().failures.length,2);assert.equal(readContinuity(f.input,{storageRoot:f.storageRoot}).messages.length,1);
});
test('actual native CLI reaches the same automatically captured failure store without a model',t=>{
  const f=fixture(t),entry=fileURLToPath(new URL('../bgz.mjs',import.meta.url));
  const result=spawnSync(process.execPath,[entry,'learning','status','--project',f.projectRoot,'--session',f.sessionId],{encoding:'utf8',windowsHide:true,timeout:10000,env:{...process.env,BGZFLOW_CONTINUITY_HOME:f.storageRoot}});
  assert.equal(result.status,0,result.stderr);const status=JSON.parse(result.stdout);assert.equal(status.failures[0].eventId,f.failure.event.id);assert.equal(status.adopted.length,0);
});
