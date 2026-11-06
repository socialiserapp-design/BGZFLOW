const fs=require('node:fs');const path=require('node:path');const {pathToFileURL}=require('node:url');
const {observedTools}=require('../foundation/assertions.cjs');
module.exports=async(output,context)=>{
  const workspace=context.providerResponse?.metadata?.workingDir||context.providerResponse?.metadata?.codexAppServer?.cwd;
  if(!workspace)return {pass:false,score:0,reason:'Native workspace unavailable; actual effects unverified.'};
  const load=name=>import(pathToFileURL(path.join(__dirname,name)).href);
  const [{cases},{grade},{readEvents,preparedFromReviewedPackage}]=await Promise.all([load('cases.mjs'),load('grade.mjs'),load('evidence.mjs')]);
  const testcase=cases.find(c=>c.id===context.vars.caseId),run=context.vars.runDirectory;
  const events=readEvents(run,workspace);
  if(context.vars.workerProvider==='codex'){
    let preflight;try{preflight=JSON.parse(fs.readFileSync(path.join(run,'hook-preflight.json')))}catch{}
    if(!preflight?.ready||preflight.pluginId!==context.vars.pluginId||!preflight.packageIdentity?.matches||!preparedFromReviewedPackage(events,testcase.methods,{reviewedRoot:context.vars.pluginRoot,actualRoot:preflight.packageIdentity.actualRoot}))return {pass:false,score:0,reason:'The exact reviewed candidate package and its prepared operative bodies were not established by native evidence.'};
  }
  const result=grade({testcase,workspace,before:JSON.parse(fs.readFileSync(path.join(run,'workspace-before.json'))),events,calls:observedTools(context.providerResponse),output,evidenceRoot:fs.mkdtempSync(path.join(run,'owner-probes-')),pluginRoot:context.vars.pluginRoot});
  fs.writeFileSync(path.join(run,'owner-grade.json'),JSON.stringify(result,null,2),{flag:'wx'});
  return {pass:result.pass,score:result.pass?1:0,reason:result.pass?'Observed method preparation/use and actual saved effects passed the bounded checks.':result.reasons.join(' ')};
};
