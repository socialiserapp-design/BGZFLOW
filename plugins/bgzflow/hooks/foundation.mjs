import { renderMethodDelivery, prepareMethodDelivery } from '../tools/foundation/method-delivery.mjs';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { isCommandEntry } from './lib/command-entry.mjs';
import { captureEvent, readContinuity, renderContinuity, hasPendingCompaction, claimCompactRestore, claimStageSelection } from '../tools/foundation/continuity.mjs';
import { readProjectRecall, renderProjectRecall } from '../tools/foundation/project-recall.mjs';
import { createFoundationSession, renderFoundationBrief } from '../tools/foundation/session.mjs';
import { readProjectRecordViews, renderRecordView } from '../tools/foundation/record-view.mjs';
import { derivePlanStage, routingEnvironmentFingerprint, routingInputFingerprint, nativeRoutingContext, latestWorkRequest, isContinuationOnly, isConversationOnly } from '../tools/foundation/stage-selection.mjs';
import { resolveProjectRoot } from '../tools/foundation/project-root.mjs';
import { describeToolActivity } from '../tools/foundation/activity-selection.mjs';
import {isAppGeneratedSuggestion} from '../tools/foundation/message-origin.mjs';
import {historyDelivery} from '../tools/foundation/history-delivery.mjs';

const eventName = input => input.hook_event_name || input.hookEventName || input.event;
const needsCompactRestore = state => state.events.findLastIndex(item => item.event === 'PostCompact') > state.events.findLastIndex(item => item.event === 'ContextRestored');

function projectHistory(input, state, options, { force = false } = {}) {
  if (options.recall !== true) return ''; // Cross-chat lookup is explicit and on demand.
  if (options.recall === false) return '';
  try {
    const recall = readProjectRecall({
      projectRoot: options.projectRoot || input.cwd,
      sessionId: input.session_id || input.sessionId || input.conversationId,
      query: force ? '' : input.prompt || input.user_prompt || input.userPrompt || '',
    }, { ...options, maxSessions: 12, maxFiles: 384, maxBytes: 2 * 1024 * 1024, maxRecords: 16 });
    const project=readProjectRecordViews({projectRoot:options.projectRoot||input.cwd,sessionId:input.session_id||input.sessionId||input.conversationId},options);
    const claim=historyDelivery(state,{ephemeral:Boolean(input.conversationId)});
    const structured=project.sessions.filter(view=>!view.isCurrentSession);
    const nativeBlocks=[];let nativeChars=0;
    for(const view of structured.slice(0,2)){
      const empty={...view,firstHuman:null,humanMessages:[],questions:[],assistantMessages:[],unlinkedAnswers:[],assignments:[],followups:[],operations:[],workers:[],plan:null,proposedPlan:null,planCoverage:null,wrapUp:null,application:null,methodContext:null,summary:null,assistantCoverage:null};
      const rows=['questions','assistantMessages','unlinkedAnswers','assignments','followups','workers'].flatMap(field=>(view[field]||[]).map(item=>({field,item,array:true})));
      rows.push(...view.operations.filter(item=>item.status==='unresolved-recorded-request'&&!recall.records.some(record=>record.eventId===item.request?.source?.eventId)).map(item=>({field:'operations',item,array:true})));
      rows.push(...['plan','proposedPlan','planCoverage','wrapUp','application'].filter(field=>view[field]).map(field=>({field,item:view[field]})));
      for(const {field,item,array} of rows){
        const current={...empty,[field]:array?[item]:item};
        const block=`Separate recorded session ${view.sessionId}; task identity is not automatically merged.\n${renderRecordView(current,{maxChars:2000,includeHuman:false})}`;
        if(nativeChars+block.length>2200)continue; // Unemitted items remain eligible.
        if(claim(`native:${view.sessionId}:${field}:${JSON.stringify(item)}`)){nativeBlocks.push(block);nativeChars+=block.length;}
      }
    }
    const nativeState=nativeBlocks.join('\n\n');
    // Missing history is not a new obligation or a reason to block a reply.
    // Do not repeatedly inject an unchanged view; compaction must restore it.
    let emittedRecords=0;
    const recalled=renderProjectRecall(recall,{maxChars:nativeState?3000:6000,includeRecord:(record,format)=>{
      if(format==='pointer'&&claim.has(`record:${record.kind}:${record.eventId}:body`))return false;
      const emitted=claim(`record:${record.kind}:${record.eventId}:${format}`);if(emitted)emittedRecords++;return emitted;
    }});
    if (!emittedRecords&&!nativeState) return '';
    const context = [emittedRecords?recalled:'',nativeState,project.partial?'Project view is partial; additional sessions may exist.':''].filter(Boolean).join('\n\n');
    const key = createHash('sha256').update(context).digest('hex');
    try{captureEvent({ ...input, hook_event_name: 'ProjectRecall', recall: { key } }, { ...options, internal: true });}catch{/* Prepared context is still returned if its diagnostic record fails. */}
    return context;
  } catch { return ''; }
}

