import {realpathSync as canonicalTestPath} from 'node:fs'; // Resolve OS temp aliases before testing descendant link protection.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { prepareFixture } from './prepare.mjs';
const require=createRequire(import.meta.url);
const {evaluateArtifacts,observedProcedure}=require('./assertions.cjs');
const preview={status:'preview',network:false,model:'jev-1.14.0',questions:[{id:'blocked',type:'noul'},{id:'area',type:'choice'},{id:'impact',type:'score'}],images:0};

test('Jev native evaluation rejects fabricated answers and unrelated project changes',t=>{
  const root=fs.mkdtempSync(path.join(canonicalTestPath(os.tmpdir()),'bgz-jev-native-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  const work=prepareFixture(path.join(root,'run')),file=path.join(work,'jev-preview.json');
  fs.writeFileSync(file,JSON.stringify(preview));assert.equal(evaluateArtifacts('jev-mixed-preview',work),true);
  fs.writeFileSync(file,JSON.stringify({...preview,answers:{impact:2}}));assert.equal(evaluateArtifacts('jev-mixed-preview',work),false);
  fs.writeFileSync(file,JSON.stringify(preview));fs.writeFileSync(path.join(work,'PLAN.md'),'Unrequested plan');assert.equal(evaluateArtifacts('jev-mixed-preview',work),false);
});

test('Jev native evaluation requires a successful helper invocation rather than a prose claim',()=>{
  assert.equal(observedProcedure('jev-mixed-preview',{output:'Preview passed.'}),false);
  const item={type:'command_execution',command:'node "E:/installed/tools/foundation/bgz.mjs" judge --stdin',status:'completed',exit_code:0,aggregated_output:JSON.stringify(preview)};
  assert.equal(observedProcedure('jev-mixed-preview',{raw:JSON.stringify({items:[item]})}),true);
  assert.equal(observedProcedure('jev-mixed-preview',{raw:JSON.stringify({items:[{...item,command:item.command+' --live'}]})}),false);
});

test('Jev native evaluation accepts an observed Node child process but rejects echo, live mode and failed execution',()=>{
  const script='node -e '+JSON.stringify('const cp=require("node:child_process");cp.spawnSync(process.execPath,["E:/installed/tools/foundation/bgz.mjs","judge","--stdin","--preview"],{input:"public fixture"});');
  const item={type:'command_execution',command:script,status:'completed',exit_code:0,aggregated_output:JSON.stringify(preview)};
  const run=value=>observedProcedure('jev-mixed-preview',{raw:JSON.stringify({items:[value]})});
  assert.equal(run(item),true);
  assert.equal(run({...item,command:'echo '+script}),false);
  assert.equal(run({...item,command:script.replace('--preview','--live')}),false);
  assert.equal(run({...item,status:'failed',exit_code:1}),false);
});
