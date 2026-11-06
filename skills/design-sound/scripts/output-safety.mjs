import { lstatSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, parse, resolve } from 'node:path';
export function freshOutput(file) {
 const target=resolve(file);let cursor=parse(target).root;
 for(const bit of target.slice(cursor.length).split(/[\\/]+/).filter(Boolean)){cursor=resolve(cursor,bit);try{const st=lstatSync(cursor);if(st.isSymbolicLink())throw Error('Linked output paths are unsupported');if(cursor===target)throw Error('Output already exists; choose a fresh destination');if(!st.isDirectory())throw Error('Output ancestor is not a directory')}catch(e){if(e.code!=='ENOENT')throw e}}
 return target;
}
export function writeFresh(file,data){const target=freshOutput(file);mkdirSync(dirname(target),{recursive:true});freshOutput(target);writeFileSync(target,data,{flag:'wx'})}
