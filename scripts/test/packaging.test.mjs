import {realpathSync as canonicalTestPath} from 'node:fs'; // Resolve OS temp aliases before testing descendant link protection.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {buildFoundation,validatePackage} from '../build-foundation.mjs';
import {inspectDocumentLinks} from '../check-document-links.mjs';

function output(t) {
  const root=fs.mkdtempSync(path.join(canonicalTestPath.native(os.tmpdir()),'bgz-package-test-'));
  t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  return path.join(root,'package');
}

test('staged normal artifact is closed and excludes unreachable legacy gates',async t=>{
  const target=output(t),result=await buildFoundation({outputDirectory:target,promote:false});
  assert.equal(fs.existsSync(target),false);
  assert.equal((await validatePackage(result.directory)).version,result.version);
  for(const file of ['hooks/lib/jev-gates.mjs','hooks/lib/compact-judge.mjs','hooks/lib/big-read.mjs','skills/bg-check-it-before-release/scripts/evidence_gate.py','skills/bg-check-it-before-release/scripts/adapt_host_review.cjs','skills/bg-finish-the-whole-job/scripts/admit_build.cjs'])assert.equal(fs.existsSync(path.join(result.directory,file)),false,file);
  assert.ok(fs.existsSync(path.join(result.directory,'tools/engine/method-assets/default-policy.md')));
  assert.ok(fs.existsSync(path.join(result.directory,'vendor/typesafe.LICENSE')));
  assert.ok(fs.existsSync(path.join(result.directory,'vendor/toml.LICENSE')));
  const judgment=spawnSync(process.execPath,[path.join(result.directory,'tools/foundation/bgz.mjs'),'judge','--stdin'],{input:JSON.stringify({state:'Public fixture',questions:{impact:{type:'score',instructions:'Observed impact?',criteria:['No failure','Blocked']}}}),encoding:'utf8',windowsHide:true,timeout:15000});
  assert.equal(judgment.status,0,judgment.stderr);
  assert.equal(JSON.parse(judgment.stdout).network,false);
  for(const name of ['bg-jev','jev-research','jev-quality','jev-context','jev-risk','jev-workflows','jev-build'])assert.ok(fs.existsSync(path.join(result.directory,'skills',name,'SKILL.md')),name);
  for(const file of ['docs/mailbox.md','docs/testing-ladder.md','templates/CHECKPOINT.md','templates/PROJECT-AGENTS.md','templates/DECISIONS.md','templates/LIVE-MANIFEST.md'])assert.ok(fs.existsSync(path.join(result.directory,file)),file);
  const receipt=path.join(path.dirname(target),'operation.json');
  const operation=spawnSync(process.execPath,[path.join(result.directory,'tools/engine/operation-runner.mjs'),receipt,JSON.stringify({operationId:'package-smoke',fingerprint:'fixture',cwd:path.dirname(target),command:{file:process.execPath,args:['-e','process.stdout.write("package child reached")']}})],{encoding:'utf8',windowsHide:true,timeout:15000});
  assert.equal(operation.status,0,operation.stderr);
  assert.equal(JSON.parse(fs.readFileSync(receipt,'utf8')).result.stdout,'package child reached');
});

test('rebuilding removes stale discoverable skills and preserves the previous package',async t=>{
  const target=output(t);await buildFoundation({outputDirectory:target});
  const retired=path.join(target,'skills','old-retired-method');fs.mkdirSync(retired,{recursive:true});fs.writeFileSync(path.join(retired,'SKILL.md'),'retired content');
  const result=await buildFoundation({outputDirectory:target});
  assert.equal(fs.existsSync(path.join(target,'skills','old-retired-method')),false);
  assert.equal(fs.readFileSync(path.join(result.backup,'skills','old-retired-method','SKILL.md'),'utf8'),'retired content');
});

