import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createFoundationSession, createProjectPathReservations } from '../session.mjs';
import { spawnSync } from 'node:child_process';
import { createEngine } from '../../engine/runtime.mjs';
import { createLocalHostAdapter } from '../../engine/local-host.mjs';
import { loadSelectedSkills } from '../router.mjs';
import { renderMethodDelivery } from '../method-delivery.mjs';
import { createExecutableChecks } from '../executable-checks.mjs';
import { captureEvent, readContinuity } from '../continuity.mjs';

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'bgz-foundation-session-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const projectRoot = path.join(root, 'project'); fs.mkdirSync(projectRoot);
  const config = { projectRoot, sessionId: 'native-a', storageRoot: path.join(root, 'store') };
  const host = { ...createProjectPathReservations(config), confirmRequest: async ({ text, sourceId }) => ({ observed: true, sourceId, text }), authorizeExecution: async () => ({ allowed: true, sourceId: 'host-authority' }) };
  return { root, projectRoot, config, host, session: createFoundationSession({ ...config, host }) };
}
const noSkills = async () => ({ selectedIds: [], strategy: 'single' });

test('confirmed questions bind answers, decisions, ownership and outcomes to current request revision', async t => {
  const f = fixture(t);
  const original = await f.session.acceptRequest({ text: 'Build a calendar.', sourceId: 'user-1' });
  f.session.ask({ id: 'colour', question: 'Which colour?', revision: original.revision });
  await assert.rejects(f.session.assign({ id: 'build', owner: 'one', revision: original.revision }), /unanswered/);
  const answered = await f.session.answer({ questionId: 'colour', text: 'Blue', sourceId: 'user-2', revision: original.revision });
  assert.notEqual(answered.requestRevision, original.revision);
  f.session.decide({ id: 'blue', questionId: 'colour', text: 'Use blue.', revision: answered.requestRevision });
  assert.equal(f.session.current().decisions[0].sourceId, 'user-2');
  await assert.rejects(f.session.assign({ id: 'old', owner: 'one', revision: original.revision }), /revision/);
  await f.session.assign({ id: 'build', owner: 'one', paths: ['chart.json'], revision: answered.requestRevision });
  await assert.rejects(f.session.assign({ id: 'collision', owner: 'two', paths: ['chart.json'], revision: answered.requestRevision }), /owner/);
  const restored = createFoundationSession({ ...f.config, host: f.host });
  assert.equal(restored.current().request.revision, answered.requestRevision);
});

test('unconfirmed source, absent capacity and absent authority cannot become an executed task', async t => {
  const f = fixture(t);
  const request = await f.session.acceptRequest({ text: 'Inspect calendar.', sourceId: 'u1' });
  await assert.rejects(f.session.assign({ id: 'extra', owner: 'two', resourcePool: 'made-up', revision: request.revision }), /reservation/);
  const bare = createFoundationSession({ ...f.config });
  await assert.rejects(bare.acceptRequest({ text: 'fake', sourceId: 'claim' }), /confirm/);
  const route = await bare.select({ request: 'Hello', catalog: [], decide: noSkills });
  assert.equal(route.capabilityStatus, 'unknown');
  assert.equal(route.strategy, 'single');
});

test('real reservation is reused for one execution and repeat never starts it twice', async t => {
  const f = fixture(t); let calls = 0, reserved = 0, released = 0;
  const host = { ...f.host, reserve: async () => { reserved++; return { granted: true, id: 'slot-1' }; }, release: async () => { released++; }, execute: async task => { calls++; return { status: 'completed', source: 'native-run', observationId: task.operationId }; } };
  const session = createFoundationSession({ ...f.config, host });
  const request = await session.acceptRequest({ text: 'Inspect calendar.', sourceId: 'u1' });
  await session.assign({ id: 'one', owner: 'worker', resourcePool: 'account', revision: request.revision });
  await session.execute({ id: 'one', revision: request.revision });
  await assert.rejects(session.execute({ id: 'one', revision: request.revision }), /already attempted/);
  assert.deepEqual([reserved, calls, released], [1, 1, 1]);
});

