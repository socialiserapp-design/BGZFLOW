import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/** Portable default, with private owner preferences kept outside the package. */
export function projectDecisionFiles(projectRoot,options={}) {
  if(!projectRoot)return [];
  let names=options.decisionFiles;
  if(names===undefined){
    try{
      const file=path.join(options.home||process.env.BGZFLOW_CONTEXT_HOME||os.homedir(),'.bgzflow','context.json');
      if(fs.statSync(file).size<=20000)names=JSON.parse(fs.readFileSync(file,'utf8')).decisionFiles;
    }catch{/* An optional local preference is not a prerequisite. */}
  }
  if(!Array.isArray(names))names=['DECISIONS.md'];
  const root=fs.realpathSync(projectRoot);
  return [...new Set(names)].flatMap(name=>{
    if(typeof name!=='string'||!name.endsWith('.md')||path.basename(name)!==name||/[\\/]/.test(name))return [];
    const file=path.join(root,name);
    try{if(path.dirname(fs.realpathSync(file))!==root)return [];}catch{return [];}
    return [file];
  });
}
