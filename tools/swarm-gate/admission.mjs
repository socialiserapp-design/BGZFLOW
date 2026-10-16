import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';

const SHA=/^[a-f0-9]{40}(?:[a-f0-9]{24})?$/i;
const failed=reason=>({allowed:false,reason});
export function evidenceFile(root,name,max=262144) {
  if(typeof name!=='string'||!name)throw new Error('evidence path missing');
  const file=path.resolve(root,name),canonical=fs.realpathSync(file),relative=path.relative(fs.realpathSync(root),canonical);
  if(relative.startsWith('..')||path.isAbsolute(relative)||/(?:^|[/\\])(?:auth\.json|\.env(?:\..*)?|credentials|[^/\\]*\.(?:pem|key))(?=$|[/\\])/i.test(name+'\n'+canonical))throw new Error('credential or outside evidence path refused');
  if(fs.statSync(canonical).size>max)throw new Error('evidence exceeds bounded size');
  return fs.readFileSync(canonical,'utf8');
}
export function outputCounts(output) {
  const numeric=label=>{const m=[...output.matchAll(new RegExp('(?:^|\\n)(?:#|ℹ)\\s*'+label+'\\s+(\\d+)','g'))].at(-1);return m?Number(m[1]):null;};
  const tests=numeric('tests');
  if(tests!==null)return {tests,pass:numeric('pass')??0,fail:(numeric('fail')??0)+(numeric('cancelled')??0),skip:(numeric('skipped')??0)+(numeric('todo')??0)};
  const py=/Ran (\d+) tests? in/.exec(output);
  if(py){const fail=Number(/failures=(\d+)/.exec(output)?.[1]||0)+Number(/errors=(\d+)/.exec(output)?.[1]||0)+Number(/unexpected successes=(\d+)/.exec(output)?.[1]||0),skip=Number(/skipped=(\d+)/.exec(output)?.[1]||0)+Number(/expected failures=(\d+)/.exec(output)?.[1]||0);return {tests:Number(py[1]),pass:Number(py[1])-fail-skip,fail,skip};}
  const files=/RESULT files (\d+) errors (\d+)/.exec(output);if(files)return {files:Number(files[1]),errors:Number(files[2])};
  const pytest=[...output.matchAll(/(\d+) (passed|failed|skipped|xfailed|xpassed|error(?:s)?)/g)];
  if(pytest.length){const values={pass:0,fail:0,skip:0};for(const m of pytest){const k=m[2]==='passed'?'pass':['skipped','xfailed'].includes(m[2])?'skip':'fail';values[k]+=Number(m[1]);}return {tests:values.pass+values.fail+values.skip,...values};}
  return null;
}
const isTest=file=>/(?:^|[/\\])(?:tests?|__tests__)(?:[/\\]|$)|(?:\.test|\.spec)[.]|(?:^|[/\\])test_[^/\\]+\.(?:py|rb)$|_test\.(?:go|py)$/i.test(file);
const isCode=file=>/\.(?:[cm]?[jt]sx?|py|rb|go|rs|java|kt|swift|c|cc|cpp|h|cs|php|sh|ps1|mjs)$/i.test(file);
function forbidden(line) {
  // Fixture strings containing negative examples are data; actual annotations and unfinished comments are not.
  const code=line.replace(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/g,'').replace(/(?<=[=(:,;])\s*\/(?:[^/\\\n]|\\.)+\/[a-z]*/g,'');
  return /\b(?:TODO|TBD|placeholder)\b|\b(?:skip|only|xfail|todo)\s*:\s*true\b|\b(?:test|it|describe)\s*[.]\s*(?:skip|only|todo)\s*\(|pytest[.]mark[.](?:skip|skipif|xfail)\b|@(?:unittest[.])?skip\b/i.test(code);
}
const TIER1_TEST=/(?:tier[-_]?1|invariant|money|billing|charge[-_]once|owner[-_]isolation|tenant[-_]isolation|consent|idempotenc|rollback)/i;
export function admitEvidence(root,handback,{baseSha,sha}={}) {
  try {
    if(!handback||handback.source?.baseSha!==baseSha||handback.source?.sha!==sha||!SHA.test(baseSha||'')||!SHA.test(sha||''))return failed('Handback source proof does not match the piece base and returned SHA.');
    if(handback.verificationStatus==='passed'||handback.outcomeContract?.verificationStatus==='passed'||(handback.verification?.status==='passed'&&(!handback.verification?.verifier||handback.verification.verifier===handback.builder||handback.role==='executor')))return failed('A builder cannot self-certify verification status passed; only an independent verifier (verifier !== builder) may record passed.');
    if(!Array.isArray(handback.checks)||!handback.checks.length)return failed('Handback needs fast-check output with exit codes and counts.');
    let total={},fastOutput='',names=[];const outputs=[];
    for(const check of handback.checks){
      if(!Array.isArray(check.argv)||!check.argv.length||check.exitCode!==0)return failed('Each fast check needs its actual command and passing exit code.');
      const output=evidenceFile(root,check.stdoutFile),counts=outputCounts(output);
      if(!counts||!check.counts||Object.keys(counts).some(k=>check.counts[k]!==counts[k])||Object.keys(check.counts).some(k=>!Object.hasOwn(counts,k)))return failed('Claimed fast-check counts do not match the output.');
      if((counts.fail||counts.errors||counts.skip)||!(counts.tests||counts.files)||(counts.tests!==undefined&&counts.tests!==counts.pass+counts.fail+counts.skip))return failed('Fast-check output includes failures, skips, inconsistent totals or no executed checks.');
      for(const [k,n]of Object.entries(counts))total[k]=(total[k]||0)+n;
      fastOutput+=output+'\n';outputs.push({file:check.stdoutFile,sha256:createHash('sha256').update(output).digest('hex'),exitCode:0,counts});
      names.push(...[...output.matchAll(/(?:# Subtest: |[✓✔]\s+)([^\r\n]+)/g)].map(m=>m[1].replace(/\s*\([\d.]+ms\)$/,'')));
    }
    // Admission is an explicit record operation, not a per-turn hook. Allow bounded Git startup
    // grace under the heavy route's lower priority; ordinary local diffs still return immediately.
    const git=(args)=>{const r=spawnSync('git',args,{cwd:root,encoding:'utf8',timeout:10000,maxBuffer:1048576,stdio:['ignore','pipe','ignore']});if(r.status!==0||r.error)throw new Error(`Exact piece diff unavailable (${r.error?.code||'Git exit '+r.status}).`);return r.stdout;};
    const files=git(['diff','--name-only','--no-renames',baseSha,sha,'--']).trim().split(/\r?\n/).filter(Boolean);
    if(files.some(p=>/(?:^|[/\\])(?:auth\.json|\.env(?:\..*)?|credentials)(?:$|[/\\])/i.test(p)))return failed('Credential-file changes require a separate safe proof; contents are never read.');
    if(files.some(p=>isCode(p)&&!isTest(p))&&!files.some(isTest))return failed('Changed source needs added or changed test files in the same piece.');
    const diff=git(['diff','--no-ext-diff','--unified=0',baseSha,sha,'--',...files]);
    const added=diff.split(/\r?\n/).filter(l=>l.startsWith('+')&&!l.startsWith('+++')).map(l=>l.slice(1));
    if(added.some(forbidden))return failed('New skip, only, xfail, todo, placeholder or TODO marker in changed lines.');
    const audit=handback.audit||{available:false,reason:'jev-audit not installed'};
    if(audit.available===true&&(!Array.isArray(audit.before)||!Array.isArray(audit.after)))return failed('Available jev-audit needs before and after findings in the handback.');
    if(handback.triageMode!==undefined&&!['rebuild','evolve','keep-shared-brain'].includes(handback.triageMode))return failed('Invalid triageMode in handback; expected rebuild, evolve or keep-shared-brain.');
    if(handback.retiredGuards!==undefined){
      if(!Array.isArray(handback.retiredGuards)||handback.retiredGuards.some(g=>!g||typeof g.file!=='string'||!g.file.trim()||typeof g.reason!=='string'||!g.reason.trim()))return failed('Retired source-shape guards must each name the file and reason.');
      if(handback.retiredGuards.length>0&&handback.triageMode&&handback.triageMode!=='rebuild')return failed('Only a rebuild piece may retire brittle source-shape guards.');
      if(handback.retiredGuards.some(g=>TIER1_TEST.test(g.file))&&(!handback.verifierSignOff||typeof handback.verifierSignOff!=='string'||!handback.verifierSignOff.trim()))return failed('Tier-1 behavioural safety tests (money, owner isolation, consent, idempotency, rollback) cannot be retired or weakened without verifierSignOff.');
    }
    if(handback.paidOrExternalWrites===true||handback.operations!==undefined){
      if(!Array.isArray(handback.operations)||!handback.operations.length||handback.operations.some(op=>!op||typeof op.id!=='string'||!op.id.trim()||typeof op.owner!=='string'||!op.owner.trim()||typeof op.intent!=='string'||!op.intent.trim()||typeof op.reconciliationMethod!=='string'||!op.reconciliationMethod.trim())){
        return failed('Paid or external writes require an operation record with id, owner, intent and reconciliationMethod.');
      }
    }
    if(handback.outcomeContract!==undefined){
      const oc=handback.outcomeContract;
      if(!oc||typeof oc!=='object'||typeof oc.used!=='string'||!oc.used.trim()||typeof oc.surfaceEvidence!=='string'||!oc.surfaceEvidence.trim())return failed('Outcome contract in handback needs a plain-English used outcome and surfaceEvidence path.');
      if(/(?:^|[/\\])(?:auth\.json|\.env(?:\..*)?|credentials)(?:$|[/\\])/i.test(oc.surfaceEvidence))return failed('Outcome contract surfaceEvidence cannot reference credential files.');
      if(oc.surfaceStatus==='unavailable'&&oc.claimedLevel==='USED')return failed('An unavailable verification surface stays BUILT and cannot be claimed as USED.');
    }
    const extra={};
    if(handback.triageMode!==undefined)extra.triageMode=handback.triageMode;
    if(handback.retiredGuards!==undefined)extra.retiredGuards=handback.retiredGuards;
    if(handback.operations!==undefined)extra.operations=handback.operations;
    if(handback.outcomeContract!==undefined){
      extra.outcomeContract={
        ...handback.outcomeContract,
        verificationLevel:handback.outcomeContract.surfaceStatus==='unavailable'?'BUILT':'BUILT_READY_FOR_VERIFIER',
      };
    }
    return {allowed:true,counts:total,files,testNames:names,fastOutput:fastOutput.slice(0,32768),diffSummary:`${files.length} changed files; ${added.length} added lines`,outputs,audit,...extra};
  }catch(e){return failed(e.message||'Piece evidence could not be verified.');}
}

