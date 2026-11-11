import {realpathSync as canonicalTestPath} from 'node:fs'; // Resolve OS temp aliases before testing descendant link protection.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {handleFoundationEvent} from '../foundation.mjs';
import {handleAgyFoundation} from '../foundation-agy.mjs';
import {completionReviewContext} from '../../tools/foundation/completion-review.mjs';
import {readContinuity} from '../../tools/foundation/continuity.mjs';

function fixture(t){
  const root=fs.mkdtempSync(path.join(canonicalTestPath.native(os.tmpdir()),'bgz-completion-review-'));
  t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  const input={cwd:root,session_id:'review-fixture'};
  let calls=0;
  const options={storageRoot:path.join(root,'store'),recall:false,route:false,routing:{decide:async()=>{calls++;throw Error('No paid selector expected');}}};
  return {root,input,options,calls:()=>calls,
    send:async event=>handleFoundationEvent({...input,...event},options)};
}
const context=result=>result.hookSpecificOutput?.additionalContext||'';
const edit={hook_event_name:'PostToolUse',tool_name:'Edit',tool_input:{file_path:'src/export.js',old_string:'bad',new_string:'fixed'},tool_response:{changed:true}};

test('successful edit delivers scope choice and independent conditional Expo guidance with no selector call',async t=>{
  const f=fixture(t);
  await f.send({hook_event_name:'UserPromptSubmit',prompt:'Fix the backend export corruption.'});
  const text=context(await f.send(edit));
  assert.match(text,/BGZFLOW completion review/);
  assert.match(text,/main agent chooses scope/);
  assert.match(text,/repair cause, callers and regressions/);
  assert.match(text,/Neither skill requires the other/);
  assert.match(text,/spending authority/);
  assert.match(text,/not evidence that a review happened/);
  assert.equal(f.calls(),0);
  const events=readContinuity(f.input,f.options).events;
  assert.equal(events.filter(e=>e.event==='RouteSelected').length,0);
  assert.equal(events.filter(e=>e.tool?.name==='Edit').length,1);
  assert.equal(events.filter(e=>e.tool&&e.tool.name!=='Edit').length,0);
});

test('batch edits and duplicate results deliver once; a later substantive request gets its own reminder',async t=>{
  const f=fixture(t);
  await f.send({hook_event_name:'UserPromptSubmit',prompt:'Build the export feature.'});
  assert.match(context(await f.send(edit)),/completion review/);
  assert.equal(context(await f.send(edit)),'');
  assert.equal(context(await f.send({...edit,tool_input:{file_path:'other.js'}})),'');
  assert.equal(context(await f.send({hook_event_name:'UserPromptSubmit',prompt:'Thanks!'})),'');
  await f.send({hook_event_name:'UserPromptSubmit',prompt:'Repair the import feature next.'});
  assert.match(context(await f.send(edit)),/completion review/);
});

test('failed, denied, no-op, proposed, read-only and ambiguous wrapper calls do not assert an edit',async t=>{
  const f=fixture(t);
  await f.send({hook_event_name:'UserPromptSubmit',prompt:'Investigate the export feature.'});
  const cases=[
    {...edit,hook_event_name:'PreToolUse'},
    {...edit,hook_event_name:'PostToolUseFailure'},
    {...edit,tool_response:{isError:true}},
    {...edit,tool_response:{status:'denied'}},
    {...edit,tool_response:{exit_code:1}},
    {...edit,tool_response:{success:false}},
    {...edit,tool_response:{changed:false}},
    {...edit,tool_response:{changes:0}},
    {...edit,tool_response:'No changes made.'},
    {...edit,tool_response:'No changes to apply.'},
    {...edit,tool_input:{old_string:'same',new_string:'same'}},
    {...edit,tool_input:JSON.stringify({old_string:'same',new_string:'same'})},
    {...edit,tool_name:'Read'},
    {...edit,tool_name:'Bash',tool_input:{command:'cat src/export.js'},tool_response:{exit_code:0}},
    {...edit,tool_name:'functions.exec',tool_input:{input:'if (false) await tools.apply_patch(patch);'},tool_response:{exit_code:0}}
  ];
  for(const event of cases){assert.equal(completionReviewContext(event),null);assert.doesNotMatch(context(await f.send(event)),/BGZFLOW completion review/);}
  assert.equal(f.calls(),0);
});

test('a native context reset restores the reminder without another edit or paid request',async t=>{
  const f=fixture(t);
  await f.send({hook_event_name:'UserPromptSubmit',prompt:'Fix the export feature.'});
  await f.send(edit);
  assert.deepEqual(await f.send({hook_event_name:'PostCompact'}),{});
  const restored=context(await f.send({hook_event_name:'PreToolUse',tool_name:'Read',tool_input:{file_path:'src/export.js'}}));
  assert.match(restored,/BGZFLOW completion review/);
  assert.doesNotMatch(context(await f.send(edit)),/BGZFLOW completion review/);
  assert.equal(f.calls(),0);
});

test('Antigravity defers review context until a supported invocation and preserves ephemeral delivery',async t=>{
  const f=fixture(t),raw={conversationId:f.input.session_id,workspacePaths:[f.root]};
  await handleAgyFoundation({...raw,prompt:'Build the export feature.'},'UserPromptSubmit',f.options);
  const post=await handleAgyFoundation({...raw,toolCall:{name:'write_to_file',args:{TargetFile:path.join(f.root,'notes.txt'),CodeContent:'feature'}}},'PostToolUse',f.options);
  assert.deepEqual(post,{});
  const first=await handleAgyFoundation(raw,'PreInvocation',f.options);
  assert.match(JSON.stringify(first.injectSteps),/BGZFLOW completion review/);
  const second=await handleAgyFoundation(raw,'PreInvocation',f.options);
  assert.match(JSON.stringify(second.injectSteps),/BGZFLOW completion review/);
  assert.equal(f.calls(),0);
});

test('Stop does not become a new review gate or restart a completed turn',async t=>{
  const f=fixture(t);
  await f.send({hook_event_name:'UserPromptSubmit',prompt:'Repair the export feature.'});
  await f.send(edit);
  assert.deepEqual(await f.send({hook_event_name:'Stop',last_assistant_message:'Done.'}),{});
  assert.equal(f.calls(),0);
});
