import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {writablePath,writeOwnedFile} from '../../hooks/lib/owned-path.mjs';

const hash=value=>createHash('sha256').update(value).digest('hex');
const stable=value=>Array.isArray(value)?value.map(stable):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(k=>[k,stable(value[k])])):value;

// A task identity is supplied by the host/agent from its original task brief and
// reused across continuations and compaction. This is not a provider-account cap:
// callers with the raw key outside this command remain governed by host policy.
export async function budgetedJev(input,{taskId,projectRoot=process.cwd(),home=os.homedir(),run}={}){
  let attempted=false;
  const fallback=reason=>({status:'fallback',reason,answers:null,requestAttempts:attempted?1:0,next:'Continue with the current agent. Ask the user before another paid Jev request for this task.'});
  if(typeof taskId!=='string'||!taskId.trim()||taskId.length>200)return fallback('stable-task-identity-required');
  if(typeof run!=='function')return fallback('jev-runner-unavailable');
  try{
    const project=fs.realpathSync.native(projectRoot);
    const directory=path.join(home,'.bgzflow','jev-task-requests');
    writablePath(directory,{create:true,directory:true});
    // Task IDs are shared by lead and workers. A different working directory
    // must not silently create another allowance for that same task.
    const ownerScope=hash(project);
    const file=path.join(directory,hash(taskId)+'.json');
    writablePath(file);
    const fingerprint=hash(JSON.stringify(stable(input)));
    // Reservation precedes the network effect and survives a crash or timeout.
    // Never retry an uncertain request or spend again to recover its answer.
    try{const fd=fs.openSync(file,'wx',0o600);try{fs.writeFileSync(fd,JSON.stringify({schema:1,status:'reserved',ownerScope,fingerprint,requests:1}));}finally{fs.closeSync(fd);}}
    catch(error){
      if(error.code!=='EEXIST')throw error;
      if(fs.statSync(file).size>1024*1024)return fallback('task-request-record-unavailable');
      const previous=JSON.parse(fs.readFileSync(file,'utf8'));
      if(previous.ownerScope!==ownerScope)return fallback('task-owned-by-another-workspace-consult-lead');
      if(previous.schema===1&&previous.status==='answered'&&previous.fingerprint===fingerprint&&previous.result?.status==='answered')return {...previous.result,usage:{input_tokens:0,output_tokens:0},reused:true,requestAttempts:0};
      return fallback('task-request-already-used-or-uncertain');
    }
    let result;
    try{attempted=true;result=await run(input);}catch{result={status:'fallback',reason:'request-outcome-uncertain',answers:null};}
    // Store only the checked result, never original prompts, keys or raw errors.
    const safe={status:result?.status==='answered'?'answered':'fallback',...(result?.status==='answered'?{answers:result.answers,usage:result.usage??null,model:result.model}: {reason:result?.reason||'request-outcome-uncertain',answers:null})};
    writeOwnedFile(file,JSON.stringify({schema:1,status:safe.status,ownerScope,fingerprint,requests:1,result:safe}));
    return {...safe,reused:false,requestAttempts:1};
  }catch{return fallback('task-request-record-unavailable');}
}