// Selection is not the same thing as delivering every body at once. Keep all
// selected methods discoverable and defer complete bodies which do not fit the
// current context allowance; never truncate a body or drop a requested method.
export { renderMethodDelivery };

function startupGuidance(input, options) {
  const blocks=[];
  const rootContract=fileURLToPath(new URL('../AGENTS.md',import.meta.url));
  const contract=fs.existsSync(rootContract)?rootContract:fileURLToPath(new URL('../rules/AGENTS.md',import.meta.url));
  const projectRoot = options.projectRoot || input.cwd;
  for(const [label,file] of [['BGZFLOW working contract',contract],['Current project decisions',projectRoot?path.join(projectRoot,'SIMON.md'):null]]) {
    if(!file)continue;
    try {
      const stat=fs.statSync(file);
      if(stat.size>20000){blocks.push(`${label} is available at ${file}; read its relevant current decisions before dependent work. It was not truncated into an incomplete authority summary.`);continue;}
      blocks.push(`${label}\n${fs.readFileSync(file,'utf8')}`);
    }catch{/* Optional project decisions may not exist. */}
  }
  return blocks.join('\n\n');
}

// Antigravity PreInvocation contains no prompt. Only its explicit human rows
// may become user messages; SDK-injected context must never impersonate a user.
export function prepareNativeInput(input, options = {}) {
  if (eventName(input) !== 'PreInvocation') return input;
  const normalized = { ...input, hook_event_name: 'UserPromptSubmit', session_id: input.conversationId, cwd: options.projectRoot || input.workspacePaths?.[0] };
  const transcript = input.transcriptPath;
  if (typeof transcript !== 'string' || !['transcript.jsonl','transcript_full.jsonl'].includes(path.basename(transcript))) return normalized;
  let fd;
  try {
    const file = fs.realpathSync(transcript);
    const roots = options.transcriptRoots || [path.join(os.homedir(), '.gemini', 'antigravity', 'brain'), path.join(os.homedir(), '.gemini', 'antigravity-cli', 'brain'), path.join(os.homedir(), '.gemini', 'antigravity-ide', 'brain')];
    if (!roots.some(root => { const rel = path.relative(path.resolve(root), file); return rel && rel !== '..' && !rel.startsWith('..' + path.sep) && !path.isAbsolute(rel); })) return normalized;
    fd = fs.openSync(file, 'r');
    const size = fs.fstatSync(fd).size;
    const length = Math.min(size, 2 * 1024 * 1024);
    const bytes = Buffer.alloc(length); fs.readSync(fd, bytes, 0, length, size - length);
    const lines = bytes.toString('utf8').split('\n');
    if (size > length) lines.shift();
    for (let index = lines.length - 1; index >= 0; index--) {
      let row; try { row = JSON.parse(lines[index]); } catch { continue; }
      if (row.type !== 'USER_INPUT' || row.source !== 'USER_EXPLICIT' || typeof row.content !== 'string') continue;
      // Current native CLI wraps the request and host-added settings in one row.
      // Only the actual request is a user decision; added host metadata is not.
      let prompt=row.content;
      if(prompt.startsWith('<USER_REQUEST>')) {
        // The final valid boundary preserves literal wrapper examples in the
        // user's own text. Unknown/malformed wrappers are not human authority.
        const boundaries=[...prompt.matchAll(/<\/USER_REQUEST>\s*(?=<(?:ADDITIONAL_METADATA|USER_SETTINGS_CHANGE)>|$)/g)];
        const boundary=boundaries.at(-1);
        if(!boundary)return {...normalized,native_prompt_unavailable:true};
        prompt=prompt.slice('<USER_REQUEST>'.length,boundary.index).replace(/^\r?\n/,'').replace(/\r?\n$/,'');
      }
      return { ...normalized, prompt, source_message_id: String(row.step_index ?? row.created_at), message_truncated: Boolean(row.truncated_fields && Object.keys(row.truncated_fields).length) };
    }
  } catch { /* Unavailable transcript must not block a native invocation. */ }
  finally { if (fd !== undefined) fs.closeSync(fd); }
  return normalized;
}

