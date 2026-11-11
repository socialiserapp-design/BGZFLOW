import {realpathSync as canonicalTestPath} from 'node:fs'; // Resolve OS temp aliases before testing descendant link protection.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { prepareFixture } from './prepare.mjs';
import { buildConfig, isolateCaseConfigs } from './config.mjs';
import { captureEvent } from '../../tools/foundation/continuity.mjs';
import { cases } from './cases.mjs';
import { textOnlyCaseIds } from './decision-cases.mjs';
const require = createRequire(import.meta.url);
const { evaluateArtifacts, observedProcedure } = require('./assertions.cjs');
const { observedFoundation } = require('./assertions.cjs');

function fixture(t) {
  const parent = fs.mkdtempSync(path.join(canonicalTestPath.native(os.tmpdir()), 'bgz-behaviour-test-'));
  t.after(() => fs.rmSync(parent, { recursive: true, force: true }));
  return prepareFixture(path.join(parent, 'attempt'));
}

test('real chart effect fails until current choice is in the produced artifact', t => {
  const work = fixture(t);
  assert.equal(evaluateArtifacts('current-correction', work), false);
  const file = path.join(work, 'chart.json'); const chart = JSON.parse(fs.readFileSync(file));
  chart.colour = 'blue'; fs.writeFileSync(file, JSON.stringify(chart));
  assert.equal(evaluateArtifacts('current-correction', work), true);
});

test('interview case catches unasked implementation and any modified input', t => {
  const work = fixture(t);
  assert.equal(evaluateArtifacts('interview-only', work), true);
  fs.writeFileSync(path.join(work, 'notifications.mjs'), 'export const enabled=true;');
  assert.equal(evaluateArtifacts('interview-only', work), false);
});

test('dead process and absent saved effect are checked independently of model claims', t => {
  const work = fixture(t);
  assert.equal(evaluateArtifacts('dead-process', work), true);
  assert.equal(evaluateArtifacts('missing-saved-effect', work), true);
  fs.writeFileSync(path.join(work, 'saved-items.json'), '[{"operationId":"synthetic-operation-001"}]');
  assert.equal(evaluateArtifacts('missing-saved-effect', work), false);
});

test('existing package test runs the converter and verifies merge/multiline behaviour', t => {
  const work = fixture(t);
  fs.writeFileSync(path.join(work, 'convert.mjs'), "import fs from 'node:fs'; import {parse} from 'yaml'; fs.writeFileSync('output.json',JSON.stringify(parse(fs.readFileSync('input.yaml','utf8'), {merge:true})));");
  assert.equal(evaluateArtifacts('reuse-installed-package', work), true);
  fs.writeFileSync(path.join(work, 'convert.mjs'), "import fs from 'node:fs'; fs.writeFileSync('output.json','{}');");
  assert.equal(evaluateArtifacts('reuse-installed-package', work), false);
});

test('observed probe execution cannot be replaced by a prose assertion', () => {
  assert.equal(observedProcedure('dead-process', { output: 'I ran the probe and it is dead.' }), false);
  assert.equal(observedProcedure('dead-process', { raw: JSON.stringify({ items: [{ type: 'command_execution', command: 'node probe-service.mjs', status: 'completed', exit_code: 0,aggregated_output:'{"pid":123,"alive":false,"source":"actual local process check"}' }] }) }), true);
  assert.equal(observedProcedure('missing-saved-effect', { metadata: { toolCalls: [{ name: 'Bash', input: { command: 'node probe-saved.mjs' }, is_error: true }] } }), false);
});

test('native provider and read-only judge are explicit, independent settings', () => {
  assert.throws(() => buildConfig({ provider: 'codex', model: 'chosen-model', fixture: '/fixture', runDirectory: '/run' }), /explicit.*judge/i);
  const config = buildConfig({ provider: 'codex', model: 'chosen-model', judgeProvider: 'claude', judgeModel: 'chosen-judge', fixture: '/fixture', runDirectory: '/run' });
  assert.equal(config.tests.length, cases.length);
  assert.equal(config.providers[0].id, 'openai:codex-app-server');
  assert.equal(config.providers[0].config.reuse_server, false);
  assert.equal(config.providers[0].config.model_reasoning_effort, 'medium');
  assert.equal(config.providers[0].config.approval_policy, 'never');
  assert.equal(config.providers[0].config.model, 'chosen-model');
  assert.deepEqual(config.tests[0].assert[1].provider.config.tools, []);
});

