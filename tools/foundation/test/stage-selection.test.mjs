import test from 'node:test';
import assert from 'node:assert/strict';
import {derivePlanStage,routingEnvironmentFingerprint,canReuseContinuation,needsStageSelection,isConversationOnly} from '../stage-selection.mjs';

const plan=(text='Investigate existing package',eventId='before')=>({nativeView:{plan:{items:[{index:0,text,status:'in_progress'}],source:{eventId,kind:'PostToolUse'},hostOutcome:'host-returned'}}});
const base={catalog:[{id:'one',name:'one',version:'v1'}],privateCatalog:[],capabilities:{models:[{id:'local',available:true}]},policy:{offline:false},stage:'current-request'};

test('only clear conversational messages bypass skill discovery',()=>{
  for(const request of ['Hello!','Thanks a lot.','Any progress?','Are you still working?','Why are you taking so long to answer?','Why are you so slow with simple questions?'])assert.equal(isConversationOnly(request),true,request);
  for(const request of ['yes','continue','go ahead','Thanks, also delete the account.','Any progress? Fix the login.','Why are you so slow? Use /bgzflow:diagnosing-bugs.','Why is the app slow?','Correction: preserve offline access.','What is the status of the live server?','<send_user_message_question_reply>[]</send_user_message_question_reply>'])assert.equal(isConversationOnly(request),false,request);
});
test('pure confirmations skip discovery but never swallow a choice or extra instruction',()=>{
  for(const request of ["Yes, that's right", 'Yes, that’s correct.', "That's right!", 'That is correct.', 'Exactly.', 'Yes, exactly!', 'Correct.'])assert.equal(isConversationOnly(request),true,request);
  for(const request of ['yes', 'Yes, use drag order', 'Yes, chips in picker', 'Yes, run the test', "Yes, that's right, publish it", 'Exactly, but keep it offline', 'Correct the server configuration', 'Is that correct?', "Yes, that's right?", "That's right\nUse /bgzflow:jev-risk", "That's correct; use Jev", 'Yes, that is the wrong account'])assert.equal(isConversationOnly(request),false,request);
});
test('native active plan transition selects a new stage; duplicate pre/post events do not',()=>{
  const first=derivePlanStage(plan()),same=derivePlanStage(plan(undefined,'after')),next=derivePlanStage(plan('Verify actual saved result'));
  assert.equal(first.key,same.key);assert.notEqual(first.key,next.key);
  assert.match(first.context,/not user authority/);assert.match(first.context,/does not permit a new effect/);
  const environmentKey=routingEnvironmentFingerprint({...base,stage:first.stage});
  assert.equal(needsStageSelection({state:{...plan(),selection:{stage:first.stage,routingEnvironmentKey:environmentKey}},environmentKey}),null);
  assert.equal(needsStageSelection({state:{...plan('Verify actual saved result'),selection:{stage:first.stage,routingEnvironmentKey:environmentKey}},environmentKey}).key,next.key);
});
test('tool failures, prose, ambiguous and partial plans do not invent a stage',()=>{
  for(const state of [{tool:{status:'failed'}},{message:'time to release'},{nativeView:{plan:{partial:true,items:[{text:'Build',status:'in_progress'}]}}},{nativeView:{plan:{items:[{text:'A',status:'in_progress'},{text:'B',status:'in_progress'}]}}}])assert.equal(derivePlanStage(state),null);
});
test('proposed or failed plan updates do not become active routing stages',()=>{
  const proposed=plan();proposed.nativeView.plan.source.kind='PreToolUse';assert.equal(derivePlanStage(proposed),null);
  const failed=plan();failed.nativeView.plan.hostOutcome='host-reported-failure';assert.equal(derivePlanStage(failed),null);
});
test('short replies reuse only the same capabilities, policy and complete library',()=>{
  const environmentKey=routingEnvironmentFingerprint(base),previous={status:'selected',stage:base.stage,routingEnvironmentKey:environmentKey};
  const reuse=input=>canReuseContinuation({request:'yes',stage:base.stage,previous,environmentKey:routingEnvironmentFingerprint(input)});
  assert.equal(reuse(base),true);
  for(const changed of [{...base,capabilities:{models:[]}},{...base,policy:{offline:true}},{...base,catalog:[{...base.catalog[0],version:'v2'}]},{...base,privateCatalog:[{id:'private',name:'tested method',version:'v1'}]},{...base,budget:{timeoutMs:1000}}])assert.equal(reuse(changed),false);
  assert.equal(canReuseContinuation({request:'yes',stage:base.stage,previous:{status:'selected',stage:base.stage},environmentKey}),false);
  assert.equal(canReuseContinuation({request:'Correction: use blue',stage:base.stage,previous,environmentKey}),false);
  assert.equal(canReuseContinuation({request:'yes',stage:'new-stage',previous,environmentKey}),false);
});
test('fresh observation timestamps do not hide capability changes or reroute unchanged capacity',()=>{
  const fingerprint=capabilities=>routingEnvironmentFingerprint({...base,capabilities});
  assert.equal(fingerprint({models:[{id:'m',capacity:2,observedAt:'first'}]}),fingerprint({models:[{id:'m',capacity:2,observedAt:'later'}]}));
  assert.notEqual(fingerprint({models:[{id:'m',capacity:2,observedAt:'first'}]}),fingerprint({models:[{id:'m',capacity:0,observedAt:'later'}]}));
  assert.notEqual(fingerprint({expiresAt:'first'}),fingerprint({expiresAt:'later'}));
});