function prepareMethods(selection,input,options,config={}) {
  const state=config.state||readContinuity(input,options);
  const reset=state.events.findLastIndex(event=>event.event==='PostCompact'||(event.event==='SessionStart'&&['compact','clear'].includes(event.source)));
  const observed=new Set(input.conversationId?[]:state.events.slice(reset+1).flatMap(event=>(event.delivery?.methods||[]).filter(item=>item.provided||item.procedureProvided).map(item=>item.version)));
  const claims=historyDelivery(state,{ephemeral:Boolean(input.conversationId)});
  const selected=(selection.selected||[]).filter(entry=>!entry.version||(!observed.has(entry.version)&&!claims.has(`method:${entry.version}`)));
  if(!selected.length)return '';
  const result=prepareMethodDelivery({...selection,selected},{loadSelectedSkills:config.loadSelectedSkills,bodyBudget:config.bodyBudget});
  for(const method of result.delivery.methods)if(method.version&&(method.provided||method.procedureProvided))claims(`method:${method.version}`);
  captureEvent({...input,hook_event_name:'MethodContextPrepared',delivery:result.delivery},{...options,internal:true});
  return result.text;
}

async function chooseMethods(input, state, options) {
  if (options.route === false) return '';
  // Native automatic routing honours the private owner switch before discovery
  // or model work. An injected decider is an explicit trusted embedding/test
  // implementation; the built-in provider independently checks before HTTP.
  if(!options.routing?.decide){
    let disabled=false;
    try{disabled=JSON.parse(fs.readFileSync(path.join(os.homedir(),'.bgzflow','auto-routing.json'),'utf8')).enabled!==true;}
    catch(error){disabled=error.code!=='ENOENT';}
    if(disabled)return historyDelivery(state,{ephemeral:Boolean(input.conversationId)})('automatic-paid-routing-off')?'Automatic paid Jev routing is disabled by the owner. Choose relevant methods with the current agent; do not call or retry Jev automatically. Explicit on-demand use remains available within the user’s authority.':'';
  }
  try {
    const [{ discoverCatalog }, { selectRoute, loadSelectedSkills }] = await Promise.all([
      import('../tools/foundation/catalog.mjs'), import('../tools/foundation/router.mjs'),
    ]);
    const config = options.routing || {};
    const pluginRoot = fileURLToPath(new URL('../', import.meta.url));
    const catalog = config.catalog || await discoverCatalog({ projectRoot: options.projectRoot || input.cwd, pluginRoot, cacheFile: path.join(os.homedir(), '.bgzflow', 'cache', 'catalog.json'), ...config.discovery });
    const incoming = input.prompt || input.user_prompt || input.userPrompt || '';
    const request = isContinuationOnly(incoming)?latestWorkRequest(state)?.message||incoming:incoming;
    const stage = config.stage || derivePlanStage(state)?.stage || 'current-request';
    const host=options.host||{capabilities:async()=>({models:config.availableModels||[],tools:config.policy?.availableTools})};
    let capabilities={};try{capabilities=await host.capabilities?.()||{};}catch{/* Unknown remains unknown. */}
    const session = createFoundationSession({ projectRoot: options.projectRoot || input.cwd, sessionId: input.session_id || input.sessionId || input.conversationId, storageRoot: options.storageRoot, host: {...host,capabilities:async()=>capabilities} });
    const privateCatalog=session.privateCatalogue();
    const environmentKey=routingEnvironmentFingerprint({catalog,privateCatalog,capabilities,policy:config.policy||{},explicitSkills:config.explicitSkills||[],budget:config.budget||{},stage});
    const taskContext = config.taskContext ?? nativeRoutingContext(state);
    const routingInputKey=routingInputFingerprint({request,taskContext,environmentKey});
    const prior=state.events.findLast(event=>event.selection?.routingInputKey===routingInputKey&&['selected','partial','fallback'].includes(event.selection.status))?.selection;
    const previousEntries = (prior?.selected || []).map(entry => [...catalog,...privateCatalog].find(candidate => candidate.id === entry.id && candidate.version === entry.version));
    const previous = previousEntries.every(Boolean) && prior ? { ...prior, selected: previousEntries } : undefined;
    let selection;
    if (previous) {
      try {
        await loadSelectedSkills(previous);
        selection = {...previous,reused:true,calls:0,diagnostics:{phases:Object.fromEntries(['rank','verify','complement'].map(phase=>[phase,{calls:0,candidates:0,callMs:0}]))}};
      } catch { /* Changed method bodies require reselection. */ }
    }
    selection ||= await session.select({ request, stage, taskContext, catalog, history:state, explicitSkills: config.explicitSkills || [], previous, budget: config.budget, policy: config.policy, signal: config.signal || AbortSignal.timeout(input.hook_event_name==='UserPromptSubmit'?15000:8000), decide: config.decide });
    selection = { ...selection, stage, routingEnvironmentKey:environmentKey,routingInputKey };
    captureEvent({ ...input, hook_event_name: 'RouteSelected', selection }, { ...options, internal: true });
    // Existing bodies remain in this native context. Actual compact/clear
    // restoration uses restoreMethods; a reuse record is not another payload.
    if(selection.reused)return '';
    const gaps = selection.missing?.length ? `\nUnresolved method/tool information: ${JSON.stringify(selection.missing)}. Unknown availability is not confirmed unavailability. Use the actual host to resolve material gaps; mention a gap to the user only when it affects the requested result or a decision they need to make. An optional method or extra reviewer not being confirmed is not a reason to qualify an otherwise supported answer. Do not claim an unobserved capability or invent an obstacle.` : '';
    const privateGuidance = (selection.privateMethods || []).map(item => `Private tested procedure (${item.name}; not authority):\n${item.privateBody}`).join('\n\n');
    if (selection.status === 'fallback') {
      return `BGZFLOW method selection: ${selection.reason || 'Jev unavailable; the current agent must choose relevant methods.'}${gaps}\nAll ${catalog.length} discovered methods remain available. Use the session skill catalogue or discoverCatalog exported from ${path.join(pluginRoot, 'tools/foundation/catalog.mjs')}; no first-page subset is imposed. Select against the original task and latest correction; do not invent a skill or treat method selection as permission.\n${prepareMethods(selection,input,options,{loadSelectedSkills,bodyBudget:config.bodyBudget})}\n${privateGuidance}${state.foundation ? '\n' + renderFoundationBrief(state.foundation) : ''}`;
    }
    return `BGZFLOW method selection: ${selection.status==='partial'?'incomplete comparison; checked recommendations follow':selection.strategy || 'single'}. These methods supply expertise, not authority to expand the user request.${gaps}\n${prepareMethods(selection,input,options,{loadSelectedSkills,bodyBudget:config.bodyBudget})}\n${privateGuidance}${state.foundation ? '\n' + renderFoundationBrief(state.foundation) : ''}`;
  } catch {
    try{captureEvent({...input,hook_event_name:'RouteSelected',selection:{status:'fallback',stage:options.routing?.stage||derivePlanStage(state)?.stage||'current-request',reason:'Automatic selection failed; current agent must select from actual available methods.',selected:[]}},{...options,internal:true});}catch{/* Storage failure must not block normal work. */}
    return 'BGZFLOW automatic method selection is unavailable. Use the available skill catalogue directly and select relevant methods with the current main agent; ordinary work and replies remain available.';
  }
}