test('echo-done and stale observations cannot verify an outcome', async t => {
  const f = fixture(t);
  const request = await f.session.acceptRequest({ text: 'Make service live.', sourceId: 'u1' });
  assert.equal((await f.session.verifyOutcome({ id: 'live', revision: request.revision, candidate: 'c1', expectation: 'alive' })).status, 'unverified');
  const session = createFoundationSession({ ...f.config, host: { ...f.host, observeOutcome: async () => ({ status: 'observed', matches: true, source: 'probe', observationId: 'one', revision: 'old', candidate: 'c1' }) } });
  assert.equal((await session.verifyOutcome({ id: 'live', revision: request.revision, candidate: 'c1', expectation: 'alive' })).status, 'unverified');
});

test('tested private procedures are consumed on later sessions, never leak to another project, and roll back', async t => {
  const f = fixture(t);
  const session = createFoundationSession({ ...f.config, host: { ...f.host, evaluateImprovement: async ({ candidate }) => ({ candidateVersion: candidate.version, source: 'actual-local-evaluator', observationId: 'run-1', baseline:{observationId:'baseline-run',cases:[{kind:'regression',passed:false,observationId:'baseline-case'}]}, cases: [{ kind: 'regression', passed: true, observationId: 'case-1' }, { kind: 'unseen', passed: true, observationId: 'case-2' }] }) } });
  const request = await session.acceptRequest({ text: 'Improve calendar work.', sourceId: 'u1' });
  session.proposeImprovement({ id: '550e8400-e29b-41d4-a716-446655440000', name: 'calendar-check', match: 'calendar', body: 'Check offline state after reload.', revision: request.revision });
  assert.throws(() => session.adoptImprovement({ id: '550e8400-e29b-41d4-a716-446655440000' }), /tested/);
  await session.evaluateImprovement({ id: '550e8400-e29b-41d4-a716-446655440000' }); session.adoptImprovement({ id: '550e8400-e29b-41d4-a716-446655440000' });
  const next = createFoundationSession({ ...f.config, sessionId: 'native-b' });
  const picked=await next.select({ request: 'Fix the weekly view', catalog: [], decide: async ({phase,candidates}) => ({selectedIds:phase==='complement'?[]:candidates.filter(item=>item.origin==='private-tested-procedure').map(item=>item.id),strategy:'single'}) });
  assert.equal(picked.selected.length, 1);
  assert.equal(picked.selected[0].privateBody, 'Check offline state after reload.');
  captureEvent({cwd:f.projectRoot,session_id:'native-b',hook_event_name:'RouteSelected',selection:picked},{storageRoot:f.config.storageRoot,internal:true});
  const retained=readContinuity({cwd:f.projectRoot,session_id:'native-b'},{storageRoot:f.config.storageRoot}).selection.selected[0];
  assert.equal(retained.id,picked.selected[0].id);assert.equal(retained.version,picked.selected[0].version);
  assert.match(renderMethodDelivery(picked,{loadSelectedSkills}),/Check offline state after reload/);
  const other = path.join(f.root, 'other'); fs.mkdirSync(other);
  assert.equal((await createFoundationSession({ ...f.config, projectRoot: other }).select({ request: 'calendar task', catalog: [], decide: noSkills })).selected.length, 0);
  session.rollbackImprovement({ id: '550e8400-e29b-41d4-a716-446655440000' });
  assert.equal((await next.select({ request: 'calendar task', catalog: [], decide: noSkills })).selected.length, 0);
});

test('a single self-certified boolean cannot pass private improvement evaluation', async t => {
  const f = fixture(t);
  const session = createFoundationSession({ ...f.config, host: { ...f.host, evaluateImprovement: async () => ({ passed: true }) } });
  const request = await session.acceptRequest({ text: 'Improve calendar.', sourceId: 'u1' });
  session.proposeImprovement({ id: 'claim', name: 'claim', match: 'calendar', body: 'trust me', revision: request.revision });
  assert.equal((await session.evaluateImprovement({ id: 'claim' })).status, 'rejected');
});

