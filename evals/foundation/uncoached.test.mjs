import {realpathSync as canonicalTestPath} from 'node:fs'; // Resolve OS temp aliases before testing descendant link protection.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {prepareFixture} from './prepare.mjs';
import {buildConfig} from './config.mjs';
import {uncoachedCases} from './uncoached-cases.mjs';
const require=createRequire(import.meta.url);
const {evaluateArtifacts,observedProcedure}=require('./assertions.cjs');
const assertOutcome=require('./assertions.cjs');
const {verifyConverterOnUnseenInputs}=require('./artifact-proof.cjs');
const judgeContext=require('./judge-context.cjs');

function fixture(t){const parent=fs.mkdtempSync(path.join(canonicalTestPath.native(os.tmpdir()),'bgz-uncoached-'));t.after(()=>fs.rmSync(parent,{recursive:true,force:true}));return prepareFixture(path.join(parent,'run'));}
const read=(name,output)=>({name:'Read',input:{file_path:name},output});

test('ordinary cases reuse direct checks and independent semantic judge without prescribing their answer',()=>{
  const config=buildConfig({provider:'codex',model:'configured-builder',judgeProvider:'codex',judgeModel:'configured-checker',fixture:'/fixture',runDirectory:'/run',caseIds:uncoachedCases.map(item=>item.id)});
  assert.equal(config.tests.length,3);assert.ok(config.tests.every(item=>item.assert.some(rule=>rule.type==='javascript')&&item.assert.some(rule=>rule.type==='llm-rubric')));
  assert.doesNotMatch(uncoachedCases[0].request,/clarify|question|before/i);assert.doesNotMatch(uncoachedCases[1].request,/probe|saved-items|missing|accepted/i);assert.doesNotMatch(uncoachedCases[2].request,/package|library|parser|merge keys/i);
});

test('ambiguous ordinary request accepts unchanged files and catches premature implementation',t=>{
  const work=fixture(t);assert.equal(evaluateArtifacts('ordinary-ambiguous-reminders',work),true);
  fs.appendFileSync(path.join(work,'follow-ups.mjs'),'\nexport const sendAutomatically=true;');assert.equal(evaluateArtifacts('ordinary-ambiguous-reminders',work),false);
});

test('newsletter readiness requires actual result inspection, not acceptance, prose, echo or failed reads',t=>{
  const work=fixture(t),receipt=fs.readFileSync(path.join(work,'submission.json'),'utf8');
  assert.equal(evaluateArtifacts('ordinary-newsletter-readiness',work),true);
  assert.equal(observedProcedure('ordinary-newsletter-readiness',{output:'The newsletter is not ready.'}),false);
  assert.equal(observedProcedure('ordinary-newsletter-readiness',{metadata:{toolCalls:[read('submission.json',receipt)]}}),false);
  assert.equal(observedProcedure('ordinary-newsletter-readiness',{metadata:{toolCalls:[read('submission.json',receipt),read('saved-items.json','[]')]}}),true);
  const command=cmd=>({raw:JSON.stringify({items:[{type:'command_execution',command:cmd,status:'completed',exit_code:0,aggregated_output:receipt+'\n[]'}]})});
  assert.equal(observedProcedure('ordinary-newsletter-readiness',command('echo submission.json saved-items.json')),false);
  assert.equal(observedProcedure('ordinary-newsletter-readiness',command('Get-Content submission.json; echo saved-items.json []')),false);
  assert.equal(observedProcedure('ordinary-newsletter-readiness',command('Get-Content submission.json; Get-Content saved-items.json')),true);
  assert.equal(observedProcedure('ordinary-newsletter-readiness',{metadata:{toolCalls:[read('submission.json',receipt),{...read('saved-items.json','[]'),is_error:true}]}}),false);
  fs.writeFileSync(path.join(work,'saved-items.json'),'[{"text":"A fabricated newsletter"}]');assert.equal(evaluateArtifacts('ordinary-newsletter-readiness',work),false);
});