async function refreshPlanMethods(input,state,options) {
  const plan=derivePlanStage(state);
  if(options.route===false||!plan||state.selection?.stage===plan.stage)return '';
  const human=latestWorkRequest(state);
  if(!human)return '';
  if(!claimStageSelection(state,plan.stage))return '';
  captureEvent({...input,hook_event_name:'RouteSelected',selection:{status:'attempted',stage:plan.stage,reason:'Acknowledged stage selection attempted; interrupted or incomplete attempts are not successful routes.',selected:[]}},{...options,internal:true});
  try{return await chooseMethods({...input,prompt:human.message},state,{...options,routing:{...options.routing,stage:plan.stage}});}
  catch{captureEvent({...input,hook_event_name:'RouteSelected',selection:{status:'fallback',stage:plan.stage,reason:'Stage selection unavailable; main agent fallback remains available.',selected:[]}},{...options,internal:true});return 'BGZFLOW stage selection is unavailable. Continue with relevant available methods using the current main agent.';}
}

async function refreshActivityMethods(input,state,options) {
  if(options.route===false)return '';
  const human=latestWorkRequest(state);
  const activity=describeToolActivity(input)||(input.conversationId?state.events.findLast(event=>event.activity&&event.at>=(human?.at||''))?.activity:null);
  // Editing a file or running a shell is not evidence that the task changed.
  if(!activity||['implementation','execution'].includes(activity.phase)||state.selection?.stage===activity.stage)return '';
  if(!human||!claimStageSelection(state,activity.stage))return '';
  return chooseMethods({...input,prompt:human.message},state,{...options,routing:{...options.routing,stage:activity.stage}});
}