test('engine shares selected methods and refuses whole-outcome success for an observed dead service', async t => {
  const f = fixture(t);
  const adapter = createLocalHostAdapter(); adapter.skillCatalog = []; adapter.continuityRoot=f.config.storageRoot;
  adapter.foundationHost = { ...f.host, decide: noSkills, observeOutcome: async ({ revision, candidate }) => {const probe=spawnSync(process.execPath,['-e',"try{process.kill(2147483647,0);console.log('alive')}catch{console.log('dead')}"],{encoding:'utf8'});return { status: 'observed', revision, candidate, matches: probe.stdout.trim()==='alive', source: 'actual local process probe', observationId: 'dead-process' };} };
  const engine = await createEngine({ projectRoot: f.projectRoot, adapter }); t.after(() => engine.dispose());
  const result = await engine.start({ id: 'service', text: 'Service is live.', sourceId: 'u1', steps: [{ id: 'build', command: { file: process.execPath, args: ['-e', "require('fs').writeFileSync('artifact.txt','ok')"] } }], checker: { id: 'check', command: { file: process.execPath, args: ['-e', "console.log('done')"] } }, artifacts: [{ id: 'one', path: 'artifact.txt', acceptance: { equals: 'ok' } }], outcome: { id: 'live', expectation: 'process alive' } });
  assert.equal(result.status, 'incomplete');
  assert.equal(result.wholeOutcomeStatus, 'unverified');
  assert.equal(result.methodContext.methods.length, 0);
});

test('explicit question dependencies let independent work continue and preserve unrelated real evidence', async t => {
  const f=fixture(t);fs.writeFileSync(path.join(f.projectRoot,'offline.txt'),'enabled');
  const session=createFoundationSession({...f.config,host:{...f.host,observeOutcome:async({revision,candidate})=>({status:'observed',revision,candidate,matches:fs.readFileSync(path.join(f.projectRoot,'offline.txt'),'utf8')==='enabled',source:'offline.txt actual read',observationId:'read-one'})}});
  const request=await session.acceptRequest({text:'Calendar with offline access.',sourceId:'u1'});
  await session.verifyOutcome({id:'offline',revision:request.revision,candidate:'c1',expectation:'enabled',criteriaIds:['offline']});
  session.ask({id:'colour',question:'Which colour?',revision:request.revision,criteriaIds:['colour']});
  await session.assign({id:'independent',owner:'worker',revision:request.revision,questionIds:[]});
  await assert.rejects(session.assign({id:'dependent',owner:'worker',revision:request.revision,questionIds:['colour']}),/unanswered/);
  const answer=await session.answer({questionId:'colour',text:'Blue',sourceId:'u2',revision:request.revision});
  const outcome=session.current().outcomes.find(item=>item.id==='offline');
  assert.equal(outcome.status,'verified');assert.equal(outcome.revision,answer.requestRevision);assert.equal(outcome.evidenceRevision,request.revision);
});

test('project path reservation prevents different sessions from claiming overlapping paths', async t => {
  const f=fixture(t),otherConfig={...f.config,sessionId:'other'};
  const other=createFoundationSession({...otherConfig,host:{...f.host,...createProjectPathReservations(otherConfig)}});
  const a=await f.session.acceptRequest({text:'one',sourceId:'u1'}),b=await other.acceptRequest({text:'two',sourceId:'u2'});
  await f.session.assign({id:'one',owner:'a',revision:a.revision,paths:['src']});
  await assert.rejects(other.assign({id:'two',owner:'b',revision:b.revision,paths:['src/file.mjs']}),/owner|reserved/);
});

test('simultaneous execute calls launch one operation only', async t => {
  const f=fixture(t);let launches=0;
  const session=createFoundationSession({...f.config,host:{...f.host,execute:async()=>{launches++;await new Promise(resolve=>setTimeout(resolve,10));return{status:'completed'};}}});
  const request=await session.acceptRequest({text:'one',sourceId:'u1'});await session.assign({id:'one',owner:'worker',revision:request.revision});
  const results=await Promise.allSettled([session.execute({id:'one',revision:request.revision}),session.execute({id:'one',revision:request.revision})]);
  assert.equal(launches,1);assert.equal(results.filter(r=>r.status==='rejected').length,1);
});

test('real local command output is bounded and secret-shaped values are redacted', async t => {
  const f = fixture(t), adapter = createLocalHostAdapter();
  const result = await adapter.execute({ projectRoot: f.projectRoot, operationId: 'output-test', command: { file: process.execPath, args: ['-e', "console.log('password=super-secret-example'); console.log('x'.repeat(300000))"] } });
  assert.equal(result.exitCode, 0);
  assert.ok(result.stdout.length <= 128000);
  assert.equal(result.outputTruncated, true);
  assert.ok(!result.stdout.includes('super-secret-example'));
});

