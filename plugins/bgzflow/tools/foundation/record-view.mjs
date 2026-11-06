import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { writablePath, writeOwnedFile } from '../../hooks/lib/owned-path.mjs';
import {isHumanSource} from './message-origin.mjs';

const digest = value => createHash('sha256').update(String(value)).digest('hex');
const eventName = /^[0-9TZ]+-[a-f0-9-]{36}\.json$/;
const keyName = /^[a-f0-9]{64}$/;
const limit = { entries: 4096, records: 1024, bytes: 8 * 1024 * 1024, cache: 1024 * 1024, items: 40 };
const compare = (a,b) => a.at.localeCompare(b.at) || (BigInt(a.order||0)<BigInt(b.order||0)?-1:BigInt(a.order||0)>BigInt(b.order||0)?1:0) || a.id.localeCompare(b.id);
const fingerprint = dir => { const stat=fs.statSync(dir,{bigint:true});return `${stat.dev}:${stat.ino}:${stat.mtimeNs}:${stat.ctimeNs}`; };
const source = event => ({ eventId:event.id, fileName:event.fileName, at:event.at, kind:event.event });
const bounded = value => typeof value==='string'?value.slice(0,2000):'';
const empty = loc => ({schema:5,sourceDirectory:loc.dir,projectRoot:loc.projectRoot,sessionKey:loc.sessionKey,sessionId:loc.sessionId||'',sessionLinkKey:'',firstHuman:null,humanMessages:[],assistantMessages:[],questions:[],unlinkedAnswers:[],assignments:[],followups:[],operations:[],workers:[],plan:null,proposedPlan:null,pendingPlans:[],handledPlans:[],planCoverage:null,wrapUp:null,selection:null,methodContext:null,summary:null,application:null,lifecycle:null,lastEvent:null,partial:false,gaps:[],appliedNames:[],fingerprint:''});

