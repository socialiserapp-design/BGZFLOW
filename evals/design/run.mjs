import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {cases} from './cases.mjs';
import {gradeRoute} from './grade.mjs';

export function parseArguments(args){
  if(!args.includes('--live'))throw Error('No network calls made. Supply --live explicitly to run the optional Jev evaluation.');
  const allowed=new Set(['--live','--plugin','--output','--catalogue','--cases']);const values={};
  for(let i=0;i<args.length;i++){const key=args[i];if(!allowed.has(key))throw Error('Unknown evaluation argument.');if(key==='--live')continue;const value=args[++i];if(!value||value.startsWith('--'))throw Error('Missing evaluation argument value.');if(values[key])throw Error('Duplicate evaluation argument.');values[key]=value;}
  if(!values['--plugin']||!values['--output'])throw Error('Supply a reviewed built --plugin directory and a new --output directory.');
  const catalogue=values['--catalogue']||'package';
  if(!['package','installed'].includes(catalogue))throw Error('Catalogue must be package or installed.');
  const caseIds=values['--cases']?.split(',');
  if(caseIds&&(!caseIds.length||new Set(caseIds).size!==caseIds.length||caseIds.some(id=>!cases.some(item=>item.id===id))))throw Error('Case filter must contain unique known case identifiers.');
  return {plugin:path.resolve(values['--plugin']),output:path.resolve(values['--output']),catalogue,caseIds};
}

/** Imports and calls only the explicitly supplied built plugin's existing APIs. */
export async function runDesignEvaluation({plugin,output,catalogue='package',caseIds},write=console.log){
  plugin=fs.realpathSync.native(plugin);
  for(const relative of ['plugin.json','vendor/typesafe.mjs','tools/foundation/catalog.mjs','tools/foundation/router.mjs','tools/foundation/jev-provider.mjs'])if(!fs.statSync(path.join(plugin,relative)).isFile())throw Error('A complete reviewed built plugin is required.');
  if(JSON.parse(fs.readFileSync(path.join(plugin,'plugin.json'),'utf8')).name!=='bgzflow')throw Error('Expected a BGZFLOW build.');
  if(fs.existsSync(output))throw Error('Output already exists; choose a new directory to preserve earlier evidence.');
  fs.mkdirSync(output,{recursive:true});
  const module=relative=>import(pathToFileURL(path.join(plugin,relative)).href);
  const [{discoverCatalog},{selectRoute,loadSelectedSkills},{createJevDecider,sanitizeRoutingData}]=await Promise.all([module('tools/foundation/catalog.mjs'),module('tools/foundation/router.mjs'),module('tools/foundation/jev-provider.mjs')]);
  // Installed mode uses the actual global libraries and current package without
  // loading a private project's history or invoking its methods.
  const catalog=catalogue==='installed'?discoverCatalog({pluginRoot:plugin}):discoverCatalog({roots:[path.join(plugin,'skills')]});
  const selectedCases=caseIds?cases.filter(item=>caseIds.includes(item.id)):cases;
  const save=(name,value)=>fs.writeFileSync(path.join(output,name),JSON.stringify(sanitizeRoutingData(value),null,2)+'\n',{flag:'wx'});
  save('invocation.json',{plugin,version:JSON.parse(fs.readFileSync(path.join(plugin,'plugin.json'),'utf8')).version,cases:selectedCases,scope:catalogue==='installed'?'Actual installed global libraries plus current package; no project history or method execution.':'Reviewed built plugin skills only. No task execution or private project data.',catalog:catalog.map(({id,name,version})=>({id,name,version}))});
  const results=[];
  for(const testcase of selectedCases){
    const phases=[];let selection,bodies=[],error,primaryId;
    const decider=createJevDecider();
    try{
      selection=await selectRoute({request:testcase.request,stage:testcase.stage,catalog,availableModels:[],budget:{timeoutMs:60000,maxCalls:32}},{decide:async input=>{
        const result=await decider(input);
        phases.push({phase:input.phase,result});
        if(input.phase==='verify')primaryId=result.primaryId;
        return result;
      }});
      bodies=await loadSelectedSkills(selection);
    }catch(caught){error=caught?.message||'Evaluation error';}
    const grade=gradeRoute(testcase,{selection,primaryId,bodies,error});
    const record={case:testcase.id,request:testcase.request,selection,phases,primaryId,error,loaded:bodies.map(({id,name,body})=>({id,name,characters:body?.length||0,bodyDigest:createHash('sha256').update(body||'').digest('hex')})),grade};
    save(`${testcase.id}.json`,record);if(!grade.pass&&!fs.existsSync(path.join(output,'first-failure.json')))save('first-failure.json',record);
    results.push({case:testcase.id,...grade});write(`${testcase.id}: ${grade.pass?'PASS':'FAIL'}${grade.reasons.length?' — '+grade.reasons.join(' '):''}`);
  }
  save('summary.json',{passed:results.filter(item=>item.pass).length,total:results.length,results,limitation:'Routing/body-delivery evaluation only. It does not execute design work or establish a baseline improvement.'});
  return results.every(item=>item.pass)?0:1;
}

if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url){
  try{process.exitCode=await runDesignEvaluation(parseArguments(process.argv.slice(2)));}
  catch{console.error('Design evaluation did not complete. Require --live, a reviewed built --plugin, and a new --output directory. Existing evidence is never overwritten.');process.exitCode=2;}
}
