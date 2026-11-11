import {realpathSync as canonicalTestPath} from 'node:fs'; // Resolve OS temp aliases before testing descendant link protection.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {projectDecisionFiles} from '../project-decisions.mjs';
test('generic defaults and private preferences preserve project decisions without personal names in the package',()=>{
 const home=fs.mkdtempSync(path.join(canonicalTestPath.native(os.tmpdir()),'bgz-context-')),root=path.join(home,'project');fs.mkdirSync(root);fs.mkdirSync(path.join(home,'.bgzflow'));
 fs.writeFileSync(path.join(root,'DECISIONS.md'),'Generic current decisions');
 fs.writeFileSync(path.join(root,'OWNER.md'),'Custom current decisions');
 assert.deepEqual(projectDecisionFiles(root,{home}),[path.join(fs.realpathSync(root),'DECISIONS.md')]);
 fs.writeFileSync(path.join(home,'.bgzflow/context.json'),JSON.stringify({decisionFiles:['OWNER.md','OWNER.md','../outside.md','bad.txt']}));
 assert.deepEqual(projectDecisionFiles(root,{home}),[path.join(fs.realpathSync(root),'OWNER.md')]);
 assert.deepEqual(projectDecisionFiles(root,{home,decisionFiles:['DECISIONS.md']}),[path.join(fs.realpathSync(root),'DECISIONS.md')]);
});
