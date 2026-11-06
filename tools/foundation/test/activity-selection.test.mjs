import test from 'node:test';
import assert from 'node:assert/strict';
import {describeToolActivity} from '../activity-selection.mjs';

test('real tool boundaries expose changed work without requiring a model-written plan',()=>{
 const step=(tool_name,tool_input)=>describeToolActivity({hook_event_name:'PreToolUse',tool_name,tool_input});
 assert.equal(step('Read',{file_path:'sdk.mjs'}),null);
 assert.equal(step('functions.apply_patch','*** Begin Patch\n*** Update File: export.mjs\n@@\n+export const value=1;\n*** End Patch').phase,'implementation');
 assert.equal(step('exec_command',{cmd:'npm test'}).phase,'verification');
 assert.equal(step('mcp__node_repl__js',{code:'await page.screenshot()'}).phase,'real-surface');
 assert.equal(step('Bash',{command:'echo "npm test"'}).phase,'execution');
 assert.equal(step('Bash',{command:'cat test-output.txt'}).phase,'execution');
 assert.equal(step('functions.exec',{code:'await tools.exec_command({cmd:"npm test"})'}).phase,'verification');
 assert.equal(step('functions.exec','await tools.exec_command({cmd:"npm test"})').phase,'verification');
 assert.equal(step('functions.exec',{code:'await tools.apply_patch(patch)'}).phase,'implementation');
 assert.equal(step('functions.exec',{code:'await tools.exec_command({cmd:"echo npm test"})'}).phase,'execution');
});

test('failed actual tool events change investigation context and never grant new authority',()=>{
 const result=describeToolActivity({hook_event_name:'PostToolUseFailure',tool_name:'Bash',tool_input:{command:'node export.mjs'}});
 assert.equal(result.phase,'diagnosis');assert.match(result.classification,/not a user decision/);
 assert.equal(describeToolActivity({hook_event_name:'UserPromptSubmit',tool_name:'Bash',prompt:'npm test'}),null);
});