function upsert(list,key,value) {
  const index=list.findIndex(item=>item.key===key);
  if(index<0)list.push({key,...value});else list[index]={...list[index],...value};
}
function applyPlanOperation(view,event,ref) {
  const operation=event.planOperation||(event.plan?{...event.plan,kind:event.plan.items.length?'replace':'unknown'}:null);
  if(!operation)return;
  const key=event.tool?.key||`uncorrelated:${event.id}`;
  if(view.handledPlans.includes(key))return;
  const pending=view.pendingPlans.find(item=>item.key===key);
  const hostOutcome=typeof event.tool?.exitCode==='number'&&event.tool.exitCode!==0?'host-reported-error':event.tool?.outcome;
  if(event.event==='PreToolUse'){
    if(!pending)view.pendingPlans.push({key,operation,source:ref,base:view.plan?.source.eventId||null,lineage:view.plan?.lineage||null});
    view.proposedPlan={...operation,source:ref,hostOutcome,toolKey:key};return;
  }
  const op=pending?.operation||operation;
  view.handledPlans.push(key);view.pendingPlans=view.pendingPlans.filter(item=>item.key!==key);
  const uncertain=reason=>{
    view.planCoverage={status:'uncertain',reason,source:ref};view.partial=true;view.gaps.push('A recorded plan operation could not be reconciled; inspect current plan coverage for its present status.');
    if(view.plan)view.plan={...view.plan,partial:true,evidence:'Last acknowledged plan is historical; a later operation could not be safely reconciled.'};
    view.proposedPlan={...op,source:ref,hostOutcome,toolKey:key};
  };
  if(event.event!=='PostToolUse'||hostOutcome!=='host-returned'){
    view.proposedPlan={...op,source:ref,hostOutcome,toolKey:key};return;
  }
  if(pending&&operation.kind!=='unknown'&&JSON.stringify(operation)!==JSON.stringify(pending.operation))return uncertain('The successful plan result supplied different arguments from its original request.');
  if(op.kind==='wrap-up'){
    view.wrapUp={recap:op.recap,ask:op.ask,actions:op.actions||[],blocked:op.blocked,source:ref,verified:false,classification:'Agent-reported recap/question/waiting status, not user permission or proof.'};
    if(op.ask)view.questions.push({key:`${key}:wrap-up`,toolKey:key,questionId:'wrap-up',questionKey:'',index:0,text:op.ask,options:op.actions||[],source:ref,status:'unanswered'});
  }
  if(op.kind==='unknown')return uncertain('A successful native plan operation was unsupported or ambiguous; the current plan is uncertain.');
  const current=view.plan;
  if(pending&&pending.base!==(current?.source.eventId||null)&&!(op.kind==='wrap-up'&&pending.lineage&&pending.lineage===current?.lineage))return uncertain('A successful native plan operation used an older plan revision; current plan order is uncertain.');
  let items;
  if(op.kind==='replace'){
    items=op.items||[];
    if(items.filter(item=>item.status==='in_progress').length>1)return uncertain('The acknowledged plan contains more than one active step.');
  }else{
    if(!pending)return uncertain('A successful incremental plan operation has no matching original request.');
    if(op.kind==='wrap-up'){
      if(!current){view.planCoverage={status:'no-plan',source:ref};view.proposedPlan=null;return;}
    }
    if(!current||current.partial)return uncertain('An incremental plan operation has no complete acknowledged base plan.');
    items=current.items.map(item=>({...item}));
    if(op.kind==='advance'){
      const active=items.filter(item=>item.status==='in_progress');
      if(active.length!==1)return uncertain('Advance requires exactly one known active plan step.');
      active[0].status='completed';const next=items.find(item=>item.index>active[0].index&&item.status==='pending');if(next)next.status='in_progress';
    }else if(op.kind==='indexed'){
      if((op.done||[]).some(n=>n>items.length)||(op.start!==undefined&&op.start>items.length))return uncertain('A native plan operation referenced a step outside the acknowledged list.');
      for(const n of op.done||[])items[n-1].status='completed';
      if(op.start!==undefined){if(items[op.start-1].status==='completed'||items.some((item,index)=>index!==op.start-1&&item.status==='in_progress'))return uncertain('Start conflicts with the acknowledged active/completed plan state.');items[op.start-1].status='in_progress';}
    }else if(op.kind==='wrap-up')for(const item of items)item.status='completed';
  }
  view.plan={...op,items,source:ref,requestSource:pending?.source,correlation:pending?'matched-original-request':'full-snapshot-in-host-result-envelope',toolKey:key,hostOutcome,lineage:op.kind==='replace'?event.id:current?.lineage,partial:Boolean(op.partial),reportedComplete:!op.partial&&items.length>0&&items.every(item=>item.status==='completed'),verified:false,evidence:'Acknowledged agent-reported plan/todo status only; no user outcome verified.'};
  view.planCoverage={status:op.partial?'partial':'acknowledged',source:ref};view.proposedPlan=null;
  if(op.partial){view.partial=true;view.gaps.push('Some reported plan items or options were omitted; complete coverage is unknown.');}
}
function apply(view,event) {
  const ref=source(event);
  view.sessionId=event.sessionId;view.sessionLinkKey=event.sessionLinkKey||view.sessionLinkKey;
  if(isHumanSource(event)) {
    const item={text:bounded(event.message),truncated:event.message.length>2000||event.messageTruncated===true,redacted:event.messageRedacted===true,source:ref};
    view.firstHuman ||= item;view.humanMessages.push(item);
    if(item.truncated){view.partial=true;view.gaps.push('Some human text is shortened; recover its original source before relying on completeness.');}
  }
  if(typeof event.assistantMessage==='string'){
    view.assistantMessages.push({text:bounded(event.assistantMessage),truncated:event.assistantMessage.length>2000||event.assistantMessageTruncated,source:ref,classification:'Quoted assistant text, not human instruction or verified state.'});
    view.assistantCoverage={source:ref,captured:true};
  }else if(['Stop','SubagentStop'].includes(event.event))view.assistantCoverage={source:ref,captured:false,reason:'Host supplied no assistant final text; ordinary-prose questions may be absent.'};
  if(event.questionnaire) {
    const toolKey=event.tool?.key;
    if(toolKey)for(const [index,question] of event.questionnaire.questions.entries()){
      const key=`${toolKey}:${question.key||question.id}`,existing=view.questions.find(q=>q.key===key),same=existing?.text===question.text;
      upsert(view.questions,key,{toolKey,questionId:question.id,questionKey:question.key||'',index:question.index??index,text:question.text,source:same?existing.source:ref,status:same?existing.status:'unanswered',...(same&&existing.answer?{answer:existing.answer}:{})});
    }
    for(const answer of event.questionnaire.answers) {
      const question=view.questions.find(q=>q.toolKey===toolKey&&((answer.key&&q.questionKey===answer.key)||q.questionId===answer.id));
      if(question){question.status='answered';question.answer={text:answer.text,source:ref};}else view.unlinkedAnswers.push({text:answer.text,questionId:answer.id,source:ref});
    }
    if(event.questionnaire.partial){view.partial=true;view.gaps.push('Some native questions or answers were omitted by capture limits.');}
  }
  for(const answer of event.nativeAnswers||[]) {
    const question=view.questions.find(q=>q.toolKey===answer.toolKey&&q.index===answer.index&&q.text===answer.question);
    if(question){question.status='answered';question.answer={text:answer.text,source:ref};}
    else view.unlinkedAnswers.push({text:answer.text,question:answer.question,source:ref});
  }
  applyPlanOperation(view,event,ref);
  if(event.assignment) {
    const key=event.tool?.key||`assignment:${event.id}`;
    const existing=view.assignments.find(item=>item.key===key);
    upsert(view.assignments,key,{description:bounded(event.assignment.description)||existing?.description||'',instruction:bounded(event.assignment.instructions)||existing?.instruction||'',assignee:event.assignment.assignee||existing?.assignee||'',childKey:event.assignment.childKey||existing?.childKey||'',childId:event.assignment.childId||existing?.childId||'',source:existing?.source||ref,...(event.assignment.childKey?{childSource:ref}:{}),verified:false,evidence:'Recorded assignment, not proof of execution or completion.'});
  }
  if(event.followup){
    const candidates=view.assignments.filter(item=>item.childKey===event.followup.targetKey||item.childId===event.followup.target||item.description===event.followup.target);
    const owner=candidates.length===1?candidates[0]:null;
    upsert(view.followups,event.tool?.key||`followup:${event.id}`,{target:event.followup.target,assignmentKey:owner?.key||null,text:event.followup.message,status:event.followup.outcome==='requested'?'requested':event.followup.outcome==='host-reported-error'?'host-reported-error':'host-returned',source:ref,verified:false,evidence:event.followup.evidence});
  }
  if(event.tool) {
    if(event.tool.key) {
      const key=event.tool.key,item=view.operations.find(row=>row.key===key)||{key,name:event.tool.name,request:null,result:null};
      if(event.tool.file)item.file=event.tool.file;
      if(event.event==='PreToolUse')item.request={source:ref};
      else item.result={source:ref,outcome:event.tool.outcome,exitCode:event.tool.exitCode};
      item.status=item.request&&!item.result?'unresolved-recorded-request':'host-returned';
      item.verified=false;item.evidence='Host event only; reconcile actual effects before retry or a success claim.';
      upsert(view.operations,key,item);
    } else if(event.tool.id){view.partial=true;view.gaps.push('An older tool identity cannot be safely matched.');}
  }
  if(event.agent)upsert(view.workers,event.agent.key||`worker:${event.id}`,{id:event.agent.id,type:event.agent.type,state:event.event==='SubagentStop'?'stopped':'started',source:ref,verified:false,evidence:'Stopped does not mean finished or successful.'});
  if(event.foundation)view.application={source:ref,request:event.foundation.request,questions:event.foundation.questions,decisions:event.foundation.decisions,assignments:event.foundation.assignments,outcomes:event.foundation.outcomes,partial:event.foundation.partialView===true,classification:'Application-confirmed/interpreted state; separate from raw human authority.'};
  if(event.selection)view.selection={stage:event.selection.stage,status:event.selection.status,routingEnvironmentKey:event.selection.routingEnvironmentKey||'',source:ref};
  if(event.delivery)view.methodContext={source:ref,...event.delivery};
  if(typeof event.summary==='string')view.summary={text:bounded(event.summary),source:ref,classification:'Host summary; subordinate to original human messages and actual observations.'};
  if(['SessionStart','SessionEnd','Stop'].includes(event.event))view.lifecycle={event:event.event,source:ref,evidence:'Session lifecycle only; jobs and external effects may remain unresolved.'};
  view.lastEvent={...ref,order:event.order||'0'};
}
function trim(view) {
  if(view.pendingPlans.length>40){view.pendingPlans=view.pendingPlans.slice(-40);view.partial=true;view.gaps.push('Some pending plan operations are outside the bounded view.');}
  if(view.handledPlans.length>1024)view.handledPlans=view.handledPlans.slice(-1024);
  for(const field of ['humanMessages','assistantMessages','questions','unlinkedAnswers','assignments','followups','operations','workers']) {
    if(view[field].length<=limit.items)continue;
    // Keep unanswered questions and unmatched operations first; all originals remain.
    if(field==='questions')view[field].sort((a,b)=>(a.status==='unanswered')-(b.status==='unanswered'));
    if(field==='operations')view[field].sort((a,b)=>(a.status==='unresolved-recorded-request')-(b.status==='unresolved-recorded-request'));
    view[field]=view[field].slice(-limit.items);view.partial=true;view.gaps.push(`Some ${field} are outside this bounded view; consult original source events.`);
  }
  view.gaps=[...new Set(view.gaps)].slice(0,20);
  if(view.application&&JSON.stringify(view.application).length>32000){view.application={source:view.application.source,classification:view.application.classification,partial:true};view.partial=true;view.gaps.push('Application state is too large for this view; recover its original event.');}
  return view;
}

