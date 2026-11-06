import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {captureEvent,readContinuity} from '../continuity.mjs';
import {renderRecordView} from '../record-view.mjs';
import {derivePlanStage} from '../stage-selection.mjs';

function fixture(t){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'bgz-native-plan-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  const project=path.join(root,'project');fs.mkdirSync(project);let n=0;
  const input={cwd:project,session_id:'desktop-plan'},options={storageRoot:path.join(root,'store'),now:()=>new Date(Date.UTC(2026,10,5,3,0,n++)).toISOString()};
  const record=(event,tool,id,args,response)=>captureEvent({...input,hook_event_name:event,tool_name:`mcp__ccd_turn__${tool}`,tool_use_id:id,...(args?{tool_input:args}:{}),...(response?{tool_response:response}:{})},options);
  const pre=(id,args,tool='update_plan')=>record('PreToolUse',tool,id,args);
  const post=(id,args,tool='update_plan',response)=>record('PostToolUse',tool,id,args,response);
  const run=(id,args,tool='update_plan')=>{pre(id,args,tool);return post(id,undefined,tool);};
  const view=()=>readContinuity(input,options).nativeView;
  return {root,project,input,options,pre,post,run,record,view};
}
const items=()=>[{content:'Inspect requested file',status:'in_progress',session:'reader'},{content:'Apply correction',status:'pending'},{content:'Check real saved result',status:'pending'}];

test('documented native replacement and advance preserve source, scope and delegation without verified completion',t=>{
  const f=fixture(t);f.run('replace',{scope:'first_task',items:items()});
  let view=f.view();assert.equal(view.plan.scope,'first_task');assert.equal(view.plan.items[0].session,'reader');assert.equal(view.plan.correlation,'matched-original-request');assert.ok(view.plan.requestSource.eventId);
  const request=f.pre('advance',{advance:true});f.post('advance');
  view=f.view();assert.deepEqual(view.plan.items.map(item=>item.status),['completed','in_progress','pending']);assert.equal(view.plan.requestSource.eventId,request.event.id);assert.equal(view.plan.verified,false);assert.equal(derivePlanStage({nativeView:view}).label,'Apply correction');
  f.post('advance',{advance:true});f.pre('advance',{advance:true});f.post('advance');
  assert.deepEqual(f.view().plan.items.map(item=>item.status),['completed','in_progress','pending'],'replay must not advance twice');
});

test('documented indexed updates are one-based and invalid indices do not invent plan state',t=>{
  const f=fixture(t);f.run('replace',{scope:'first_task',items:items()});f.run('indexed',{done:[1],start:3});
  assert.deepEqual(f.view().plan.items.map(item=>item.status),['completed','pending','in_progress']);
  f.run('outside',{done:[9]});const view=f.view();assert.equal(view.planCoverage.status,'uncertain');assert.equal(derivePlanStage({nativeView:view}),null);assert.match(view.planCoverage.reason,/outside/);
});

test('observed native advance proceeds forward after an out-of-order start and wrap-up checks the skipped step',t=>{
  const f=fixture(t);f.run('replace',{items:['A','B','C','D'].map((content,index)=>({content,status:index===0?'in_progress':'pending'}))});
  f.run('jump',{done:[1],start:3});f.run('advance',{advance:true});
  assert.deepEqual(f.view().plan.items.map(item=>item.status),['completed','pending','completed','in_progress']);
  f.run('last',{advance:true});assert.equal(f.view().plan.reportedComplete,false);assert.equal(f.view().plan.items[1].status,'pending');
  f.run('wrap',{recap:'The app task list is checked off.'},'wrap_up');assert.ok(f.view().plan.items.every(item=>item.status==='completed'));assert.equal(f.view().plan.verified,false);
});

test('wrap-up preserves displayed question and options but cannot verify work or settle pending effects',t=>{
  const f=fixture(t);fs.writeFileSync(path.join(f.project,'saved.json'),'[]');f.run('replace',{scope:'first_task',items:items()});
  f.record('PreToolUse','save','pending-save',{});
  f.run('wrap',{recap:'The task list is complete; the saved result still needs checking.',ask:'Check the saved result now?',actions:[{label:'Check now'},{label:'Later'}],blocked:true},'wrap_up');
  const view=f.view();assert.equal(view.plan.reportedComplete,true);assert.equal(view.plan.verified,false);assert.ok(view.plan.items.every(item=>item.status==='completed'));assert.equal(view.questions.at(-1).status,'unanswered');assert.equal(view.questions.at(-1).options[0].label,'Check now');
  assert.equal(view.wrapUp.blocked,true);assert.equal(view.application,null);assert.ok(view.operations.some(item=>item.status==='unresolved-recorded-request'));assert.deepEqual(JSON.parse(fs.readFileSync(path.join(f.project,'saved.json'))),[]);
  const text=renderRecordView(view,{maxChars:6000});assert.match(text,/Check the saved result now/);assert.match(text,/Check now/);assert.match(text,/verified:false/);
});

test('failed, stale, out-of-order and unsupported successful native operations retain honest coverage',t=>{
  const f=fixture(t);f.run('replace',{items:items()});const first=f.view().plan.source.eventId;
  f.pre('rejected',{advance:true});f.record('PostToolUseFailure','update_plan','rejected',undefined,{is_error:true});assert.equal(f.view().plan.source.eventId,first);assert.equal(f.view().planCoverage.status,'acknowledged');
  f.pre('old',{advance:true});f.run('new-plan',{scope:'continuation',items:[{content:'Check corrected request',status:'in_progress'}]});f.post('old');
  let view=f.view();assert.equal(view.plan.items[0].text,'Check corrected request');assert.equal(view.planCoverage.status,'uncertain');assert.equal(derivePlanStage({nativeView:view}),null);
  f.run('recover',{items:items()});f.post('orphan',{advance:true});assert.match(f.view().planCoverage.reason,/no matching/);
  f.run('recover-again',{items:items()});f.run('unknown',{unexpected:true});view=f.view();assert.equal(view.planCoverage.status,'uncertain');assert.match(view.planCoverage.reason,/unsupported/);
  f.run('fresh',{items:items()});assert.equal(f.view().planCoverage.status,'acknowledged');assert.ok(derivePlanStage({nativeView:f.view()}));
});

test('concurrent advances cannot apply twice against the same acknowledged revision',t=>{
  const f=fixture(t);f.run('replace',{items:items()});f.pre('one',{advance:true});f.pre('two',{advance:true});f.post('one');f.post('two');
  const view=f.view();assert.deepEqual(view.plan.items.map(item=>item.status),['completed','in_progress','pending']);assert.equal(view.planCoverage.status,'uncertain');assert.equal(view.plan.verified,false);
});

test('last advance and parallel wrap-up share a lineage but never close an external operation',t=>{
  const f=fixture(t);f.run('replace',{items:[{content:'Inspect saved output',status:'in_progress'}]});f.pre('last',{advance:true});f.pre('wrap',{recap:'Reported complete.'},'wrap_up');f.post('last');f.post('wrap',undefined,'wrap_up');
  const view=f.view();assert.equal(view.planCoverage.status,'acknowledged');assert.equal(view.plan.reportedComplete,true);assert.equal(view.plan.verified,false);
});
