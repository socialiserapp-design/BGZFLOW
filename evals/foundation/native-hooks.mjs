import {spawn} from 'node:child_process';
import readline from 'node:readline';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';

export const livePluginId='bgzflow@bgzflow-live';
export function candidateCliConfig(pluginId=livePluginId){
  if(!/^bgzflow@[a-z0-9][a-z0-9_-]*$/.test(pluginId))throw Error('Supply an exact BGZFLOW plugin identity.');
  // promptfoo concatenates nested keys without TOML quoting. Flat, already
  // quoted paths preserve @ as part of the plugin key in both supported APIs.
  return pluginId===livePluginId?{}:{[`plugins.${JSON.stringify(pluginId)}.enabled`]:true,[`plugins.${JSON.stringify(livePluginId)}.enabled`]:false};
}
export function nativeConfigArguments(cliConfig={}){
  const args=[];
  for(const [key,value] of Object.entries(cliConfig)){
    if(!/^plugins\."bgzflow@[a-z0-9][a-z0-9_-]*"\.enabled$/.test(key)||typeof value!=='boolean')throw Error('Hook preflight only supports explicit flat BGZFLOW activation overrides.');
    args.push('-c',`${key}=${value}`);
  }
  return args;
}
const samePath=(a,b)=>fs.realpathSync.native(a)===fs.realpathSync.native(b);
export function reviewedPackageIdentity(actualRoot,reviewedRoot){
  try{
    actualRoot=fs.realpathSync.native(actualRoot);reviewedRoot=fs.realpathSync.native(reviewedRoot);
    const manifest=root=>JSON.parse(fs.readFileSync(path.join(root,'plugin.json'),'utf8'));
    const expected=manifest(reviewedRoot),actual=manifest(actualRoot);
    if(expected.name!=='bgzflow'||actual.name!==expected.name||!expected.version||actual.version!==expected.version)return {matches:false,reason:'Native plugin version differs from the reviewed build.'};
    let checked=0;
    function scan(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
      if(entry.isSymbolicLink())throw Error('Linked reviewed package entry.');
      const file=path.join(dir,entry.name),relative=path.relative(reviewedRoot,file),other=path.join(actualRoot,relative);
      const stat=fs.lstatSync(other);if(stat.isSymbolicLink())throw Error('Linked native package entry.');
      if(entry.isDirectory()){if(!stat.isDirectory()||!samePath(path.dirname(other),path.dirname(fs.realpathSync.native(other))))throw Error('Native package ancestry mismatch.');scan(file);}
      else if(entry.isFile()){
        if(!stat.isFile()||stat.size!==fs.statSync(file).size)throw Error('Native package file differs.');
        const hash=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');if(hash(file)!==hash(other))throw Error('Native package file differs.');checked++;
      }
    }}scan(reviewedRoot);
    return {matches:true,version:expected.version,checkedFiles:checked,actualRoot};
  }catch{return {matches:false,reason:'Native plugin files do not match the reviewed build, or identity could not be verified.'};}
}

function hookPackage(hooks,pluginRoot){
  try{
    const roots=new Set();
    for(const hook of hooks){
      if(hook.handlerType!=='command'||typeof hook.sourcePath!=='string'||typeof hook.command!=='string')throw Error('No actual command source.');
      const source=fs.realpathSync.native(hook.sourcePath);
      if(path.basename(source)!=='hooks.json'||path.basename(path.dirname(source))!=='hooks')throw Error('Unexpected hook declaration.');
      const root=path.dirname(path.dirname(source));roots.add(root);
      const command=/^node(?:\.exe)?\s+"([^"]+)"\s*$/.exec(hook.command);
      if(!command)throw Error('Unrecognized native hook command.');
      const script=fs.realpathSync.native(command[1]),relative=path.relative(root,script).replaceAll('\\','/');
      if(!['hooks/foundation.mjs','hooks/mechanical-safety.mjs'].includes(relative))throw Error('Native command outside reviewed entrypoints.');
    }
    if(roots.size!==1)throw Error('Mixed native roots.');
    return reviewedPackageIdentity([...roots][0],pluginRoot);
  }catch{return {matches:false,reason:'Native hook commands do not resolve to one reviewed package.'};}
}

