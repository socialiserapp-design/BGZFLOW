import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { captureEvent, readContinuity, renderContinuity, normalizeEvent } from '../continuity.mjs';
import { discoverCatalog } from '../catalog.mjs';
import { readProjectRecall } from '../project-recall.mjs';
import { ownedPath, writablePath, writeOwnedFile } from '../../../hooks/lib/owned-path.mjs';

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'bgz-continuity-test-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const projectRoot = path.join(root, 'project'); fs.mkdirSync(projectRoot);
  const options = { projectRoot, storageRoot: path.join(root, 'store') };
  const input = { cwd: projectRoot, session_id: 'session-one' };
  return { root, projectRoot, options, input };
}

test('route diagnostics retain only numeric phase costs, never supplied prompts or secrets',t=>{
  const {input,options}=fixture(t);
  captureEvent({...input,hook_event_name:'RouteSelected',selection:{status:'selected',selected:[],diagnostics:{elapsedMs:12.5,prompt:'must not persist',secret:'must not persist',phases:{rank:{calls:2,candidates:400,callMs:10.5,input:'must not persist'},verify:{calls:0,candidates:0,callMs:0},complement:{calls:-1,candidates:'bad',callMs:Infinity},unexpected:{calls:100}}}}},{...options,internal:true});
  const result=readContinuity(input,options).selection.diagnostics;
  assert.deepEqual(result,{elapsedMs:12.5,phases:{rank:{calls:2,candidates:400,callMs:10.5},verify:{calls:0,candidates:0,callMs:0},complement:{}}});
  assert.ok(!JSON.stringify(result).includes('must not persist'));
});

test('explicit selection identity survives capture and resume without retaining unmatched or secret values',t=>{
  const {input,options}=fixture(t),secret='sk-live-not-a-real-secret-example-token';
  captureEvent({...input,hook_event_name:'RouteSelected',selection:{status:'fallback',selected:[{id:'method-one',name:'safe-method'},{id:secret,name:'another-method'}],explicitIds:['method-one','method-one','not-selected',secret]}},{...options,internal:true});
  const saved=readContinuity(input,options).selection;
  assert.deepEqual(saved.explicitIds,['method-one']);
  assert.ok(!JSON.stringify(saved).includes(secret));
});

test('native canonical owned paths preserve case parity and reject hard-linked write targets',t=>{
  const {projectRoot}=fixture(t),file=path.join(projectRoot,'source.json'),alias=path.join(projectRoot,'alias.json');
  writeOwnedFile(file,'original');
  assert.equal(ownedPath(projectRoot,'source.json'),fs.realpathSync.native(file));
  if(process.platform==='win32')assert.equal(ownedPath(projectRoot.toUpperCase(),'source.json'),fs.realpathSync.native(file));
  fs.linkSync(file,alias);assert.throws(()=>writablePath(alias),/unsafe|linked/i);assert.throws(()=>writeOwnedFile(alias,'changed'),/unsafe|linked/i);assert.equal(fs.readFileSync(file,'utf8'),'original');
});

test('secret-shaped native tool IDs retain distinct private correlation without exposing originals',t=>{
  const {input,options}=fixture(t);
  const first='call_01a1a94679587fb1b25e122d20a6b776AAAA',second='call_01a1a94679587fb1b25e122d20a6b776BBBB';
  for(const id of [first,second])captureEvent({...input,hook_event_name:'PreToolUse',tool_name:'Bash',tool_use_id:id},options);
  captureEvent({...input,hook_event_name:'PostToolUse',tool_name:'Bash',tool_use_id:first},options);
  const state=readContinuity(input,options);
  assert.equal(new Set(state.tools.map(e=>e.tool.id)).size,1);
  assert.equal(new Set(state.tools.map(e=>e.tool.key)).size,2);
  assert.equal(state.pendingTools.length,1);assert.equal(state.pendingTools[0].tool.key,state.tools[1].tool.key);
  const recall=readProjectRecall({projectRoot:input.cwd,sessionId:'new-native-session',query:'Bash'},options);
  assert.equal(recall.records.filter(e=>e.kind==='unresolved-recorded-request').length,1);
  assert.ok(!JSON.stringify(state).includes(first));assert.ok(!JSON.stringify(state).includes(second));
});

