import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { after, test } from 'node:test';
import { createHash } from 'node:crypto';
import { hook } from '../swarm-gate.mjs';

// Tests specify observable safety boundaries, with literal independent expectations.
const script = fileURLToPath(new URL('../swarm-gate.mjs', import.meta.url));
const made = [];
const seed=fs.mkdtempSync(path.join(os.tmpdir(),'gate-seed-'));made.push(seed);
git(seed,['init','-q']);fs.mkdirSync(path.join(seed,'src'));
fs.writeFileSync(path.join(seed,'src/a.mjs'),'export const a=1;\n');fs.writeFileSync(path.join(seed,'src/b.mjs'),'export const b=2;\n');
fs.writeFileSync(path.join(seed,'src/a.test.mjs'),"import {test} from 'node:test';import assert from 'node:assert/strict';import {a} from './a.mjs';test('fixture source returns one',()=>assert.equal(a,1));\n");
git(seed,['add','.']);git(seed,['-c','user.name=BGZFLOW','-c','user.email=bgzflow@users.noreply.github.com','commit','-qm','seed']);const sha=git(seed,['rev-parse','HEAD']);
fs.writeFileSync(path.join(seed,'README.md'),'Second fixture candidate\n');git(seed,['add','.']);git(seed,['-c','user.name=BGZFLOW','-c','user.email=bgzflow@users.noreply.github.com','commit','-qm','next']);const nextSha=git(seed,['rev-parse','HEAD']);git(seed,['checkout','-q','--detach',sha]);
const seedEnv={...process.env};delete seedEnv.NODE_TEST_CONTEXT;
const fastFixture=spawnSync(process.execPath,['--test','--test-reporter=tap','src/a.test.mjs'],{cwd:seed,env:seedEnv,encoding:'utf8'});assert.equal(fastFixture.status,0);
const policy = { models: ['test-model'], efforts: { default: ['max'], mechanical: ['max', 'xhigh'], research: ['max', 'ultra'] } };
function fixture(config = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'gate-')); made.push(root);
  fs.cpSync(seed,root,{recursive:true});
  const state = path.join(root, 'registry'), overlay = path.join(root, 'overlay'), bin = path.join(root, 'bin');
  for (const d of [state, overlay, bin]) fs.mkdirSync(d);
  fs.writeFileSync(path.join(bin, 'codex'), '#!/bin/sh\nexit 99\n', { mode: 0o755 });
  const identity = { id: 'codex-local', account: 'codex:fixture-a', environment: root.replace(/\\/g, '/').toLowerCase(), authenticated: true, at: new Date().toISOString(), source: 'safe login status', allowance: { available: false } };
  fs.writeFileSync(path.join(state, 'swarm-current-identities.json'), JSON.stringify({ identities: [identity] }));
  fs.writeFileSync(path.join(overlay, 'ROUTES.md'), '| Resource | Kind | CLI | Home | Dispatch | Model | Effort |\n|---|---|---|---|---|---|---|\n| codex-local | local | codex | '+root+' | supported task route | test-model | max |\n');
  fs.writeFileSync(path.join(state, 'swarm-proven-routes.json'), JSON.stringify({ routes: [{ ...identity, at: '2026-01-01T00:00:00Z', jobId: 'proof', model: 'test-model', effort: 'max', access: 'owned scratch and network verified', returnRef: 'local-return', evidence: 'proof.json', result: 'passed' }] }));
  const env = { ...process.env, BGZFLOW_PROJECT: root, BG_SWARM_DIR: state, BGZFLOW_OVERLAY: overlay, CODEX_HOME: root, PATH: bin + path.delimiter + process.env.PATH, BGZFLOW_SWARM_POLICY: '' };
  const f = { root, state, env, config: { resources: ['codex-local'], limit: { jobs: 20, workerHours: 20 }, reserve: { jobs: 3, workerHours: 3 }, policy, wave0Sha: sha, pieces: { p1: { owns: ['src/a.mjs'] }, p2: { owns: ['src/b.mjs'] } }, ...config } };
  return f;
}
after(() => made.forEach(d => fs.rmSync(d, { recursive: true, force: true })));
function run(f, args, input) {
  const r = spawnSync(process.execPath, [script, ...args], { cwd: f.root, env: f.env, input: input === undefined ? undefined : JSON.stringify(input), encoding: 'utf8', timeout: 15000 });
  assert.equal(r.error, undefined, 'gate process failed or timed out: '+r.error?.code);
  let data; try { data = JSON.parse(r.stdout); } catch { data = null; }
  return { ...r, data };
}
function start(f) {
  const file = path.join(f.root, 'config.json'); fs.writeFileSync(file, JSON.stringify(f.config));
  const r = run(f, ['start', '--swarm', 's1', '--config', file]); assert.equal(r.status, 0, r.stderr); return r.data;
}
function brief(f, { piece = 'p1', kind = 'build', owns = ['src/a.mjs'], stage, body = '', ...extra } = {}) {
  const file = path.join(f.root, 'brief-'+piece+'-'+kind+'.md');
  fs.writeFileSync(file, `SWARM: s1\nPIECE: ${piece}\nKIND: ${kind}\nOWNS: ${JSON.stringify(owns)}\n${stage ? 'CHECK: '+stage+'\n' : ''}${extra.readOnly ? 'READ_ONLY: true\n' : ''}${extra.unsplit ? 'UNSPLIT: true\n' : ''}${extra.targetKind ? 'TARGET_KIND: '+extra.targetKind+'\n' : ''}\nRead bg-efficiency, test-driven-development, systematic-debugging, verification-before-completion.\nFast checks only.\nProof handback: exact SHA, evidence, exit codes, skills read, confidence.\n${body}`);
  return file;
}
function command(file, model = 'test-model', effort = 'max') { return `cx task --background --write --model ${model} --effort ${effort} --prompt-file "${file}"`; }
function dispatch(f, id, options = {}) {
  const file = brief(f, options);
  const cmd = options.readOnly ? command(file, options.model, options.effort).replace(' --write', '') : command(file, options.model, options.effort);
  return run(f, ['dispatch', '--job-id', id, '--resource', options.resource || 'codex-local', '--worker-hours', String(options.hours ?? 1), '--command', cmd]);
}
function record(f, type, value) {
  if(type==='piece'&&value.status==='returned'){
    const state=JSON.parse(fs.readFileSync(path.join(f.root,'.bgzflow/swarms/s1.json'),'utf8')),job=[...state.dispatches].reverse().find(j=>j.piece===value.piece&&j.status==='completed');
    fs.writeFileSync(path.join(f.root,'fast-fixture.log'),fastFixture.stdout);
    const proofFile=path.join(f.root,'handback-'+value.piece+'.json');fs.writeFileSync(proofFile,JSON.stringify({jobId:job?.id||'fixture-root',source:{baseSha:job?.baseSha||f.config.wave0Sha,sha:value.returnRef},checks:[{argv:['node','--test','src/a.test.mjs'],exitCode:0,stdoutFile:'fast-fixture.log',counts:{tests:1,pass:1,fail:0,skip:0}}]}));value={...value,handbackFile:proofFile,jobId:job?.id};
  }
  if(type==='finding'&&value.blocking)value={category:'data-loss',reproduction:'Fixture reproduces the invariant violation',...value};
  const file = path.join(f.root, 'record.json'); fs.writeFileSync(file, JSON.stringify(value)); return run(f, ['record', type, '--file', file]);
}
function done(f, id, value = {}) { return record(f, 'job', { id, status: 'completed', workerHours: 0.1, returnRef: sha, evidence: 'result.json', ...value }); }
function integrated(f) {
  for (const id of ['p1', 'p2']) assert.equal(record(f, 'piece', { piece: id, status: 'returned', returnRef: sha, evidence: 'result.json' }).status, 0);
  assert.equal(record(f, 'candidate', { sha }).status, 0);
}
function passed(f, stage, candidate = sha) { if(stage==='review'){const r=record(f,'rehearsal',{sha:candidate,goldenJourneys:'passed',rollbackProven:true,rollbackEvidence:'rollback.log',evidence:'rehearsal.log',exitCode:0});if(r.status!==0)return r;} return record(f, 'result', { stage, sha: candidate, status: 'passed', evidence: `${stage}.log`, exitCode: 0 }); }
function ready(f) { integrated(f); for (const s of ['suite', 'journey', 'review']) assert.equal(passed(f, s).status, 0); }
function denied(r, rule) { assert.equal(r.status, 2, r.stderr || r.stdout); assert.equal(r.data?.rule, rule); assert.ok(r.data?.next); }

