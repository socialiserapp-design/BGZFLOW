import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import childProcess from 'node:child_process';
import {syncBuiltinESMExports} from 'node:module';
import {after,test} from 'node:test';
const api=await import('../admission.mjs').catch(()=>({}));
const roots=[];after(()=>roots.forEach(p=>fs.rmSync(p,{recursive:true,force:true})));
function fixture({source=true,tests=true,added='export const answer=42;\n'}={}) {
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'gate-evidence-'));roots.push(root);
  const git=(...a)=>{const r=spawnSync('git',a,{cwd:root,encoding:'utf8'});assert.equal(r.status,0,r.stderr);return r.stdout.trim();};
  git('init','-q');fs.writeFileSync(path.join(root,'README.md'),'Evidence fixture\n');git('add','.');git('-c','user.name=BGZFLOW','-c','user.email=bgzflow@users.noreply.github.com','commit','-qm','base');const base=git('rev-parse','HEAD');
  if(source)fs.writeFileSync(path.join(root,'answer.mjs'),added);else fs.writeFileSync(path.join(root,'README.md'),'Documented behaviour\n');
  if(tests)fs.writeFileSync(path.join(root,'answer.test.mjs'),"import {test} from 'node:test';import assert from 'node:assert/strict';import {answer} from './answer.mjs';test('answer is forty two',()=>assert.equal(answer,42));\n");
  git('add','.');git('-c','user.name=BGZFLOW','-c','user.email=bgzflow@users.noreply.github.com','commit','-qm','piece');const sha=git('rev-parse','HEAD');
  const runnerEnv={...process.env};delete runnerEnv.NODE_TEST_CONTEXT;
  const run=spawnSync(process.execPath,['--test','answer.test.mjs'],{cwd:root,encoding:'utf8',env:runnerEnv});
  fs.writeFileSync(path.join(root,'fast.log'),run.stdout||'');
  const handback={source:{baseSha:base,sha},jobId:'worker-1',checks:[{argv:['node','--test','answer.test.mjs'],exitCode:run.status,stdoutFile:'fast.log',counts:{tests:1,pass:1,fail:0,skip:0}}],audit:{available:false,reason:'not installed'}};
  return {root,base,sha,handback,git};
}
function admit(f,patch={}){assert.equal(typeof api.admitEvidence,'function','admission implementation required');return api.admitEvidence(f.root,{...f.handback,...patch},{baseSha:f.base,sha:f.sha});}
test('E1 admission accepts real runner output, matching counts and changed behavioural tests',()=>{const f=fixture();const r=admit(f);assert.equal(r.allowed,true,r.reason);assert.deepEqual(r.counts,{tests:1,pass:1,fail:0,skip:0});assert.ok(r.testNames.includes('answer is forty two'));});
test('E2 missing fast-check output is rejected',()=>{const f=fixture();assert.equal(admit(f,{checks:[]}).allowed,false);});
test('E3 changed source without changed tests is rejected',()=>{const f=fixture({tests:false});f.handback.checks[0]={argv:['node','--test'],exitCode:0,stdoutFile:'fast.log',counts:{tests:1,pass:1,fail:0,skip:0}};fs.writeFileSync(path.join(f.root,'fast.log'),'# tests 1\n# pass 1\n# fail 0\n# skipped 0\n');assert.match(admit(f).reason,/test files/i);});
for(const marker of ['test.skip(','test.only(','test.todo(','pytest.mark.xfail','TODO','placeholder'])test(`E4 newly added marker rejected: ${marker}`,()=>{const f=fixture({added:`export const answer=42; // ${marker}\n`});assert.equal(admit(f).allowed,false);});
test('E5 claimed counts must match output and exit status must pass',()=>{const f=fixture();f.handback.checks[0].counts.tests=2;assert.match(admit(f).reason,/counts/i);f.handback.checks[0].counts.tests=1;f.handback.checks[0].exitCode=1;assert.equal(admit(f).allowed,false);});
test('E6 docs and config only do not need changed test files but still need output',()=>{const f=fixture({source:false,tests:false});fs.writeFileSync(path.join(f.root,'fast.log'),'RESULT files 1 errors 0\n');f.handback.checks=[{argv:['node','check-docs.mjs'],exitCode:0,stdoutFile:'fast.log',counts:{files:1,errors:0}}];const r=admit(f);assert.equal(r.allowed,true,r.reason);});
test('E7 counts from TAP, pytest and unittest are parsed without trusting claims',()=>{assert.equal(typeof api.outputCounts,'function');assert.deepEqual(api.outputCounts('# tests 3\n# pass 3\n# fail 0\n# skipped 0\n'),{tests:3,pass:3,fail:0,skip:0});assert.equal(api.outputCounts('3 passed in 0.20s').tests,3);assert.equal(api.outputCounts('Ran 2 tests in 0.02s\n\nOK').pass,2);assert.equal(api.outputCounts('All good'),null);});
test('E8 old markers and unchanged tests do not cause false positives',()=>{const f=fixture();f.git('checkout',f.base,'--','README.md');fs.writeFileSync(path.join(f.root,'README.md'),'Historical TODO retained\n');f.git('add','.');f.git('-c','user.name=BGZFLOW','-c','user.email=bgzflow@users.noreply.github.com','commit','-qm','docs');const base=f.git('rev-parse','HEAD');fs.writeFileSync(path.join(f.root,'README.md'),'Historical TODO retained\nUpdated explanation\n');f.git('add','.');f.git('-c','user.name=BGZFLOW','-c','user.email=bgzflow@users.noreply.github.com','commit','-qm','docs update');f.base=base;f.sha=f.git('rev-parse','HEAD');f.handback.source={baseSha:base,sha:f.sha};assert.equal(admit(f).allowed,true);});
test('E9 stale source proof and credential output paths are refused',()=>{const f=fixture();assert.equal(admit(f,{source:{baseSha:f.base,sha:'0'.repeat(40)}}).allowed,false);f.handback.checks[0].stdoutFile='auth.json';fs.writeFileSync(path.join(f.root,'auth.json'),'secret');assert.equal(admit(f).allowed,false);});
for(const marker of ['skip: true','only: true','xfail: true','todo: true'])test(`E10 enabled option marker is rejected: ${marker}`,()=>{const f=fixture({added:`export const answer=42; // ${marker}\n`});assert.equal(admit(f).allowed,false);});
test('E11 negative-example regex and marker strings are data, not skipped execution',()=>{const f=fixture({added:'export const answer=42; const guard=/\\bTODO|placeholder\\b/; const label="test.skip(";\n'});assert.equal(admit(f).allowed,true);});
test('E12 final runner counts include cancelled/todo and unittest expected failures',()=>{assert.equal(api.outputCounts('# tests 1\n# pass 1\n# fail 0\n# skipped 0\n# tests 2\n# pass 1\n# fail 0\n# cancelled 0\n# skipped 0\n# todo 1\n').skip,1);assert.equal(api.outputCounts('Ran 2 tests in 0.1s\nOK (expected failures=1)').skip,1);});
test('E13 bounded admission tolerates slow Git startup under the heavy route without losing exact diff checks',(t)=>{
  const f=fixture(),original=childProcess.spawnSync;
  const slow=t.mock.method(childProcess,'spawnSync',(command,args,options)=>{
    if(command==='git'&&args[0]==='diff'&&options.timeout<5000)return {status:null,error:Object.assign(new Error('simulated slow Git startup'),{code:'ETIMEDOUT'})};
    return original(command,args,options);
  });
  syncBuiltinESMExports();
  try {const result=admit(f);assert.equal(result.allowed,true,result.reason);}
  finally {slow.mock.restore();syncBuiltinESMExports();}
});
