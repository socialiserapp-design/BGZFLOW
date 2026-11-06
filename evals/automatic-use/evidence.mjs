import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';

// Only this evaluation's owned store; never read global private history.
export function readEvents(run,workspace){
  const rows=[];let files=0;
  function scan(dir,depth){if(depth>5||!fs.existsSync(dir))return;
    for(const item of fs.readdirSync(dir,{withFileTypes:true})){
      if(item.isSymbolicLink())continue;const file=path.join(dir,item.name);
      if(item.isDirectory())scan(file,depth+1);
      else if(item.isFile()&&item.name.endsWith('.json')){
        if(++files>6000)throw Error('Evaluation event coverage exceeded its bounded reader; unverified.');
        if(fs.statSync(file).size>200000)continue;
        try{const row=JSON.parse(fs.readFileSync(file,'utf8'));if(row.schema===1&&path.resolve(row.projectRoot||'')===path.resolve(workspace))rows.push(row);}catch{}
      }
    }
  }scan(path.join(run,'continuity'),0);return rows.sort((a,b)=>a.at.localeCompare(b.at)||String(a.order).localeCompare(String(b.order)));
}

export function methodCoverage(events,names){
  const routes=events.filter(row=>row.event==='RouteSelected'&&['selected','partial'].includes(row.selection?.status));
  const groups=names.map(name=>Array.isArray(name)?name:[name]);
  const selected=groups.every(group=>routes.some(row=>row.selection.selected?.some(method=>group.includes(method.name))));
  // Host context preparation is observable; cognitive reading is not.
  const prepared=groups.every(group=>events.some(row=>row.event==='MethodContextPrepared'&&row.delivery?.methods?.some(method=>group.includes(method.name)&&(method.provided===true||method.procedureProvided===true&&row.delivery.methods.some(other=>other.id===method.duplicateOf&&other.provided===true))&&Number.isInteger(method.characters)&&method.characters>0&&/^[a-f0-9]{64}$/.test(method.bodyDigest||''))));
  return {selected,prepared,routeStages:[...new Set(routes.map(row=>row.selection.stage).filter(Boolean))],...(routes.some(row=>row.selection.status==='partial')?{incompleteComparison:true}:{})};
}

export function preparedFromReviewedPackage(events,names,{reviewedRoot,actualRoot}){
  try{
    return names.every(group=>(Array.isArray(group)?group:[group]).some(name=>{
      if(!/^[a-z0-9-]+$/.test(name))return false;
      const file=fs.realpathSync.native(path.join(actualRoot,'skills',name,'SKILL.md'));
      const body=fs.readFileSync(path.join(reviewedRoot,'skills',name,'SKILL.md'),'utf8');
      const digest=createHash('sha256').update(body).digest('hex');
      const id='skill-'+createHash('sha256').update(file).digest('hex').slice(0,24);
      return events.some(event=>event.event==='MethodContextPrepared'&&event.delivery?.methods?.some(method=>method.name===name&&method.id===id&&method.version===digest&&method.bodyDigest===digest&&method.characters===body.length&&(method.provided===true||method.procedureProvided===true&&event.delivery.methods.some(other=>other.id===method.duplicateOf&&other.provided===true))));
    }));
  }catch{return false;}
}