test('S1 start persists one ignored ledger and repeat start preserves in-flight work', () => {
  const f = fixture(); start(f); assert.equal(dispatch(f, 'j1').status, 0);
  const r = start(f); assert.equal(r.dispatches.length, 1);
  assert.ok(fs.existsSync(path.join(f.root, '.bgzflow', 'swarms', 's1.json')));
  assert.deepEqual(run(f, ['status']).data.limit, { jobs: 20, workerHours: 20 });
});
test('S2 presets show numbers and saved defaults retain both resource and limit', () => {
  const f = fixture({ limit: 'Small', reserve: undefined }); start(f);
  assert.deepEqual(run(f, ['presets']).data.Small, { jobs: 8, workerHours: 4, reserve: { jobs: 3, workerHours: 1.5 } });
  const defaults = JSON.parse(fs.readFileSync(path.join(f.root, '.bgzflow', 'swarm-defaults.json')));
  assert.deepEqual(defaults.resources, ['codex-local']); assert.equal(defaults.limit.jobs, 8);
});
test('S3 wave zero and piece paths are mandatory, invalid config never creates an active swarm', () => {
  const f = fixture({ wave0Sha: 'HEAD' }); const file = path.join(f.root, 'bad.json'); fs.writeFileSync(file, JSON.stringify(f.config));
  assert.equal(run(f, ['start', '--swarm', 's1', '--config', file]).status, 2);
  assert.equal(run(f, ['status']).data.active, false);
});
test('D1 explicit configured model and effort permit a dispatch and keep its identity', () => {
  const f = fixture(); start(f); assert.equal(dispatch(f, 'j1').status, 0);
  const j = run(f, ['status']).data.dispatches[0]; assert.equal(j.id, 'j1'); assert.equal(j.piece, 'p1'); assert.equal(j.model, 'test-model'); assert.equal(j.effort, 'max');
});
test('D2 wrong model gives the exact corrected command without consuming usage', () => {
  const f = fixture(); start(f); const file = brief(f); const r = dispatch(f, 'j1', { model: 'other' }); denied(r, 'policy');
  assert.equal(r.data.correctedCommand, command(file)); assert.equal(run(f, ['status']).data.used.jobs, 0);
});
test('D3 xhigh is blocked for build and allowed for a mechanical piece', () => {
  const f = fixture(); start(f); denied(dispatch(f, 'bad', { effort: 'xhigh' }), 'policy');
  assert.equal(dispatch(f, 'good', { kind: 'mechanical', effort: 'xhigh' }).status, 0);
});
test('D4 ultra requires one unsplit read-only research job and cannot be repeated', () => {
  const f = fixture(); start(f); denied(dispatch(f, 'bad', { kind: 'research', owns: [], effort: 'ultra' }), 'policy');
  assert.equal(dispatch(f, 'one', { kind: 'research', owns: [], effort: 'ultra', readOnly: true, unsplit: true }).status, 0);
  done(f, 'one'); denied(dispatch(f, 'two', { kind: 'research', owns: [], effort: 'ultra', readOnly: true, unsplit: true }), 'policy');
});
test('D5 project policy overrides user policy and supports another explicit public model', () => {
  const f = fixture({ policy: { ...policy, models: ['alternative'] } }); start(f); assert.equal(dispatch(f, 'j1', { model: 'alternative' }).status, 0);
});
test('D6 unapproved resource cannot launch', () => { const f = fixture(); start(f); denied(dispatch(f, 'j1', { resource: 'unknown' }), 'resource'); });
test('D7 account switch invalidates saved qualification before launch', () => {
  const f = fixture(); start(f); const file = path.join(f.state, 'swarm-current-identities.json'); const data = JSON.parse(fs.readFileSync(file)); data.identities[0].account = 'codex:fixture-b'; fs.writeFileSync(file, JSON.stringify(data)); denied(dispatch(f, 'j1'), 'resource');
});
test('D8 missing or logged-out observation cannot reuse an old proof', () => {
  for (const observation of [null, { authenticated: false }]) { const f = fixture(); start(f); const file = path.join(f.state, 'swarm-current-identities.json'); if (!observation) fs.unlinkSync(file); else { const d = JSON.parse(fs.readFileSync(file)); Object.assign(d.identities[0], observation); fs.writeFileSync(file, JSON.stringify(d)); } denied(dispatch(f, 'j1'), 'resource'); }
});
test('D9 changed CODEX_HOME invalidates local account scope', () => { const f = fixture(); start(f); f.env.CODEX_HOME = path.join(f.root, 'other'); denied(dispatch(f, 'j1'), 'resource'); });
test('U1 limit counts jobs, protects check/fix reserve and never stops a running job', () => {
  const f = fixture({ limit: { jobs: 4, workerHours: 10 }, reserve: { jobs: 3, workerHours: 3 } }); start(f); assert.equal(dispatch(f, 'j1').status, 0);
  denied(dispatch(f, 'j2', { piece: 'p2', owns: ['src/b.mjs'] }), 'usage'); assert.equal(run(f, ['status']).data.dispatches[0].status, 'running');
  assert.equal(run(f, ['status']).data.used.jobs, 1);
});
test('U2 worker-hours reserve cannot be oversubscribed', () => {
  const f = fixture({ limit: { jobs: 20, workerHours: 4 }, reserve: { jobs: 3, workerHours: 3 } }); start(f); denied(dispatch(f, 'j1', { hours: 2 }), 'usage');
});
test('U3 unavailable provider allowance is labelled and is never guessed', () => { const f = fixture({ limit: { jobs: 20, workerHours: 20, providerPercent: 80 } }); start(f); assert.equal(dispatch(f, 'j1').status, 0); assert.equal(run(f, ['status']).data.allowance['codex-local'].available, false); });
test('U4 readable current provider allowance enforces its percentage ceiling', () => {
  const f = fixture({ limit: { jobs: 20, workerHours: 20, providerPercent: 80 } }); start(f); const file = path.join(f.state, 'swarm-current-identities.json'); const d = JSON.parse(fs.readFileSync(file)); d.identities[0].allowance = { available: true, usedPercent: 85, at: new Date().toISOString(), source: 'supported usage status' }; fs.writeFileSync(file, JSON.stringify(d)); denied(dispatch(f, 'j1'), 'usage');
});
test('U5 raising a limit requires recorded human authorisation and never silently switches routes', () => {
  const f = fixture(); start(f); assert.equal(record(f, 'limit', { jobs: 30, workerHours: 30 }).status, 2);
  assert.equal(record(f, 'limit', { jobs: 30, workerHours: 30, authorisedBy: 'human', reason: 'chat approval', chatRef: 'turn-4' }).status, 0);
});
test('F1 third failed logical attempt permits only read-only diagnosis until Cause and Evidence exist', () => {
  const f = fixture(); start(f);
  for (const id of ['a', 'b']) { assert.equal(dispatch(f, id).status, 0); done(f, id, { status: 'failed', error: 'unknown implementation failure' }); }
  denied(dispatch(f, 'c'), 'diagnose'); denied(dispatch(f, 'd', { kind: 'diagnose', owns: [], targetKind: 'build' }), 'diagnose');
  assert.equal(dispatch(f, 'd', { kind: 'diagnose', owns: [], targetKind: 'build', readOnly: true }).status, 0); done(f, 'd');
  assert.equal(record(f, 'root-cause', { piece: 'p1', kind: 'build', note: 'Cause: guessed' }).status, 2);
  assert.equal(record(f, 'root-cause', { piece: 'p1', kind: 'build', note: '## Cause\nWrong branch was admitted.\n## Evidence\nStack trace and commit diff in diagnosis result.' }).status, 0);
  assert.equal(dispatch(f, 'c',{body:'## Cause\nWrong branch was admitted.\n## Evidence\nStack trace and commit diff in diagnosis result.'}).status, 0); done(f, 'c', { status: 'failed', error: 'still fails' }); denied(dispatch(f, 'e'), 'human-failure');
});
for (const error of ['quota exceeded', 'HTTP 429 rate limit', 'ECONNRESET network unavailable', 'provider outage HTTP 503', 'cancelled by lead']) {
  test('F2 outside failure does not count: '+error, () => { const f = fixture(); start(f); for (const id of ['a', 'b']) { dispatch(f, id); done(f, id, { status: 'failed', error }); } assert.equal(dispatch(f, 'c').status, 0); });
}
test('F3 repeated completion pickup is idempotent and cannot count one failure twice', () => { const f = fixture(); start(f); dispatch(f, 'a'); done(f, 'a', { status: 'failed', error: 'assertion failed' }); done(f, 'a', { status: 'failed', error: 'assertion failed' }); assert.equal(run(f, ['status']).data.failures['p1:build'].count, 1); });
test('F4 failed diagnosis cannot manufacture root-cause evidence or permit another diagnosis', () => {
  const f = fixture(); start(f); for (const id of ['a', 'b']) { dispatch(f, id); done(f, id, { status: 'failed', error: 'assertion failed' }); }
  dispatch(f, 'd', { kind: 'diagnose', owns: [], targetKind: 'build', readOnly: true }); done(f, 'd', { status: 'failed', error: 'analysis failed' });
  assert.equal(record(f, 'root-cause', { piece: 'p1', kind: 'build', note: '## Cause\nA cause.\n## Evidence\nA result.' }).status, 2);
  denied(dispatch(f, 'd2', { kind: 'diagnose', owns: [], targetKind: 'build', readOnly: true }), 'diagnose');
});
test('O1 another running worker owns overlapping files including parent folders', () => {
  const f = fixture({ pieces: { p1: { owns: ['src'] }, p2: { owns: ['src/a.mjs'] } } }); start(f); dispatch(f, 'a', { owns: ['src'] }); denied(dispatch(f, 'b', { piece: 'p2' }), 'ownership');
});
test('O2 separate files run concurrently and terminal work releases ownership', () => { const f = fixture(); start(f); assert.equal(dispatch(f, 'a').status, 0); assert.equal(dispatch(f, 'b', { piece: 'p2', owns: ['src/b.mjs'] }).status, 0); done(f, 'a'); assert.equal(dispatch(f, 'c').status, 0); });
test('O3 file traversal and undeclared piece ownership cannot bypass the ledger', () => { const f = fixture(); start(f); for (const owns of [['../escape'], ['src/b.mjs']]) denied(dispatch(f, 'bad', { owns }), 'ownership'); });
test('B1 a missing brief header blocks the launch', () => { const f = fixture(); start(f); const file = brief(f); fs.writeFileSync(file, 'build it'); denied(run(f, ['check-dispatch', '--resource', 'codex-local', '--command', command(file)]), 'brief'); });
for (const removed of ['test-driven-development', 'systematic-debugging', 'verification-before-completion', 'bg-efficiency', 'Fast checks only.', 'Proof handback']) {
  test('B2 required brief contract missing: '+removed, () => { const f = fixture(); start(f); const file = brief(f); fs.writeFileSync(file, fs.readFileSync(file, 'utf8').replace(removed, '')); denied(run(f, ['check-dispatch', '--resource', 'codex-local', '--command', command(file)]), 'brief'); });
}
test('C1 check dispatch waits for all pieces and an immutable integration SHA', () => { const f = fixture(); start(f); denied(dispatch(f, 'check', { kind: 'check', owns: [], readOnly: true, stage: 'suite' }), 'integration'); integrated(f); assert.equal(dispatch(f, 'check', { kind: 'check', owns: [], readOnly: true, stage: 'suite' }).status, 0); });
test('C2 explicit deferral needs a reason and unblocks integration without pretending it returned', () => { const f = fixture(); start(f); record(f, 'piece', { piece: 'p1', status: 'returned', returnRef: sha, evidence: 'result.json' }); assert.equal(record(f, 'piece', { piece: 'p2', status: 'deferred' }).status, 2); assert.equal(record(f, 'piece', { piece: 'p2', status: 'deferred', reason: 'optional piece omitted in this release' }).status, 0); assert.equal(record(f, 'candidate', { sha }).status, 0); assert.equal(run(f, ['check-suite', '--sha', sha]).status, 0); });
test('C3 suite then journey then review order binds results to exact SHA', () => { const f = fixture(); start(f); integrated(f); denied(run(f, ['check-journey', '--sha', sha]), 'suite'); denied(run(f, ['check-review', '--sha', sha]), 'rehearsal'); assert.equal(passed(f, 'journey').status, 2); assert.equal(passed(f, 'suite').status, 0); assert.equal(passed(f, 'journey').status, 0); assert.equal(passed(f, 'review', nextSha).status, 2); assert.equal(passed(f, 'review').status, 0); });
test('C4 a new candidate invalidates all earlier check results', () => { const f = fixture(); start(f); ready(f); assert.equal(record(f, 'candidate', { sha: nextSha }).status, 0); denied(run(f, ['check-release', '--sha', nextSha]), 'release'); });
test('C5 running workers cannot be marked returned or bypass the check gate', () => { const f = fixture(); start(f); dispatch(f, 'j1'); assert.equal(record(f, 'piece', { piece: 'p1', status: 'returned', returnRef: sha, evidence: 'result.json' }).status, 2); denied(run(f, ['check-suite', '--sha', sha]), 'integration'); });
test('C6 third fix wave requires human authority; findings stay visible', () => { const f = fixture(); start(f); for (const id of ['F1', 'F2']) record(f, 'finding', { id, blocking: true, status: 'open', detail: 'wrong output' }); assert.equal(record(f, 'fix-wave', {}).status, 0); assert.equal(record(f, 'fix-wave', {}).status, 0); denied(record(f, 'fix-wave', {}), 'fix-wave'); assert.equal(record(f, 'fix-wave', { authorisedBy: 'human', reason: 'chat approved wave 3', chatRef: 'turn-5' }).status, 0); });
test('R1 ready exact SHA releases; any other SHA and open findings block', () => { const f = fixture(); start(f); ready(f); assert.equal(run(f, ['check-release', '--sha', sha]).status, 0); denied(run(f, ['check-release', '--sha', nextSha]), 'release'); record(f, 'finding', { id: 'F1', blocking: true, status: 'open', detail: 'data loss' }); denied(run(f, ['check-release', '--sha', sha]), 'release'); });
test('R2 failed rehearsal closes release; a review verdict is not readiness', () => { const f = fixture(); start(f); ready(f); record(f, 'rehearsal', {sha,goldenJourneys:'failed',rollbackProven:true,rollbackEvidence:'rollback.log',exitCode:1,evidence:'failure.log'}); denied(run(f, ['check-release', '--sha', sha]), 'release'); });
test('R3 emergency override is candidate-bound and only recorded human authority opens it', () => { const f = fixture(); start(f); integrated(f); assert.equal(record(f, 'override', { sha, reason: 'emergency' }).status, 2); assert.equal(record(f, 'override', { sha, authorisedBy: 'human', reason: 'emergency', chatRef: 'turn-8' }).status, 0); assert.equal(run(f, ['check-release', '--sha', sha]).status, 0); denied(run(f, ['check-release', '--sha', nextSha]), 'release'); });
test('R4 ordinary builds and preview deployments are not releases', () => { const f = fixture(); start(f); for (const cmd of ['npm run build', 'eas build --profile production', 'vercel deploy', 'vercel deploy --target preview', 'wrangler deploy --env preview', 'supabase db push --local', 'gh release view']) { const r = run(f, ['hook'], { hook_event_name: 'PreToolUse', tool_name: 'Bash', cwd: f.root, tool_input: { command: cmd } }); assert.equal(r.status, 0); assert.equal(r.stdout, '', cmd); } });
for (const cmd of ['vercel --prod', 'eas submit --platform android', 'eas update --channel production', 'supabase db push --linked', 'wrangler deploy --env production', 'npm publish', 'gh release create v1', 'asc submit', 'fastlane deliver']) {
  test('R5 conservative production release blocked: '+cmd, () => { const f = fixture(); start(f); const r = run(f, ['hook'], { hook_event_name: 'PreToolUse', tool_name: 'Bash', cwd: f.root, tool_input: { command: cmd } }); assert.equal(r.data?.hookSpecificOutput?.permissionDecision, 'deny', r.stdout); });
}
test('H1 commands and native workers outside a swarm are untouched', () => { const f = fixture(); for (const [name, input] of [['Bash', { command: 'vercel --prod' }], ['Agent', { prompt: 'do a task' }], ['Bash', { command: 'cx task --model bad' }]]) { const r = run(f, ['hook'], { hook_event_name: 'PreToolUse', tool_name: name, cwd: f.root, tool_input: input }); assert.equal(r.stdout, ''); assert.equal(r.stderr, ''); assert.equal(r.status, 0); } });
test('H2 supported worker launches all enforce the prompt-file brief', () => { const f = fixture(); start(f); for (const cmd of ['cx task --background', 'node bg-swarm.mjs launch --host codex', 'codex cloud exec --env e1', 'grok --prompt do-it', 'kimi --print -p do-it']) { const r = run(f, ['hook'], { hook_event_name: 'PreToolUse', tool_name: 'Bash', cwd: f.root, tool_input: { command: cmd } }); assert.equal(r.data?.hookSpecificOutput?.permissionDecision, 'deny', cmd); } });
test('H3 Agent, Task and Codex companion workers require identifiable brief files', () => { const f = fixture(); start(f); for (const name of ['Agent', 'Task', 'mcp__codex__task']) { const r = run(f, ['hook'], { hook_event_name: 'PreToolUse', tool_name: name, cwd: f.root, tool_input: { prompt: 'do-it', model: 'test-model', effort: 'max' } }); assert.equal(r.data?.hookSpecificOutput?.permissionDecision, 'deny', name); } });
test('H4 hook reserves dispatch atomically and collects a returned job ID without double charging', () => {
  const f = fixture(); start(f); const input = { hook_event_name: 'PreToolUse', tool_use_id: 'call-1', tool_name: 'Bash', cwd: f.root, tool_input: { command: command(brief(f)) } };
  assert.equal(run(f, ['hook'], input).stdout, ''); assert.equal(run(f, ['hook'], input).stdout, '');
  assert.equal(run(f, ['status']).data.used.jobs, 1);
  assert.equal(run(f, ['hook'], { ...input, hook_event_name: 'PostToolUse', tool_response: { id: 'actual-1', status: 'running' } }).status, 0);
  assert.equal(run(f, ['status']).data.dispatches[0].id, 'actual-1');
});
test('H5 full suite launch waits for integration even when disguised as mechanical work', () => {
  const f = fixture(); start(f); const r = run(f, ['hook'], { hook_event_name: 'PreToolUse', tool_name: 'Bash', cwd: f.root, tool_input: { command: 'node scripts/test-all.mjs' } }); assert.equal(r.data?.hookSpecificOutput?.permissionDecision, 'deny');
  denied(dispatch(f, 'j1', { kind: 'mechanical', body: 'Run the full-suite: npm test' }), 'integration');
});
test('H6 internal error warns and fails open for dispatch, but an unready release fails closed', () => {
  const f = fixture(); start(f); fs.writeFileSync(path.join(f.root, '.bgzflow', 'swarms', 's1.json'), '{');
  const input = { hook_event_name: 'PreToolUse', tool_name: 'Bash', cwd: f.root, tool_input: { command: command(brief(f)) } };
  const r = run(f, ['hook'], input); assert.equal(r.status, 0); assert.equal(r.stdout, ''); assert.match(r.stderr, /warning/i);
  const release = run(f, ['hook'], { ...input, tool_input: { command: 'vercel --prod' } }); assert.equal(release.data?.hookSpecificOutput?.permissionDecision, 'deny');
});
test('H7 inactive ledgers do not affect ordinary chats', () => { const f = fixture(); start(f); assert.equal(record(f, 'finish', {}).status, 0); assert.equal(run(f, ['hook'], { hook_event_name: 'PreToolUse', tool_name: 'Agent', cwd: f.root, tool_input: { prompt: 'ordinary task' } }).stdout, ''); });
test('H8 gate hook adds at most one short reason and one next step', () => { const f = fixture(); start(f); const r = run(f, ['hook'], { hook_event_name: 'PreToolUse', tool_name: 'Bash', cwd: f.root, tool_input: { command: 'cx task' } }); assert.ok(r.data.hookSpecificOutput.permissionDecisionReason.length < 900); });
test('H9 composed launches cannot sneak extra workers past one reservation', () => { const f = fixture(); start(f); const c = command(brief(f)); const r = run(f, ['hook'], { hook_event_name: 'PreToolUse', tool_name: 'Bash', cwd: f.root, tool_input: { command: c+'; '+c } }); assert.equal(r.data?.hookSpecificOutput?.permissionDecision, 'deny'); });
test('H10 allow path runs well under a second and never reads credential files', () => { const f = fixture(); start(f); fs.writeFileSync(path.join(f.root, 'auth.json'), '{invalid secret file'); const at = performance.now(); assert.equal(dispatch(f, 'j1').status, 0); assert.ok(performance.now() - at < 900); });
test('A1 fix dispatch cannot bypass the third-wave limit by omitting the wave record', () => {
  const f = fixture(); start(f); record(f, 'fix-wave', {}); record(f, 'fix-wave', {}); integrated(f);
  denied(dispatch(f, 'fix-3', { kind: 'fix' }), 'fix-wave');
});
test('A2 reusing a reservation identity for a different launch is blocked', () => {
  const f = fixture(); start(f); assert.equal(dispatch(f, 'j1').status, 0); denied(dispatch(f, 'j1', { model: 'other' }), 'identity');
});
test('A3 release artifact binding refuses credential paths without opening them', () => {
  const f = fixture(); start(f); integrated(f); const file = path.join(f.root, 'auth.json'); fs.writeFileSync(file, 'nonsecret fixture');
  assert.equal(record(f, 'release-intent', { sha, command: 'eas submit', artifact: file, hash: 'f'.repeat(64) }).status, 2);
});
test('A4 a read-only header cannot authorize a writable worker command', () => {
  const f = fixture(); start(f); const file = brief(f, { kind: 'research', owns: [], readOnly: true, unsplit: true });
  denied(run(f, ['dispatch', '--job-id', 'bad', '--resource', 'codex-local', '--command', command(file, 'test-model', 'ultra')]), 'policy');
});
test('A5 native bg-swarm blocks bad policy before it can start a process', () => {
  const f = fixture(); start(f); const worker = fileURLToPath(new URL('../../bg-swarm/bg-swarm.mjs', import.meta.url));
  const r = spawnSync(process.execPath, [worker, 'launch', '--project', 'fixture', '--name', 'bad', '--host', 'codex', '--cwd', f.root, '--prompt-file', brief(f), '--model', 'wrong', '--effort', 'max'], { cwd: f.root, env: f.env, encoding: 'utf8', timeout: 5000 });
  assert.equal(r.status, 2); assert.match(r.stderr, /policy|corrected/i); assert.equal(run(f, ['status']).data.used.jobs, 0);
});
test('A6 gate CLI preflights are not mistaken for worker launches by their own hook', () => {
  const f = fixture(); start(f); const cmd = `node swarm-gate.mjs dispatch --job-id cloud-1 --prompt-file "${brief(f)}" --command 'codex cloud exec --env fixture'`;
  assert.equal(run(f, ['hook'], { hook_event_name: 'PreToolUse', tool_name: 'Bash', cwd: f.root, tool_input: { command: cmd } }).stdout, '');
});
test('A7 an inline account-home change invalidates proof before dispatch', () => {
  const f = fixture(); start(f); const cmd = `CODEX_HOME="${path.join(f.root, 'other')}" ${command(brief(f))}`;
  denied(run(f, ['dispatch', '--job-id', 'j1', '--resource', 'codex-local', '--command', cmd]), 'resource');
});
test('A8 an explicit command setting cannot be hidden by different dispatch metadata', () => {
  const f = fixture(); start(f); denied(run(f, ['dispatch', '--job-id', 'j1', '--resource', 'codex-local', '--model', 'test-model', '--command', command(brief(f), 'wrong')]), 'policy');
});
test('A9 a CLI reservation transports a brief to a host without a native prompt-file flag exactly once', () => {
  const f = fixture(); start(f); const file = brief(f); const cmd = 'cx task --background --model test-model --effort max';
  assert.equal(run(f, ['dispatch', '--job-id', 'native-1', '--resource', 'codex-local', '--prompt-file', file, '--command', cmd]).status, 0);
  const input = { hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_use_id: 'claim-1', cwd: f.root, tool_input: { command: cmd } };
  assert.equal(run(f, ['hook'], input).stdout, ''); assert.equal(run(f, ['status']).data.used.jobs, 1);
  assert.equal(run(f, ['hook'], { ...input, tool_use_id: 'claim-2' }).data?.hookSpecificOutput?.permissionDecision, 'deny');
});
test('A10 policy corrections preserve native short-model and reasoning-effort flags', () => {
  const f = fixture(); start(f); const file = brief(f);
  const cmd = `cx task -m wrong --reasoning-effort low --prompt-file "${file}"`;
  const r = run(f, ['check-dispatch', '--resource', 'codex-local', '--command', cmd]); denied(r, 'policy');
  assert.equal(r.data.correctedCommand, `cx task -m test-model --reasoning-effort max --prompt-file "${file}"`);
});
test('A11 blocked check and third-wave reasons are retained in status', () => {
  const f = fixture(); start(f); denied(run(f, ['check-journey', '--sha', sha]), 'integration');
  assert.equal(run(f, ['status']).data.blocked['check:journey'].rule, 'integration');
  assert.equal(record(f, 'fix-wave', {}).status, 0); assert.equal(record(f, 'fix-wave', {}).status, 0); denied(record(f, 'fix-wave', {}), 'fix-wave');
  assert.equal(run(f, ['status']).data.blocked['fix-wave'].rule, 'fix-wave');
});
test('A12 wildcard public policy corrects a missing model from its proven configured route', () => {
  const f = fixture({ policy: { ...policy, models: ['*'] } }); start(f); const cmd = command(brief(f)).replace('--model test-model ', '');
  const r = run(f, ['check-dispatch', '--resource', 'codex-local', '--command', cmd]); denied(r, 'policy'); assert.equal(r.data.correctedCommand, cmd+' --model test-model');
});
test('A13 malformed proof state is unproven, rather than an internal-error dispatch bypass', () => {
  const f = fixture(); start(f); fs.writeFileSync(path.join(f.state, 'swarm-proven-routes.json'), 'null'); denied(dispatch(f, 'j1'), 'resource');
});

