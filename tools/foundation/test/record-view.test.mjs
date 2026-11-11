import {realpathSync as canonicalTestPath} from 'node:fs'; // Resolve OS temp aliases before testing descendant link protection.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { captureEvent, readContinuity, renderContinuity } from '../continuity.mjs';
import { readRecordView, readProjectRecordViews, renderRecordView } from '../record-view.mjs';
import { createFoundationSession } from '../session.mjs';
import { handleFoundationEvent } from '../../../hooks/foundation.mjs';

function fixture(t) {
  const root=fs.mkdtempSync(path.join(canonicalTestPath(os.tmpdir()),'bgz-native-current-'));
  t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  const projectRoot=path.join(root,'project');fs.mkdirSync(projectRoot);
  const input={cwd:projectRoot,session_id:'provider-a'};
  const options={storageRoot:path.join(root,'store'),route:false};let n=0;
  options.now=()=>new Date(Date.UTC(2026,10,5,2,0,n++)).toISOString();
  const record=value=>captureEvent({...input,...value},options);
  return {root,projectRoot,input,options,record,view:()=>readContinuity(input,options).nativeView};
}

test('long quotations cannot hide latest correction, current plan or unresolved work in bounded restoration',t=>{
  const f=fixture(t);
  for(let i=0;i<10;i++)f.record({hook_event_name:'UserPromptSubmit',prompt:`Earlier discussion ${i}: `+'background '.repeat(450)});
  f.record({hook_event_name:'UserPromptSubmit',prompt:'Correction: use blue headers and retain offline access.'});
  f.record({hook_event_name:'PreToolUse',tool_name:'save-calendar',tool_use_id:'pending'});
  f.record({hook_event_name:'PostToolUse',tool_name:'update_plan',tool_use_id:'stage',tool_input:{plan:[{step:'Verify saved calendar',status:'in_progress'}]}});
  f.record({hook_event_name:'PreToolUse',tool_name:'AskUserQuestion',tool_use_id:'question',tool_input:{questions:[{question:'Which calendar should be used?',header:'Calendar',options:[]}]}});
  const state=readContinuity(f.input,f.options);
  for(const text of [renderRecordView(state.nativeView,{maxChars:5000}),renderContinuity(state,{maxChars:5000})]){
    assert.ok(text.length<=5000);assert.match(text,/save-calendar/);assert.match(text,/Verify saved calendar/);assert.match(text,/Correction: use blue headers/);assert.match(text,/Which calendar/);assert.match(text,/PARTIAL/);
  }
});

test('normal native events automatically maintain source messages, matching questions, plan and ownership observations',t=>{
  const f=fixture(t),first=f.record({hook_event_name:'UserPromptSubmit',prompt:'Build a calendar with red headers; preserve offline access.'});
  f.record({hook_event_name:'UserPromptSubmit',prompt:'Correction: use blue headers.'});
  f.record({hook_event_name:'PreToolUse',tool_name:'request_user_input_async',tool_use_id:'call_01a1a94679587fb1b25e122d20a6b776AAAA',tool_input:{questions:[{id:'colour',title:'Which colour?'}]}});
  const reply='<send_user_message_question_reply>\n'+JSON.stringify([{questionItemId:JSON.stringify(['request_user_input_async','call_01a1a94679587fb1b25e122d20a6b776AAAA',0]),question:'Which colour?',answer:'Blue'}])+'\n</send_user_message_question_reply>';
  const answer=f.record({hook_event_name:'UserPromptSubmit',prompt:reply});
  f.record({hook_event_name:'PostToolUse',tool_name:'Agent',tool_use_id:'assignment',tool_input:{description:'Calendar',prompt:'Use blue and keep offline access.',subagent_type:'builder'},tool_response:{agent_id:'child-one'}});
  f.record({hook_event_name:'PreToolUse',tool_name:'Write',tool_use_id:'save-one',tool_input:{file_path:'chart.json'}});
  f.record({hook_event_name:'PostToolUse',tool_name:'update_plan',tool_use_id:'plan',tool_input:{plan:[{step:'Build calendar',status:'in_progress'},{step:'Check real effect',status:'pending'}]}});
  const view=f.view();
  assert.equal(view.firstHuman.source.eventId,first.event.id);
  assert.ok(view.humanMessages.some(item=>item.text==='Correction: use blue headers.'));
  assert.equal(view.questions[0].status,'answered');assert.equal(view.questions[0].answer.text,'Blue');assert.equal(view.questions[0].answer.source.eventId,answer.event.id);
  assert.equal(view.assignments[0].childId,'child-one');assert.equal(view.assignments[0].verified,false);
  assert.equal(view.operations.find(item=>item.name==='Write').status,'unresolved-recorded-request');assert.equal(view.plan.items[1].status,'pending');
  assert.ok(fs.existsSync(path.join(path.dirname(first.dir),'record-view.json')));
  const current=createFoundationSession({projectRoot:f.projectRoot,sessionId:f.input.session_id,storageRoot:f.options.storageRoot}).current();
  assert.equal(current.request,null);assert.equal(current.native.questions[0].answer.text,'Blue');
});