export function listRecordSourceNames(dir) {
  writablePath(dir,{directory:true});
  const handle=fs.opendirSync(dir),names=[];let count=0;
  // Retain the newest names in a bounded min-heap while streaming the directory.
  // Stopping at an arbitrary directory prefix can permanently hide new events.
  const add=name=>{if(names.length<limit.entries){names.push(name);let i=names.length-1;while(i>0){const parent=(i-1)>>1;if(names[parent]<=names[i])break;[names[parent],names[i]]=[names[i],names[parent]];i=parent;}}else if(name>names[0]){names[0]=name;let i=0;while(true){const left=i*2+1,right=left+1;if(left>=names.length)break;const child=right<names.length&&names[right]<names[left]?right:left;if(names[i]<=names[child])break;[names[i],names[child]]=[names[child],names[i]];i=child;}}};
  try {let entry;while((entry=handle.readSync()))if(entry.isFile()&&eventName.test(entry.name)){count++;add(entry.name);}}
  finally{handle.closeSync();}
  return {names:names.sort(),partial:count>limit.entries};
}
function readSource(loc,name,budget) {
  const file=path.join(loc.dir,name);writablePath(file);
  const stat=fs.statSync(file);if(stat.size>3*1024*1024||stat.size>budget.bytes)throw Error('Record read limit.');budget.bytes-=stat.size;
  const event=JSON.parse(fs.readFileSync(file,'utf8'));
  if(event.schema!==1||event.projectRoot!==loc.projectRoot||event.sessionKey!==loc.sessionKey||typeof event.id!=='string'||typeof event.at!=='string'||!Number.isFinite(Date.parse(event.at))||(event.order!==undefined&&!/^\d{1,30}$/.test(event.order))||`${event.at.replace(/[^0-9TZ]/g,'')}-${event.id}.json`!==name)throw Error('Mismatched event.');
  return {...event,fileName:name};
}
function cacheFile(loc){return path.join(path.dirname(loc.dir),'record-view.json');}
function readCache(loc) {
  try {
    const file=cacheFile(loc);writablePath(file);if(fs.statSync(file).size>limit.cache)return null;
    const value=JSON.parse(fs.readFileSync(file,'utf8'));
    if(value.cacheDigest!==digest(JSON.stringify({...value,cacheDigest:undefined})))return null;
    if(value.schema!==5||value.sourceDirectory!==loc.dir||value.projectRoot!==loc.projectRoot||value.sessionKey!==loc.sessionKey||!Array.isArray(value.sourceNames)||value.sourceNames.some(name=>!eventName.test(name))||!Array.isArray(value.appliedNames)||value.appliedNames.some(name=>!eventName.test(name))||!['humanMessages','assistantMessages','questions','unlinkedAnswers','assignments','followups','operations','workers','gaps','pendingPlans','handledPlans'].every(key=>Array.isArray(value[key])))return null;
    const checkRefs=item=>{if(!item||typeof item!=='object')return true;if(item.fileName&&(!eventName.test(item.fileName)||(!value.appliedNames.includes(item.fileName)&&!fs.existsSync(path.join(loc.dir,item.fileName)))))return false;return Object.values(item).every(child=>typeof child!=='object'||checkRefs(child));};
    return checkRefs(value)?value:null;
  }catch{return null;}
}

