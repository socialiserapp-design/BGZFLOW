import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createHash, randomUUID } from 'node:crypto';
import { captureEvent, readContinuity } from './continuity.mjs';
import { discoverCatalog } from './catalog.mjs';
import { selectRoute } from './router.mjs';
import { readProjectRecordViews } from './record-view.mjs';
import { sanitize, sanitizeRecord } from '../../hooks/lib/secrets.mjs';
import { withOwnedLock, writablePath, writeOwnedFile } from '../../hooks/lib/owned-path.mjs';
import {isHumanSource} from './message-origin.mjs';

const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const text = value => sanitize(String(value ?? '')).slice(0, 12000);
const empty = () => ({ schema: 1, sequence: 0, request: null, questions: [], decisions: [], assignments: [], outcomes: [], improvements: [], methods: [] });
const pendingInputs = assignment => (assignment.inputs || []).some(item => item.status !== 'taken');
const terminalWork = value => {
  if (value === false) return true;
  if (!value || typeof value !== 'object' || value.running === true) return false;
  const lists = ['jobs', 'workers'].filter(key => Array.isArray(value[key]));
  return lists.length > 0 && lists.every(key => value[key].every(item => item && typeof item === 'object' && ['completed', 'failed', 'cancelled', 'stopped', 'exited'].includes(item.status)));
};
const completedObservation = (result, task) => result?.status === 'completed' && text(result.source).trim() && text(result.observationId).trim()
  && (result.operationId === undefined || result.operationId === task.operationId)
  && !(task.inputs || []).some(item => ['uncertain', 'delivered'].includes(item.status))
  && (!Object.hasOwn(result, 'backgroundWork') || terminalWork(result.backgroundWork));

/** Optional local host adapter: one project-wide writer reservation, no service or expiry. */
export function createProjectPathReservations({ projectRoot, storageRoot, sessionId }) {
  projectRoot = fs.realpathSync.native(projectRoot);
  const root = path.resolve(storageRoot || process.env.BGZFLOW_CONTINUITY_HOME || path.join(os.homedir(), '.bgzflow', 'continuity'));
  const file = path.join(root, createHash('sha256').update(projectRoot).digest('hex'), 'path-reservations.json');
  const read = () => { if(!fs.existsSync(file))return {schema:1,projectRoot,reservations:[]}; writablePath(file); if(fs.statSync(file).size>1000000)throw Error('Reservation history requires compaction.'); const state=JSON.parse(fs.readFileSync(file,'utf8'));if(state.schema!==1||state.projectRoot!==projectRoot||!Array.isArray(state.reservations))throw Error('Unsafe reservation history.');return state; };
  return {
    reservePaths({ paths, assignmentId }) {
      try { return withOwnedLock(file,()=>{const state=read(); const clash=state.reservations.some(r=>r.status==='held'&&r.paths.some(a=>paths.some(b=>a===b||a.startsWith(b+path.sep)||b.startsWith(a+path.sep))));if(clash)return {granted:false};const item={id:randomUUID(),sessionId,assignmentId,paths,status:'held'};state.reservations.push(item);writeOwnedFile(file,JSON.stringify(state));return {granted:true,id:item.id};}); } catch {return {granted:false};}
    },
    releasePaths(id) { return withOwnedLock(file,()=>{const state=read();const item=state.reservations.find(r=>r.id===id&&r.sessionId===sessionId);if(!item)throw Error('Reservation belongs to a different owner.');item.status='released';writeOwnedFile(file,JSON.stringify(state));}); },
  };
}