async function restoreMethods(input, state, options) {
  if (options.route === false || !state.selection?.selected?.length) return '';
  try {
    const [{ discoverCatalog }, { loadSelectedSkills }] = await Promise.all([import('../tools/foundation/catalog.mjs'), import('../tools/foundation/router.mjs')]);
    const config = options.routing || {};
    const pluginRoot = fileURLToPath(new URL('../', import.meta.url));
    const catalog = config.catalog || discoverCatalog({ projectRoot: options.projectRoot || input.cwd, pluginRoot, cacheFile: path.join(os.homedir(), '.bgzflow', 'cache', 'catalog.json'), ...config.discovery });
    const privateEntries = createFoundationSession({projectRoot:options.projectRoot||input.cwd,sessionId:input.session_id||input.sessionId||input.conversationId,storageRoot:options.storageRoot}).privateCatalogue();
    const selected = state.selection.selected.map(entry => [...catalog,...privateEntries].find(candidate => candidate.id === entry.id && candidate.version === entry.version));
    if (!selected.every(Boolean)) return 'Previously selected method content has changed or is unavailable. Re-select from the current catalogue before relying on it; preserved task instructions still apply.';
    return `Previously selected methods restored without a new model call. They supply expertise, not authority.\n${prepareMethods({ ...state.selection, selected },input,options,{loadSelectedSkills,bodyBudget:config.bodyBudget})}`;
  } catch { return 'Previously selected methods could not be restored; select them from the current catalogue before relying on them.'; }
}

