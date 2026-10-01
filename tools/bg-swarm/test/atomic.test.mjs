import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import {test} from 'node:test';import {writeAtomic} from '../lib.mjs';import {makeHome} from './helper.mjs';
test('R3 failed backup rename preserves the original ledger when both renames would be denied',(t)=>{
 const home=makeHome('wave1-atomic-'),file=path.join(home.swarm,'ledger.json'),original='{"durable":"original job records"}\n';fs.writeFileSync(file,original);
 const rename=fs.renameSync,blocked=t.mock.method(fs,'renameSync',(from,to)=>{if(String(from)===file||String(to)===file)throw Object.assign(new Error('fixture access denied'),{code:'EPERM'});return rename(from,to);});
 try {assert.throws(()=>writeAtomic(file,{replacement:true}),{code:'EPERM'});assert.equal(fs.readFileSync(file,'utf8'),original);}finally {blocked.mock.restore();home.cleanup();}
});
test('R3 failed replacement rename restores the successfully backed-up original ledger',(t)=>{
 const home=makeHome('wave1-atomic-'),file=path.join(home.swarm,'ledger.json');fs.writeFileSync(file,'{"original":true}\n');
 const rename=fs.renameSync,blocked=t.mock.method(fs,'renameSync',(from,to)=>{if(String(from).endsWith('.tmp'))throw Object.assign(new Error('fixture replacement denied'),{code:'EPERM'});return rename(from,to);});
 try {assert.throws(()=>writeAtomic(file,{replacement:true}),{code:'EPERM'});assert.equal(fs.readFileSync(file,'utf8'),'{"original":true}\n');}finally {blocked.mock.restore();home.cleanup();}
});
