import {realpathSync as canonicalTestPath} from 'node:fs'; // Resolve OS temp aliases before testing descendant link protection.
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {budgetedJev} from '../jev-budget.mjs';
import {runJevJudgmentCli} from '../jev-judgment.mjs';
function fixture(t){const home=fs.mkdtempSync(path.join(canonicalTestPath.native(os.tmpdir()),'bgz-jev-budget-'));t.after(()=>fs.rmSync(home,{recursive:true,force:true}));return {home,projectRoot:home,taskId:'original-task'};}
const answer={status:'answered',answers:{choice:{type:'choice',choice:'local'}},usage:{input_tokens:20,output_tokens:4},model:'jev-test'};
test('one successful consultation is reused across independent invocations, but changed input cannot spend again',async t=>{
 const options=fixture(t);let calls=0;const run=async()=>{calls++;return answer;};
 const first=await budgetedJev({a:1,b:2},{...options,run});assert.equal(first.requestAttempts,1);
 const again=await budgetedJev({b:2,a:1},{...options,run});assert.equal(again.reused,true);assert.equal(again.requestAttempts,0);assert.deepEqual(again.usage,{input_tokens:0,output_tokens:0});
 assert.equal((await budgetedJev({a:2},{...options,run})).status,'fallback');assert.equal(calls,1);
});
test('parallel workers sharing a task reserve exactly one consultation',async t=>{
 const options=fixture(t);let calls=0;const run=async()=>{calls++;await new Promise(resolve=>setTimeout(resolve,20));return answer;};
 const rows=await Promise.all(Array.from({length:8},()=>budgetedJev({x:1},{...options,run})));
 assert.equal(calls,1);assert.equal(rows.filter(r=>r.status==='answered').length,1);
});
test('uncertain and invalid service results consume the attempt and do not retry',async t=>{
 const options=fixture(t);let calls=0;const run=async()=>{calls++;throw Error('secret provider error');};
 const first=await budgetedJev({x:1},{...options,run});assert.equal(first.requestAttempts,1);assert.doesNotMatch(JSON.stringify(first),/secret provider error/);
 assert.equal((await budgetedJev({x:1},{...options,run})).requestAttempts,0);assert.equal(calls,1);
});
test('missing identity and unavailable storage fall back without a request',async t=>{
 const options=fixture(t);let calls=0;const run=async()=>{calls++;return answer;};
 assert.equal((await budgetedJev({}, {...options,taskId:undefined,run})).status,'fallback');
 fs.writeFileSync(path.join(options.home,'.bgzflow'),'not a directory');
 assert.equal((await budgetedJev({}, {...options,run})).status,'fallback');assert.equal(calls,0);
});
test('different workspace cannot reuse private answers or create another allowance for the same task',async t=>{
 const options=fixture(t);let calls=0;const run=async()=>{calls++;return answer;};
 await budgetedJev({}, {...options,run});const other=path.join(options.home,'other');fs.mkdirSync(other);
 const result=await budgetedJev({}, {...options,projectRoot:other,run});assert.equal(calls,1);assert.equal(result.status,'fallback');
});
test('native live CLI requires task identity, validates before reserving, and uses the budgeted path',async t=>{
 const options=fixture(t);let calls=0;options.client={systemOne:async()=>{calls++;return {model:'jev-test',answers:{ok:{type:'noul',noul:0.9}},usage:{input_tokens:1,output_tokens:1}};}};
 const request={state:'public fixture',questions:{ok:{type:'noul',instructions:'Is the input public?'}}};
 const rows=[];await runJevJudgmentCli(['--stdin','--live'],{input:JSON.stringify(request),options,write:x=>rows.push(JSON.parse(x))});assert.equal(calls,0);
 for(let i=0;i<2;i++)await runJevJudgmentCli(['--stdin','--live'],{input:JSON.stringify({...request,taskId:options.taskId}),options,write:x=>rows.push(JSON.parse(x))});
 assert.equal(calls,1);assert.equal(rows.at(-1).reused,true);
});
