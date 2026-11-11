import {realpathSync as canonicalTestPath} from 'node:fs'; // Resolve OS temp aliases before testing descendant link protection.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {inspectNativeHooks,candidateCliConfig,nativeConfigArguments,reviewedPackageIdentity,livePluginId} from './native-hooks.mjs';
const good=()=>({data:[{errors:[],hooks:['sessionStart','userPromptSubmit','postToolUse'].map(eventName=>({pluginId:'bgzflow@test-marketplace',eventName,enabled:true,trustStatus:'trusted'}))}]});
test('native evaluation rejects stale trust and missing hooks before model usage',()=>{
  assert.equal(inspectNativeHooks(good()).ready,true);
  for(const change of [data=>{data.data[0].hooks[0].trustStatus='modified'},data=>{data.data[0].hooks[0].enabled=false},data=>{data.data[0].hooks.pop()},data=>{data.data[0].errors.push({message:'configuration unavailable'})},data=>{data.data[0].hooks[0].pluginId='bgzflow@second-marketplace'}]){
    const value=good();change(value);assert.equal(inspectNativeHooks(value).ready,false);
  }
  assert.equal(inspectNativeHooks({data:[]}).ready,false);
  assert.equal(inspectNativeHooks({data:[{hooks:[],errors:[]}]}).ready,false);
});
test('unrelated pending hooks do not make BGZFLOW evaluation demand wider permission',()=>{
  const value=good();value.data[0].hooks.push({pluginId:'unrelated@example',eventName:'stop',enabled:true,trustStatus:'modified'});
  const result=inspectNativeHooks(value);assert.equal(result.ready,true);assert.equal(result.unrelatedHooks,1);assert.equal(result.hooks.length,3);
  assert.equal(JSON.stringify(result).includes('currentHash'),false);
});
test('candidate activation uses exact quoted flat TOML paths, never unquoted nested provider keys',()=>{
  assert.deepEqual(candidateCliConfig(),{});
  const config=candidateCliConfig('bgzflow@bgzflow-candidate');
  assert.deepEqual(config,{'plugins."bgzflow@bgzflow-candidate".enabled':true,'plugins."bgzflow@bgzflow-live".enabled':false});
  assert.deepEqual(nativeConfigArguments(config),['-c','plugins."bgzflow@bgzflow-candidate".enabled=true','-c','plugins."bgzflow@bgzflow-live".enabled=false']);
  assert.throws(()=>nativeConfigArguments({plugins:{'bgzflow@bgzflow-candidate':{enabled:true}}}),/flat/);
  assert.throws(()=>candidateCliConfig('other@example'),/exact/);
});
function packages(){
  const root=fs.mkdtempSync(path.join(canonicalTestPath.native(os.tmpdir()),'bgz-hook-package-')),reviewed=path.join(root,'reviewed build'),actual=path.join(root,'native cache');
  for(const dir of [reviewed,actual]){fs.mkdirSync(path.join(dir,'hooks'),{recursive:true});fs.writeFileSync(path.join(dir,'plugin.json'),JSON.stringify({name:'bgzflow',version:'test-candidate'}));fs.writeFileSync(path.join(dir,'hooks/hooks.json'),'{}');fs.writeFileSync(path.join(dir,'hooks/foundation.mjs'),'// synthetic, never executed\n');}
  const pluginId='bgzflow@bgzflow-candidate',metadata=good();
  for(const hook of metadata.data[0].hooks)Object.assign(hook,{pluginId,handlerType:'command',sourcePath:path.join(actual,'hooks/hooks.json'),command:`node "${path.join(actual,'hooks/foundation.mjs')}"`});
  return {reviewed,actual,pluginId,metadata};
}
test('candidate preflight proves actual hook root/version/file bytes and rejects mixed active live hooks',()=>{
  const {reviewed,actual,pluginId,metadata}=packages();
  const options={pluginId,pluginRoot:reviewed};const valid=inspectNativeHooks(metadata,options);assert.equal(valid.ready,true);assert.equal(valid.packageIdentity.version,'test-candidate');assert.equal(valid.packageIdentity.actualRoot,fs.realpathSync.native(actual));
  metadata.data[0].hooks.push({...metadata.data[0].hooks[0],pluginId:livePluginId});assert.equal(inspectNativeHooks(metadata,options).ready,false);
  metadata.data[0].hooks.at(-1).enabled=false;assert.equal(inspectNativeHooks(metadata,options).ready,true);
  fs.writeFileSync(path.join(actual,'hooks/foundation.mjs'),'// wrong candidate bytes\n');assert.equal(inspectNativeHooks(metadata,options).ready,false);
});
test('same version or reviewed directory alone never proves the native candidate package',()=>{
  const {reviewed,actual,pluginId,metadata}=packages();
  assert.equal(inspectNativeHooks(metadata,{pluginId:livePluginId,pluginRoot:reviewed}).ready,false);
  metadata.data[0].hooks[0].command='node "outside/foundation.mjs"';assert.equal(inspectNativeHooks(metadata,{pluginId,pluginRoot:reviewed}).ready,false);
  fs.writeFileSync(path.join(actual,'plugin.json'),JSON.stringify({name:'bgzflow',version:'old'}));assert.equal(reviewedPackageIdentity(actual,reviewed).matches,false);
});