/** Callbacks are supplied by the trusted host, never read from a task or stored document. */
export function createFoundationSession({ projectRoot, sessionId, host = {}, storageRoot } = {}) {
  projectRoot = fs.realpathSync.native(projectRoot);
  if (!sessionId || typeof sessionId !== 'string') throw Error('A native session identity is required.');
  const input = { cwd: projectRoot, session_id: sessionId };
  const options = storageRoot ? { storageRoot } : {};
  const read = () => readContinuity(input, options);
  function projectFile(name) { return path.join(path.resolve(storageRoot || process.env.BGZFLOW_CONTINUITY_HOME || path.join(os.homedir(), '.bgzflow', 'continuity')), createHash('sha256').update(projectRoot).digest('hex'), name); }
  const privateFile = () => projectFile('private-procedures.json');
  const privateEntry=item=>({id:`skill-${digest([projectRoot,'private-procedure',item.id]).slice(0,24)}`,name:item.name,description:item.description,version:item.version,privateBody:item.body,path:privateFile(),origin:'private-tested-procedure'});
  let privateGap = null;
  function privateMethods() {
    privateGap = null;
    try { const file = privateFile(); if (!file || !fs.existsSync(file)) return []; writablePath(file); if (fs.statSync(file).size > 100000) throw Error('oversized'); const value = JSON.parse(fs.readFileSync(file, 'utf8')); if(value.projectRoot !== projectRoot || !Array.isArray(value.methods) || value.methods.some(item => item.status !== 'adopted' || typeof item.body !== 'string' || item.version !== digest(item.body))) throw Error('invalid'); return value.methods; } catch { privateGap = 'Private procedure history is corrupt or unsafe; no procedures loaded and no overwrite permitted.'; return []; }
  }
  function publishPrivate(item) {
    const file = privateFile(); if (!file) throw Error('Private store unavailable.');
    withOwnedLock(file, () => { const methods = privateMethods().filter(old => old.id !== item.id); if(privateGap)throw Error(privateGap); if (item.status === 'adopted') methods.push(item); const value = JSON.stringify({ projectRoot, methods }); if (value.length > 100000) throw Error('Private procedure library is full.'); writeOwnedFile(file, value); });
  }
  const current = (history = read()) => {
    return { ...(history.foundation || empty()), partial: Boolean(history.partial || history.foundation?.partialView || history.nativeView?.partial), native:history.nativeView||null, recentHumanMessages: history.messages.slice(-8).map(item => ({ text: item.message, sourceEventId: item.id, sourceMessageId: item.sourceMessageId, at: item.at })) };
  };
  function mutate(action) {
    let history = read();
    if (!history.dir) { captureEvent({ ...input, hook_event_name: 'SessionStart' }, options); history = read(); }
    const lock = path.join(path.dirname(history.dir), 'foundation-state');
    return withOwnedLock(lock, () => {
      const state = structuredClone(read().foundation || empty());
      const result = action(state);
      state.sequence++;
      // This is only a derived current view. Every earlier snapshot remains in events.
      for (const field of ['outcomes','assignments','questions','decisions','improvements']) {
        if (JSON.stringify(state).length <= 100000) break;
        state[field] = state[field].filter(item => field === 'assignments' ? ['assigned','uncertain'].includes(item.status) || pendingInputs(item) : field === 'questions' ? item.status === 'unanswered' : field === 'improvements' ? ['proposed','tested'].includes(item.status) : item.revision === state.request?.revision);
        if(!['assignments','questions'].includes(field))state[field]=state[field].slice(-32);
        state.partialView = true;
      }
      if (JSON.stringify(state).length > 120000) {
        state.partialView = true;
        // Keep live identities and holds. Only shorten prose in the derived view;
        // confirmed originals and earlier full snapshots remain source evidence.
        for(const field of ['outcomes','assignments','questions','decisions'])for(const item of state[field])for(const key of ['text','instruction','question','expectation'])if(typeof item[key]==='string')item[key]=item[key].slice(0,256);
        for (const task of state.assignments) for (const item of task.inputs || []) if (item.text.length > 256) { item.text = item.text.slice(0, 256); item.textTruncated = true; }
      }
      captureEvent({ ...input, hook_event_name: 'FoundationState', foundation: state }, { ...options, internal: true });
      return structuredClone(result ?? state);
    });
  }
  const requireRequest = (state, revision) => {
    if (!state.request || state.request.revision !== revision) throw Error('Current request revision changed or has not been confirmed.');
  };
  const ownedPath = value => {
    if (typeof value !== 'string' || !value) throw Error('Owned path must be explicit.');
    let target = path.resolve(projectRoot, value), ancestor = target, tail = [];
    while (!fs.existsSync(ancestor)) { tail.unshift(path.basename(ancestor)); const parent = path.dirname(ancestor); if (parent === ancestor) throw Error('Owned path is unavailable.'); ancestor = parent; }
    target = path.join(fs.realpathSync(ancestor), ...tail);
    const relative = path.relative(projectRoot, target);
    if (relative === '..' || relative.startsWith('..' + path.sep) || path.isAbsolute(relative)) throw Error('Owned path escapes project.');
    return process.platform === 'win32' ? target.toLowerCase() : target;
  };
  const overlaps = (a, b) => a === b || a.startsWith(b + path.sep) || b.startsWith(a + path.sep);
  async function confirm(value) {
    const original = read().messages.find(item => (item.id === value.sourceId || item.sourceMessageId === value.sourceId) && item.message === text(value.text));
    const confirmed = host.confirmRequest ? await host.confirmRequest(value) : original ? { observed: true, sourceId: original.id, text: value.text } : null;
    if (!confirmed) throw Error('The host must confirm the original human/application source.');
    if (confirmed?.observed !== true || !confirmed.sourceId || confirmed.text !== value.text) throw Error('Original request source was not confirmed.');
    return { sourceId: text(confirmed.sourceId), text: text(confirmed.text) };
  }
  function assignmentInput(state, assignmentId, inputId) {
    const task = state.assignments.find(item => item.id === assignmentId);
    const item = task?.inputs?.find(value => value.id === inputId);
    if (!task || !item) throw Error('The owning assignment and original input are required.');
    return { task, item };
  }
  function inputObservation(result, task, item) {
    const valid = text(result?.source).trim() && text(result?.observationId).trim()
      && (result.assignmentId === undefined || result.assignmentId === task.id)
      && (result.inputId === undefined || result.inputId === item.id);
    return { status: valid && ['delivered', 'taken', 'not-delivered'].includes(result.status) ? result.status : 'uncertain', source: text(result?.source), observationId: text(result?.observationId) };
  }
  function recordInputObservation(assignmentId, inputId, result) {
    return mutate(state => {
      const { task, item } = assignmentInput(state, assignmentId, inputId);
      const observed = inputObservation(result, task, item);
      // A later inconclusive inspection never erases confirmed delivery/consumption.
      if (item.status !== 'taken' && !(item.status === 'delivered' && observed.status !== 'taken')) item.status = observed.status === 'not-delivered' ? 'queued' : observed.status;
      if (observed.status !== 'uncertain') item.observation = observed;
      return item;
    });
  }
  async function releaseCompleted(task) {
    if (task.reservationId && !task.reservationReleased) {
      if (!host.release) throw Error('The reservation owner must confirm release.');
      await host.release(task.reservationId);
      mutate(state => { state.assignments.find(item => item.id === task.id).reservationReleased = true; });
    }
    if (task.pathReservationId && !task.pathReservationReleased) {
      await host.releasePaths?.(task.pathReservationId);
      mutate(state => { state.assignments.find(item => item.id === task.id).pathReservationReleased = true; });
    }
  }
  return {
    current,
    projectCurrent:()=>readProjectRecordViews({projectRoot,sessionId},options),
    privateCatalogue: () => privateMethods().map(privateEntry),
    observeOperation({ id, revision, operationId, status, source }) {
      return mutate(state => { requireRequest(state, revision); let item = state.assignments.find(task => task.id === id); if (!item) { item = { id: text(id), owner: 'owning-host', revision, operationId: text(operationId), status: 'uncertain', paths: [] }; state.assignments.push(item); } if (item.operationId !== operationId) throw Error('Operation identity changed.'); item.status = status === 'completed' ? 'completed' : 'uncertain'; item.source = text(source); item.verification = 'Host execution observation only; outcome requires its own check.'; return item; });
    },
    async acceptRequest(value) {
      const source = await confirm(value);
      return mutate(state => {
        if (state.request?.sourceId === source.sourceId && state.request.text === source.text) return state.request;
        state.request = { ...source, revision: digest([source, state.sequence]), status: 'active' };
        // Old decisions and outcomes retain their revision; none silently applies to the new request.
        return state.request;
      });
    },
    // Adapted from DeepSeek SuperAgent's assignment/input lifecycle (MIT,
    // 8c32a9dc5d72c033816c6a8110b37f40cf94fba4, src/core/assignments.ts and
    // src/app/delivery.ts). Delivery and a session taking input are distinct;
    // neither means the instruction was executed or its outcome verified.
    async queueInput({ assignmentId, sourceId, text: message, revision }) {
      const source = await confirm({ sourceId, text: message });
      return mutate(state => {
        const task = state.assignments.find(item => item.id === assignmentId);
        if (!task || task.revision !== revision) throw Error('Follow-up must name its existing assignment and revision.');
        task.inputs ||= [];
        const previous = task.inputs.find(item => item.sourceId === source.sourceId);
        if (previous) {
          if (previous.contentDigest !== digest(source.text)) throw Error('Original input identity has conflicting content.');
          return previous;
        }
        const item = { id: digest([projectRoot, sessionId, task.id, source.sourceId]), sourceId: source.sourceId, text: source.text, contentDigest: digest(source.text), revision, status: 'queued' };
        task.inputs.push(item);
        return item;
      });
    },
    async deliverInput({ assignmentId, inputId }) {
      const { task, item } = assignmentInput(current(), assignmentId, inputId);
      if (item.status !== 'queued') return structuredClone(item);
      if (!host.deliverInput) throw Error('A trusted input delivery host is required.');
      let message = item.text;
      if (item.textTruncated) {
        message = read().messages.find(value => (value.id === item.sourceId || value.sourceMessageId === item.sourceId) && digest(text(value.message)) === item.contentDigest)?.message;
        if (!message) throw Error('Recover the original source before delivering a shortened input.');
      }
      // Persist intent first. An interrupted delivery must be reconciled, never blindly repeated.
      const attempted = mutate(state => {
        const value = assignmentInput(state, assignmentId, inputId).item;
        if (value.status !== 'queued') return false;
        value.status = 'uncertain'; return true;
      });
      if (!attempted) return assignmentInput(current(), assignmentId, inputId).item;
      let result;
      // Queueing does not authorise a new turn; the native owner retains its own slot admission.
      try { result = await host.deliverInput({ projectRoot, sessionId, mode: 'queue', assignment: structuredClone(task), input: { ...structuredClone(item), text: message } }); }
      catch (error) { result = { status: 'uncertain' }; }
      return recordInputObservation(assignmentId, inputId, result);
    },
    async reconcileInput({ assignmentId, inputId }) {
      const { task, item } = assignmentInput(current(), assignmentId, inputId);
      if (item.status === 'taken') return structuredClone(item);
      if (!host.reconcileInput) throw Error('The original input and trusted reconciliation route are required.');
      let result;
      try { result = await host.reconcileInput({ projectRoot, sessionId, assignment: structuredClone(task), input: structuredClone(item) }); }
      catch (error) { result = { status: 'uncertain' }; }
      return recordInputObservation(assignmentId, inputId, result);
    },
    ask({ id, question, revision, required = true, criteriaIds = ['*'] }) {
      return mutate(state => { requireRequest(state, revision); if (!id || state.questions.some(q => q.id === id)) throw Error('Distinct question identity required.'); const item = { id: text(id), question: text(question), revision, required, criteriaIds: criteriaIds.map(text), status: 'unanswered' }; state.questions.push(item); return item; });
    },
    async answer({ questionId, text: answer, sourceId, revision }) {
      const source = await confirm({ text: answer, sourceId });
      return mutate(state => { requireRequest(state, revision); const question = state.questions.find(q => q.id === questionId && q.revision === revision); if (!question) throw Error('Question does not belong to current request.'); question.answer = source; question.status = 'answered'; if (question.required) { const next = digest([revision, source]); state.request.revision = next; for (const item of [...state.questions, ...state.decisions]) if (item.revision === revision) item.revision = next; for(const item of state.outcomes.filter(row=>row.revision===revision)){item.evidenceRevision ||= revision; const affected=question.criteriaIds.includes('*') || (item.criteriaIds||['*']).includes('*') || item.criteriaIds.some(id=>question.criteriaIds.includes(id)); if(affected)item.status='unverified';else item.revision=next;} for(const item of state.assignments.filter(row=>row.revision===revision)){if((item.questionIds||[]).includes(questionId))item.status='needs-replan';else item.revision=next;} } return { ...question, requestRevision: state.request.revision }; });
    },
    decide({ id, questionId, text: decision, revision }) {
      return mutate(state => { requireRequest(state, revision); const question = state.questions.find(q => q.id === questionId && q.revision === revision && q.status === 'answered'); if (!question) throw Error('A decision requires its confirmed source answer.'); const item = { id: text(id), questionId, text: text(decision), sourceId: question.answer.sourceId, revision, classification: 'application interpretation of confirmed answer' }; state.decisions.push(item); return item; });
    },
    async select({ request, stage = 'work', catalog, decide, history, ...rest } = {}) {
      // The native hook has just read this same immutable-source snapshot.
      // Selection grants no authority; mutating operations still read afresh.
      const state = current(history);
      let capabilities = {};
      try { capabilities = await host.capabilities?.() || {}; } catch { /* Unknown is not unavailable proof. */ }
      const adopted = privateMethods().map(privateEntry);
      const selection = await selectRoute({ ...rest, request: request ?? state.request?.text ?? '', stage, taskContext: { history: rest.taskContext, request: state.request, decisions: state.decisions.filter(item => item.revision === state.request?.revision), questions: state.questions.filter(item => item.revision === state.request?.revision), availableTools: capabilities.tools }, catalog: [...(catalog || discoverCatalog({ projectRoot })), ...adopted], availableModels: capabilities.models || [], policy: { ...rest.policy, availableTools: capabilities.tools } }, { decide });
      // Adopted private procedures supplement matching local tasks, never the shared catalogue.
      return { ...selection, ...(privateGap?{missing:[...selection.missing,{capability:'private-procedures',reason:privateGap}]}:{}), privateMethods: [], capabilityStatus: host.capabilities ? 'host-reported' : 'unknown', requestRevision: state.request?.revision ?? null };
    },
    async assign({ id, owner, resourcePool, paths = [], revision, instruction, questionIds }) {
      const state = current(); requireRequest(state, revision);
      questionIds ??= state.questions.filter(q=>q.required && q.revision===revision).map(q=>q.id);
      if (state.questions.some(q => q.revision === revision && questionIds.includes(q.id) && q.required && q.status === 'unanswered')) throw Error('An unanswered required question blocks dependent assignment.');
      if (!id || !owner) throw Error('Assignment and owner identities required.');
      paths = paths.map(ownedPath);
      const collision = next => next.assignments.some(a => ['assigned','uncertain'].includes(a.status) && paths.some(p => a.paths.some(old => overlaps(p,old))));
      if (collision(state)) throw Error('A shared path already has an owner.');
      if (paths.length && (!host.reservePaths || !host.releasePaths)) throw Error('A trusted project-wide path reservation host is required.');
      const pathReservation = paths.length ? await host.reservePaths({projectRoot,sessionId,assignmentId:id,paths}) : null;
      if(paths.length && (!pathReservation?.id || pathReservation.granted!==true))throw Error('A shared path already has an owner or could not be reserved.');
      let reservation = null;
      if (resourcePool) {
        if (!host.reserve) { if(pathReservation)await host.releasePaths(pathReservation.id); throw Error('No trusted reservation capability.'); }
        reservation = await host.reserve({ projectRoot, sessionId, assignmentId: id, resourcePool });
        if (!reservation?.id || reservation.granted !== true) { if(pathReservation)await host.releasePaths(pathReservation.id); throw Error('Capacity could not be reserved.'); }
      }
      try { return mutate(next => { requireRequest(next, revision); if (collision(next)) throw Error('A shared path already has an owner.'); if (next.assignments.some(a => a.id === id)) throw Error('Assignment already exists; reconcile it instead of replaying.'); const item = { id: text(id), owner: text(owner), paths, revision, questionIds, instruction: text(instruction), reservationId: reservation?.id || null,pathReservationId:pathReservation?.id||null, status: 'assigned', operationId: digest([projectRoot, sessionId, id]) }; next.assignments.push(item); return item; }); }
      catch (error) { if (reservation) await host.release?.(reservation.id);if(pathReservation)await host.releasePaths(pathReservation.id); throw error; }
    },
    async execute({ id, revision }) {
      const state = current(); requireRequest(state, revision);
      const task = state.assignments.find(item => item.id === id && item.revision === revision);
      if (!task || task.status !== 'assigned' || !host.execute) throw Error('Assignment is unavailable or already attempted; reconcile its original operation.');
      const authority = await host.authorizeExecution?.({ request: state.request, task: structuredClone(task) });
      if (authority?.allowed !== true || !authority.sourceId) throw Error('The owning host has not confirmed authority for this execution.');
      mutate(next => { requireRequest(next, revision); const pending = next.assignments.find(item => item.id === id); if (pending.status !== 'assigned') throw Error('Assignment is already attempted; reconcile it.'); pending.status = 'uncertain'; });
      const result = await host.execute({ ...task, projectRoot, sessionId });
      const updated = mutate(next => { const item = next.assignments.find(item => item.id === id); item.status = completedObservation(result, item) ? 'completed' : 'uncertain'; item.result = { status: item.status, source: text(result?.source), observationId: text(result?.observationId), ...(Object.hasOwn(result || {}, 'backgroundWork') ? { backgroundWork: sanitizeRecord(result.backgroundWork) } : {}) }; return item; });
      if (updated.status === 'completed') await releaseCompleted(updated);
      return updated.result;
    },
    async reconcile({id}) {
      const task=current().assignments.find(item=>item.id===id);
      if(!task || !host.reconcile)throw Error('Original assignment and trusted reconciliation route required.');
      const result=await host.reconcile({...task,projectRoot,sessionId});
      const recorded=mutate(state=>{const item=state.assignments.find(value=>value.id===id);item.status=completedObservation(result,item)?'completed':'uncertain';item.result={status:item.status,source:text(result?.source),observationId:text(result?.observationId),...(Object.hasOwn(result||{},'backgroundWork')?{backgroundWork:sanitizeRecord(result.backgroundWork)}:{})};return item;});
      if(recorded.status==='completed')await releaseCompleted(recorded);
      return recorded;
    },
    async verifyOutcome({ id, revision, candidate, expectation, criteriaIds = ['*'] }) {
      const state = current(); requireRequest(state, revision);
      const observation = await host.observeOutcome?.({ projectRoot, sessionId, id, revision, candidate, expectation });
      const valid = observation?.status === 'observed' && observation.source && observation.observationId && observation.revision === revision && observation.candidate === candidate && observation.matches === true;
      return mutate(next => { requireRequest(next, revision); const item = { id: text(id), revision, criteriaIds:criteriaIds.map(text), candidate: text(candidate), expectation: text(expectation), status: valid ? 'verified' : 'unverified', source: text(observation?.source), observationId: text(observation?.observationId) }; next.outcomes.push(item); return item; });
    },
    proposeImprovement({ id, name, match, body, revision, evidenceEventId }) {
      const nativeSource=revision===undefined&&evidenceEventId?read().events.find(event=>event.id===evidenceEventId&&(isHumanSource(event)||event.tool&&event.event!=='PreToolUse'&&(event.tool.outcome==='host-reported-error'||Number.isSafeInteger(event.tool.exitCode)&&event.tool.exitCode!==0))):null;
      return mutate(state => { if(!nativeSource)requireRequest(state, revision); if (!id || state.improvements.some(item => item.id === id)) throw Error('Distinct improvement identity required.'); const cleanBody = text(body); const item = { id: text(id), name: text(name), description: text(match), body: cleanBody, version: digest(cleanBody), ...(nativeSource?{evidenceEventId:nativeSource.id,sourceScope:'native-evidence-only; no accepted task or authority inferred'}:{revision}), status: 'proposed', scope: 'private-procedure' }; state.improvements.push(item); return item; });
    },
    async evaluateImprovement({ id }) {
      const item = current().improvements.find(value => value.id === id);
      if (!item || !host.evaluateImprovement) throw Error('A candidate and trusted real evaluator are required.');
      const result = await host.evaluateImprovement({ projectRoot, sessionId, candidate: structuredClone(item) });
      const benefit = result?.baseline?.observationId && result.baseline.observationId !== result.observationId && Array.isArray(result.baseline.cases) && result.baseline.cases.some(before=>before.passed===false && before.observationId && result.cases?.some(after=>(after.id||after.kind)===(before.id||before.kind)&&after.passed===true&&after.observationId!==before.observationId));
      const passed = benefit && result?.candidateVersion === item.version && result.source && result.observationId && Array.isArray(result.cases) && result.cases.length >= 2 && result.cases.every(row => row.passed === true && row.observationId) && result.cases.some(row => row.kind === 'regression') && result.cases.some(row => row.kind === 'unseen');
      return mutate(state => { const next = state.improvements.find(value => value.id === id); if (next.version !== item.version) throw Error('Candidate changed during evaluation.'); next.status = passed ? 'tested' : 'rejected'; next.evaluation = { source: text(result?.source), observationId: text(result?.observationId), candidateVersion: item.version, baseline:sanitizeRecord(result?.baseline||null), cases: sanitizeRecord(result?.cases || []).slice(0, 30) }; if(passed&&host.autoAdoptImprovements!==false){next.status='adopted';publishPrivate(next);} return next; });
    },
    adoptImprovement({ id }) {
      return mutate(state => { const item = state.improvements.find(value => value.id === id); if (!['tested','adopted'].includes(item?.status)) throw Error('Only a tested private procedure can be adopted.'); item.status = 'adopted'; publishPrivate(item); return item; });
    },
    rollbackImprovement({ id }) { return mutate(state => { const item = state.improvements.find(value => value.id === id); if (!item) throw Error('Unknown improvement.'); item.status = 'withdrawn'; publishPrivate(item); return item; }); },
  };
}

export function renderFoundationBrief(state, { maxChars = 4000 } = {}) {
  const view = { request: state.request, unanswered: state.questions?.filter(q => q.status === 'unanswered' && q.revision === state.request?.revision), decisions: state.decisions?.filter(d => d.revision === state.request?.revision), assignments: state.assignments?.filter(a => a.revision === state.request?.revision), outcomes: state.outcomes?.filter(o => o.revision === state.request?.revision) };
  return `Current application-confirmed task view (source-attributed; native human messages remain authoritative). ${state.partial || state.partialView ? 'History is partial. ' : ''}${state.request ? '' : 'No application-confirmed request revision; use the actual conversation, do not invent permission. '}\n${JSON.stringify(view).slice(0, Math.max(0, maxChars - 300))}`;
}
