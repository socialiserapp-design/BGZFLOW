import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {readContinuity} from './continuity.mjs';
import {createFoundationSession} from './session.mjs';
import {createExecutableChecks} from './executable-checks.mjs';
import {writablePath} from '../../hooks/lib/owned-path.mjs';

const hash = text => createHash('sha256').update(text).digest('hex');
export const observedFailure = event => Boolean(event?.tool && event.event !== 'PreToolUse' &&
  (event.tool.outcome === 'host-reported-error' || Number.isSafeInteger(event.tool.exitCode) && event.tool.exitCode !== 0));
const outside = (project, file) => {const relative=path.relative(project,file);return relative==='..'||relative.startsWith('..'+path.sep)||path.isAbsolute(relative);};

// This is a private OWNER configuration, not a project file, candidate field or
// generated check. Native agents must not author/alter it to certify their work.
// Full-access agents still require real host/OS isolation from owner checks.
function ownerChecks(projectRoot, home) {
  const file=path.join(home,'.bgzflow','native-learning','checks.json');
  if(!fs.existsSync(file))return {status:'unavailable',reason:'No owner-configured local evaluator; proposals remain unverified.'};
  try {
    writablePath(file);if(fs.statSync(file).size>100000)throw Error('oversized');
    const value=JSON.parse(fs.readFileSync(file,'utf8'));
    const config=value.schema===1&&value.projects?.[hash(projectRoot)];
    if(!config||config.projectRoot!==projectRoot||!outside(projectRoot,fs.realpathSync.native(file)))throw Error('not configured');
    const checks=config.improvementChecks;
    if(!Array.isArray(checks)||!checks.some(c=>c.kind==='regression')||!checks.some(c=>c.kind==='unseen')||!config.baselineCandidate)throw Error('incomplete');
    for(const check of checks){
      if(!check.command||check.command.file!==process.execPath||!Array.isArray(check.command.args)||!check.command.args.every(x=>typeof x==='string')||!Array.isArray(check.sources)||!check.sources.length)throw Error('invalid');
      for(const source of check.sources){
        writablePath(source);const actual=fs.realpathSync.native(source);
        if(!outside(projectRoot,actual)||check.sourceDigests?.[source]!==hash(fs.readFileSync(actual)))throw Error('untrusted check');
      }
      if(!check.sources.some(source=>check.command.args.includes(source)))throw Error('unchecked entry');
    }
    return {status:'configured',checks:createExecutableChecks({projectRoot,improvementChecks:checks,baselineCandidate:config.baselineCandidate}),file};
  }catch{return {status:'unavailable',reason:'Owner evaluator is missing, changed or invalid; no candidate checks executed.'};}
}

/** Called by the current agent on useful observed learning, never a background
 * model job. All check commands come from owner configuration or a trusted host. */
export function createNativeLearning({projectRoot,sessionId,storageRoot,home=os.homedir(),host}={}) {
  projectRoot=fs.realpathSync.native(projectRoot);
  if(typeof sessionId!=='string'||!sessionId)throw Error('Current native session required.');
  const input={cwd:projectRoot,session_id:sessionId},options=storageRoot?{storageRoot}:{};
  const evaluator=host?{status:'configured',checks:host}:ownerChecks(projectRoot,home);
  const session=createFoundationSession({projectRoot,sessionId,storageRoot,host:evaluator.checks||{}});
  const history=()=>readContinuity(input,options);
  const status=()=>{
    const state=session.current(),records=history();
    return {status:'available',checks:evaluator.status,reason:evaluator.reason,
      failures:records.events.filter(observedFailure).slice(-8).map(event=>({eventId:event.id,tool:event.tool.name,exitCode:event.tool.exitCode,at:event.at,classification:'Recorded tool failure, not a diagnosis or product outcome.'})),
      proposals:(state.improvements||[]).map(item=>({id:item.id,name:item.name,status:item.status,evidenceEventId:item.evidenceEventId})),
      adopted:session.privateCatalogue().map(item=>({id:item.id,name:item.name,version:item.version})),partial:records.partial};
  };
  return {
    status,
    async propose(payload={}){
      const records=history(),evidence=records.events.find(event=>event.id===payload.evidenceEventId);
      if(!evidence||!observedFailure(evidence)&&!records.messages.some(event=>event.id===evidence.id))throw Error('An actual captured failure or human feedback source is required.');
      const state=session.current();
      const id='native-'+hash(JSON.stringify([evidence.id,payload.name,payload.body])).slice(0,16);
      const old=state.improvements.find(item=>item.id===id);
      if(old)return {status:old.status,id,checks:evaluator.status,reused:true};
      if(typeof payload.body!=='string'||!payload.body.trim()||payload.body.length>12000||typeof payload.name!=='string'||!payload.name.trim())throw Error('A complete text procedure within the existing session storage allowance and a name are required.');
      // Learning provenance is not task acceptance: a status question or feedback
      // source must never replace or manufacture the application's current goal.
      session.proposeImprovement({id,name:payload.name,match:payload.description||payload.name,body:payload.body,evidenceEventId:evidence.id});
      if(evaluator.status!=='configured')return {status:'proposed',id,checks:'unavailable',reason:evaluator.reason};
      const result=await session.evaluateImprovement({id});return {status:result.status,id,checks:'configured'};
    },
    async evaluate({id}={}){
      if(evaluator.status!=='configured')return {status:'unverified',id,reason:evaluator.reason};
      const result=await session.evaluateImprovement({id});return {status:result.status,id};
    },
    rollback({id}={}){const result=session.rollbackImprovement({id});return {status:result.status,id};},
  };
}
