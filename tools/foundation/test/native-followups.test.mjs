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
});