/** A cache is accepted only against the source directory identity. No lock file
 * survives a crash. Concurrent atomic cache writes may replace one another, but
 * a stale generation never passes source-fingerprint validation on the next read.
 */
export function readRecordView(loc,{ captured, force=false, recoveredEvents=[] }={}) {
  let view=empty(loc);
  try {
    const before=fingerprint(loc.dir),cached=readCache(loc);
    if(!force&&cached?.fingerprint===before)return cached;
    const listing=listRecordSourceNames(loc.dir),names=listing.names;
    const priorNames=new Set(cached?.sourceNames||[]),currentNames=new Set(names);
    const added=cached?names.filter(name=>!priorNames.has(name)):[];
    const removed=cached?cached.appliedNames.some(name=>!currentNames.has(name)&&!fs.existsSync(path.join(loc.dir,name))):false;
    const canAppend=captured&&cached&&!removed&&added.length===1&&added[0]===path.basename(captured.file)&&(!cached.lastEvent||compare(captured.event,{...cached.lastEvent,id:cached.lastEvent.eventId})>=0);
    if(canAppend){view=cached;apply(view,{...captured.event,fileName:path.basename(captured.file)});view.appliedNames.push(path.basename(captured.file));if(view.appliedNames.length>limit.entries){view.appliedNames=view.appliedNames.slice(-limit.entries);view.partial=true;}}
    else {
      const selected=names.slice(-limit.records),budget={bytes:limit.bytes},events=[];
      if(listing.partial||selected.length<names.length){view.partial=true;view.gaps.push('Some source history is outside the bounded rebuild.');}
      const recovered=new Map(recoveredEvents.filter(event=>event.projectRoot===loc.projectRoot&&event.sessionKey===loc.sessionKey&&path.dirname(event.file||'')===loc.dir&&`${event.at?.replace(/[^0-9TZ]/g,'')}-${event.id}.json`===path.basename(event.file||'')).map(event=>[path.basename(event.file),event]));
      for(const name of selected){try{const prior=recovered.get(name);events.push(prior?{...prior,fileName:name}:readSource(loc,name,budget));}catch{view.partial=true;view.gaps.push('Some source events were unreadable, unsafe or outside the read budget.');}}
      if(captured&&!events.some(item=>item.id===captured.event.id)){events.push({...captured.event,fileName:path.basename(captured.file)});view.partial=true;view.gaps.push('The latest captured event was included beyond the bounded source window.');}
      events.sort(compare);for(const event of events)apply(view,event);view.appliedNames=events.map(event=>event.fileName);
    }
    view.sourceNames=names;view.fingerprint=before;trim(view);
    if(fingerprint(loc.dir)!==before){view.partial=true;view.gaps.push('Source events changed during recovery; refresh before relying on completeness.');view.fingerprint='interrupted';return view;}
    view.cacheDigest=digest(JSON.stringify({...view,cacheDigest:undefined}));
    if(JSON.stringify(view).length<=limit.cache){try{writeOwnedFile(cacheFile(loc),JSON.stringify(view));}catch{view.gaps.push('Derived cache could not be saved; original events remain available.');}}
    return view;
  }catch{return {...view,partial:true,gaps:['Native source history is missing or unsafe to read.']};}
}