test('native reported-complete todo and stopped workers never establish a real saved effect',t=>{
  const f=fixture(t);fs.writeFileSync(path.join(f.projectRoot,'saved-items.json'),'[]');
  f.record({hook_event_name:'PostToolUse',tool_name:'TodoWrite',tool_use_id:'todo',tool_input:{todos:[{content:'Save newsletter',status:'completed',activeForm:'Saving newsletter'}]}});
  f.record({hook_event_name:'PreToolUse',tool_name:'publish',tool_use_id:'publish-one'});
  f.record({hook_event_name:'SubagentStart',agent_id:'child'});f.record({hook_event_name:'SubagentStop',agent_id:'child'});f.record({hook_event_name:'Stop'});f.record({hook_event_name:'SessionEnd'});
  const view=f.view();assert.equal(view.plan.reportedComplete,true);assert.equal(view.plan.verified,false);assert.equal(view.workers[0].state,'stopped');assert.equal(view.workers[0].verified,false);
  assert.equal(view.operations.find(item=>item.name==='publish').status,'unresolved-recorded-request');assert.deepEqual(JSON.parse(fs.readFileSync(path.join(f.projectRoot,'saved-items.json'))),[]);
  assert.match(renderRecordView(view),/no user outcome verified|not.*verified|verified:false/);
});

test('current project view recovers separate host sessions without API calls or cross-project leakage',async t=>{
  const f=fixture(t);
  f.record({hook_event_name:'UserPromptSubmit',prompt:'Keep blue calendar headers.'});
  f.record({hook_event_name:'PostToolUse',tool_name:'update_plan',tool_use_id:'plan',tool_input:{plan:[{step:'Verify blue calendar',status:'pending'}]}});
  f.record({session_id:'another-task',hook_event_name:'UserPromptSubmit',prompt:'Draft the separate marketing plan.'});
  const other=path.join(f.root,'other');fs.mkdirSync(other);captureEvent({cwd:other,session_id:'elsewhere',hook_event_name:'UserPromptSubmit',prompt:'PRIVATE OTHER PROJECT'},f.options);
  const project=readProjectRecordViews({projectRoot:f.projectRoot,sessionId:'provider-b'},f.options);
  assert.equal(project.sessions.length,2);assert.ok(!JSON.stringify(project).includes('PRIVATE OTHER PROJECT'));assert.equal(project.sessions[0].sessionKey===project.sessions[1].sessionKey,false);
  const restored=await handleFoundationEvent({cwd:f.projectRoot,session_id:'provider-b',hook_event_name:'SessionStart'},{...f.options,recall:true});
  assert.match(restored.hookSpecificOutput.additionalContext,/Verify blue calendar/);assert.match(restored.hookSpecificOutput.additionalContext,/Separate recorded session/);assert.match(restored.hookSpecificOutput.additionalContext,/not automatically merged/);
  const privateSession=await handleFoundationEvent({cwd:f.projectRoot,session_id:'without-recall',hook_event_name:'SessionStart'},f.options);
  assert.doesNotMatch(privateSession.hookSpecificOutput?.additionalContext||'',/Verify blue calendar|PRIVATE OTHER PROJECT/);
});