test('engine verifies a real saved effect and invalidates it when the effect disappears', async t => {
  const f=fixture(t),adapter=createLocalHostAdapter();adapter.skillCatalog=[];adapter.continuityRoot=f.config.storageRoot;
  adapter.foundationHost={...f.host,decide:noSkills,observeOutcome:async({revision,candidate})=>({status:'observed',revision,candidate,matches:fs.existsSync(path.join(f.projectRoot,'saved.txt'))&&fs.readFileSync(path.join(f.projectRoot,'saved.txt'),'utf8')==='saved',source:'saved.txt direct filesystem read',observationId:'saved-probe'})};
  const engine=await createEngine({projectRoot:f.projectRoot,adapter});t.after(()=>engine.dispose());
  const result=await engine.start({id:'saved',text:'Save the item.',sourceId:'u1',steps:[{id:'write',command:{file:process.execPath,args:['-e',"require('fs').writeFileSync('saved.txt','saved');require('fs').writeFileSync('artifact.txt','ok')"]}}],checker:{id:'check',command:{file:process.execPath,args:['-e','process.exit(0)']}},artifacts:[{id:'artifact',path:'artifact.txt',acceptance:{equals:'ok'}}],outcome:{id:'saved-effect',expectation:'saved'}});
  assert.equal(result.status,'accepted');assert.equal(result.wholeOutcomeStatus,'verified');
  fs.unlinkSync(path.join(f.projectRoot,'saved.txt'));
  assert.equal((await engine.resume('saved')).status,'invalidated');
});

test('corrupt private overlay is not overwritten by adoption', async t => {
  const f=fixture(t),session=createFoundationSession({...f.config,host:{...f.host,autoAdoptImprovements:false,evaluateImprovement:async({candidate})=>({candidateVersion:candidate.version,source:'test',observationId:'run',baseline:{observationId:'before-run',cases:[{kind:'regression',passed:false,observationId:'before-case'}]},cases:[{kind:'regression',passed:true,observationId:'a'},{kind:'unseen',passed:true,observationId:'b'}]})}});
  const request=await session.acceptRequest({text:'Improve calendar',sourceId:'u1'});session.proposeImprovement({id:'new',name:'new',match:'calendar',body:'Read the result',revision:request.revision});await session.evaluateImprovement({id:'new'});
  const projectDir=fs.readdirSync(f.config.storageRoot,{withFileTypes:true}).find(item=>item.isDirectory()).name;
  const file=path.join(f.config.storageRoot,projectDir,'private-procedures.json');fs.writeFileSync(file,'invalid');
  assert.throws(()=>session.adoptImprovement({id:'new'}),/corrupt/);assert.equal(fs.readFileSync(file,'utf8'),'invalid');
});

test('owner-configured executable checks inspect real files and evaluate candidates without executing candidate code',async t=>{
  const f=fixture(t);fs.writeFileSync(path.join(f.projectRoot,'saved.txt'),'yes');
  const checks=createExecutableChecks({projectRoot:f.projectRoot,outcomeChecks:{saved:{id:'read saved file',target:{candidate:'c1',revision:'r1',projectRoot:fs.realpathSync(f.projectRoot)},command:{file:process.execPath,args:['-e',"console.log(JSON.stringify({matches:require('fs').readFileSync('saved.txt','utf8')==='yes'}))"]}}},improvementChecks:[{id:'regression',kind:'regression',command:{file:process.execPath,args:['-e',"let s='';process.stdin.on('data',x=>s+=x);process.stdin.on('end',()=>console.log(JSON.stringify({matches:JSON.parse(s).candidate.body==='retain checked source'})))"]}},{id:'unseen',kind:'unseen',command:{file:process.execPath,args:['-e',"let s='';process.stdin.on('data',x=>s+=x);process.stdin.on('end',()=>console.log(JSON.stringify({matches:JSON.parse(s).candidate.body.includes('source')})))"]}}]});
  assert.equal(checks.observeOutcome({id:'saved',candidate:'c1',revision:'r1'}).matches,true);
  fs.writeFileSync(path.join(f.projectRoot,'saved.txt'),'no');
  assert.equal(checks.observeOutcome({id:'saved',candidate:'c1',revision:'r1'}).matches,false);
  fs.writeFileSync(path.join(f.projectRoot,'saved.txt'),'yes');
  assert.equal(checks.observeOutcome({id:'saved',candidate:'old',revision:'r1'}).matches,false);
  assert.equal(checks.observeOutcome({id:'saved',candidate:'c1',revision:'new-request'}).matches,false);
  assert.ok(checks.evaluateImprovement({candidate:{version:'v1',body:'retain checked source'}}).cases.every(row=>row.passed));
  assert.ok(checks.evaluateImprovement({candidate:{version:'v2',body:"require('fs').writeFileSync('UNREQUESTED','bad')"}}).cases.every(row=>!row.passed));
  assert.equal(fs.existsSync(path.join(f.projectRoot,'UNREQUESTED')),false);
});