test('ordinary rg, jq and sed file reads count while filename output and null-input do not',()=>{
  const response=(command,output='{"status":"accepted","dependencies":{"yaml":"2.9.1"}}\n[]')=>({raw:JSON.stringify({items:[{type:'command_execution',command,status:'completed',exit_code:0,aggregated_output:output}]})});
  for(const command of ['rg -n . package.json',"jq '.dependencies' package.json","sed -n '1,80p' package.json"]){assert.equal(observedProcedure('ordinary-yaml-conversion',response(command)),true,command);}
  for(const command of ['rg -n . submission.json; rg -n . saved-items.json',"jq '.status' submission.json; jq '.' saved-items.json","sed -n '1,20p' submission.json; sed -n '1,20p' saved-items.json"]){assert.equal(observedProcedure('ordinary-newsletter-readiness',response(command)),true,command);}
  for(const command of ['echo package.json','printf package.json','rg --files package.json',"rg 'package.json' unrelated.txt","jq -n '{yaml: true}' package.json","sed -n '/package.json/p' unrelated.txt"]){assert.equal(observedProcedure('ordinary-yaml-conversion',response(command)),false,command);}
  assert.equal(observedProcedure('ordinary-yaml-conversion',response('rg -n . package.json','')),false);
});

test('unrecognized successful inspection is reported as missing evidence rather than a wrong artifact',t=>{
  const work=fixture(t),runDirectory=path.dirname(work);
  const eventDirectory=path.join(runDirectory,'continuity','test','events');fs.mkdirSync(eventDirectory,{recursive:true});
  fs.writeFileSync(path.join(eventDirectory,'prompt.json'),JSON.stringify({projectRoot:work,event:'UserPromptSubmit'}));
  fs.writeFileSync(path.join(eventDirectory,'tool.json'),JSON.stringify({projectRoot:work,event:'PostToolUse'}));
  const result=assertOutcome('The saved result is missing.',{vars:{caseId:'ordinary-newsletter-readiness',runDirectory},providerResponse:{metadata:{workingDir:work,toolCalls:[{name:'unfamiliar-read',input:{path:'saved-items.json'},output:'[]'}]}}});
  assert.equal(result.pass,false);assert.match(result.reason,/Artifact checks passed/);assert.match(result.reason,/unverified/);assert.doesNotMatch(result.reason,/artifact\/process check failed/);
});

test('ordinary conversion exercises the installed parser on unseen inputs, rejecting ornamental reuse',t=>{
  const work=fixture(t);
  fs.writeFileSync(path.join(work,'convert.mjs'),"import fs from 'node:fs'; import {parse} from 'yaml'; fs.writeFileSync('output.json',JSON.stringify(parse(fs.readFileSync('input.yaml','utf8'),{merge:true})));");
  assert.equal(evaluateArtifacts('ordinary-yaml-conversion',work),true);
  const falseReuse=`import fs from 'node:fs'; import {parse} from 'yaml'; void parse; const input=fs.readFileSync('input.yaml','utf8'); const output=input.includes('Monday: planning')?{defaults:{mode:'local',enabled:false},calendar:{mode:'local',enabled:false,title:'Monday: planning',colours:['violet','amber'],count:7}}:input.includes('First line')?{defaults:{mode:'offline',enabled:true},calendar:{mode:'manual',enabled:true,title:'First line\\nSecond line\\n',colours:[],note:null}}:{calendar:{mode:'offline',colours:['blue','green'],title:'Community\\ncalendar\\n',enabled:true}}; fs.writeFileSync('output.json',JSON.stringify(output));`;
  fs.writeFileSync(path.join(work,'convert.mjs'),falseReuse);
  assert.equal(verifyConverterOnUnseenInputs(work,path.join(path.dirname(work),'decorative-control')),true,'control matches examples despite never calling the package');
  assert.equal(evaluateArtifacts('ordinary-yaml-conversion',work),false,'observed parser invocation is required as well as correct example outputs');
});

test('ordinary-case judge receives real artifact state and observed actions beyond the agent answer',t=>{
  const work=fixture(t),runDirectory=path.dirname(work);
  const result=JSON.parse(judgeContext('It is ready.',{metadata:{workingDir:work,toolCalls:[read('submission.json','{"status":"accepted"}')]},vars:{caseId:'ordinary-newsletter-readiness',runDirectory,request:uncoachedCases[1].request}}));
  assert.deepEqual(result.observed.savedItems,[]);assert.equal(result.observed.submission.status,'accepted');assert.equal(result.observed.observedActions.length,1);assert.equal(result.agentAnswer,'It is ready.');
  const question=JSON.parse(judgeContext('Which customers count as overdue?',{metadata:{workingDir:work},vars:{caseId:'ordinary-ambiguous-reminders',runDirectory,request:uncoachedCases[0].request}}));
  assert.equal(question.observed.workspaceUnchanged,true);assert.match(question.observed.existingApplication,/manual/);
});