test('missing, corrupt, stale and interrupted derived caches rebuild from original events without stale locks',t=>{
  const f=fixture(t),captured=f.record({hook_event_name:'UserPromptSubmit',prompt:'Original request.'});const cache=path.join(path.dirname(captured.dir),'record-view.json');
  const loc={...captured,projectRoot:f.projectRoot};
  fs.unlinkSync(cache);assert.equal(readRecordView(loc).humanMessages[0].text,'Original request.');
  fs.writeFileSync(cache,'{interrupted');assert.equal(readRecordView(loc).humanMessages[0].text,'Original request.');
  captureEvent({...f.input,hook_event_name:'UserPromptSubmit',prompt:'Later correction.'},{...f.options,recordView:false});
  fs.writeFileSync(cache+'.lock',JSON.stringify({pid:2147483647}));
  assert.equal(readRecordView(loc).humanMessages.at(-1).text,'Later correction.');
  const damaged=JSON.parse(fs.readFileSync(cache,'utf8'));damaged.humanMessages[0].source.fileName='../../escape.json';fs.writeFileSync(cache,JSON.stringify(damaged));
  assert.equal(readRecordView(loc).humanMessages[0].source.fileName,path.basename(captured.file));
});

test('parallel native hook processes cannot erase each other from the derived current view',async t=>{
  const f=fixture(t),moduleUrl=new URL('../continuity.mjs',import.meta.url).href;
  await Promise.all(Array.from({length:6},(_,index)=>new Promise((resolve,reject)=>{
    const script=`import{captureEvent}from ${JSON.stringify(moduleUrl)};captureEvent(${JSON.stringify({...f.input,hook_event_name:'UserPromptSubmit',prompt:`Concurrent source ${index}`})},${JSON.stringify({storageRoot:f.options.storageRoot})});`;
    const child=spawn(process.execPath,['--input-type=module','-e',script],{stdio:['ignore','ignore','pipe'],windowsHide:true});let error='';child.stderr.on('data',part=>error+=part);child.on('error',reject);child.on('close',code=>code===0?resolve():reject(Error(error)));
  })));
  const view=f.view();assert.equal(view.humanMessages.length,6);assert.equal(new Set(view.humanMessages.map(item=>item.source.eventId)).size,6);
});

test('bounded view reports partial history while originals remain intact and summaries stay subordinate',t=>{
  const f=fixture(t);for(let n=0;n<45;n++)f.record({hook_event_name:'UserPromptSubmit',prompt:`Human instruction ${n}.`});
  const view=f.view();assert.equal(view.partial,true);assert.ok(view.humanMessages.length<=40);
  assert.equal(readContinuity(f.input,f.options).messages.length,45);assert.ok(renderRecordView(view,{maxChars:500}).length<=500);assert.match(renderRecordView(view,{maxChars:500}),/PARTIAL/);
  captureEvent({...f.input,hook_event_name:'FoundationState',foundation:{schema:1,request:{text:'AGENT INTERPRETATION',revision:'r'},questions:[],decisions:[],assignments:[],outcomes:[]}},{...f.options,internal:true});
  assert.equal(f.view().application.request.text,'AGENT INTERPRETATION');assert.match(f.view().application.classification,/separate from raw human authority/);
  assert.match(renderContinuity(readContinuity(f.input,f.options)),/Human instruction/);
});

test('partial plans cannot report complete and post-tool metadata cannot erase an original assignment',t=>{
  const f=fixture(t);
  const task=f.record({hook_event_name:'PreToolUse',tool_name:'Agent',tool_use_id:'one',tool_input:{description:'Actual brief',prompt:'Preserve the whole requested flow.',subagent_type:'builder'}});
  f.record({hook_event_name:'PostToolUse',tool_name:'Agent',tool_use_id:'one',tool_response:{agent_id:'child'}});
  f.record({hook_event_name:'PostToolUse',tool_name:'TodoWrite',tool_use_id:'todos',tool_input:{todos:[...Array.from({length:40},(_,n)=>({content:`Done ${n}`,status:'completed'})),{content:'Still pending',status:'pending'}]}});
  const view=f.view();assert.equal(view.assignments[0].instruction,'Preserve the whole requested flow.');assert.equal(view.assignments[0].source.eventId,task.event.id);assert.equal(view.plan.reportedComplete,false);assert.equal(view.partial,true);
});

