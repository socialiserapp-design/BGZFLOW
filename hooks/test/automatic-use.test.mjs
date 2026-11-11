import {realpathSync as canonicalTestPath} from 'node:fs'; // Resolve OS temp aliases before testing descendant link protection.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {handleFoundationEvent} from '../foundation.mjs';
import {readContinuity} from '../../tools/foundation/continuity.mjs';
import {discoverCatalog} from '../../tools/foundation/catalog.mjs';

function fixture(t){
 const root=fs.mkdtempSync(path.join(canonicalTestPath(os.tmpdir()),'bgz-live-delivery-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const project=path.join(root,'project');fs.mkdirSync(project);const skills=path.join(root,'skills');fs.mkdirSync(skills);
 for(const name of ['build','verify']){const dir=path.join(skills,name);fs.mkdirSync(dir);fs.writeFileSync(path.join(dir,'SKILL.md'),`---\nname: ${name}\ndescription: Relevant ${name} method\n---\n${name==='build'?'Preserve the original request. ':'Inspect the actual saved result. '}${'.'.repeat(6500)}`);}
 const catalog=discoverCatalog({roots:[skills]});let calls=0;
 const options={storageRoot:path.join(root,'store'),recall:false,routing:{catalog,decide:async({candidates,phase})=>{calls++;return{selectedIds:candidates.map(x=>x.id),strategy:phase==='verify'?'single':undefined};}}};
 return{input:{session_id:'native-use',cwd:project},options,catalog,calls:()=>calls};
}

test('native prompt context actually contains complete selected procedures and records exact prepared bytes',async t=>{
 const f=fixture(t);const result=await handleFoundationEvent({...f.input,hook_event_name:'UserPromptSubmit',prompt:'Fix the export and check the saved result.'},f.options);
 const context=result.hookSpecificOutput?.additionalContext||'';
 const events=readContinuity(f.input,f.options).events;
 const prepared=events.findLast(x=>x.event==='MethodContextPrepared');
 assert.equal(prepared.delivery.partial,false);assert.equal(prepared.delivery.methods.length,2);
 for(const entry of f.catalog){const body=fs.readFileSync(entry.path,'utf8');assert.ok(context.includes(body));const actual=prepared.delivery.methods.find(x=>x.id===entry.id);assert.equal(actual.bodyDigest,createHash('sha256').update(body).digest('hex'));assert.equal(actual.characters,body.length);assert.equal(actual.provided,true);}
 assert.match(prepared.delivery.evidence,/use and outcomes require separate/);
});

test('native edits avoid paid rerouting; verification refreshes selection once and greetings remain immediate',async t=>{
 const f=fixture(t);await handleFoundationEvent({...f.input,hook_event_name:'UserPromptSubmit',prompt:'Fix the export and check the saved result.'},f.options);
 const initial=f.calls();
 await handleFoundationEvent({...f.input,hook_event_name:'PreToolUse',tool_name:'Read',tool_input:{file_path:'sdk.mjs'}},f.options);assert.equal(f.calls(),initial);
 await handleFoundationEvent({...f.input,hook_event_name:'PreToolUse',tool_use_id:'edit-1',tool_name:'Edit',tool_input:{file_path:'export.mjs',new_string:'export const value=1;'}},f.options);
 const editCalls=f.calls();assert.equal(editCalls,initial);
 await handleFoundationEvent({...f.input,hook_event_name:'PostToolUse',tool_use_id:'edit-1',tool_name:'Edit',tool_input:{file_path:'export.mjs'},tool_response:{}},f.options);assert.equal(f.calls(),editCalls);
 await handleFoundationEvent({...f.input,hook_event_name:'PreToolUse',tool_name:'Bash',tool_input:{command:'npm test'}},f.options);
 const stages=readContinuity(f.input,f.options).events.filter(x=>x.selection).map(x=>x.selection.stage);
 assert.ok(!stages.includes('tool-activity:implementation'));assert.ok(stages.includes('tool-activity:verification'));
 const before=f.calls();const answer=await handleFoundationEvent({...f.input,hook_event_name:'UserPromptSubmit',prompt:'Thanks!'},f.options);assert.deepEqual(answer,{});assert.equal(f.calls(),before);
});

test('ordinary arithmetic replies do not discover or route skills, while mixed work still routes',async t=>{
 const f=fixture(t);
 const output=await handleFoundationEvent({...f.input,hook_event_name:'UserPromptSubmit',prompt:'What is 7 times 8? Just the answer, please.'},f.options);
 assert.match(output.hookSpecificOutput?.additionalContext||'',/BG Efficiency baseline/);assert.equal(f.calls(),0);
 const repeated=await handleFoundationEvent({...f.input,hook_event_name:'UserPromptSubmit',prompt:'What is 3 times 4?'},f.options);
 assert.deepEqual(repeated,{});assert.equal(f.calls(),0);
 await handleFoundationEvent({...f.input,hook_event_name:'UserPromptSubmit',prompt:'What is 7 times 8? Update the invoice too.'},f.options);
 assert.ok(f.calls()>0);
});

test('partial comparisons deliver checked bodies and retain unassessed sources through same-session restoration',async t=>{
 const f=fixture(t),root=path.dirname(path.dirname(f.catalog[0].path)),dir=path.join(root,'huge');fs.mkdirSync(dir);
 fs.writeFileSync(path.join(dir,'SKILL.md'),'---\nname: huge-unrelated\ndescription: An unrelated long reference\n---\n'+'.'.repeat(100000));
 f.options.routing.catalog=discoverCatalog({roots:[root]});
 const output=await handleFoundationEvent({...f.input,hook_event_name:'UserPromptSubmit',prompt:'Fix the export and inspect the actual saved result.'},f.options);
 const state=readContinuity(f.input,f.options),selection=state.events.findLast(x=>x.event==='RouteSelected').selection;
 assert.equal(selection.status,'partial');assert.equal(selection.selected.length,2);assert.equal(selection.comparisonDeferred.length,1);
 assert.match(selection.comparisonDeferred[0].id,/^skill-[0-9a-f]{24}$/);assert.match(output.hookSpecificOutput.additionalContext,/incomplete comparison/);
 const prepared=state.events.findLast(x=>x.event==='MethodContextPrepared');assert.equal(prepared.delivery.methods.filter(x=>x.provided).length,2);
 const calls=f.calls();
 assert.deepEqual(await handleFoundationEvent({...f.input,hook_event_name:'PostCompact'},f.options),{});
 const restored=await handleFoundationEvent({...f.input,hook_event_name:'SessionStart',source:'compact'},f.options);
 assert.equal(f.calls(),calls);assert.match(restored.hookSpecificOutput.additionalContext,/Unassessed nominee/);
});
