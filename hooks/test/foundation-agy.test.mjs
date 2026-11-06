import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {mapAgyInput,handleAgyFoundation} from '../foundation-agy.mjs';
test('Antigravity structured tool calls reach the same mechanical protections',async()=>{
  const raw={conversationId:'example',workspacePaths:[process.cwd()],toolCall:{name:'run_command',args:{CommandLine:'rm -rf /'}}};
  assert.equal((await handleAgyFoundation(raw,'PreToolUse')).decision,'deny');
  assert.equal(mapAgyInput({...raw,toolCall:{name:'write_file',args:{TargetFile:'a.js',Content:'export const a=1;'}}},'PostToolUse').tool_input.file_path,'a.js');
  assert.equal(mapAgyInput({...raw,toolCall:{name:'write_to_file',args:{TargetFile:'a.js',CodeContent:'export const a=1;'}}},'PreToolUse').tool_input.content,'export const a=1;');
  assert.equal(mapAgyInput({...raw,toolCall:{name:'multi_replace_file_content',args:{TargetFile:'a.js',ReplacementChunks:[{ReplacementContent:'one'},{ReplacementContent:'two'}]}}},'PreToolUse').tool_input.new_string,'one\ntwo');
});
test('Antigravity syntax failure is retained for the next permitted context delivery',async t=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'bgz-agy-check-'));
  t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  const file=path.join(root,'broken.mjs');fs.writeFileSync(file,'export const broken=;');
  const raw={conversationId:'synthetic-session',workspacePaths:[root],stepIdx:4,toolCall:{name:'write_to_file',args:{TargetFile:file,CodeContent:'export const broken=;'}}};
  const options={storageRoot:path.join(root,'state'),route:false};
  assert.deepEqual(await handleAgyFoundation(raw,'PostToolUse',options),{});
  const recovered=await handleAgyFoundation({conversationId:raw.conversationId,workspacePaths:[root]},'PreInvocation',options);
  assert.match(JSON.stringify(recovered),/JavaScript syntax check/);
  assert.match(JSON.stringify(recovered),/host-reported-error/);
});
