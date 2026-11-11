import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('../../',import.meta.url));
const scanner=path.join(root,'scripts/leak-check.mjs');
const exceptions=JSON.parse(fs.readFileSync(path.join(root,'scripts/leak-check-allowlist.json'),'utf8')).exceptions;

function fixture(t){
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'bgz-public-leak-test-'));
  t.after(()=>fs.rmSync(directory,{recursive:true,force:true}));
  fs.writeFileSync(path.join(directory,'VERSION'),'0.0.0\n');
  fs.writeFileSync(path.join(directory,'plugin.json'),'{}');
  return directory;
}
function scan(directory,args=[]){
  const result=spawnSync(process.execPath,[scanner,'--plugin-surface','--json',...args],{
    cwd:directory,encoding:'utf8',windowsHide:true,timeout:15000,
    env:{...process.env,BGZFLOW_OVERLAY:path.join(directory,'private-overlay')}
  });
  return {status:result.status,result:JSON.parse(result.stdout)};
}

test('a reviewed public example is exempt only while its complete line is unchanged',t=>{
  const directory=fixture(t);
  const entry=exceptions.find(item=>item.rule==='email'&&item.path.endsWith('/forms-validation.md'));
  assert.ok(entry);
  const line=fs.readFileSync(path.join(root,entry.path),'utf8').split(/\r?\n/)[entry.line-1];
  const file=path.join(directory,entry.path);fs.mkdirSync(path.dirname(file),{recursive:true});
  fs.writeFileSync(file,'\n'.repeat(entry.line-1)+line+'\n');
  assert.equal(scan(directory).status,0);
  fs.writeFileSync(file,'\n'.repeat(entry.line-1)+line+' changed\n');
  const altered=scan(directory);
  assert.equal(altered.status,1);
  assert.ok(altered.result.findings.some(item=>item.path===entry.path&&item.line===entry.line&&item.rule===entry.rule));
});

test('an unexcepted credential-shaped line elsewhere still fails and output stays masked',t=>{
  const directory=fixture(t);
  const synthetic=['sk','proj', 'Q'.repeat(36)].join('-');
  fs.writeFileSync(path.join(directory,'README.md'),synthetic+'\n');
  const found=scan(directory);
  assert.equal(found.status,1);
  assert.ok(found.result.findings.some(item=>item.path==='README.md'&&item.rule==='openai-token'));
  assert.ok(found.result.findings.every(item=>item.masked==='***'));
  assert.equal(JSON.stringify(found.result).includes(synthetic),false);
});

test('ordinary task-status words are not mistaken for embedded credential prefixes',t=>{
 const directory=fixture(t);
 fs.writeFileSync(path.join(directory,'README.md'),'task-request-record-unavailable\ntask-owned-by-another-workspace-consult-lead\n');
 assert.equal(scan(directory).status,0);
});

test('private overlay terms are ignored unless their denylist is explicitly supplied',t=>{
  const directory=fixture(t),overlay=path.join(directory,'private-overlay');fs.mkdirSync(overlay);
  const denylist=path.join(overlay,'denylist.txt');fs.writeFileSync(denylist,'private-fixture-term\n');
  fs.writeFileSync(path.join(directory,'README.md'),'private-fixture-term\n');
  assert.equal(scan(directory).status,0);
  const explicit=scan(directory,['--denylist',denylist]);
  assert.equal(explicit.status,1);
  assert.ok(explicit.result.findings.some(item=>item.rule==='denylist'));
});

test('the ready-to-install bundle is included in the public scanner surface',t=>{
  const directory=fixture(t),bundle=path.join(directory,'plugins','bgzflow');fs.mkdirSync(bundle,{recursive:true});
  const synthetic=['sk','proj','B'.repeat(36)].join('-');
  fs.writeFileSync(path.join(bundle,'fixture.mjs'),synthetic+'\n');
  const found=scan(directory);
  assert.equal(found.status,1);
  assert.ok(found.result.findings.some(item=>item.path==='plugins/bgzflow/fixture.mjs'&&item.rule==='openai-token'));
});