test('typed catalogue identity survives masking only after source content is verified',t=>{
  const {input,options}=fixture(t),name='ui5-best-practices-integration-cards',directory=path.join(input.cwd,'skills',name);fs.mkdirSync(directory,{recursive:true});
  fs.writeFileSync(path.join(directory,'SKILL.md'),`---\nname: ${name}\ndescription: Official UI5 card workflow\n---\nOnly for UI5 cards.`);
  const catalog=discoverCatalog({roots:[directory]});const cacheKey='a'.repeat(20)+'07700123456'+'b'.repeat(33);
  captureEvent({...input,hook_event_name:'RouteSelected',selection:{status:'selected',cacheKey,selected:catalog}},{...options,internal:true});
  const saved=readContinuity(input,options).selection;
  assert.equal(saved.cacheKey,cacheKey);assert.equal(saved.selected[0].version,catalog[0].version);assert.equal(saved.selected[0].name,name);assert.equal(saved.selected[0].path,catalog[0].path);
  const invalid={...catalog[0],id:'skill-'+'a'.repeat(24),name:'sk-live-not-a-real-secret-example-token'};
  captureEvent({...input,hook_event_name:'RouteSelected',selection:{status:'selected',selected:[invalid]}},{...options,internal:true});
  assert.notEqual(readContinuity(input,options).selection.selected[0].name,invalid.name);
});

test('async question titles and the full native human reply remain source records',t=>{
  const {input,options}=fixture(t);
  captureEvent({...input,hook_event_name:'PreToolUse',tool_name:'request_user_input_async',tool_use_id:'q',tool_input:{questions:[{id:'priority',title:'What matters most?',options:[{label:'Quality'}]}]}},options);
  const reply='<send_user_message_question_reply>\n[{"questionItemId":"priority","question":"What matters most?","answer":"Quality"}]\n</send_user_message_question_reply>';
  captureEvent({...input,hook_event_name:'UserPromptSubmit',prompt:reply},options);
  const state=readContinuity(input,options);assert.equal(state.events.find(e=>e.questionnaire).questionnaire.questions[0].text,'What matters most?');assert.equal(state.messages[0].message,reply);assert.match(renderContinuity(state),/Quality/);
});

test('bounded question and answer captures report omitted items explicitly',t=>{
  const {input,options}=fixture(t);
  const questions=Array.from({length:18},(_,n)=>({id:`q${n}`,title:`Question ${n}`}));
  const answers=Object.fromEntries(questions.map(q=>[q.id,{answers:['Choice']}]));
  captureEvent({...input,hook_event_name:'PostToolUse',tool_name:'request_user_input_async',tool_use_id:'many-questions',tool_input:{questions},tool_response:{answers}},options);
  const record=readContinuity(input,options).events[0].questionnaire;
  assert.equal(record.partial,true);assert.equal(record.omittedQuestions,8);assert.equal(record.omittedAnswers,8);
});

test('native structured clarification answers and child identities survive without becoming invented decisions',t=>{
  const {input,options}=fixture(t);
  captureEvent({...input,hook_event_name:'PostToolUse',tool_name:'request_user_input',tool_use_id:'q1',tool_input:{questions:[{id:'colour',question:'Which colour?'}]},tool_response:{answers:{colour:{answers:['Blue']}}}},options);
  captureEvent({...input,hook_event_name:'PostToolUse',tool_name:'Agent',tool_use_id:'assign',tool_input:{description:'Calendar',prompt:'Preserve offline access.'},tool_response:{agent_id:'child-one'}},options);
  const state=readContinuity(input,options);
  assert.equal(state.events.find(e=>e.questionnaire).questionnaire.answers[0].text,'Blue');
  assert.equal(state.assignments[0].assignment.childId,'child-one');
  assert.match(renderContinuity(state),/Which colour/);
  assert.match(renderContinuity(state),/Blue/);
  assert.match(renderContinuity(state),/no additional authority/);
});

test('compaction restores original request, corrections, assignments and factual failures', t => {
  const { input, options } = fixture(t);
  let n = 0;
  options.now = () => `2026-11-04T12:00:${String(n++).padStart(2, '0')}.000Z`;
  captureEvent({ ...input, hook_event_name: 'UserPromptSubmit', prompt: 'Build a calendar. Keep offline access.' }, options);
  captureEvent({ ...input, hook_event_name: 'UserPromptSubmit', prompt: 'Correction: weekly view first. Do not change the colours.' }, options);
  captureEvent({ ...input, hook_event_name: 'PreToolUse', tool_name: 'Agent', tool_use_id: 'builder', tool_input: { description: 'Weekly view', prompt: 'Implement weekly view, preserve offline access.', subagent_type: 'builder' } }, options);
  captureEvent({ ...input, hook_event_name: 'SubagentStart', agent_id: 'worker-one', agent_type: 'builder' }, options);
  captureEvent({ ...input, hook_event_name: 'PostToolUseFailure', tool_name: 'Bash', tool_use_id: 'run-1', tool_response: { exit_code: 1, stdout: 'SECRET OUTPUT MUST NOT BE COPIED' } }, options);
  captureEvent({ ...input, hook_event_name: 'PostCompact', summary: 'Everything succeeded.' }, options);
  const state = readContinuity(input, options);
  const restored = renderContinuity(state);
  assert.match(restored, /Keep offline access/);
  assert.match(restored, /weekly view first/);
  assert.match(restored, /Do not change the colours/);
  assert.match(restored, /host-reported-error, exit 1/);
  assert.match(restored, /summary only, subordinate/);
  assert.equal(state.tools.at(-1).tool.evidence, 'Tool event only; no product outcome verified.');
  assert.ok(!JSON.stringify(state).includes('SECRET OUTPUT MUST NOT BE COPIED'));
});

