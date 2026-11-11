import {realpathSync as canonicalTestPath} from 'node:fs'; // Resolve OS temp aliases before testing descendant link protection.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {pinQualityPlan,qualityVerdict} from '../quality-verdict.mjs';
import {createExecutableChecks} from '../executable-checks.mjs';

const target={candidate:'candidate-a',revision:'revision-a'};
const plan=pinQualityPlan({version:'catalog-v1',criteria:[
  {id:'visible-truth',expected:'Visible availability describes the usable library',required:true,kind:'direct'},
  {id:'meaning',expected:'Descriptions match inspected source content',required:true,kind:'judgment',calibrationRef:'blind-accepted-and-rejected-examples-v1',minScore:0.85},
  {id:'polish',expected:'Optional visual refinement',required:false,kind:'direct'},
]});
function report(){return {...target,rubricVersion:plan.version,criteria:[
 {id:'visible-truth',kind:'direct',verdict:'meets',evidence:['observed-first-page'],reason:'The count and eligibility agree.'},
 {id:'meaning',kind:'judgment',verdict:'meets',evidence:['inspected-source-and-template'],reason:'The template represents its source.',calibrationRef:plan.criteria[1].calibrationRef,score:0.9},
]};}
test('required semantics cannot be averaged away by functional success or a high score',()=>{
 const r=report();r.criteria[0].verdict='fails';
 assert.equal(qualityVerdict(plan,r,target).status,'fails');
 r.criteria[0].verdict='meets';r.criteria[1].verdict='fails';r.criteria[1].score=1;
 assert.equal(qualityVerdict(plan,r,target).matches,false);
});
test('good observed results pass without treating advisory polish as a new gate',()=>{
 assert.equal(qualityVerdict(plan,report(),target).matches,true);
});
test('missing, duplicate, stale and uncalibrated observations never acquire a pass',()=>{
 for(const mutate of [r=>r.criteria=[],r=>r.criteria.push(r.criteria[0]),r=>r.candidate='old',r=>r.revision='old',r=>r.rubricVersion='old',r=>r.criteria[1].calibrationRef='invented',r=>r.criteria[1].evidence=[],r=>r.criteria[1].score=NaN]){
  const r=report();mutate(r);assert.equal(qualityVerdict(plan,r,target).matches,false);
 }
});
test('an explicit calibrated threshold applies to the individual requirement',()=>{
 const r=report();r.criteria[1].score=0.8;assert.equal(qualityVerdict(plan,r,target).status,'fails');
 r.criteria[1].score=0.85;assert.equal(qualityVerdict(plan,r,target).status,'meets');
});
test('a consequential unknown is a decision rather than a guessed repair',()=>{
 const r=report();r.criteria[0].verdict='needs-decision';assert.equal(qualityVerdict(plan,r,target).status,'needs-decision');
});
test('the caller cannot lower an already pinned rubric by changing its original object',()=>{
 const original={version:'v1',criteria:[{id:'latency',expected:'Measured warm interaction budget',kind:'direct',required:true}]};
 const pinned=pinQualityPlan(original);original.criteria[0].required=false;
 assert.equal(pinned.criteria[0].required,true);
 assert.throws(()=>pinQualityPlan({...original,criteria:[]}));
 assert.throws(()=>pinQualityPlan({...original,criteria:[{...original.criteria[0],required:true,kind:'judgment'}]}));
});
test('the actual executable runner rejects exit-zero success with failed or absent quality evidence',()=>{
 const root=fs.realpathSync(fs.mkdtempSync(path.join(canonicalTestPath(os.tmpdir()),'bgz-quality-')));
 const source=path.join(root,'observer.cjs'),observations=path.join(root,'observed.json');
 fs.writeFileSync(source,"process.stdout.write(require('fs').readFileSync('observed.json','utf8'))");
 const checks=createExecutableChecks({projectRoot:root,outcomeChecks:{journey:{id:'actual configured runner',quality:plan,target:{...target,projectRoot:root},sources:[source],command:{file:process.execPath,args:[source]}}}});
 const observe=()=>checks.observeOutcome({id:'journey',...target});
 const r=report();fs.writeFileSync(observations,JSON.stringify({matches:true,quality:r}));assert.equal(observe().matches,true);
 r.criteria[0].verdict='fails';fs.writeFileSync(observations,JSON.stringify({matches:true,quality:r}));assert.equal(observe().matches,false);
 fs.writeFileSync(observations,JSON.stringify({matches:true}));assert.equal(observe().matches,false);
 // Artifacts retained for failure inspection; this tests the runner, not a live product.
});