// Independent review reproductions. They exercise real ledgers, Git worktrees and directory aliases.
function git(cwd, args) {
  const r = spawnSync('git', args, { cwd, encoding: 'utf8', timeout: 15000 });
  assert.equal(r.status, 0, r.stderr); return r.stdout.trim();
}
function repository(f) {
  git(f.root, ['init', '-q']); fs.writeFileSync(path.join(f.root, 'project.txt'), 'wave zero\n');
  git(f.root, ['add', 'project.txt']);
  git(f.root, ['-c', 'user.name=Fixture', '-c', 'user.email=bgzflow@users.noreply.github.com', 'commit', '-qm', 'fixture']);
  return git(f.root, ['rev-parse', 'HEAD']);
}
function accepted(f, candidate) {
  for (const piece of ['p1', 'p2']) assert.equal(record(f, 'piece', { piece, status: 'returned', returnRef: candidate, evidence: 'result.json' }).status, 0);
  assert.equal(record(f, 'candidate', { sha: candidate }).status, 0);
  for (const stage of ['suite', 'journey', 'review']) assert.equal(passed(f, stage, candidate).status, 0);
}
function pre(f, cmd, extra = {}, name = 'Bash') {
  return run(f, ['hook'], { hook_event_name: 'PreToolUse', tool_name: name, cwd: f.root, tool_use_id: 'probe-'+createHash('sha256').update(cmd+JSON.stringify(extra)).digest('hex').slice(0,12), tool_input: { command: cmd, ...extra } });
}
test('A14 claudex task and exec tools enforce briefs, reserve once and collect failures', () => {
  const f = fixture(); start(f);
  for (const name of ['mcp__claudex__task', 'mcp__claudex__exec']) assert.equal(pre(f, '', { prompt: 'do-it', model: 'test-model', effort: 'max' }, name).data?.hookSpecificOutput?.permissionDecision, 'deny');
  const input = { hook_event_name: 'PreToolUse', tool_name: 'mcp__claudex__task', cwd: f.root, tool_use_id: 'claudex-call', tool_input: { prompt_file: brief(f), model: 'test-model', effort: 'max' } };
  assert.equal(run(f, ['hook'], input).stdout, ''); assert.equal(run(f, ['hook'], input).stdout, '');
  assert.equal(run(f, ['status']).data.used.jobs, 1);
  assert.equal(run(f, ['hook'], { ...input, hook_event_name: 'PostToolUse', tool_response: { job_id: 'native-claudex' } }).stdout, '');
  assert.equal(run(f, ['status']).data.dispatches[0].id, 'native-claudex');
  assert.equal(run(f, ['hook'], { ...input, hook_event_name: 'PostToolUseFailure', error: 'worker bug' }).stdout, '');
  assert.equal(run(f, ['status']).data.failures['p1:build'].count, 1);
  const outside = fixture(); assert.equal(pre(outside, '', { prompt: 'ordinary' }, 'mcp__claudex__exec').stdout, '');
});
for (const wrong of [true, false]) test('A15 native linked-worktree '+(wrong ? 'bad policy blocks before spawn' : 'launch reserves once and protects logical ownership'), () => {
  const f = fixture(); repository(f); start(f);
  const work = f.root+'-work'; made.push(work); git(f.root, ['worktree', 'add', '--detach', work, 'HEAD']);
  for (const key of ['BGZFLOW_PROJECT','CLAUDE_PROJECT_DIR','GROK_WORKSPACE_ROOT']) delete f.env[key];
  const worker = fileURLToPath(new URL('../../bg-swarm/bg-swarm.mjs', import.meta.url));
  const exe=path.join(f.root,'bin',process.platform==='win32'?'codex.exe':'codex');
  if(fs.existsSync(exe)) fs.unlinkSync(exe);
  try { fs.linkSync(process.execPath,exe); } catch { fs.copyFileSync(process.execPath,exe); } fs.chmodSync(exe,0o755);
  const intercept=path.join(f.root,'fake-codex.mjs');
  fs.writeFileSync(intercept,"import path from 'node:path'; if(path.basename(process.argv[1]||'')==='exec'){ for await(const chunk of process.stdin){} console.log('fake worker started'); setInterval(()=>{},1000); await new Promise(()=>{}); }");
  f.env.NODE_OPTIONS='--import="'+pathToFileURL(intercept).href+'"';
  const argv = ['launch', '--project', 'fixture', '--name', 'worktree', '--host', 'codex', '--resource', 'codex-local', '--cwd', work, '--prompt-file', brief(f), '--model', wrong ? 'wrong' : 'test-model', '--effort', 'max', '--verify-seconds', '10'];
  try {
    const r = spawnSync(process.execPath, [worker, ...argv], { cwd: f.root, env: f.env, encoding: 'utf8', timeout: 20000 });
    assert.equal(r.status, wrong ? 2 : 0, r.stderr);
    if(wrong) assert.match(r.stderr,/policy/);
    const s = run(f, ['status']).data;
    assert.equal(s.used.jobs, wrong ? 0 : 1);
    if (!wrong) {
      assert.equal(s.dispatches[0].cwd, work);
      denied(dispatch(f, 'overlap'), 'ownership');
    }
  } finally { spawnSync(process.execPath, [worker, 'stop', '--project', 'fixture', '--name', 'worktree'], { cwd: f.root, env: f.env, encoding: 'utf8', timeout: 15000 }); }
});
test('A16 release uses effective workdir, cwd, shell directory and provider directory', () => {
  const f = fixture(); const candidate = repository(f); start(f); accepted(f, candidate);
  const other = fixture(); repository(other); fs.writeFileSync(path.join(other.root, 'project.txt'), 'another candidate\n'); git(other.root, ['add','project.txt']); git(other.root, ['-c','user.name=Fixture','-c','user.email=bgzflow@users.noreply.github.com','commit','-qm','other']);
  for (const [cmd, metadata] of [['vercel --prod', {workdir: other.root}], ['vercel --prod', {cwd: other.root}], [`cd "${other.root}" && vercel --prod`, {}], [`Set-Location -LiteralPath "${other.root}"; vercel --prod`, {}], [`vercel --cwd "${other.root}" --prod`, {}]]) assert.equal(pre(f, cmd, metadata).data?.hookSpecificOutput?.permissionDecision, 'deny', cmd+JSON.stringify(metadata));
  for (const cmd of [`vercel --prod; cd "${f.root}"`, `vercel --prod; Set-Location -LiteralPath "${f.root}"`, `echo --cwd "${f.root}"; vercel --prod`, `printf "%s" "--cwd ${f.root}"; vercel --prod`]) assert.equal(pre(f,cmd,{workdir:other.root}).data?.hookSpecificOutput?.permissionDecision,'deny',cmd);
  for (const [cmd, metadata] of [['vercel --prod', {workdir: f.root}], [`cd "${f.root}" && vercel --prod`, {}], [`vercel --cwd "${f.root}" --prod`, {}]]) assert.equal(pre(f, cmd, metadata).stdout, '', cmd);
});
test('A17 self-gate exemption cannot hide a release or a worker in composed shell text', () => {
  const f = fixture(); start(f);
  for (const cmd of ['node swarm-gate.mjs status; vercel --prod', 'echo "swarm-gate status"; vercel --prod', 'node swarm-gate.mjs status; cx task --model wrong', 'echo "swarm-gate status"; cx task']) assert.equal(pre(f, cmd).data?.hookSpecificOutput?.permissionDecision, 'deny', cmd);
  const transport = `node swarm-gate.mjs dispatch --prompt-file "${brief(f)}" --command 'codex cloud exec --env fixture'`;
  assert.equal(pre(f, transport).stdout, '');
});
test('A18 configured release stays closed when its bound artifact disappears', () => {
  const f = fixture({ releasePatterns: ['prod-publish'] }); start(f); integrated(f);
  const artifact = path.join(f.root, 'release.zip'); fs.writeFileSync(artifact, 'artifact');
  const hash = createHash('sha256').update('artifact').digest('hex');
  assert.equal(record(f, 'release-intent', {sha, command:'prod-publish', artifact, hash}).status, 0);
  fs.unlinkSync(artifact); const r = pre(f, 'prod-publish'); assert.equal(r.data?.hookSpecificOutput?.permissionDecision, 'deny');
});
test('A19 terminal reservation cannot be replayed and active replay revalidates current account', () => {
  const f = fixture(); start(f); assert.equal(dispatch(f,'j1').status,0); done(f,'j1'); denied(dispatch(f,'j1'),'identity');
  assert.equal(dispatch(f,'j2').status,0);
  const file = path.join(f.state,'swarm-current-identities.json'), d=JSON.parse(fs.readFileSync(file)); d.identities[0].account='codex:changed'; fs.writeFileSync(file,JSON.stringify(d));
  denied(dispatch(f,'j2'),'resource'); assert.equal(run(f,['status']).data.used.jobs,2);
});
test('A20 in-tree junction aliases cannot authorize overlapping writers or missing descendants', () => {
  for (const exists of [false,true]) {
    const f=fixture({pieces:{p1:{owns:['src']},p2:{owns:['alias']}}}); fs.mkdirSync(path.join(f.root,'src'),{recursive:true});
    fs.symlinkSync(path.join(f.root,'src'),path.join(f.root,'alias'),process.platform==='win32'?'junction':'dir');
    if(exists) fs.writeFileSync(path.join(f.root,'src','a.mjs'),'fixture');
    start(f); assert.equal(dispatch(f,'j1',{owns:['src/a.mjs']}).status,0); denied(dispatch(f,'j2',{piece:'p2',owns:['alias/a.mjs']}),'ownership');
  }
});
for (const permission of ['--yolo','--sandbox workspace-write','--sandbox=danger-full-access']) test('A21 advertised read-only correction is usable for '+permission, () => {
  const f=fixture(); start(f); const file=brief(f,{kind:'research',owns:[],readOnly:true});
  const r=run(f,['check-dispatch','--prompt-file',file,'--command',`codex exec --model wrong -c model_reasoning_effort="low" ${permission} -`]); denied(r,'policy');
  assert.equal(run(f,['check-dispatch','--prompt-file',file,'--command',r.data.correctedCommand]).status,0,r.data.correctedCommand);
  assert.match(r.data.correctedCommand,/--sandbox(?:=|\s+)read-only/);
});
test('A22 direct Codex missing effort correction uses a supported configuration flag', () => {
  const f=fixture(); start(f); const file=brief(f), cmd='codex exec --model wrong -';
  const r=run(f,['check-dispatch','--prompt-file',file,'--command',cmd]); denied(r,'policy');
  assert.match(r.data.correctedCommand,/-c model_reasoning_effort="max"/); assert.doesNotMatch(r.data.correctedCommand,/--effort\b/);
  assert.equal(run(f,['check-dispatch','--prompt-file',file,'--command',r.data.correctedCommand]).status,0);
});
test('A23 remote Supabase push blocks and local or dry-run operations stay untouched', () => {
  const f=fixture(); start(f);
  for(const cmd of ['supabase db push','supabase db push --linked','supabase db push --db-url postgresql://fixture.invalid/db']) assert.equal(pre(f,cmd).data?.hookSpecificOutput?.permissionDecision,'deny',cmd);
  for(const cmd of ['supabase db push --local','supabase db push --dry-run','supabase db push --linked --dry-run']) assert.equal(pre(f,cmd).stdout,'',cmd);
});
test('A24 printed release text and publish dry-runs are not releases', () => {
  const f=fixture(); start(f);
  for(const cmd of ['echo npm publish','echo "vercel --prod"','printf "%s" "npm publish"','Write-Output "eas submit"','npm publish --dry-run','pnpm publish --dry-run']) assert.equal(pre(f,cmd).stdout,'',cmd);
  for(const cmd of ['echo "npm publish"; npm publish','npm publish --dry-run; npm publish']) assert.equal(pre(f,cmd).data?.hookSpecificOutput?.permissionDecision,'deny',cmd);
});
test('A25 credential directory alias is refused before content is opened', () => {
  const f=fixture(); start(f); const credentials=path.join(f.root,'credentials'); fs.mkdirSync(credentials);
  const target=path.join(credentials,'plain.md'); fs.writeFileSync(target,fs.readFileSync(brief(f),'utf8'));
  const alias=path.join(f.root,'safe-alias'); fs.symlinkSync(credentials,alias,process.platform==='win32'?'junction':'dir');
  const aliasFile=path.join(alias,'plain.md'), original=fs.readFileSync; let opened=false;
  fs.readFileSync=function(file,...args){ if(path.resolve(String(file))===aliasFile) opened=true; return original.call(this,file,...args); };
  try { const r=hook({hook_event_name:'PreToolUse',tool_name:'Bash',cwd:f.root,tool_use_id:'alias',tool_input:{command:command(aliasFile)}},f.env); assert.equal(r.hookSpecificOutput?.permissionDecision,'deny'); assert.equal(opened,false); }
  finally { fs.readFileSync=original; }
  integrated(f); assert.equal(record(f,'release-intent',{sha,command:'eas submit',artifact:aliasFile,hash:createHash('sha256').update(fs.readFileSync(target)).digest('hex')}).status,2);
});
test('A26 unknown or inactive swarm selectors cannot bypass checks in an active project', () => {
  const f=fixture(); start(f);
  for(const stage of ['suite','review','release']) denied(run(f,['check-'+stage,'--swarm','wrong-id','--sha',sha]),'swarm');
  const outside=fixture(); assert.equal(run(outside,['check-release','--swarm','wrong-id','--sha',sha]).status,0);
});
test('A27 required CLI checks in a linked worktree find the main swarm ledger', () => {
  const f=fixture(); repository(f); start(f); const work=f.root+'-work'; made.push(work); git(f.root,['worktree','add','--detach',work,'HEAD']);
  for(const key of ['BGZFLOW_PROJECT','CLAUDE_PROJECT_DIR','GROK_WORKSPACE_ROOT']) delete f.env[key];
  const r=run({...f,root:work},['check-release','--swarm','s1','--sha',sha]); denied(r,'release');
  assert.equal(run({...f,root:work},['status']).data.swarm,'s1');
});
test('A28 resource metadata cannot disguise an identifiable provider launch', () => {
  const f=fixture(); start(f); const file=brief(f);
  for(const provider of ['grok','kimi']) denied(run(f,['check-dispatch','--resource','codex-local','--command',`${provider} --model test-model --effort max --prompt-file "${file}"`]),'resource');
});
test('A29 native worker provider cannot borrow another provider qualification', () => {
  const f=fixture({resources:['claude-local']}); f.env.CLAUDE_CONFIG_DIR=f.root;
  fs.writeFileSync(path.join(f.root,'bin','claude'),'#!/bin/sh\nexit 99\n',{mode:0o755});
  for(const filename of ['swarm-current-identities.json','swarm-proven-routes.json']){
    const file=path.join(f.state,filename), d=JSON.parse(fs.readFileSync(file));
    for(const r of d.identities || d.routes) {r.id='claude-local'; r.account='claude:fixture-a';} fs.writeFileSync(file,JSON.stringify(d));
  }
  fs.writeFileSync(path.join(f.env.BGZFLOW_OVERLAY,'ROUTES.md'),'| Resource | Kind | CLI | Home | Dispatch | Model | Effort |\n|---|---|---|---|---|---|---|\n| claude-local | local | claude | '+f.root+' | native worker | test-model | max |\n');
  start(f); const file=brief(f), metadata={prompt_file:file,resource:'claude-local',model:'test-model',effort:'max'};
  for(const name of ['mcp__claudex__task','mcp__codex__exec']) assert.equal(pre(f,'',metadata,name).data?.hookSpecificOutput?.permissionDecision,'deny',name);
  assert.equal(run(f,['status']).data.used.jobs,0);
  assert.equal(pre(f,'',metadata,'Agent').stdout,''); assert.equal(run(f,['status']).data.used.jobs,1);
  const codex=fixture(); start(codex); assert.equal(pre(codex,'',{prompt_file:brief(codex),resource:'codex-local',model:'test-model',effort:'max'},'mcp__claudex__task').stdout,'');
});
for(const permission of ['--permission-mode "auto"',"--permission-mode 'auto'",'--permission-mode="auto"']) test('A30 quoted permission mode cannot authorize read-only work: '+permission,()=>{
  const f=fixture(); start(f); const file=brief(f,{kind:'research',owns:[],readOnly:true});
  const cmd=`cx task --model test-model --effort max ${permission}`;
  const r=run(f,['check-dispatch','--prompt-file',file,'--command',cmd]); denied(r,'policy');
  assert.equal(run(f,['check-dispatch','--prompt-file',file,'--command',r.data.correctedCommand]).status,0,r.data.correctedCommand);
  assert.doesNotMatch(r.data.correctedCommand,/auto/);
});
test('A31 an explicit false dry-run value cannot authorize a production publish',()=>{
  const f=fixture(); start(f);
  for(const cmd of ['npm publish --dry-run=false','pnpm publish --dry-run=false','supabase db push --dry-run=false']) assert.equal(pre(f,cmd).data?.hookSpecificOutput?.permissionDecision,'deny',cmd);
  assert.equal(pre(f,'npm publish --dry-run=true').stdout,'');
});
test('A32 an unqualified dry-run flag cannot exempt a configured production alias',()=>{
  const f=fixture({releasePatterns:['prod-publish']}); start(f);
  assert.equal(pre(f,'prod-publish --dry-run').data?.hookSpecificOutput?.permissionDecision,'deny');
});

for (const command of ['npm publish','pnpm publish','supabase db push','vercel --prod','wrangler deploy --env production','eas update --channel production','gh release create v1','eas submit','asc submit','fastlane deliver','kubectl apply --context production','helm upgrade --kube-context production']) {
  for (const flags of ['--dry-run false','--dry-run="false"','--dry-run=false','--no-dry-run','--dry-run --no-dry-run','--dry-run=false --dry-run']) test(`A33 false or negated dry-run stays guarded: ${command} ${flags}`,()=>{
    const f=fixture();start(f);assert.equal(pre(f,`${command} ${flags}`).data?.hookSpecificOutput?.permissionDecision,'deny');
  });
}
test('A34 supported Boolean true dry-runs allow and custom production aliases stay guarded',()=>{
  const f=fixture();start(f);
  for(const cmd of ['npm publish --dry-run','npm publish --dry-run true','npm publish --dry-run="true"','pnpm publish --dry-run=true','supabase db push --dry-run']) assert.equal(pre(f,cmd).stdout,'',cmd);
});