test('Antigravity build has only its appropriate root hook layout',async t=>{
  const target=output(t),result=await buildFoundation({outputDirectory:target,antigravity:true});
  await validatePackage(result.directory,{antigravity:true});
  assert.ok(fs.existsSync(path.join(target,'hooks.json')));
  assert.ok(fs.existsSync(path.join(target,'rules','AGENTS.md')));
  assert.equal(fs.existsSync(path.join(target,'.claude-plugin')),false);
  assert.equal(fs.existsSync(path.join(target,'hooks','hooks.json')),false);
});

test('Git-bearing output is never moved during package replacement',async t=>{
  const target=output(t);await buildFoundation({outputDirectory:target});
  fs.mkdirSync(path.join(target,'.git'));fs.writeFileSync(path.join(target,'.git','marker'),'owner repository');
  await assert.rejects(()=>buildFoundation({outputDirectory:target}),/Git metadata/);
  assert.equal(fs.readFileSync(path.join(target,'.git','marker'),'utf8'),'owner repository');
});

test('validation rejects a missing shipped runtime dependency',async t=>{
  const result=await buildFoundation({outputDirectory:output(t),promote:false});
  fs.appendFileSync(path.join(result.directory,'hooks','foundation.mjs'),"\nimport './missing-runtime-dependency.mjs';\n");
  await assert.rejects(()=>validatePackage(result.directory),/missing-runtime-dependency/);
});

test('instruction links follow Markdown references, encoded names and actual heading slugs',t=>{
  const root=output(t);fs.mkdirSync(root,{recursive:true});
  fs.writeFileSync(path.join(root,'Guide space.md'),'# Café **design**\n\n# Café **design**\n\n<a id="named-target"></a>\n');
  fs.writeFileSync(path.join(root,'README.md'),[
    '---','title: fixture','---','# Package',
    '[first](Guide%20space.md#caf%C3%A9-design)',
    '[second][reference]','','[reference]: Guide%20space.md#café-design-1','',
    '<a href="Guide%20space.md#named-target">named</a>',
    '[remote](https://invalid.example/not-fetched)',
    '```md','[example only](missing-example.md)','```',
    '| Check |','| --- |','| [missing](missing-table.md) |',''
  ].join('\n'));
  const result=inspectDocumentLinks(root);
  assert.equal(result.files,2);
  assert.deepEqual(result.issues,[{file:'README.md',line:17,target:'missing-table.md',reason:'missing file'}]);
  assert.equal(result.links,4);
});

test('instruction links reject escaped package paths and stale headings',t=>{
  const root=output(t);fs.mkdirSync(root,{recursive:true});
  fs.writeFileSync(path.join(root,'README.md'),'# Present\n\n[old](#removed)\n[escape](../outside.md)\n[absolute](C:/private.md)\n');
  assert.deepEqual(inspectDocumentLinks(root).issues.map(issue=>issue.reason),['missing heading','outside package','non-portable local path']);
});

test('package validation detects missing referenced documents and headings in shipped copies',async t=>{
  const result=await buildFoundation({outputDirectory:output(t),promote:false});
  const checkpoint=path.join(result.directory,'templates','CHECKPOINT.md');
  fs.renameSync(checkpoint,checkpoint+'.retained');
  await assert.rejects(()=>validatePackage(result.directory),/CHECKPOINT\.md: missing file/);
  fs.renameSync(checkpoint+'.retained',checkpoint);
  const testing=path.join(result.directory,'docs','testing-ladder.md'),original=fs.readFileSync(testing,'utf8');
  fs.writeFileSync(testing,original.replace('## Test behavior and compatibility','## Renamed in fixture'));
  await assert.rejects(()=>validatePackage(result.directory),/testing-ladder\.md#test-behavior-and-compatibility: missing heading/);
  fs.writeFileSync(testing,original);
  assert.ok(fs.existsSync(fileURLToPath(import.meta.url)));
  fs.appendFileSync(path.join(result.directory,'README.md'),'\n[Source-only test](scripts/test/packaging.test.mjs)\n');
  await assert.rejects(()=>validatePackage(result.directory),/scripts\/test\/packaging\.test\.mjs: missing file/);
});
