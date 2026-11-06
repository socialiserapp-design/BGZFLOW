import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {writablePath,writeOwnedFile} from '../../hooks/lib/owned-path.mjs';

const digest=value=>createHash('sha256').update(value).digest('hex');
// Delivery hints are scoped to actual source items and a native context reset,
// never to a changing rendered summary. Originals remain the source of truth.
export function historyDelivery(state,{ephemeral=false}={}) {
  const reset=state.events.findLast(event=>event.event==='PostCompact'||(event.event==='SessionStart'&&['compact','clear'].includes(event.source)));
  let generation=reset?digest(reset.id):'initial';
  if(!ephemeral&&state.dir){
    const hint=path.join(path.dirname(state.dir),'history-context.txt');
    writablePath(hint);
    let previous='initial';
    if(fs.existsSync(hint)&&fs.statSync(hint).size<=128){const value=fs.readFileSync(hint,'utf8').trim();if(/^(?:initial|[a-f0-9]{64})$/.test(value))previous=value;}
    // Keep the reset identity after it ages outside a bounded source read.
    if(!reset)generation=previous;
    if(generation!==previous)writeOwnedFile(hint,generation+'\n');
  }
  const fileFor=key=>path.join(path.dirname(state.dir),'history-delivery',digest(`${generation}:${key}`)+'.claim');
  const claim=key=>{
    if(ephemeral)return true; // AGY explicitly supplies invocation-only context.
    if(!state.dir)return false;
    const directory=path.join(path.dirname(state.dir),'history-delivery');
    writablePath(directory,{create:true,directory:true});
    const file=fileFor(key);
    writablePath(file);
    try{const fd=fs.openSync(file,'wx',0o600);fs.closeSync(fd);return true;}
    catch(error){if(error.code==='EEXIST')return false;throw error;}
  };
  claim.has=key=>{
    if(ephemeral||!state.dir||!fs.existsSync(path.join(path.dirname(state.dir),'history-delivery')))return false;
    return fs.existsSync(writablePath(fileFor(key)));
  };
  return claim;
}