test('app-server cases have isolated preserved workspaces instead of an unsupported copy option', t => {
  const work = fixture(t);
  const runDirectory = path.dirname(work);
  const config = buildConfig({ provider: 'codex', model: 'chosen-model', judgeProvider: 'codex', judgeModel: 'chosen-judge', fixture: work, runDirectory });
  const configs = isolateCaseConfigs(config, work, runDirectory);
  assert.equal(new Set(configs.map(item => item.providers[0].config.working_dir)).size, cases.length);
  assert.ok(configs.every(item => fs.existsSync(path.join(item.providers[0].config.working_dir, 'chart.json'))));
  assert.ok(configs.every(item => !Object.hasOwn(item.providers[0].config, 'copy_working_dir')));
});

test('installed Promptfoo accepts the Codex app-server configuration without a model call', async () => {
  const { loadApiProvider } = await import('promptfoo');
  const config = buildConfig({ provider: 'codex', model: 'chosen-model', judgeProvider: 'codex', judgeModel: 'chosen-judge', fixture: path.resolve('.'), runDirectory: path.resolve('evals/foundation/.runs/not-started') });
  const native = await loadApiProvider(config.providers[0].id, { options: { config: config.providers[0].config } });
  assert.equal(typeof native.callApi, 'function');
});

test('Promptfoo actual assertion dispatcher loads the relative Windows file reference and checks real effects', async t => {
  const work = fixture(t);
  const runDirectory = path.dirname(work);
  const config = buildConfig({ provider: 'codex', model: 'chosen-model', judgeProvider: 'codex', judgeModel: 'chosen-judge', fixture: work, runDirectory });
  const assertion = config.tests[0].assert[0];
  assert.ok(!assertion.value.slice(7).includes(':'));
  const storage = { storageRoot: path.join(runDirectory, 'continuity') };
  captureEvent({ hook_event_name: 'UserPromptSubmit', cwd: work, session_id: 'local-dispatch-check', prompt: 'Use blue.' }, storage);
  captureEvent({ hook_event_name: 'PostToolUse', cwd: work, session_id: 'local-dispatch-check', tool_name: 'Write' }, storage);
  const { assertions } = await import('promptfoo');
  const args = { assertion, test: { vars: { caseId: 'current-correction', runDirectory } }, providerResponse: { output: 'Synthetic local result', metadata: { workingDir: work } } };
  const failed = await assertions.runAssertion(args);
  assert.equal(failed.pass, false);
  assert.match(failed.reason, /Actual synthetic artifact\/process check failed/);
  const chart = JSON.parse(fs.readFileSync(path.join(work, 'chart.json'), 'utf8'));
  chart.colour = 'blue'; fs.writeFileSync(path.join(work, 'chart.json'), JSON.stringify(chart));
  const passed = await assertions.runAssertion(args);
  assert.equal(passed.pass, true, passed.reason);
});

test('all input files and dependencies are protected in read-only cases',t=>{
  for(const name of ['AGENTS.md','CLAUDE.md','restored-context.txt','node_modules/yaml/package.json']){
    const work=fixture(t);fs.appendFileSync(path.join(work,name),'\nchanged');
    assert.equal(evaluateArtifacts('interview-only',work),false,name);
  }
  const work=fixture(t);fs.writeFileSync(path.join(work,'extra-plan.md'),'unasked');
  assert.equal(evaluateArtifacts('dead-process',work),false);
});

