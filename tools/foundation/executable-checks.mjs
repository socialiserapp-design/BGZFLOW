import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { randomUUID, createHash } from 'node:crypto';
import { sanitize } from '../../hooks/lib/secrets.mjs';

/** Fixed, owner-configured check commands. No command is accepted from a candidate. */
export function createExecutableChecks({ projectRoot, outcomeChecks = {}, improvementChecks = [], baselineCandidate, timeoutMs = 30000 } = {}) {
  projectRoot = fs.realpathSync(projectRoot);
  const hashFile=file=>createHash('sha256').update(fs.readFileSync(file)).digest('hex');
  const pin=check=>({...check,command:{file:check.command.file,args:[...check.command.args]},pins:(check.sources||[]).map(file=>({file:fs.realpathSync(file),hash:hashFile(file)}))});
  outcomeChecks=Object.fromEntries(Object.entries(outcomeChecks).map(([id,check])=>[id,pin(check)]));
  improvementChecks=improvementChecks.map(pin);
  function run(check, input) {
    if (!check || typeof check.command?.file !== 'string' || !Array.isArray(check.command.args) || !check.command.args.every(a=>typeof a==='string')) throw Error('An owner-configured check command is required.');
    const observationId = randomUUID();
    const unchanged=()=>check.pins.every(pin=>hashFile(pin.file)===pin.hash);
    if(!unchanged())return {observationId,source:sanitize(check.id),matches:false,error:'Trusted check source changed.'};
    const before=check.currentTarget?check.currentTarget():check.target;
    const result = spawnSync(check.command.file,check.command.args,{cwd:projectRoot,input:JSON.stringify(input),encoding:'utf8',shell:false,windowsHide:true,timeout:timeoutMs,maxBuffer:128000});
    let report;try {report=JSON.parse(result.stdout||'{}');}catch {report=null;}
    const after=check.currentTarget?check.currentTarget():check.target;
    const targetMatches=!input.revision || (before?.candidate===input.candidate && after?.candidate===input.candidate && before?.revision===input.revision && after?.revision===input.revision && before?.projectRoot===projectRoot && after?.projectRoot===projectRoot);
    return {observationId,source:sanitize(check.id||path.basename(check.command.file)),matches:result.status===0&&!result.error&&report?.matches===true&&targetMatches&&unchanged(),exitCode:result.status,error:result.error?sanitize(result.error.code||'check failed'):!targetMatches?'Current target identity was not established.':undefined};
  }
  return {
    observeOutcome(input) {
      const check=outcomeChecks[input.id];
      if(!check)return {status:'unavailable',revision:input.revision,candidate:input.candidate};
      return {...run(check,input),status:'observed',revision:input.revision,candidate:input.candidate};
    },
    evaluateImprovement({candidate}) {
      // These are tests of a text procedure through an existing trusted harness,
      // not permission to execute a code file supplied by the candidate.
      const cases=improvementChecks.map(check=>({...run(check,{candidate}),kind:check.kind})).map(row=>({...row,passed:row.matches}));
      const baseline=baselineCandidate?{observationId:randomUUID(),cases:improvementChecks.map(check=>({...run(check,{candidate:baselineCandidate}),kind:check.kind})).map(row=>({...row,passed:row.matches}))}:null;
      return {candidateVersion:candidate.version,source:'owner-configured executable checks',observationId:randomUUID(),baseline,cases};
    },
  };
}
