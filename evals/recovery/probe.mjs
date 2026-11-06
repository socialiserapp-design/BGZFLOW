import fs from 'node:fs';
const request=JSON.parse(fs.readFileSync(new URL('./intent.json',import.meta.url),'utf8'));
const service=JSON.parse(fs.readFileSync(new URL('./service.json',import.meta.url),'utf8'));
const operations=JSON.parse(fs.readFileSync(service.database,'utf8'));
let serverAlive=false;try{process.kill(service.pid,0);serverAlive=true}catch{}
console.log(JSON.stringify({operationId:request.operationId,saved:operations[request.operationId]||null,serverAlive}));