test('probe needs real invocation and matching observed output, not echo, cat or empty success',()=>{
  const response=(command,aggregatedOutput='{"pid":12,"alive":false,"source":"actual local process check"}')=>({metadata:{codexAppServer:{items:[{type:'commandExecution',command,aggregatedOutput,status:'completed',exitCode:0}]}}});
  for(const command of ['echo node probe-service.mjs','cat probe-service.mjs','Get-Content probe-service.mjs'])assert.equal(observedProcedure('dead-process',response(command)),false,command);
  assert.equal(observedProcedure('dead-process',response('node probe-service.mjs','')),false);
  assert.equal(observedProcedure('dead-process',response('pwsh -Command \'node ./probe-service.mjs\'')),true);
});

test('interview can ask without tool use but still needs actual native prompt event',t=>{
  const work=fixture(t),run=path.dirname(work),storage={storageRoot:path.join(run,'continuity')};
  assert.equal(observedFoundation(run,work,'interview-only'),false);
  captureEvent({hook_event_name:'UserPromptSubmit',cwd:work,session_id:'interview',prompt:'Ask only'},storage);
  assert.equal(observedFoundation(run,work,'interview-only'),true);
  assert.equal(observedFoundation(run,work,'dead-process'),false);
});

test('exact case filtering, inherited routing credentials and report artifact are configured without key values',t=>{
  const work=fixture(t),run=path.dirname(work),options={provider:'codex',model:'chosen-model',judgeProvider:'codex',judgeModel:'chosen-judge',fixture:work,runDirectory:run};
  const config=buildConfig({...options,caseIds:['source-grounded-report']});
  assert.equal(config.tests.length,1);assert.equal(config.providers[0].config.inherit_process_env,true);
  assert.deepEqual(Object.keys(config.providers[0].config.cli_env),['BGZFLOW_CONTINUITY_HOME']);
  assert.throws(()=>buildConfig({...options,caseIds:['report']}),/exact known/);
  assert.equal(evaluateArtifacts('source-grounded-report',work),false);
});

test('Promptfoo report transform reads actual artifact instead of agent claims',async t=>{
  const work=fixture(t),run=path.dirname(work);
  fs.writeFileSync(path.join(work,'report.md'),'Actual pilot report: eighteen participated.');
  const config=buildConfig({provider:'codex',model:'chosen',judgeProvider:'codex',judgeModel:'checker',fixture:work,runDirectory:run,caseIds:['source-grounded-report']});
  const {assertions}=await import('promptfoo');
  const result=await assertions.runAssertion({assertion:{type:'javascript',value:'JSON.parse(output).observed.actualReport.includes("eighteen participated")',transform:config.tests[0].assert[1].transform},test:{vars:{caseId:'source-grounded-report',runDirectory:run}},providerResponse:{output:'Untrusted agent summary says something else',metadata:{codexAppServer:{cwd:work}}}});
  assert.equal(result.pass,true,result.reason);
});

test('judge sees actual wrong chart even when the final reply claims correct blue',t=>{
  const work=fixture(t),transform=require('./judge-context.cjs');
  const rendered=JSON.parse(transform('Done: chart is blue.',{vars:{caseId:'current-correction',runDirectory:path.dirname(work)},metadata:{codexAppServer:{cwd:work}}}));
  assert.equal(rendered.observed.actualChart.colour,'red');
  assert.equal(rendered.agentAnswer,'Done: chart is blue.');
});

test('question, informed-choice and bug-triage cases require prompt evidence but allow no tools',t=>{
  const work=fixture(t),run=path.dirname(work),storage={storageRoot:path.join(run,'continuity')};
  for(const id of textOnlyCaseIds){assert.equal(evaluateArtifacts(id,work),true);assert.equal(observedFoundation(run,work,id),false);}
  captureEvent({hook_event_name:'UserPromptSubmit',cwd:work,session_id:'decisions',prompt:'Advice only'},storage);
  for(const id of textOnlyCaseIds)assert.equal(observedFoundation(run,work,id),true);
  fs.writeFileSync(path.join(work,'unasked-plan.md'),'unasked');
  for(const id of textOnlyCaseIds)assert.equal(evaluateArtifacts(id,work),false);
});
