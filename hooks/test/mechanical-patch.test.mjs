import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {inspectMechanicalSafety} from '../mechanical-safety.mjs';

const fixture=()=>{const root=fs.mkdtempSync(path.join(os.tmpdir(),'bgz-mechanical-patch-'));const allowed=path.join(root,'allowed'),outside=path.join(root,'outside');fs.mkdirSync(allowed);fs.mkdirSync(outside);return {root,allowed,outside,env:{BGZFLOW_WRITE_ROOTS:JSON.stringify([allowed])}};};
const patch=lines=>`*** Begin Patch\n${lines.join('\n')}\n*** End Patch`;
const pre=(tool_input,extra={})=>({hook_event_name:'PreToolUse',tool_name:'apply_patch',tool_input,...extra});
const denied=result=>assert.equal(result.hookSpecificOutput?.permissionDecision,'deny');
const synthetic='ghp_'+'AbCdEfGhIjKlMnOpQrStUvWxYz9876543210';

test('native string and structured namespaced patches check every changed file',()=>{
  const f=fixture();
  const safe=patch(['*** Add File: one.js','+export const one=1;','*** Update File: two.mjs','@@','-export const two=1;','+export const two=2;']);
  const unsafe=patch(['*** Add File: one.js','+export const one=1;','*** Add File: ../outside/two.js','+export const two=2;']);
  const envelopes=[p=>pre(p),p=>pre({input:p},{tool_name:'functions.apply_patch'}),p=>pre({patch:p},{tool_name:'mcp__codex__apply_patch'}),p=>({event:'PreToolUse',cwd:f.allowed,toolCall:{name:'apply_patch',args:{patch:p}}}),p=>pre(JSON.stringify({input:p}))];
  for(const make of envelopes){assert.deepEqual(inspectMechanicalSafety({...make(safe),cwd:f.allowed},{env:f.env}),{});denied(inspectMechanicalSafety({...make(unsafe),cwd:f.allowed},{env:f.env}));}
  assert.deepEqual(fs.readdirSync(f.outside),[]);assert.deepEqual(fs.readdirSync(f.allowed),[]);
});

test('move source, move destination and deletes all respect the configured boundary',()=>{
  const f=fixture();
  for(const lines of [
    ['*** Update File: one.js','*** Move to: ../outside/one.js','@@','-x','+y'],
    ['*** Update File: ../outside/one.js','*** Move to: one.js','@@','-x','+y'],
    ['*** Delete File: ../outside/one.js'],
  ])denied(inspectMechanicalSafety(pre(patch(lines),{cwd:f.allowed}),{env:f.env}));
  assert.deepEqual(inspectMechanicalSafety(pre(patch(['*** Update File: one.js','*** Move to: renamed.js','@@','-x','+y']),{cwd:f.allowed}),{env:f.env}),{});
});

test('patch credentials are checked only in new text, including multiline keys',()=>{
  const add=body=>patch(['*** Add File: config.txt',...body.split('\n').map(line=>'+'+line)]);
  denied(inspectMechanicalSafety(pre(add(synthetic))));
  const privateKey='-----BEGIN PRIVATE KEY-----\n'+'AbCdEfGhIjKlMnOpQrStUvWxYz9876543210'.repeat(3)+'\n-----END PRIVATE KEY-----';
  denied(inspectMechanicalSafety(pre({patch:add(privateKey)})));
  const removal=patch(['*** Update File: config.txt','@@','-'+synthetic,'+process.env.PROVIDER_API_KEY']);
  assert.deepEqual(inspectMechanicalSafety(pre(removal)),{});
  assert.deepEqual(inspectMechanicalSafety(pre(patch(['*** Delete File: config.txt']))),{});
});

test('namespaced Claude writes and MultiEdit replacements retain ordinary work',()=>{
  const f=fixture();
  const event=(name,input)=>({hookEventName:'PreToolUse',toolName:name,toolInput:input,cwd:f.allowed});
  assert.deepEqual(inspectMechanicalSafety(event('functions.Write',{file_path:'one.js',content:'export const x=1;'}),{env:f.env}),{});
  denied(inspectMechanicalSafety(event('mcp__host__Edit',{file_path:'../outside/one.js',new_string:'safe'}),{env:f.env}));
  denied(inspectMechanicalSafety(event('MultiEdit',{file_path:'one.js',edits:[{old_string:'safe',new_string:synthetic}]}),{env:f.env}));
  assert.deepEqual(inspectMechanicalSafety(event('MultiEdit',{file_path:'one.js',edits:[{old_string:synthetic,new_string:'process.env.KEY'}]}),{env:f.env}),{});
});

test('linked multi-file patch targets are resolved rather than prefix-trusted',()=>{
  const f=fixture();fs.symlinkSync(f.outside,path.join(f.allowed,'escape'),process.platform==='win32'?'junction':'dir');
  denied(inspectMechanicalSafety(pre(patch(['*** Add File: okay.js','+x','*** Add File: escape/no.js','+x']),{cwd:f.allowed}),{env:f.env}));
  assert.deepEqual(fs.readdirSync(f.outside),[]);
});

test('successful patch syntax checks every saved JS target and move destination, skipping deletes',()=>{
  const f=fixture();
  for(const name of ['one.js','two.mjs','renamed.cjs'])fs.writeFileSync(path.join(f.allowed,name),'export const x=1;');
  const p=patch(['*** Add File: one.js','+export const x=1;','*** Update File: two.mjs','@@','-x','+y','*** Update File: old.cjs','*** Move to: renamed.cjs','@@','-x','+y','*** Delete File: deleted.js','*** Add File: styles.css','+body {}']);
  const calls=[];const result=inspectMechanicalSafety({...pre({input:p},{cwd:f.allowed}),hook_event_name:'PostToolUse'},{env:{},check:(exe,args,opts)=>{calls.push({exe,args,opts});return {status:calls.length===1?1:0};}});
  assert.equal(calls.length,3);assert.deepEqual(calls.map(c=>path.basename(c.args[1])),['one.js','two.mjs','renamed.cjs']);assert(calls.every(c=>c.args[0]==='--check'&&c.opts.windowsHide));assert.match(result.hookSpecificOutput.additionalContext,/failed/);
});

test('actual saved patched JS is syntax-checked without executing its contents',()=>{
  const f=fixture(),file=path.join(f.allowed,'saved.mjs'),marker=path.join(f.allowed,'must-not-exist');
  fs.writeFileSync(file,`import fs from 'node:fs';fs.writeFileSync(${JSON.stringify(marker)},'executed');`);
  const input={...pre(patch(['*** Update File: saved.mjs','@@','-x','+y']),{cwd:f.allowed}),hook_event_name:'PostToolUse'};
  assert.deepEqual(inspectMechanicalSafety(input),{});assert.equal(fs.existsSync(marker),false);
  fs.writeFileSync(file,'export const x = ;');assert.match(inspectMechanicalSafety(input).hookSpecificOutput.additionalContext,/failed/);assert.equal(fs.existsSync(marker),false);
});

test('unrecognized patch forms cannot bypass an activated boundary, without creating a new global gate',()=>{
  const f=fixture();
  denied(inspectMechanicalSafety(pre({input:'not a supported native patch'}),{env:f.env}));
  assert.deepEqual(inspectMechanicalSafety(pre({input:'not a supported native patch'}),{env:{}}),{});
  assert.deepEqual(inspectMechanicalSafety({hook_event_name:'Stop'}),{});
  assert.deepEqual(inspectMechanicalSafety({...pre(patch(['*** Add File: x.js','+x'])),hook_event_name:'PostToolUseFailure'}),{});
});
