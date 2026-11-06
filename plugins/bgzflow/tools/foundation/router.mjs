import { createHash } from 'node:crypto';
import { readSkill } from './catalog.mjs';
import { createJevDecider, sanitizeRoutingData, routingRequestBytes } from './jev-provider.mjs';
import { explicitSkillRequests, matchesSkillRequest } from './explicit-skills.mjs';
import {routingFailure} from './routing-diagnostics.mjs';
const readCandidate = entry => typeof entry.privateBody === 'string' ? { ...entry, body: entry.privateBody } : readSkill(entry);

function stable(value) { if (Array.isArray(value)) return value.map(stable); if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map((k) => [k, stable(value[k])])); return value; }
const keyFor = (value) => createHash('sha256').update(JSON.stringify(stable(value))).digest('hex');
const strategies = new Set(['single', 'parallel', 'independent-check']);

/** Pure selection state: callers keep it per session. Never authorizes execution or marks work done. */
export async function selectRoute({ request = '', stage = 'work', taskContext = {}, catalog = [], availableModels = [], explicitSkills = [], previous, budget = {}, policy = {}, signal } = {}, { decide = createJevDecider() } = {}) {
  const started=performance.now();
  let failureCode;
  const phaseWork=Object.fromEntries(['rank','verify','complement'].map(phase=>[phase,{calls:0,candidates:0,callMs:0}]));
  const diagnostics=()=>({elapsedMs:Math.round((performance.now()-started)*1000)/1000,phases:structuredClone(phaseWork),...(failureCode?{failureCode}:{})});
  const models = availableModels.filter((m) => m && typeof m.id === 'string' && m.available !== false && m.authorized !== false && (m.capacity === undefined || m.capacity > 0));
  const requestedNames = new Set([...explicitSkills,...explicitSkillRequests(request)]);
  const cacheKey = keyFor({ request, stage, taskContext, catalog: catalog.map(({ id, version, name, origin, manualOnly, requiredTools, permissions }) => ({ id, version, name, origin, manualOnly, requiredTools, permissions })), models, explicitSkills:[...requestedNames], budget, policy });
  const byId = new Map(catalog.map((c) => [c.id, c]));
  if (previous?.cacheKey === cacheKey && ['selected','partial'].includes(previous.status) && previous.selected.every((e) => byId.has(e.id))) return { ...previous, selected: previous.selected.map((e) => byId.get(e.id)), reused: true,calls:0,diagnostics:diagnostics() };
  const explicit = [];
  const missing = [];
  for (const name of requestedNames) {
    const matches = catalog.filter((c) => matchesSkillRequest(c,name));
    if (matches.length === 1) explicit.push(matches[0]); else missing.push({ skill: name, reason: matches.length ? 'ambiguous-name-use-source-id' : 'not-in-catalogue' });
  }
  const unique = (entries) => [...new Map(entries.map((e) => [e.id, e])).values()];
  const eligible = catalog.filter((e) => !e.manualOnly || policy.allowManualSkills === true || explicit.some((x) => x.id === e.id));
  const base = { selected: unique(explicit), explicitIds: unique(explicit).map(entry => entry.id), strategy: 'single', modelChoices: [], missing, cacheKey };
  // A failed/incomplete model selection never turns inferred candidates into
  // user-requested methods. Keep useful leads separately for the main agent.
  let provisional = [];
  let checked=[];
  let pendingComparisons=[];
  const deferred=new Map();
  const deferredEntries=()=>[...deferred].map(([id,reason])=>({id,name:byId.get(id)?.name,path:byId.get(id)?.path,reason}));
  const fallback = (reason) => {
    if(checked.length)for(const entry of [...provisional,...pendingComparisons])if(!checked.some(method=>method.id===entry.id))deferred.set(entry.id,'Supporting comparison did not finish; main-agent fit assessment remains required.');
    return { ...base, ...(checked.length?{selected:unique([...base.selected,...checked])}:{}), provisional:unique([...provisional.filter(entry=>!checked.some(method=>method.id===entry.id)),...[...deferred.keys()].map(id=>byId.get(id))]), ...(deferred.size?{comparisonDeferred:deferredEntries()}:{}), status: checked.length?'partial':'fallback', reason, calls,diagnostics:diagnostics(), next: 'Checked methods supply expertise, not permission or a success verdict. The main agent assesses remaining nominees against the actual task.' };
  };
  const context = sanitizeRoutingData({ request, stage, taskContext, policy });
  const batchSize = Math.min(200, Math.max(1, budget.batchSize || 200));
  const maxCalls = Math.max(1, budget.maxCalls || 64);
  const timeoutMs = Math.max(50, budget.timeoutMs || 15000);
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal?.aborted) controller.abort(); else signal?.addEventListener('abort', abort, { once: true });
  const timer = setTimeout(abort, timeoutMs);
  let calls = 0;
  async function invoke(phase, candidates, selected = []) {
    if (controller.signal.aborted) throw new Error('routing-cancelled-or-timed-out');
    if (calls >= maxCalls) throw new Error('routing-call-budget-reached');
    calls++;
    const callStarted=performance.now();
    phaseWork[phase].calls++;
    phaseWork[phase].candidates+=candidates.length;
    const safeCandidates = candidates.map((candidate) => ({ ...sanitizeRoutingData(candidate), id: candidate.id }));
    const safeModels = models.map((model) => ({ ...sanitizeRoutingData(model), id: model.id }));
    const safeSelected = selected.map((entry) => ({ ...sanitizeRoutingData(entry), id: entry.id }));
    const promise = Promise.resolve().then(() => decide({ phase, context, candidates: safeCandidates, selected: safeSelected, availableModels: safeModels, signal: controller.signal }));
    let cancel;
    const stopped = new Promise((_, reject) => { cancel = () => reject(new Error('routing-cancelled-or-timed-out')); controller.signal.addEventListener('abort', cancel, { once: true }); });
    try {
      const result = await Promise.race([promise, stopped]);
      if (!result || !Array.isArray(result.selectedIds)) throw new Error('malformed-routing-response');
      const allowed = new Set(candidates.map((c) => c.id));
      if (result.selectedIds.some((id) => !allowed.has(id)) || (result.primaryId && !allowed.has(result.primaryId)) || result.ranks?.some((r) => !allowed.has(r.id) || !Number.isFinite(r.score))) throw new Error('out-of-catalogue-routing-response');
      return result;
    } finally { controller.signal.removeEventListener('abort', cancel);phaseWork[phase].callMs+=Math.round((performance.now()-callStarted)*1000)/1000; }
  }
  try {
    if (policy.allowRemoteSelection === false || policy.offline === true) return fallback('Remote selection is disabled by the trusted task/host policy; use the main agent and local catalogue.');
    const ranked = [];
    const batches = [];
    let pending = [], pendingBytes = 0;
    for (const { id, name, description, origin, requiredTools, permissions } of eligible) {
      const metadata = { id, name, description, origin, requiredTools, permissions };
      const bytes = Buffer.byteLength(JSON.stringify(metadata), 'utf8');
      if (pending.length && (pending.length >= batchSize || pendingBytes + bytes > 45000)) { batches.push(pending); pending = []; pendingBytes = 0; }
      pending.push(metadata); pendingBytes += bytes;
    }
    if (pending.length) batches.push(pending);
    const batchResults = new Array(batches.length);
    let cursor = 0;
    await Promise.all(Array.from({ length: Math.min(batches.length, Math.max(1, Math.min(8, budget.concurrency || 3))) }, async () => {
      while (cursor < batches.length) {
        const index = cursor++;
        batchResults[index] = await invoke('rank', batches[index]);
      }
    }));
    for (const result of batchResults) {
      const scores = new Map((result.ranks || []).map((r) => [r.id, r.score]));
      // A nominated primary also reaches instruction comparison; the score and
      // the categorical judgment can disagree without silently losing it.
      ranked.push(...[...new Set([...result.selectedIds,...(result.primaryId?[result.primaryId]:[])])].map((id) => ({ id, score: scores.get(id) ?? 1 })));
    }
    const shortlist = ranked.sort((a, b) => b.score - a.score).map((r) => byId.get(r.id));
    const rich = new Map();
    const richEntry = entry => {
      if(!rich.has(entry.id))rich.set(entry.id,{id:entry.id,name:entry.name,description:entry.description,origin:entry.origin,requiredTools:entry.requiredTools,permissions:entry.permissions,excerpt:readCandidate(entry).body});
      return rich.get(entry.id);
    };
    // Byte-sized comparison packets bound normal requests, without discarding
    // a thirteenth skill or hiding the operative tail of a selected procedure.
    async function compare(phase, entries, selected=[]) {
      const groups=[];let group=[];
      const packetBytes=Math.max(1024,budget.comparisonBytes||64000);
      const size=candidates=>routingRequestBytes({phase,context,candidates,selected,availableModels:models});
      for(const entry of entries){
        if(group.length&&(group.length>=200||size([...group,entry])>packetBytes)){groups.push(group);group=[];}
        if(size([entry])>packetBytes){deferred.set(entry.id,'Complete procedure does not fit this comparison budget; main-agent assessment remains required.');continue;}
        group.push(entry);
      }
      if(group.length||!entries.length)groups.push(group);
      if(!groups.length)return{selectedIds:[],strategy:'single',modelIds:[],reason:'No whole procedure fits; deferred nominees require main-agent assessment.'};
      // Packet comparisons are independent. Bound concurrency, not useful
      // catalogue coverage; serial packets previously consumed the whole native
      // deadline before supporting comparisons could finish.
      const results=new Array(groups.length);let nextGroup=0;
      await Promise.all(Array.from({length:Math.min(groups.length,Math.max(1,Math.min(8,budget.concurrency||3)))},async()=>{
        while(nextGroup<groups.length){const index=nextGroup++;results[index]=await invoke(phase,groups[index],selected);}
      }));
      if(results.length===1)return results[0];
      let winners=unique(results.flatMap(result=>result.selectedIds.map(id=>entries.find(entry=>entry.id===id))));
      // Each packet has compared its whole procedures. Retain one genuinely
      // fit-checked lead if a later cross-packet comparison cannot fit, rather
      // than misreporting a local size limit as total provider failure.
      if(phase==='verify'&&winners.length){
        const fit=new Map(results.flatMap(result=>result.ranks||[]).map(item=>[item.id,item.score]));
        const lead=[...winners].sort((a,b)=>(fit.get(b.id)||0)-(fit.get(a.id)||0))[0];
        checked=[byId.get(lead.id)];
        provisional=winners.map(entry=>byId.get(entry.id));
      }
      let finalResult=results.find(result=>result.selectedIds.includes(winners[0]?.id))||results[0];
      if(winners.length>1&&size(winners)<=packetBytes)return invoke(phase,winners,selected);
      // Compare packet winners in pairs instead of reassembling an unbounded
      // final request. No nominated candidate disappears before comparison.
      while(winners.length>1){
        const next=[];
        for(let i=0;i<winners.length;i+=2){
          const pair=winners.slice(i,i+2);
          if(pair.length===1){next.push(pair[0]);continue;}
          if(size(pair)>packetBytes)throw new Error('complete-winner-comparison-too-large');
          const result=await invoke(phase,pair,selected);finalResult=result;
          next.push(...result.selectedIds.map(id=>pair.find(entry=>entry.id===id)));
        }
        const reduced=unique(next);
        if(reduced.length>=winners.length)throw new Error('comparison-did-not-reduce');
        winners=reduced;
      }
      return {...finalResult,selectedIds:winners.map(entry=>entry.id)};
    }
    // Explicit choices are honoured locally and do not consume comparison space.
    const candidates = unique(shortlist).filter((entry) => !explicit.some((x) => x.id === entry.id)).flatMap(entry=>{
      try{return[richEntry(entry)];}
      catch{deferred.set(entry.id,'Procedure content changed or is unavailable; main-agent source assessment remains required.');return[];}
    });
    // Ranking has completed successfully. With neither a remaining skill nor
    // a model choice, a remote verification call cannot add a decision.
    if(controller.signal.aborted)throw new Error('routing-cancelled-or-timed-out');
    const result = candidates.length===0&&models.length===0
      ? {selectedIds:[],strategy:'single',modelIds:[],reason:'Successful ranking left no additional skill or model choice.'}
      : await compare('verify', candidates);
    if (!strategies.has(result.strategy)) throw new Error('invalid-execution-strategy');
    if (result.modelIds && (!Array.isArray(result.modelIds) || result.modelIds.some((id) => !models.some((m) => m.id === id)))) throw new Error('unavailable-model-selected');
    let chosen = unique([...explicit, ...result.selectedIds.map((id) => byId.get(id))]);
    checked=chosen.filter(entry=>!base.explicitIds.includes(entry.id));
    provisional = chosen.filter(entry => !base.explicitIds.includes(entry.id));
    let remaining = candidates.filter((candidate) => !deferred.has(candidate.id)&&!chosen.some((entry) => entry.id === candidate.id));
    pendingComparisons=remaining;
    while (chosen.length && remaining.length) {
      const next = await compare('complement', remaining, chosen.map(richEntry));
      if (next.selectedIds.length === 0) break;
      if (next.selectedIds.length !== 1) throw new Error('invalid-complement-selection');
      chosen = unique([...chosen, byId.get(next.selectedIds[0])]);
      provisional = chosen.filter(entry => !base.explicitIds.includes(entry.id));
      remaining = remaining.filter((candidate) => !deferred.has(candidate.id)&&candidate.id !== next.selectedIds[0]);
      pendingComparisons=remaining;
    }
    let strategy = result.strategy;
    // No invented capacity: independent contexts may share a provider only when the supplied pool supports them.
    const pools = new Map();
    for (const model of models) {
      const pool = model.resourcePool || model.accountId || model.poolId;
      const capacity = model.availableSlots ?? model.capacity;
      if (!pool || model.capacityTrusted !== true || !Number.isInteger(capacity) || capacity < 0) continue;
      pools.set(pool, Math.min(pools.get(pool) ?? capacity, capacity));
    }
    const slots = [...pools.values()].reduce((sum, capacity) => sum + capacity, 0);
    const capacityMissing = strategy !== 'single' && slots < 2;
    if (capacityMissing) strategy = 'single';
    const selected = chosen;
    const tools = policy.availableTools || taskContext.availableTools;
    const knownTools = new Set(Array.isArray(tools) ? tools.map((tool) => typeof tool === 'string' ? tool : tool.name) : []);
    const dependencies = selected.flatMap((entry) => {
      const required = Array.isArray(entry.requiredTools) ? entry.requiredTools : typeof entry.requiredTools === 'string' ? entry.requiredTools.split(/[\s,]+/).filter(Boolean) : [];
      return required.filter((tool) => !knownTools.has(tool)).map((tool) => ({ skill: entry.id, tool, reason: Array.isArray(tools) ? 'Required tool is not available in the supplied tool pool.' : 'Required tool availability has not been confirmed.' }));
    });
    if(deferred.size&&!selected.length)return fallback('No confirmed procedure was selected; unassessed nominees remain available to the main agent.');
    return { ...base, missing: [...missing, ...dependencies, ...(capacityMissing ? [{ capability: result.strategy, reason: 'Independent execution capacity is not confirmed; continue in the current main agent.' }] : [])], status: deferred.size?'partial':'selected', ...(deferred.size?{comparisonDeferred:deferredEntries()}:{}), selected, strategy, modelChoices: (result.modelIds || []).map((id) => models.find((m) => m.id === id)), reason: deferred.size?'Checked recommendations are supplied; comparison remains incomplete for the listed deferred methods.':typeof result.reason === 'string' ? result.reason : 'Relevant skills selected.', calls,diagnostics:diagnostics() };
  } catch (error) {
    failureCode=routingFailure(error);
    const cancelled = controller.signal.aborted;
    controller.abort();
    const incomplete=['complete-winner-comparison-too-large','complete-procedure-comparison-too-large','routing-call-budget-reached'].includes(failureCode);
    return fallback(cancelled ? 'Routing cancelled or timed out.' : incomplete?'Whole-procedure comparison did not finish within the local request budget; retained methods were independently fit-checked. The main agent must assess remaining nominees.':'Jev selection unavailable or invalid; main-agent selection is required.');
  }
  finally { clearTimeout(timer); signal?.removeEventListener('abort', abort); }
}

export function loadSelectedSkills(selection) { return selection.selected.map(readCandidate); }
