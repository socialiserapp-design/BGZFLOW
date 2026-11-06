import {createHash} from 'node:crypto';

const stable=value=>Array.isArray(value)?value.map(stable):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().filter(key=>value[key]!==undefined).map(key=>[key,stable(value[key])])):value;
const digest=value=>createHash('sha256').update(JSON.stringify(stable(value))).digest('hex');
const observationTimes=new Set(['at','observedAt','checkedAt','updatedAt','timestamp','observed_at','checked_at','updated_at']);
const effectiveCapabilities=value=>Array.isArray(value)?value.map(effectiveCapabilities):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).filter(([key])=>!observationTimes.has(key)).map(([key,item])=>[key,effectiveCapabilities(item)])):value;

/** A native agent plan is context, never a human request or execution authority. */
export function derivePlanStage(state={}){
  const plan=state.nativeView?.plan;
  if(!plan||plan.partial||plan.source?.kind!=='PostToolUse'||plan.hostOutcome!=='host-returned'||!Array.isArray(plan.items))return null;
  const active=plan.items.filter(item=>item.status==='in_progress'&&typeof item.text==='string'&&item.text.trim());
  if(active.length!==1)return null;
  const item=active[0],key=digest({index:item.index,text:item.text});
  return {stage:`agent-plan:${key}`,key,label:item.text,sourceEventId:plan.source?.eventId||null,context:`Agent-declared active plan step (not user authority or verified completion): ${item.text}. Select relevant methods within the original human request and latest corrections; this plan does not permit a new effect.`};
}

/** No procedure bodies or raw capability values are persisted by this helper. */
export function routingEnvironmentFingerprint({catalog=[],privateCatalog=[],capabilities={},policy={},explicitSkills=[],budget={},stage=''}={}){
  const metadata=entries=>entries.map(({id,version,name,description,origin,requiredTools,permissions,manualOnly})=>({id,version,name,description,origin,requiredTools,permissions,manualOnly})).sort((a,b)=>String(a.id).localeCompare(String(b.id)));
  return digest({catalog:metadata(catalog),privateCatalog:metadata(privateCatalog),capabilities:effectiveCapabilities(capabilities),policy,explicitSkills,budget,stage});
}

export function canReuseContinuation({request='',previous,environmentKey,stage}={}){
  return /^(?:yes|yes please|okay|ok|continue|carry on|go ahead|thanks|thank you)[.!\s]*$/i.test(request.trim())
    && ['selected','partial'].includes(previous?.status) && previous.stage===stage
    && typeof environmentKey==='string' && environmentKey.length===64
    && previous.routingEnvironmentKey===environmentKey;
}

/** Only unambiguous conversation skips discovery. A pure confirmation still
 * reaches the host and original-event record; it does not grant tool authority.
 * Mixed requests, choices, action approvals, corrections and named methods keep
 * the ordinary selection path. This never
 * skips event capture, compaction recovery or the mechanical tool checks. */
export function isConversationOnly(request='') {
  const text=request.trim().replace(/[’]/g,"'");
  // A complete, small two-operand arithmetic question needs no method router.
  // Full anchoring excludes a trailing instruction, file request or approval.
  if(/^(?:(?:what is|what's|calculate|compute)\s+)?[+-]?\d{1,15}(?:\.\d{1,10})?\s*(?:\+|-|\*|\/|×|÷|plus|minus|times|multiplied by|divided by)\s*[+-]?\d{1,15}(?:\.\d{1,10})?\s*[?!.]?(?:\s+just (?:the )?answer(?:,? please)?[.!]?)?$/i.test(text))return true;
  if(/[\n\r<>/\\{}\[\]$]/.test(text))return false;
  if(/^(?:hi|hello|hey|thanks|thank you|many thanks|thanks a lot)[.!\s]*$/i.test(text))return true;
  if(/^(?:(?:yes|yeah|yep)[,.!]?\s+)?(?:that(?:'s| is) (?:right|correct)|exactly|correct)[.!\s]*$/i.test(text))return true;
  if(/^(?:any (?:news|update|updates|progress)|what(?:'s| is) (?:the status|happening|taking so long)|are you still (?:there|working)|how(?:'s| is) it going)[?!.\s]*$/i.test(text))return true;
  return /^why (?:are you|is (?:claude|the assistant)) (?:taking so long|so slow)(?: (?:just )?(?:to (?:reply|respond|answer(?: me)?|ask(?: me)? questions)(?: or do anything)?|(?:with|on) (?:simple|basic) (?:replies|questions|stuff)))?(?:[,!.?\s]*(?:it'?s|this is) (?:(?:really|so|fucking) )?annoying)?[?!.\s]*$/i.test(text);
}

export function needsStageSelection({state,environmentKey}={}){
  const stage=derivePlanStage(state);
  if(!stage)return null;
  return state.selection?.stage===stage.stage&&state.selection?.routingEnvironmentKey===environmentKey?null:stage;
}
