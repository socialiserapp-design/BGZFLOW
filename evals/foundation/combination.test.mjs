import {realpathSync as canonicalTestPath} from 'node:fs'; // Resolve OS temp aliases before testing descendant link protection.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {prepareFixture} from './prepare.mjs';
import {buildConfig,isolateCaseConfigs} from './config.mjs';
import {captureEvent} from '../../tools/foundation/continuity.mjs';
const require=createRequire(import.meta.url);
const {evaluateArtifacts,observedRequestedMethods}=require('./assertions.cjs');
const judgeContext=require('./judge-context.cjs');
const caseId='combined-small-wording-change';
function fixture(t){const root=fs.mkdtempSync(path.join(canonicalTestPath(os.tmpdir()),'bgz-combination-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));return prepareFixture(path.join(root,'run'));}

test('new design-specialist case rejects unchanged work, visual drift and extra records',t=>{
  const work=fixture(t),file=path.join(work,'action-labels.json');
  const original=JSON.parse(fs.readFileSync(file,'utf8'));
  const id='combined-design-specialists';
  assert.equal(evaluateArtifacts(id,work),false);
  const correct={...original,primaryAction:{...original.primaryAction,label:'Send message'}};
  fs.writeFileSync(file,JSON.stringify(correct));assert.equal(evaluateArtifacts(id,work),true);
  fs.writeFileSync(file,JSON.stringify({...correct,appearance:{...correct.appearance,fontFamily:'new-display-font'}}));
  assert.equal(evaluateArtifacts(id,work),false);
  fs.writeFileSync(file,JSON.stringify(correct));fs.writeFileSync(path.join(work,'DESIGN.md'),'Unrequested design ledger');
  assert.equal(evaluateArtifacts(id,work),false);
});

test('combined small edit requires the requested change and rejects altered design, behaviour or paperwork',t=>{
  const work=fixture(t),file=path.join(work,'action-labels.json');
  const original=JSON.parse(fs.readFileSync(file,'utf8'));
  assert.equal(evaluateArtifacts(caseId,work),false);
  const correct={...original,primaryAction:{...original.primaryAction,label:'Send message'}};
  const write=value=>fs.writeFileSync(file,JSON.stringify(value));
  write(correct);assert.equal(evaluateArtifacts(caseId,work),true);
  write({...correct,appearance:{...correct.appearance,palette:'dark'}});assert.equal(evaluateArtifacts(caseId,work),false);
  write({...correct,behaviour:{...correct.behaviour,sendOnEnter:false}});assert.equal(evaluateArtifacts(caseId,work),false);
  write(correct);fs.writeFileSync(path.join(work,'PLAN.md'),'Unrequested plan');assert.equal(evaluateArtifacts(caseId,work),false);
});

test('independent combination judge sees actual before and after data, not an unsupported done claim',t=>{
  const work=fixture(t),result=JSON.parse(judgeContext('Done; all screens tested.',{metadata:{workingDir:work},vars:{caseId,request:'Change the primary label',runDirectory:path.dirname(work)}}));
  assert.equal(result.observed.originalLabels.primaryAction.label,'Send');
  assert.equal(result.observed.actualLabels.primaryAction.label,'Send');
  assert.deepEqual(result.observed.observedActions,[]);
});

test('native combination evaluation can pin the same installed executable for worker and independent judge',()=>{
  const config=buildConfig({provider:'codex',model:'available-builder',judgeProvider:'codex',judgeModel:'available-checker',fixture:'/fixture',runDirectory:'/run',caseIds:[caseId],codexPath:'/installed/codex'});
  assert.equal(config.tests.length,1);
  assert.equal(config.providers[0].config.codex_path_override,'/installed/codex');
  assert.equal(config.tests[0].assert[1].provider.config.codex_path_override,'/installed/codex');
  assert.equal(config.tests[0].assert[1].provider.config.sandbox_mode,'read-only');
});

test('native workspaces live outside the source repository and reject an inherited Git boundary',t=>{
  const work=fixture(t),run=path.dirname(work),parent=path.dirname(run);
  const config=buildConfig({provider:'codex',model:'builder',judgeProvider:'codex',judgeModel:'checker',fixture:work,runDirectory:run,caseIds:[caseId]});
  const workspacesRoot=path.join(parent,'external-cases');
  const isolated=isolateCaseConfigs(config,work,run,{workspacesRoot});
  assert.equal(isolated[0].providers[0].config.working_dir,path.join(workspacesRoot,caseId));
  assert.equal(isolated[0].tests[0].assert[1].provider.config.working_dir,path.join(workspacesRoot,caseId));
  assert.ok(fs.existsSync(path.join(workspacesRoot,caseId,'action-labels.json')));
  // This empty marker belongs only to the disposable fixture, not a real repo.
  fs.mkdirSync(path.join(parent,'.git'));
  assert.throws(()=>isolateCaseConfigs(config,work,run,{workspacesRoot:path.join(parent,'unsafe-cases')}),/inherit another Git repository/);
  assert.equal(fs.existsSync(path.join(parent,'unsafe-cases')),false);
});

test('combination proof rejects absent or merely inferred selection and accepts preserved explicit fallback',t=>{
  const work=fixture(t),run=path.dirname(work),options={storageRoot:path.join(run,'continuity'),internal:true};
  const names=['bg-plain-english-builder','bg-personal-product-design'];
  const input={cwd:work,session_id:'synthetic-combination-selection',hook_event_name:'RouteSelected'};
  assert.equal(observedRequestedMethods(run,work,names),false);
  const selected=names.map((name,index)=>({id:'method-'+index,name}));
  captureEvent({...input,selection:{status:'selected',selected,explicitIds:[]} },options);
  assert.equal(observedRequestedMethods(run,work,names),false);
  captureEvent({...input,selection:{status:'fallback',selected,explicitIds:selected.map(item=>item.id)}},options);
  assert.equal(observedRequestedMethods(run,work,names),true);
});