/** Derive the project list, never update a shared mutable task board/index. */
export function readProjectRecordViews({projectRoot,sessionId},options={}) {
  projectRoot=fs.realpathSync.native(projectRoot);
  const root=path.resolve(options.storageRoot||process.env.BGZFLOW_CONTINUITY_HOME||path.join(os.homedir(),'.bgzflow','continuity'));
  const directory=path.join(root,digest(projectRoot)),sessions=[];let partial=false,current=null,total=0;
  try {
    writablePath(directory,{directory:true});
    const handle=fs.opendirSync(directory);
    try{let entry;while((entry=handle.readSync()))if(entry.isDirectory()&&keyName.test(entry.name)){const dir=path.join(directory,entry.name,'events');try{writablePath(dir,{directory:true});const item={dir,projectRoot,sessionKey:entry.name,at:fs.statSync(dir).mtimeMs};total++;if(entry.name===digest(sessionId||''))current=item;sessions.push(item);sessions.sort((a,b)=>b.at-a.at||a.sessionKey.localeCompare(b.sessionKey));if(sessions.length>12)sessions.pop();}catch{partial=true;}}}finally{handle.closeSync();}
    if(total>12)partial=true;
    if(current&&!sessions.some(item=>item.sessionKey===current.sessionKey)){sessions.pop();sessions.push(current);}
    return {projectRoot,partial,sessions:sessions.map(loc=>({...readRecordView(loc),isCurrentSession:loc.sessionKey===digest(sessionId||'')})),scope:'Recorded sessions remain separate; no automatic semantic task merge or exclusive ownership claim.'};
  }catch{return {projectRoot,partial:true,sessions:[],scope:'Project source history is missing or unsafe.'};}
}