// Evaluation preflight only. Never writes host configuration or grants trust.
export function inspectNativeHooks(result,{pluginId,pluginRoot}={}){
  const entries=result?.data;
  if(!Array.isArray(entries)||entries.length!==1)return {ready:false,reason:'The host did not report one inspected workspace.'};
  const entry=entries[0],all=(entry.hooks||[]).filter(hook=>hook.pluginId?.split('@')[0]==='bgzflow');
  const hooks=pluginId?all.filter(hook=>hook.pluginId===pluginId):all;
  const required=['sessionStart','userPromptSubmit','postToolUse'];
  const identity=pluginRoot&&hooks.length?hookPackage(hooks,pluginRoot):null;
  const ready=!entry.errors?.length&&hooks.length>0&&new Set(hooks.map(hook=>hook.pluginId)).size===1
    &&(!pluginId||!all.some(hook=>hook.pluginId!==pluginId&&hook.enabled))
    &&(!pluginRoot||identity?.matches===true)
    &&hooks.every(hook=>hook.enabled&&hook.trustStatus==='trusted')
    &&required.every(event=>hooks.some(hook=>hook.eventName===event));
  return {ready,reason:ready?'Fresh host reports the installed BGZFLOW hooks enabled and trusted; actual execution still needs prompt/tool evidence.':'BGZFLOW hooks are missing, disabled or need native review. Resolve only the authorised plugin through host controls before spending model usage.',
    hooks:hooks.map(hook=>({event:hook.eventName,enabled:hook.enabled,trust:hook.trustStatus})),unrelatedHooks:(entry.hooks||[]).length-hooks.length,...(pluginId?{pluginId}:{}),...(identity?{packageIdentity:identity}:{}),...(!ready&&identity?.matches===false?{reason:identity.reason}:{})};
}

export async function readNativeHookStatus({executable='codex',cwd,timeoutMs=20000,pluginId,pluginRoot,cliConfig={}}){
  const required=pluginId&&candidateCliConfig(pluginId);
  if(required&&Object.entries(required).some(([key,value])=>cliConfig[key]!==value))throw Error('Candidate preflight requires the same explicit candidate-only activation overrides as the worker.');
  const child=spawn(executable,['app-server','--stdio',...nativeConfigArguments(cliConfig)],{cwd,windowsHide:true,stdio:['pipe','pipe','pipe']});
  child.stderr.on('data',()=>{}); // Do not retain arbitrary host log bodies.
  const pending=new Map();let next=0;
  const rejectAll=reason=>{for(const handler of pending.values())handler.reject(Error(reason));pending.clear()};
  child.once('error',()=>rejectAll('The native hook-status process could not start.'));
  child.once('exit',()=>rejectAll('The native hook-status process ended before replying.'));
  child.stdin.on('error',()=>rejectAll('The native hook-status connection closed.'));
  const rpc=(method,params)=>new Promise((resolve,reject)=>{const id=++next;pending.set(id,{resolve,reject});child.stdin.write(JSON.stringify({id,method,params})+'\n')});
  const reader=(async()=>{
    for await(const line of readline.createInterface({input:child.stdout})){
      let message;try{message=JSON.parse(line)}catch{continue}
      const handler=pending.get(message.id);if(!handler)continue;pending.delete(message.id);
      message.error?handler.reject(Error('The native host rejected the hook-status request.')):handler.resolve(message.result);
    }
  })();
  const timer=setTimeout(()=>{rejectAll('Native hook-status request timed out.');child.kill()},timeoutMs);
  try{
    await rpc('initialize',{clientInfo:{name:'bgzflow_evaluation_preflight',version:'1.0.0'},capabilities:{experimentalApi:true}});
    child.stdin.write(JSON.stringify({method:'initialized'})+'\n');
    return inspectNativeHooks(await rpc('hooks/list',{cwds:[cwd]}),{pluginId,pluginRoot});
  }finally{
    clearTimeout(timer);child.stdin.end();const kill=setTimeout(()=>child.kill(),1000);kill.unref();await reader;clearTimeout(kill);
  }
}
