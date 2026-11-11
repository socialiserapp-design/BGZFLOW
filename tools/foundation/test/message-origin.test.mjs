import {realpathSync as canonicalTestPath} from 'node:fs'; // Resolve OS temp aliases before testing descendant link protection.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {captureEvent,readContinuity,renderContinuity} from '../continuity.mjs';
import {readProjectRecall} from '../project-recall.mjs';
import {isAppGeneratedSuggestion} from '../message-origin.mjs';
import {handleFoundationEvent} from '../../../hooks/foundation.mjs';

const suggestion="This is an app-generated request for a suggested next user message. The user did not write this message.\n\nYour suggestion will appear in the user's empty message composer. They can ignore it.\nPredict a next message.";
function fixture(t){const base=fs.mkdtempSync(path.join(canonicalTestPath.native(os.tmpdir()),'bgz-origin-'));t.after(()=>fs.rmSync(base,{recursive:true,force:true}));const project=path.join(base,'project');fs.mkdirSync(project);return {input:{cwd:project,session_id:'native'},options:{storageRoot:path.join(base,'records'),route:false,recall:false}};}
test('composer envelope is excluded while genuine quotations and partial matches remain human',t=>{
  const {input,options}=fixture(t);
  for(const prompt of ['Keep the current calendar.',suggestion,'Explain this envelope: '+suggestion,'This is an app-generated request for a suggested next user message. The user did not write this message.'])captureEvent({...input,hook_event_name:'UserPromptSubmit',prompt},options);
  const state=readContinuity(input,options);assert.equal(state.messages.length,3);assert.equal(state.nativeView.humanMessages.length,3);
  assert.equal(state.messages[0].message,'Keep the current calendar.');assert.ok(state.messages[1].message.startsWith('Explain this envelope:'));
  assert.equal(state.events.filter(x=>x.messageOrigin==='app-generated-suggestion').length,1);
  assert.equal(isAppGeneratedSuggestion(suggestion.replace("user's","user’s")),true);
});
test('old records and schema4 views rebuild without rewriting original evidence or losing a correction/tool',t=>{
  const {input,options}=fixture(t);
  captureEvent({...input,hook_event_name:'UserPromptSubmit',prompt:'Keep offline access.'},options);
  const old=captureEvent({...input,hook_event_name:'UserPromptSubmit',prompt:suggestion},options);
  const data=JSON.parse(fs.readFileSync(old.file));delete data.messageOrigin;fs.writeFileSync(old.file,JSON.stringify(data)+'\n');
  captureEvent({...input,hook_event_name:'UserPromptSubmit',prompt:'Correction: use blue headers.'},options);
  captureEvent({...input,hook_event_name:'PreToolUse',tool_name:'Bash',tool_use_id:'pending'},options);
  const cache=path.join(path.dirname(old.dir),'record-view.json'),value=JSON.parse(fs.readFileSync(cache));value.schema=4;value.humanMessages.push({text:suggestion});value.cacheDigest=createHash('sha256').update(JSON.stringify({...value,cacheDigest:undefined})).digest('hex');fs.writeFileSync(cache,JSON.stringify(value));
  const bytes=fs.readFileSync(old.file),state=readContinuity(input,options);
  assert.equal(state.messages.length,2);assert.equal(state.nativeView.schema,5);assert.equal(state.nativeView.humanMessages.length,2);assert.equal(state.pendingTools.length,1);
  assert.match(renderContinuity(state),/Correction: use blue headers/);assert.doesNotMatch(renderContinuity(state),/Predict a next message/);assert.deepEqual(fs.readFileSync(old.file),bytes);
  const recalled=readProjectRecall({projectRoot:input.cwd,sessionId:'other'},options);assert.equal(recalled.records.filter(x=>x.kind==='historical-user-message').length,2);assert.ok(recalled.records.every(x=>!x.text?.includes('Predict a next message')));
});
test('native suggested prompt records provenance but never starts routing',async t=>{
  const {input,options}=fixture(t);let calls=0;
  const result=await handleFoundationEvent({...input,hook_event_name:'UserPromptSubmit',prompt:suggestion},{...options,route:true,routing:{catalog:[],decide:async()=>{calls++;return {selectedIds:[]};}}});
  assert.deepEqual(result,{});assert.equal(calls,0);assert.equal(readContinuity(input,options).messages.length,0);
});