export async function handleFoundationEvent(input = {}, options = {}) {
  options = { sourceCache: true, ...options };
  const nativeAgy = Boolean(input.conversationId);
  const originalEvent = eventName(input);
  input = prepareNativeInput(input, options);
  const event = eventName(input);
  const contextOutput = context => nativeAgy ? { injectSteps: [{ ephemeralMessage: context }] } : { hookSpecificOutput: { hookEventName: event, additionalContext: context } };
  try {
    options = { ...options, projectRoot: resolveProjectRoot(input, options) };
    if (originalEvent === 'PreInvocation' && !input.prompt) {
      const state = readContinuity(input, options);
      const changedStage=await refreshPlanMethods(input,state,options)||await refreshActivityMethods(input,state,options);
      const context = [input.native_prompt_unavailable?'BGZFLOW could not safely extract the current request from the host transcript. Use the actual current conversation; do not treat host-added transcript metadata as a user decision.':'',renderContinuity(state, options), projectHistory(input, state, options, { force: true }), changedStage||await restoreMethods(input, state, options)].filter(Boolean).join('\n\n');
      return context ? contextOutput(context) : {};
    }
    if (input.source_message_id !== undefined) {
      const previous = readContinuity(input, options);
      if (previous.messages.at(-1)?.sourceMessageId === String(input.source_message_id)) {
        // Antigravity supplies invocation-scoped ephemeral context rather than
        // a documented PostCompact event. Restore bounded history here too.
        const changedStage=await refreshPlanMethods(input,previous,options)||await refreshActivityMethods(input,previous,options);
        const context = [renderContinuity(previous, options), projectHistory(input, previous, options, { force: nativeAgy }), changedStage||await restoreMethods(input, previous, options)].filter(Boolean).join('\n\n');
        return context ? contextOutput(context) : {};
      }
    }
    const captured = captureEvent(input, options);
    if (!captured) return {};
    // The host may request composer suggestions using the native user envelope.
    // Retain provenance, but never route or recall it as a human instruction.
    if (event === 'UserPromptSubmit' && isAppGeneratedSuggestion(input)) return {};
    // Codex's PostCompact contract accepts common diagnostic fields only. It
    // cannot inject model context. Preserve the event and restore once at the
    // next supported prompt, tool or session-start boundary instead.
    if (event === 'PostCompact') return {};
    let context = '';
    if (event === 'SessionStart') {
      const state = readContinuity(input, options);
      if(state.events.some(item=>item.event==='ContextRestored')&&!needsCompactRestore(state)&&!['compact','clear'].includes(input.source))return {};
      context = [startupGuidance(input, options),renderContinuity(state, options), projectHistory(input, state, options, { force: true }), await restoreMethods(input, state, options)].filter(Boolean).join('\n\n');
      if (context) captureEvent({ ...input, hook_event_name: 'ContextRestored' }, { ...options, internal: true });
    } else if (event === 'UserPromptSubmit') {
      // Keep conversational turns immediate. The original message and any
      // linked answer have already been preserved above. Existing task methods
      // remain in the conversation; real stage changes still select on tools.
      const explicit=options.routing?.explicitSkills?.length||options.routing?.stage;
      const view=captured.nativeView,stage=derivePlanStage({nativeView:view});
      // A status question does not resolve an uncertain plan or authorise work.
      // Old/truncated plan metadata must not make every later greeting/status
      // pay for history and routing. A known changed stage still selects here;
      // substantive requests and tool-stage boundaries keep their normal path.
      if(!nativeAgy&&!explicit&&!hasPendingCompaction(captured)
        &&isConversationOnly(input.prompt||input.user_prompt||input.userPrompt||''))return {};
      const state = readContinuity(input, options);
      const restore = needsCompactRestore(state);
      context = [restore ? renderContinuity(state, options) : '', projectHistory(input, state, options, { force: restore }), await chooseMethods(input, state, options)].filter(Boolean).join('\n\n');
      if (restore && context) captureEvent({ ...input, hook_event_name: 'ContextRestored' }, { ...options, internal: true });
    } else if (event === 'PreToolUse' && hasPendingCompaction(captured)) {
      const state = readContinuity(input, options);
      if (needsCompactRestore(state)) {
        const claim = claimCompactRestore(state);
        if (!claim) return {};
        try {
          const changedStage=nativeAgy?'':await refreshPlanMethods(input,state,options);
          context = [renderContinuity(state, options), projectHistory(input, state, options, { force: true }), changedStage||await restoreMethods(input, state, options)].filter(Boolean).join('\n\n');
          if (context) captureEvent({ ...input, hook_event_name: 'ContextRestored' }, { ...options, internal: true });
          else claim.release();
        } catch (error) { claim.release(); throw error; }
      }
    } else if(!nativeAgy&&['PreToolUse','PostToolUse','PostToolUseFailure'].includes(event)){
      const stage=derivePlanStage({nativeView:captured.nativeView});
      if(stage&&captured.nativeView.selection?.stage!==stage.stage)context=await refreshPlanMethods(input,readContinuity(input,options),options);
      else if(!stage&&describeToolActivity(input))context=await refreshActivityMethods(input,readContinuity(input,options),options);
    }
    return context ? contextOutput(context) : {};
  } catch {
    // Storage and routing failures never block a reply, compaction, or normal tool use.
    return event === 'SessionStart' ? contextOutput('BGZFLOW continuity storage is unavailable for this session. Recover important decisions from the original conversation before relying on a summary.') : {};
  }
}

if (isCommandEntry(import.meta.url)) {
  try {
    const bytes = fs.readFileSync(0, 'utf8');
    const input = bytes.length <= 2 * 1024 * 1024 ? JSON.parse(bytes || '{}') : {};
    const eventAt = process.argv.indexOf('--event');
    if (eventAt >= 0 && process.argv[eventAt + 1] && !eventName(input)) input.hook_event_name = process.argv[eventAt + 1];
    process.stdout.write(JSON.stringify(await handleFoundationEvent(input, { nativeProjectRoot: process.env.CLAUDE_PROJECT_DIR })));
  } catch { process.stdout.write('{}'); }
}