test('concurrent event captures preserve all events without overwriting another session', async t => {
  const { input, options } = fixture(t);
  await Promise.all(Array.from({ length: 30 }, (_, i) => Promise.resolve().then(() => captureEvent({ ...input, hook_event_name: 'UserPromptSubmit', prompt: `message ${i}` }, options))));
  captureEvent({ ...input, session_id: 'other-session', hook_event_name: 'UserPromptSubmit', prompt: 'PRIVATE OTHER SESSION' }, options);
  const state = readContinuity(input, options);
  assert.equal(state.messages.length, 30);
  assert.equal(new Set(state.messages.map(e => e.file)).size, 30);
  assert.ok(!JSON.stringify(state).includes('PRIVATE OTHER SESSION'));
});

test('separate native hook processes can create the same session storage concurrently', async t => {
  const { input, options } = fixture(t);
  const moduleUrl = new URL('../continuity.mjs', import.meta.url).href;
  await Promise.all(Array.from({ length: 8 }, (_, n) => new Promise((resolve, reject) => {
    const script = `import {captureEvent} from ${JSON.stringify(moduleUrl)}; captureEvent(${JSON.stringify({ ...input, hook_event_name: 'UserPromptSubmit', prompt: `parallel ${n}` })}, ${JSON.stringify(options)});`;
    const child = spawn(process.execPath, ['--input-type=module', '-e', script], { stdio: ['ignore', 'ignore', 'pipe'] });
    let error = ''; child.stderr.on('data', chunk => error += chunk);
    child.on('error', reject); child.on('close', code => code === 0 ? resolve() : reject(new Error(error)));
  })));
  assert.equal(readContinuity(input, options).messages.length, 8);
});

test('secret-shaped user values are masked and tool results/inputs are never copied wholesale', t => {
  const { input, options } = fixture(t);
  captureEvent({ ...input, hook_event_name: 'UserPromptSubmit', prompt: 'Use password="correct-horse-secret-123" but preserve the requested wording.' }, options);
  captureEvent({ ...input, hook_event_name: 'PostToolUse', tool_name: 'Read', tool_input: { file_path: 'settings.txt', password: 'private-input-value' }, tool_response: { content: 'private-output-value', api_key: 'private-api-value' } }, options);
  const all = JSON.stringify(readContinuity(input, options));
  for (const secret of ['correct-horse-secret-123', 'private-input-value', 'private-output-value', 'private-api-value']) assert.ok(!all.includes(secret));
  assert.match(all, /preserve the requested wording/);
});

test('storage rejects linked parents and cannot write outside selected storage', t => {
  const { root, input, options } = fixture(t);
  const external = path.join(root, 'external'); fs.mkdirSync(external);
  const link = path.join(root, 'linked'); fs.symlinkSync(external, link, process.platform === 'win32' ? 'junction' : 'dir');
  assert.throws(() => captureEvent({ ...input, hook_event_name: 'Stop' }, { ...options, storageRoot: path.join(link, 'escape') }), /unsafe|linked|target/i);
  assert.deepEqual(fs.readdirSync(external), []);
});

test('unknown events and missing identities do not create shared fallback sessions', t => {
  const { input, options } = fixture(t);
  assert.equal(captureEvent({ ...input, hook_event_name: 'Unknown' }, options), null);
  assert.equal(captureEvent({ cwd: input.cwd, hook_event_name: 'Stop' }, options), null);
  assert.equal(fs.existsSync(options.storageRoot), false);
});

test('Claude and Codex payloads retain explicit host outcomes without upgrading them', t => {
  const { input, options } = fixture(t);
  const event = normalizeEvent({ cwd: input.cwd, sessionId: input.session_id, hookEventName: 'PostToolUse', toolName: 'exec_command', toolInput: { cmd: 'ignored' }, toolResponse: { exitCode: 0 }, toolUseId: 'tool-one' }, options);
  assert.equal(event.tool.exitCode, 0);
  assert.equal(event.tool.outcome, 'host-returned');
  assert.ok(!Object.hasOwn(event.tool, 'verified'));
});

test('user corrections retain observed order when wall-clock timestamps are identical', t => {
  const { input, options } = fixture(t);
  options.now = () => '2026-11-04T12:00:00.000Z';
  captureEvent({ ...input, hook_event_name: 'UserPromptSubmit', prompt: 'Use red labels.' }, options);
  captureEvent({ ...input, hook_event_name: 'UserPromptSubmit', prompt: 'Correction: use blue labels.' }, options);
  const state = readContinuity(input, options);
  assert.equal(state.messages.at(-1).message, 'Correction: use blue labels.');
});
