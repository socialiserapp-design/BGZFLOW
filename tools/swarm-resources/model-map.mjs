import fs from 'node:fs';import path from 'node:path';import {spawnSync} from 'node:child_process';
import {writeAtomic} from '../bg-swarm/lib.mjs';
export const TIERS=['light','standard','heavy-write','heavy-read'];
export function parseListing(body,version='unknown'){
  let data;try{data=JSON.parse(body);}catch{data={};}
  const models=(data.models||[]).map(m=>typeof m==='string'?{id:m}:{...m,id:m.id||m.name,default:m.default===true||m.isDefault===true,flagship:m.flagship===true||m.isFlagship===true,fast:m.fast===true||m.speed==='fast'}).filter(m=>typeof m.id==='string'&&m.id);
  let efforts=(data.efforts||[]).map((e,i)=>typeof e==='string'?{value:e,rank:i}:{...e,value:e.value||e.id,rank:Number.isFinite(e.rank)?e.rank:i});
  const effortFlag=/--(?:reasoning-)?effort\b/.exec(body)?.[0];
  if(!efforts.length){const block=effortFlag?body.slice(body.indexOf(effortFlag),body.indexOf(effortFlag)+350):'',values=/(?:choices:|possible values:|\()\s*([a-z0-9_,| -]+)(?:\]|\)|\n)/i.exec(block)?.[1];if(values)efforts=values.split(/[,|]/).map((v,i)=>({value:v.trim().replace(/["'<>]/g,''),rank:i})).filter(e=>/^[a-z][a-z0-9_-]*$/.test(e.value));}
  return {...data,version:data.version||version,models,efforts,modelFlag:data.modelFlag||(/--model\b/.test(body)?'--model':null),effortFlag:data.effortFlag||effortFlag||null,thinking:data.thinking===true||/--thinking\b/.test(body),evidence:'CLI model listing/help'};
}
export function proposeMapping(listing,user={}){
  const models=listing.models||[],strong=models.find(m=>m.id===user.strongest)||models.find(m=>m.flagship)||models.find(m=>m.default),fast=models.find(m=>m.id===user.fast)||models.find(m=>m.fast)||strong;
  if(!strong)return {};const efforts=(listing.efforts||[]).filter(e=>e.value).sort((a,b)=>(a.rank||0)-(b.rank||0)),normal=efforts.filter(e=>!e.readOnly&&!e.selfSplit),write=normal.at(-1),read=efforts.at(-1);
  const setting=(model,e,heavy=false)=>({model:model.id,effort:e?.value||'none',thinking:!!listing.thinking&&heavy,readOnly:e?.readOnly===true||e?.selfSplit===true,selfSplit:e?.selfSplit===true,modelFlag:listing.modelFlag||'--model',effortFlag:listing.effortFlag||null});
  return {light:setting(fast,normal[0]),standard:setting(strong,write,true),'heavy-write':setting(strong,write,true),'heavy-read':setting(strong,read,true)};
}
export function qualifiedSetting(setting,proofs=[]){return !!setting&&proofs.some(p=>p.result==='passed'&&p.jobId&&p.evidence&&p.account&&p.environment&&p.model===setting.model&&p.effort===setting.effort&&p.observed?.model===setting.model&&p.observed?.effort===setting.effort&&(!setting.thinking||p.observed.thinking===true||p.thinking===true));}
export function tierSetting(mapping,tier,actual){const required=mapping?.[tier];return {allowed:!!required&&actual.model===required.model&&actual.effort===required.effort&&(!required.thinking||actual.thinking===true),required:required||null};}
export function selectTierRoute(routes,preference,tier,{differentFamily}={}){for(const id of preference){const r=routes.find(r=>r.id===id);if(r?.available&&(!differentFamily||r.family!==differentFamily)&&qualifiedSetting(r.mapping?.[tier],r.settingProofs||r.proofs))return {...r,setting:r.mapping[tier],tier};}return null;}
export function needsRediscovery(map,listing,now=Date.now(),error=''){
  return !map||!Number.isFinite(Date.parse(map.verifiedOn))||now-Date.parse(map.verifiedOn)>7*86400000||map.cliVersion!==listing.version||Object.values(map.mapping||{}).filter(Boolean).some(s=>!listing.models?.some(m=>m.id===s.model))||(map.listing&&listing.models?.some(m=>!map.listing.models?.some(p=>p.id===m.id)))||(map.listing&&JSON.stringify((map.listing.models||[]).filter(m=>m.default||m.flagship).map(m=>m.id).sort())!==JSON.stringify((listing.models||[]).filter(m=>m.default||m.flagship).map(m=>m.id).sort()))||/model[- ]not[- ]found|unknown model|deprecated|model.*(?:removed|does not exist)/i.test(error);
}
export function refreshMapping(old,listing,{now=Date.now(),qualify,proofs=[],autoAdopt=false,user={}}={}){
  const proposed=proposeMapping(listing,user),known=new Set(old?.listing?.models?.map(m=>m.id)||Object.values(old?.mapping||{}).filter(Boolean).map(s=>s.model)),changed=proposed.standard?.model!==old?.mapping?.standard?.model;
  const candidates=(listing.models||[]).filter(m=>!known.has(m.id)||(changed&&m.id===proposed.standard?.model));
  const newModel=candidates.find(m=>m.id===proposed.standard?.model)||candidates[0];
  const all=[...proofs],qualification=[];
  for(const model of candidates){const setting=Object.values(proposed).find(s=>s.model===model.id&&!s.readOnly)||{...proposed.standard,model:model.id};if(setting&&!qualifiedSetting(setting,all)){
    const task={model:setting.model,effort:setting.effort,setting,status:'pending',reason:'New model needs one small exact-flags qualification'};
    if(qualify){try{const proof=qualify(setting);if(qualifiedSetting(setting,[proof])){all.push(proof);task.status='passed';task.jobId=proof.jobId;}else task.status='failed';}catch{task.status='failed';}}qualification.push(task);
  }}
  const mapping={};for(const tier of TIERS){const previous=old?.mapping?.[tier],candidate=proposed[tier],present=previous&&listing.models.some(m=>m.id===previous.model),qualified=qualifiedSetting(candidate,all);mapping[tier]=present?autoAdopt&&qualified?candidate:previous:qualified?candidate:null;}
  const previous=old?structuredClone(old):null;if(previous)delete previous.previous;
  return {verifiedOn:new Date(now).toISOString(),cliVersion:listing.version,listing,mapping,proposal:newModel?proposed:old?.proposal||null,qualification,proofs:all,previous,autoAdopted:!!newModel&&autoAdopt&&changed&&mapping.standard?.model===newModel.id};
}
export function discoverModelMap(resource,config={}, {runner=spawnSync,now=Date.now()}={}){
  const run=args=>{const r=runner(args[0],args.slice(1),{encoding:'utf8',timeout:1500,maxBuffer:262144,stdio:['ignore','pipe','ignore']});if(r.status!==0||r.error)throw new Error('CLI discovery unavailable');return r.stdout;};
  const version=run(config.versionCommand||[resource.cli,'--version']).trim();
  const body=run(config.listingCommand||[resource.cli,'--help']);return {...parseListing(body,version),verifiedOn:new Date(now).toISOString(),evidence:{versionArgv:config.versionCommand||[resource.cli,'--version'],listingArgv:config.listingCommand||[resource.cli,'--help']}};
}
export function refreshModelMaps(resources,policy,{dir,runner,qualify,now=Date.now()}={}){
  const file=path.join(dir,'swarm-model-map.json');let previous={providers:{}};try{previous=JSON.parse(fs.readFileSync(file,'utf8'));}catch(e){if(e.code!=='ENOENT')throw new Error('Model map unreadable');}
  const next={schemaVersion:1,providers:{...previous.providers},at:new Date(now).toISOString()},warnings=[];
  for(const r of resources.filter(r=>r.installed&&r.cli))try{
    const config=policy.providers?.[r.id]||{},listing=discoverModelMap(r,config,{runner,now}),old=next.providers[r.id];
    if(!listing.models.length&&Array.isArray(config.models)){listing.models=config.models.map(m=>typeof m==='string'?{id:m,default:m===config.strongest,fast:m===config.fast}:m);listing.catalogueSource='explicit user selection; exact flags still need qualification';}
    if(Array.isArray(config.efforts)&&config.efforts.length)listing.efforts=config.efforts.map((e,i)=>({...e,rank:e.rank??i}));
    if(!listing.models.length){warnings.push(`${r.id}: CLI exposes no model catalogue; retained the existing map. Configure a model listing command or explicit user choices, then qualify exact flags.`);continue;}
    if(needsRediscovery(old,listing,now,config.lastError))next.providers[r.id]={...refreshMapping(old,listing,{now,qualify:qualify?setting=>qualify(r,setting):undefined,proofs:r.settingProofs||r.proofs||[],autoAdopt:policy.autoAdoptNewFlagship===true,user:config}),family:config.family||r.cli,evidence:listing.evidence};
  }catch{warnings.push(`${r.id}: model discovery unavailable; retained qualified mapping and pending jobs.`);}
  writeAtomic(file,next);return {...next,warnings};
}
export function launchQualification(root,request,route,{approved=false,withinLimit=false,runner=spawnSync}={}){
  if(!approved||!withinLimit||!Array.isArray(route.qualificationCommand)||!route.qualificationCommand.length)return {status:'held',reason:'Approve this route and budget and configure its small qualification launch.'};
  if(!/^[A-Za-z0-9][A-Za-z0-9._-]{0,100}$/.test(request.id||''))throw new Error('Invalid qualification operation ID');
  const dir=path.join(root,'.bgzflow','qualifications');fs.mkdirSync(dir,{recursive:true});const record=path.join(dir,request.id+'.json');
  if(fs.existsSync(record))return JSON.parse(fs.readFileSync(record,'utf8'));
  const prompt=path.join(dir,request.id+'.md');fs.writeFileSync(prompt,`SWARM: ${request.swarm||'qualification'}\nPIECE: ${request.piece||'qualification'}\nKIND: mechanical\nOWNS: []\nREAD_ONLY: true\nUNSPLIT: true\nQUALIFICATION: true\n\nRead bg-efficiency, test-driven-development, systematic-debugging, verification-before-completion. Fast checks only. Proof handback.\nThis is one small read-only model/flags qualification. No file changes, tools, external data or subtasks. Return one line confirming the effective model and effort from your job record.\n`);
  const initial={...request,status:'starting',at:new Date().toISOString()};writeAtomic(record,initial);
  try{const args=[...route.qualificationCommand.slice(1),'--prompt-file',prompt,'--model',request.setting.model];if(request.setting.effort!=='none')args.push('--effort',request.setting.effort);if(request.setting.thinking)args.push('--thinking');
    const run=runner(route.qualificationCommand[0],args,{cwd:root,encoding:'utf8',timeout:15000,maxBuffer:262144,stdio:['ignore','pipe','ignore']});let response;try{response=JSON.parse(run.stdout||'{}');}catch{response={};}
    const terminal=['completed','failed','uncertain'].includes(response.status)&&response.evidence?response:null;
    const status=terminal?.status||(run.error?'uncertain':run.status===0?'queued':'failed'),result={...initial,status,jobId:response.jobId||response.id||request.id,exitCode:run.status??null,...(terminal?{result:terminal}:{})};writeAtomic(record,result);return result;
  }catch{const result={...initial,status:'uncertain',reason:'Launch outcome uncertain; reconcile this operation ID before any retry.'};writeAtomic(record,result);return result;}
}
export function collectQualification(request,job){
  const passed=job?.status==='completed'&&job.exitCode===0&&job.model===request.setting.model&&(job.effort||'none')===request.setting.effort&&(!request.setting.thinking||job.thinking===true)&&!!job.evidence;
  return {id:request.resource,account:request.account,environment:request.environment,model:request.setting.model,effort:request.setting.effort,observed:{model:job?.model,effort:job?.effort||'none',thinking:job?.thinking===true},at:new Date().toISOString(),jobId:job?.id||request.id,result:passed?'passed':'failed',access:'Small read-only exact-flags qualification',returnRef:job?.returnRef||'',evidence:job?.evidence||''};
}