export function renderRecordView(view,{maxChars=5000,includeHuman=true}={}) {
  const location=ref=>ref?`${ref.at}; original event ${path.join(view.sourceDirectory||'',ref.fileName)}`:'';
  const lines=['Automatically maintained native record view. Human quotations are sources; agent plans and tool returns do not establish permission or verified completion.'];
  if(view.partial)lines.push(`PARTIAL: ${view.gaps.join(' ')}`);
  // Each category gets a bounded excerpt so a long quotation cannot consume
  // the entire restoration or silently hide pending work. Never cut a quote
  // without labelling the excerpt and retaining its original source pointer.
  const humanLines=[];
  if(includeHuman&&view.firstHuman&&!view.firstHuman.truncated)humanLines.push(`First available human source (${location(view.firstHuman.source)}): ${view.firstHuman.text}`);
  if(includeHuman)for(const item of view.humanMessages.slice(-8)){if(item.truncated&&item!==view.humanMessages.at(-1))continue;humanLines.push(`Human source (${location(item.source)}${item.truncated?'; PARTIAL source text':''}): ${item.text}`);}
  const assistantLines=[];
  for(const item of view.assistantMessages.slice(-2))assistantLines.push(`Quoted assistant source (${location(item.source)}${item.truncated?'; partial text':''}): ${item.text}. This is not a human instruction, answered-decision record or proof of completion.`);
  if(view.assistantCoverage?.captured===false)lines.push(view.assistantCoverage.reason);
  for(const q of view.questions.filter(item=>item.status==='unanswered').slice(-8))lines.push(`Unanswered captured question (${location(q.source)}): ${q.text}${q.options?.length?`; agent-proposed buttons: ${JSON.stringify(q.options)}`:''}`);
  for(const q of view.questions.filter(item=>item.status==='answered').slice(-8))lines.push(`Captured answer: ${q.text} â†’ ${q.answer.text} (${location(q.answer.source)}). No additional decision or authority inferred.`);
  for(const item of view.unlinkedAnswers.slice(-4))lines.push(`Unlinked captured reply (${location(item.source)}): ${item.question||item.questionId||''} ${item.text}; no question or decision association inferred.`);
  for(const task of view.assignments.slice(-5))lines.push(`Declared assignment to ${task.assignee||'agent'}${task.childId?`; child ${task.childId}`:''}: ${task.description}; ${task.instruction} (${location(task.source)}). Execution/completion unverified.`);
  for(const item of (view.followups||[]).slice(-5))lines.push(`Agent-authored follow-up to ${item.target}${item.assignmentKey?' on its recorded assignment':''}: ${item.text}; ${item.status} (${location(item.source)}). Delivery into worker context and completed work are not established by this return; preserve the original assignment and reconcile before replay.`);
  if(view.methodContext?.partial)lines.push('Some selected procedure bodies were not prepared within the operator-configured context budget. Load the omitted instructions before dependent work; selection alone is not use.');
  for(const op of view.operations.filter(item=>item.status==='unresolved-recorded-request').slice(-8))lines.push(`Unresolved recorded operation ${op.name} (${location(op.request.source)}). Reconcile effects before retry; stopped sessions do not close it.`);
  for(const worker of view.workers.slice(-4))lines.push(`Worker ${worker.id||worker.type}: ${worker.state}; completion unverified (${location(worker.source)}).`);
  if(view.plan)lines.push(`Agent-reported plan (${location(view.plan.source)}; verified:false): ${JSON.stringify(view.plan.items)}. ${view.plan.evidence}`);
  if(view.planCoverage?.status==='uncertain')lines.push(`Current plan coverage is uncertain (${location(view.planCoverage.source)}): ${view.planCoverage.reason}`);
  if(view.proposedPlan)lines.push(`Proposed, failed or uncertain plan update (${location(view.proposedPlan.source)}; ${view.proposedPlan.hostOutcome||'unconfirmed'}): ${view.proposedPlan.kind||'replace'} ${JSON.stringify(view.proposedPlan.items||[])}. This is not a fresh acknowledged plan.`);
  if(view.wrapUp)lines.push(`Agent wrap-up report (${location(view.wrapUp.source)}; verified:false): ${view.wrapUp.recap}. ${view.wrapUp.blocked===true?'Agent reports waiting for an answer; this does not change goal status.':''}`);
  if(view.summary)lines.push(`Host summary, not new authority (${location(view.summary.source)}): ${view.summary.text}`);
  if(view.application)lines.push(`Separate application-linked state (${location(view.application.source)}): ${JSON.stringify(view.application).slice(0,1500)}`);
  const header=lines.shift();
  const buckets=[
    lines.filter(line=>line.startsWith('Unresolved recorded operation')),
    lines.filter(line=>line.startsWith('Agent-reported plan')),
    includeHuman?humanLines.slice(-1):[],
    lines.filter(line=>line.startsWith('Unanswered captured question')),
    lines.filter(line=>line.startsWith('Declared assignment')),
    assistantLines.slice(-1),
    lines.filter(line=>!['Unresolved recorded operation','Agent-reported plan','Unanswered captured question','Declared assignment'].some(prefix=>line.startsWith(prefix))),
    humanLines.slice(0,-1),assistantLines.slice(0,-1),
  ];
  const notice='[PARTIAL rendered excerpts; omitted or shortened text remains in the original source events. No supersession or completion is inferred.]';
  const out=[header];let remaining=Math.max(0,maxChars-header.length-notice.length-4),omitted=includeHuman&&view.humanMessages.length>8;
  const perCategory=Math.max(180,Math.floor(remaining/Math.max(1,buckets.filter(bucket=>bucket.length).length)));
  for(const bucket of buckets){if(!bucket.length)continue;let allocation=Math.min(remaining,perCategory),used=0;
    // Most recent item first within a category, retaining whole source pointer.
    for(const line of [...bucket].reverse()){
      const allowance=allocation-used-2;if(allowance<120){omitted=true;break;}
      let excerpt=line;if(excerpt.length>allowance){excerpt=excerpt.slice(0,Math.max(0,allowance-30))+' [PARTIAL source excerpt]';omitted=true;}
      out.push(excerpt);used+=excerpt.length+2;
    }remaining-=used;
  }
  if(omitted)out.push(notice);
  return out.join('\n\n');
}