test('echo done and a mutated trusted check cannot establish outcome evidence', t=>{
  const f=fixture(t),source=path.join(f.projectRoot,'trusted-check.mjs');fs.writeFileSync(source,"console.log(JSON.stringify({matches:true}))");
  const checks=createExecutableChecks({projectRoot:f.projectRoot,outcomeChecks:{echo:{id:'echo',target:{candidate:'c1',revision:'r1',projectRoot:fs.realpathSync(f.projectRoot)},command:{file:process.execPath,args:['-e',"console.log('done')"]}},pinned:{id:'pinned',target:{candidate:'c1',revision:'r1',projectRoot:fs.realpathSync(f.projectRoot)},sources:[source],command:{file:process.execPath,args:[source]}}}});
  assert.equal(checks.observeOutcome({id:'echo',candidate:'c1',revision:'r1'}).matches,false);
  fs.appendFileSync(source,'\n// changed');assert.equal(checks.observeOutcome({id:'pinned',candidate:'c1',revision:'r1'}).matches,false);
});

test('private improvement automatically adopts only after fixing a real output and passing unseen input',async t=>{
  const f=fixture(t),script=path.join(f.projectRoot,'reconcile-check.mjs');
  // Trusted deterministic harness, not generated candidate code. Candidate is
  // a declarative procedure choice; the output is independently read back.
  fs.writeFileSync(script,`import fs from 'node:fs';let data='';for await(const part of process.stdin)data+=part;const {candidate}=JSON.parse(data);const unseen=process.argv[2]==='unseen';const input=unseen?[{colour:'green'},{colour:'yellow'}]:[{colour:'red'},{colour:'blue'}];const method=JSON.parse(candidate.body);const selected=method.order==='latest'?input.at(-1):input[0];const file=unseen?'unseen-result.json':'result.json';fs.writeFileSync(file,JSON.stringify({title:'Calendar',offline:true,...selected}));const actual=JSON.parse(fs.readFileSync(file));console.log(JSON.stringify({matches:actual.colour===(unseen?'yellow':'blue')&&actual.offline===true&&actual.title==='Calendar'}));`);
  const checks=createExecutableChecks({projectRoot:f.projectRoot,baselineCandidate:{body:JSON.stringify({order:'oldest'})},improvementChecks:[{id:'correction',kind:'regression',sources:[script],command:{file:process.execPath,args:[script]}},{id:'unseen',kind:'unseen',sources:[script],command:{file:process.execPath,args:[script,'unseen']}}]});
  const session=createFoundationSession({...f.config,host:{...f.host,...checks}});
  const request=await session.acceptRequest({text:'Preserve latest calendar correction.',sourceId:'user'});
  session.proposeImprovement({id:'latest-source',name:'latest-source',match:'source correction',body:JSON.stringify({order:'latest'}),revision:request.revision});
  const result=await session.evaluateImprovement({id:'latest-source'});
  assert.equal(result.status,'adopted');assert.ok(result.evaluation.baseline.cases.every(c=>c.passed===false));assert.ok(result.evaluation.cases.every(c=>c.passed===true));
  const route=await session.select({request:'reconcile source corrections',catalog:[],decide:async({phase,candidates})=>({selectedIds:phase==='complement'?[]:candidates.map(c=>c.id),strategy:'single'})});
  assert.equal(route.selected[0].name,'latest-source');
});
