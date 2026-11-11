import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {captureEvent,readContinuity,renderContinuity} from '../continuity.mjs';

test('native worker followups stay on the observed owning assignment without inventing completion',t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'bgz-native-followup-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const input={cwd:root,session_id:'lead'},options={storageRoot:path.join(root,'history')};
 captureEvent({...input,hook_event_name:'UserPromptSubmit',prompt:'Repair the export and preserve existing formatting.'},options);
 captureEvent({...input,hook_event_name:'PreToolUse',tool_use_id:'spawn',tool_name:'collaboration.spawn_agent',tool_input:{task_name:'export-worker',message:'Repair only the agreed export.'}},options);
 captureEvent({...input,hook_event_name:'PostToolUse',tool_use_id:'spawn',tool_name:'collaboration.spawn_agent',tool_input:{task_name:'export-worker',message:'Repair only the agreed export.'},tool_response:{agent_id:'worker-17'}},options);
 for(const hook_event_name of ['PreToolUse','PostToolUse'])captureEvent({...input,hook_event_name,tool_use_id:'correction',tool_name:'collaboration.send_message',tool_input:{target:'worker-17',message:'Keep the original delimiter; the new wording was not approved.'},tool_response:{}},options);
 captureEvent({...input,hook_event_name:'Stop',last_assistant_message:'The worker received the correction.'},options);
 const state=readContinuity(input,options),view=state.nativeView;
 assert.equal(view.assignments.length,1);assert.equal(view.followups.length,1);assert.equal(view.followups[0].assignmentKey,view.assignments[0].key);assert.equal(view.followups[0].status,'host-returned');assert.equal(view.followups[0].verified,false);
 const restored=renderContinuity(state);assert.match(restored,/Agent-authored follow-up/);assert.match(restored,/preserve the original assignment/);assert.match(restored,/not approved/);
 assert.equal((restored.match(/Agent-authored follow-up to/g)||[]).length,1);assert.match(restored,/host-returned/);assert.match(restored,/Full record: /);
});

test('bounded recovery retains the latest followup and original-source pointer without the derived view',t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'bgz-followup-bounded-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const input={cwd:root,session_id:'lead'},options={storageRoot:path.join(root,'history'),recordView:false};
 let tick=0;options.now=()=>new Date(Date.UTC(2026,10,11,8,0,tick++)).toISOString();
 captureEvent({...input,hook_event_name:'UserPromptSubmit',prompt:'Repair only the export and preserve formatting.'},options);
 captureEvent({...input,hook_event_name:'PostToolUse',tool_use_id:'spawn',tool_name:'collaboration.spawn_agent',tool_input:{task_name:'export-worker',message:'Repair only the agreed export.'},tool_response:{agent_id:'worker-17'}},options);
 for(let index=0;index<4;index++){
  captureEvent({...input,hook_event_name:'PostToolUse',tool_use_id:`followup-${index}`,tool_name:'collaboration.send_message',tool_input:{target:'worker-17',message:`Correction ${index}: keep the export scoped. `+'Supporting context. '.repeat(100)},tool_response:{}},options);
 }
 captureEvent({...input,hook_event_name:'PostCompact',summary:'The worker was given corrections.'},options);
 const state=readContinuity(input,options),restored=renderContinuity(state,{maxChars:3000});
 assert.equal(state.nativeView,null);assert.ok(restored.length<=3000);assert.match(restored,/Correction 3: keep the export scoped/);assert.match(restored,/PARTIAL follow-up/);assert.match(restored,/earlier agent-authored follow-ups remain/);assert.match(restored,/Repair only the export and preserve formatting/);assert.match(restored,/Full record: \d{8}T/);assert.match(restored,/completed work are unverified/);
});
