import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {inspectMechanicalSafety} from '../mechanical-safety.mjs';
const shell=cmd=>({hook_event_name:'PreToolUse',tool_name:'exec_command',tool_input:{cmd}});
test('credential-shaped writes are caught locally, including in test paths',()=>{
  const synthetic='ghp_'+'AbCdEfGhIjKlMnOpQrStUvWxYz9876543210';
  const input={hook_event_name:'PreToolUse',tool_name:'Write',tool_input:{file_path:'tests/example.js',content:synthetic}};
  assert.equal(inspectMechanicalSafety(input).hookSpecificOutput.permissionDecision,'deny');
  input.tool_input.content='process.env.PROVIDER_API_KEY';
  assert.deepEqual(inspectMechanicalSafety(input),{});
});
test('obvious root destruction is rejected; normal work and explanations remain available',()=>{
  assert.equal(inspectMechanicalSafety(shell('Remove-Item -Recurse -Force C:\\')).hookSpecificOutput.permissionDecision,'deny');
  assert.equal(inspectMechanicalSafety(shell('rm -rf /')).hookSpecificOutput.permissionDecision,'deny');
  assert.deepEqual(inspectMechanicalSafety(shell('git status --short')),{});
  assert.deepEqual(inspectMechanicalSafety({hook_event_name:'Stop'}),{});
});
test('Desktop PowerShell and namespaced shell tools receive the same narrow accident check',()=>{
  // These are inert hook payloads. No destructive command is ever executed.
  for(const tool_name of ['PowerShell','mcp__ccd_turn__PowerShell','functions.exec_command']) {
    const input=command=>({hook_event_name:'PreToolUse',tool_name,tool_input:{command}});
    assert.equal(inspectMechanicalSafety(input('Remove-Item -Recurse -Force C:\\')).hookSpecificOutput.permissionDecision,'deny');
    assert.deepEqual(inspectMechanicalSafety(input('Get-Process -Name node -ErrorAction SilentlyContinue')),{});
    assert.deepEqual(inspectMechanicalSafety(input('node ./probe-service.mjs')),{});
  }
  assert.deepEqual(inspectMechanicalSafety({hook_event_name:'PostToolUse',tool_name:'PowerShell',tool_input:{command:'Remove-Item -Recurse -Force C:\\'}}),{});
});
test('configured write boundary follows junctions rather than text prefixes',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'bgz-path-'));
  try {
    const allowed=path.join(root,'allowed'),other=path.join(root,'allowed-other'); fs.mkdirSync(allowed);fs.mkdirSync(other);
    fs.symlinkSync(other,path.join(allowed,'escape'),process.platform==='win32'?'junction':'dir');
    const event=file=>({hook_event_name:'PreToolUse',tool_name:'Write',tool_input:{file_path:file}});
    const env={BGZFLOW_WRITE_ROOTS:JSON.stringify([allowed])};
    assert.deepEqual(inspectMechanicalSafety(event(path.join(allowed,'new.js')),{env}),{});
    assert.equal(inspectMechanicalSafety(event(path.join(other,'new.js')),{env}).hookSpecificOutput.permissionDecision,'deny');
    assert.equal(inspectMechanicalSafety(event(path.join(allowed,'escape','new.js')),{env}).hookSpecificOutput.permissionDecision,'deny');
  } finally {fs.rmSync(root,{recursive:true,force:true});}
});
test('actual saved JavaScript is checked without executing it',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'bgz-syntax-'));
  try {
    const file=path.join(root,'case.mjs'),marker=path.join(root,'must-not-exist');
    const input={hook_event_name:'PostToolUse',tool_name:'Write',tool_input:{file_path:file}};
    fs.writeFileSync(file,`import fs from 'node:fs'; fs.writeFileSync(${JSON.stringify(marker)},'bad');`);
    assert.deepEqual(inspectMechanicalSafety(input),{});assert.equal(fs.existsSync(marker),false);
    fs.writeFileSync(file,'export const x = ;');
    assert.match(inspectMechanicalSafety(input).hookSpecificOutput.additionalContext,/failed/);
  } finally {fs.rmSync(root,{recursive:true,force:true});}
});
