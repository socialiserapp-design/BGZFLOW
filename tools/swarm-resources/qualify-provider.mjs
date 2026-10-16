import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {buildPlan,writeAtomic,safeName} from '../bg-swarm/lib.mjs';
import {redactSecrets} from '../../hooks/lib/secrets.mjs';

// A single foreground probe retains its terminal exit, even after the parent lead exits.
export function qualifyProvider(root,input,{runner=spawnSync}={}) {
  const id=safeName(input.id,'qualification ID'),dir=path.join(root,'.bgzflow','qualifications');fs.mkdirSync(dir,{recursive:true});
  const record=path.join(dir,id+'.native.json');if(fs.existsSync(record))return JSON.parse(fs.readFileSync(record,'utf8'));
  const plan=buildPlan({host:input.host,cwd:root,promptFile:input.promptFile,model:input.model,effort:input.effort==='none'?undefined:input.effort,thinking:input.thinking===true,readOnly:true});
  const evidence=path.relative(root,path.join(dir,id+'.out')).replace(/\\/g,'/');
  const started={id,jobId:id,status:'starting',model:input.model,effort:input.effort||'none',thinking:input.thinking===true,command:[plan.cmd,...plan.args],readOnly:true,evidence,startedAt:new Date().toISOString()};writeAtomic(record,started);
  let result;try{result=runner(plan.cmd,plan.args,{cwd:root,encoding:'utf8',input:plan.stdin?fs.readFileSync(input.promptFile,'utf8'):undefined,timeout:12000,maxBuffer:262144,stdio:['pipe','pipe','pipe']});}catch{result={error:true,status:null};}
  fs.writeFileSync(path.resolve(root,evidence),redactSecrets(result.stdout||''));
  fs.writeFileSync(path.join(dir,id+'.err'),redactSecrets(result.stderr||''));
  const final={...started,status:result.error?'uncertain':result.status===0?'completed':'failed',exitCode:result.status??null,endedAt:new Date().toISOString(),returnRef:path.relative(root,record).replace(/\\/g,'/')};writeAtomic(record,final);return final;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const input={};for(let i=2;i<process.argv.length;i++){const key=process.argv[i].slice(2);if(key==='thinking')input.thinking=true;else input[key.replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]=process.argv[++i];}
  try{const r=qualifyProvider(process.cwd(),input);console.log(JSON.stringify(r));process.exitCode=r.status==='completed'?0:r.status==='uncertain'?3:1;}catch{console.error('Qualification unavailable; reconcile this operation before retrying.');process.exitCode=2;}
}
