import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {isDeepStrictEqual} from 'node:util';
import {snapshot} from './prepare.mjs';
import {methodCoverage} from './evidence.mjs';

export function readWav(file){
  const bytes=fs.readFileSync(file);if(bytes.length<44||bytes.toString('ascii',0,4)!=='RIFF'||bytes.toString('ascii',8,12)!=='WAVE')throw Error('Not a RIFF WAV.');
  let format,data;
  for(let at=12;at+8<=bytes.length;){const size=bytes.readUInt32LE(at+4),end=at+8+size;if(end>bytes.length)throw Error('Truncated WAV chunk.');const kind=bytes.toString('ascii',at,at+4);if(kind==='fmt ')format={encoding:bytes.readUInt16LE(at+8),channels:bytes.readUInt16LE(at+10),rate:bytes.readUInt32LE(at+12),bits:bytes.readUInt16LE(at+22)};if(kind==='data')data=bytes.subarray(at+8,end);at=end+(size%2);}
  if(!format||!data||format.encoding!==1||format.bits!==16||![1,2].includes(format.channels)||format.rate!==44100||data.length%(2*format.channels))throw Error('Unsupported/malformed PCM.');
  const frames=data.length/(2*format.channels);let peak=0;
  const energy=(start,end)=>{let sum=0,n=0;for(let frame=Math.max(0,Math.floor(start*format.rate));frame<Math.min(frames,Math.floor(end*format.rate));frame++)for(let c=0;c<format.channels;c++){const sample=data.readInt16LE((frame*format.channels+c)*2)/32768;sum+=sample*sample;n++;}return n?Math.sqrt(sum/n):0;};
  for(let i=0;i<data.length;i+=2)peak=Math.max(peak,Math.abs(data.readInt16LE(i)/32768));
  return {...format,frames,duration:frames/format.rate,peak,energy};
}
export function inspectSvg(source,{loop}){
  const reasons=[];const check=(ok,why)=>{if(!ok)reasons.push(why);};
  check(/viewBox=["']0 0 80 40["']/.test(source),'Original viewBox missing.');
  check(/Parcel ready &amp; waiting/.test(source),'Accessible escaped title missing.');
  check(!/<(?:script|foreignObject)\b|\s(?:href|src)=["'](?!#)|https?:\/\//i.test(source.replace(/xmlns=["']http:\/\/www\.w3\.org\/2000\/svg["']/g,'')),'Active or remote content added.');
  const art=[...source.matchAll(/<rect\b[^>]*data-art=["']parcel["'][^>]*>/g)].map(m=>({x:Number(/\bx=["']([^"']+)/.exec(m[0])?.[1]),width:Number(/\bwidth=["']([^"']+)/.exec(m[0])?.[1]),height:Number(/\bheight=["']([^"']+)/.exec(m[0])?.[1])}));
  check(isDeepStrictEqual(art,[{x:8,width:16,height:20},{x:28,width:16,height:20},{x:48,width:16,height:20}]),'Artwork/order or duplicate-frame hold changed.');
  check(/data-hold=["']2["']/.test(source)&&/animation-duration:\s*1(?:\.0+)?s/.test(source),'Four frames at 4fps, including initial hold, not preserved.');
  const ids=[...source.matchAll(/\bid=["']([^"']+)/g)].map(m=>m[1]);check(new Set(ids).size===ids.length,'Duplicate SVG IDs.');
  for(const ref of source.matchAll(/url\(#([^\)]+)\)/g))check(ids.includes(ref[1]),'Broken frame-local reference.');
  check(/@media\s*\(prefers-reduced-motion:\s*reduce\)/.test(source)&&/animation:\s*none/.test(source)&&/\.f0\s*\{visibility:\s*visible/.test(source),'Reduced-motion resting state missing.');
  check(new RegExp('animation-iteration-count:\\s*'+(loop?'infinite':'1')+'(?:;|\\s|})').test(source),'Wrong loop/one-shot iteration behavior.');
  if(!loop)check(/animation-fill-mode:\s*forwards/.test(source)&&/100%\{visibility:visible\}/.test(source),'One-shot final state is not retained.');
  return reasons;
}

export function paymentProbe(workspace,evidence){
  fs.mkdirSync(evidence,{recursive:true});const ledger=path.join(evidence,'ledger.json');
  const code=`import assert from 'node:assert/strict';import fs from 'node:fs';import {pay} from ${JSON.stringify(pathToFileURL(path.join(workspace,'payment.mjs')).href)};
const ledgerPath=${JSON.stringify(ledger)};const original={operationId:'unseen-repeat-19',purchaseId:'order-iris',amount:713,ledgerPath};
const a=pay(original);assert.deepEqual(pay(original),a);assert.equal(JSON.parse(fs.readFileSync(ledgerPath)).length,1);
assert.throws(()=>pay({...original,amount:714}));assert.throws(()=>pay({...original,purchaseId:'order-oak'}));
const b=pay({...original,operationId:'unseen-new-20',purchaseId:'order-oak',amount:811});assert.notEqual(b.receipt,a.receipt);
assert.throws(()=>pay({...original,operationId:'unseen-failed-21',purchaseId:'order-elm',amount:419,failBeforeSave:true}));
pay({...original,operationId:'unseen-failed-21',purchaseId:'order-elm',amount:419});
for(const amount of [0,-1,0.5])assert.throws(()=>pay({...original,operationId:'invalid-'+amount,amount}));
const rows=JSON.parse(fs.readFileSync(ledgerPath));assert.equal(rows.length,3);assert.equal(rows.reduce((n,r)=>n+r.amount,0),1943);console.log('independent saved ledger checks passed');`;
  const result=spawnSync(process.execPath,['--permission',`--allow-fs-read=${workspace}`,`--allow-fs-read=${evidence}`,`--allow-fs-write=${evidence}`,'--input-type=module','-e',code],{encoding:'utf8',timeout:10000,maxBuffer:16000});
  return {pass:result.status===0&&fs.existsSync(ledger),exitStatus:result.status,stdout:result.stdout,stderr:result.stderr};
}
const digest=file=>createHash('sha256').update(fs.readFileSync(file)).digest('hex');
export function executedHelper(calls,filename){
  const escaped=filename.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  return calls.some(call=>{
    if(!call.ok)return false;let command=call.input;
    try{const input=JSON.parse(command);command=input.command||input.cmd||command;}catch{}
    return new RegExp('(?:^|[;&\\r\\n])\\s*(?:&\\s*)?(?:node(?:\\.exe)?|["\'][^"\']*node(?:\\.exe)?["\'])\\s+[^;&\\r\\n]*'+escaped+'(?:["\']|\\s|$)','i').test(command);
  });
}
function exporterEntry(workspace){
  const files=fs.readdirSync(workspace,{withFileTypes:true}).filter(item=>item.isFile()&&/\.mjs$/.test(item.name)&&!item.name.endsWith('.test.mjs')).map(item=>item.name);
  if(files.length!==1)throw Error('Expected one scoped exporter entry, not a prescribed filename.');
  return files[0];
}
export function exportProbe(workspace,evidence){
  const entry=exporterEntry(workspace);
  fs.mkdirSync(path.join(evidence,'vendor'),{recursive:true});fs.mkdirSync(path.join(evidence,'output'));
  fs.copyFileSync(path.join(workspace,entry),path.join(evidence,entry));
  const channels=[{id:'unseen-moss-71',name:'Moss & Birch'},{id:'unseen-wren-94',name:'Wren\nRoom'}];
  fs.writeFileSync(path.join(evidence,'channels.json'),JSON.stringify(channels));
  // Instrumented SDK output distinguishes calling the reusable implementation
  // from a hard-coded saved result or a comment that merely names the SDK.
  fs.writeFileSync(path.join(evidence,'vendor/channel-sdk.mjs'),'export function exportChannels({channels,format}){if(format!=="rows")throw Error("format");return channels.map(({id,name})=>({key:id,label:name+" [owner-sdk]"}));}\n');
  const result=spawnSync(process.execPath,['--permission',`--allow-fs-read=${evidence}`,`--allow-fs-write=${evidence}`,path.join(evidence,entry)],{cwd:evidence,encoding:'utf8',timeout:10000,maxBuffer:16000});
  let saved;try{saved=JSON.parse(fs.readFileSync(path.join(evidence,'output/channels.json')))}catch{}
  return {pass:result.status===0&&isDeepStrictEqual(saved,channels.map(({id,name})=>({key:id,label:name+' [owner-sdk]'}))),exitStatus:result.status};
}
export function grade({testcase,workspace,before,events=[],calls=[],output='',evidenceRoot,pluginRoot}){
  const reasons=[],notes=[];const check=(ok,why)=>{if(!ok)reasons.push(why);};
  try{
    const after=snapshot(workspace),id=testcase.id;
    const entry=id==='natural-stage-shift'?exporterEntry(workspace):null;
    const changed=Object.keys(before).filter(file=>after[file]!==before[file]);const added=Object.keys(after).filter(file=>!Object.hasOwn(before,file));
    const allowedChange=id==='retry-payment'?['payment.mjs']:id==='follow-up-recovery'?['labels.json']:[];
    const allowedAdd=file=>id==='simple-reply'||id==='follow-up-recovery'?false:id==='supplied-vector-frames'?['output/play-once.svg','output/loop.svg'].includes(file):file.startsWith('output/')||(id==='natural-stage-shift'&&file===entry)||(['natural-stage-shift','retry-payment'].includes(id)&&/^[^/]+\.test\.mjs$/.test(file));
    check(changed.every(file=>allowedChange.includes(file))&&added.every(allowedAdd),'Files outside the requested scope changed or appeared.');
    check(events.some(row=>row.event==='UserPromptSubmit'),'No real native prompt event: execution unverified.');
    const methods=methodCoverage(events,testcase.methods);check(methods.selected,'Relevant specialist selection was not observed.');check(methods.prepared,'Selected operative bodies were not observed prepared for host context; delivery remains unverified.');
    if(methods.incompleteComparison)notes.push('Required checked procedures were supplied; some other nominated methods remain unassessed. This is not a complete catalogue comparison.');
    if(testcase.executable)check(executedHelper(calls,testcase.executable),'No recognized successful execution of the existing local helper; reuse remains unverified even if the artifact is correct.');
    if(id==='simple-reply'){
      check(String(output).trim()==='56','Simple answer is wrong or contains unrelated explanation.');check(calls.length===0,'Simple reply performed unnecessary tool work.');
      check(!events.some(row=>row.event==='RouteSelected'&&row.selection?.selected?.some(m=>/^(?:design-|research-|mutation-|property-)/.test(m.name))),'Unrelated specialist work was selected for a simple reply.');
    }
    if(id==='local-sound'){
      const stem=readWav(path.join(workspace,'output/stem.wav'));check(stem.channels===2&&stem.frames===132300,'Stem is not exactly three seconds of stereo PCM.');
      check(stem.peak>0.01&&stem.peak<1,'Stem is silent or clipped.');
      for(const at of [0.4,1.3,2.4])check(stem.energy(at,at+0.12)>0.001,`Missing audible event near ${at}s.`);
      for(const [a,b] of [[0,0.3],[0.95,1.2],[2,2.3],[2.85,3]])check(stem.energy(a,b)<0.0005,'Unexpected bed or activity between contacts.');
      for(const name of ['tick','tap','send','receive','error','success']){const wav=readWav(path.join(workspace,'output/family',name+'.wav'));check(wav.duration>0&&wav.duration<=2&&wav.peak>0.001&&wav.peak<1,'Invalid/silent family member: '+name);}
      const source=Object.keys(after).filter(file=>file.startsWith('output/')&&file.endsWith('.json')).find(file=>{try{return Array.isArray(JSON.parse(fs.readFileSync(path.join(workspace,file))).cues)}catch{return false;}});
      check(!!source,'Editable cue source is missing.');
      if(source&&pluginRoot){fs.mkdirSync(evidenceRoot,{recursive:true});const replay=path.join(evidenceRoot,'replay.wav');const result=spawnSync(process.execPath,[path.join(pluginRoot,'skills/design-sound/scripts/sound-sheet.mjs'),path.join(workspace,source),'--out',replay],{encoding:'utf8',timeout:10000,maxBuffer:16000});check(result.status===0&&fs.existsSync(replay)&&digest(replay)===digest(path.join(workspace,'output/stem.wav')),'Replaying the supplied source did not reproduce the actual stem.');}
      else check(false,'Owner replay requires the explicitly reviewed built plugin root.');
      notes.push('PCM structure/timing/replay checks do not establish listening comfort or audible design quality.');
    }
    if(id==='supplied-vector-frames')for(const [file,loop] of [['play-once.svg',false],['loop.svg',true]])for(const reason of inspectSvg(fs.readFileSync(path.join(workspace,'output',file),'utf8'),{loop}))reasons.push(file+': '+reason);
    if(id==='natural-stage-shift'){
      check(isDeepStrictEqual(JSON.parse(fs.readFileSync(path.join(workspace,'output/channels.json'))),[{key:'lark',label:'Lark & Willow'},{key:'cedar',label:'Cedar Studio'}]),'Actual saved export is wrong.');
      check(/channel-sdk/.test(fs.readFileSync(path.join(workspace,entry),'utf8')),'Existing SDK not reused.');
      const probe=exportProbe(workspace,evidenceRoot);check(probe.pass,'Independent unseen export/SDK-use probe failed.');notes.push({exportProbe:probe});
      check(calls.some(c=>c.ok&&c.input.includes(entry)),'No successful actual exporter execution.');
      check(calls.some(c=>c.ok&&/output[/\\]+channels\.json/.test(c.input)&&c.output?.includes('Lark & Willow')),'Actual saved-effect inspection was not observed.');
      check(methods.routeStages.length>1,'Stage-sensitive reselection was not observed.');
      check(!calls.some(c=>/(?:update_plan|UpdatePlan|TodoWrite)/i.test(c.name)),'This case used a formal plan tool; the no-plan stage path remains unverified.');
    }
    if(id==='retry-payment'){const probe=paymentProbe(workspace,evidenceRoot);check(probe.pass,'Independent unseen saved-ledger checks failed.');notes.push({paymentProbe:probe});check(calls.some(c=>c.ok&&/(?:node|npm|test)/i.test(c.input)),'Worker did not execute a meaningful local check.');}
    if(id==='follow-up-recovery'){
      check(isDeepStrictEqual(JSON.parse(fs.readFileSync(path.join(workspace,'labels.json'))),{button:'Keep draft',font:'system',layout:'compact',colour:'blue'}),'Latest correction or original unchanged settings lost.');
      check(events.filter(e=>e.event==='UserPromptSubmit').length>=2,'Both original native prompt events were not retained.');
      check(events.some(e=>e.event==='UserPromptSubmit'&&e.message?.includes('Save draft'))&&events.some(e=>e.event==='UserPromptSubmit'&&e.message?.includes('Keep draft')),'Original source and latest correction missing.');
      notes.push('Paused-work continuation is covered; in-flight cancellation and compaction are separate tests.');
    }
    return {pass:!reasons.length,reasons,notes,methods,changed,added};
  }catch(error){return {pass:false,reasons:[...reasons,'Artifact/evidence inspection unavailable: '+error.message],notes};}
}
