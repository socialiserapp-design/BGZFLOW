import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {historyDelivery} from './history-delivery.mjs';

const file=fileURLToPath(new URL('../../skills/bg-efficiency/references/startup.md',import.meta.url));
/** Small, deterministic instruction delivery; no catalogue, model or history search. */
export function efficiencyBaseline(state,{workerKey}={}){
  try{
    if(!state?.dir)return '';
    const stat=fs.lstatSync(file);
    if(!stat.isFile()||stat.isSymbolicLink()||stat.size>4096)return '';
    const text=fs.readFileSync(file,'utf8').trim();
    if(!text)return '';
    const claim=historyDelivery(state);
    return claim(`efficiency-baseline:${workerKey||'session'}`)?text:'';
  }catch{return '';}// Optional guidance never blocks ordinary work.
}