test('host final assistant questions remain quoted source alongside later human corrections',t=>{
  const f=fixture(t);
  f.record({hook_event_name:'UserPromptSubmit',prompt:'Only interview me about the calendar.'});
  const assistant=f.record({hook_event_name:'Stop',last_assistant_message:'Which audience is this for? Which platforms matter? I propose red headers; nothing has been built.'});
  f.record({hook_event_name:'UserPromptSubmit',prompt:'Families, on the web. Use blue rather than red.'});
  const view=f.view();assert.equal(view.assistantMessages[0].source.eventId,assistant.event.id);assert.match(view.assistantMessages[0].text,/Which audience/);
  assert.equal(view.questions.length,0);assert.equal(view.application,null);assert.match(view.humanMessages.at(-1).text,/blue rather than red/);
  const rendered=renderRecordView(view);assert.match(rendered,/Quoted assistant source/);assert.match(rendered,/not a human instruction/);
  f.record({hook_event_name:'SubagentStop',agent_id:'child',last_assistant_message:'The worker claims done.'});assert.equal(f.view().workers[0].verified,false);
});

test('large source directories retain the newest correction and pending operation after a bounded rebuild',t=>{
  const f=fixture(t),base=f.record({hook_event_name:'SessionStart'}),root=fs.realpathSync.native(f.projectRoot);
  const sessionKey=createHash('sha256').update(f.input.session_id).digest('hex');
  for(let n=0;n<4110;n++){
    const at=new Date(Date.UTC(2020,0,1,0,0,n)).toISOString(),id=randomUUID();
    const event={schema:1,id,at,order:String(n),event:'UserPromptSubmit',sessionId:f.input.session_id,sessionKey,projectRoot:root,message:`Older unrelated source ${n}`};
    fs.writeFileSync(path.join(base.dir,`${at.replace(/[^0-9TZ]/g,'')}-${id}.json`),JSON.stringify(event));
  }
  const correction=f.record({hook_event_name:'UserPromptSubmit',prompt:'Latest correction: preserve the blue calendar and offline access.'});
  f.record({hook_event_name:'PreToolUse',tool_name:'publish',tool_use_id:'latest-pending'});
  fs.unlinkSync(path.join(path.dirname(base.dir),'record-view.json'));
  const started=performance.now(),view=f.view();t.diagnostic(`Cold bounded recovery from 4113 event files: ${Math.round(performance.now()-started)}ms`);assert.equal(view.partial,true);assert.ok(view.humanMessages.some(item=>item.source.eventId===correction.event.id));assert.ok(view.operations.some(op=>op.name==='publish'&&op.status==='unresolved-recorded-request'));
  assert.ok(view.appliedNames.length<=1024);assert.equal(view.sourceNames.length,4096);
  const warmed=performance.now();f.view();t.diagnostic(`Warm bounded recovery from 4113 event files: ${Math.round(performance.now()-warmed)}ms`);
});

test('project listing always includes current session and newest sessions beyond old directory limits',t=>{
  const f=fixture(t),base=f.record({hook_event_name:'UserPromptSubmit',prompt:'Old current session source.'});
  const projectDir=path.dirname(path.dirname(base.dir));
  for(let n=0;n<260;n++){
    const key=createHash('sha256').update(`other-${n}`).digest('hex'),dir=path.join(projectDir,key,'events');fs.mkdirSync(dir,{recursive:true});
    const time=new Date(Date.UTC(2021,0,1,0,0,n));fs.utimesSync(dir,time,time);
  }
  f.record({session_id:'newest-host',hook_event_name:'UserPromptSubmit',prompt:'Newest separate task.'});
  fs.utimesSync(base.dir,new Date('2000-01-01'),new Date('2000-01-01'));
  const project=readProjectRecordViews({projectRoot:f.projectRoot,sessionId:f.input.session_id},f.options);
  assert.equal(project.partial,true);assert.equal(project.sessions.length,12);assert.ok(project.sessions.some(view=>view.isCurrentSession));assert.ok(project.sessions.some(view=>view.humanMessages.some(item=>item.text==='Newest separate task.')));
});
