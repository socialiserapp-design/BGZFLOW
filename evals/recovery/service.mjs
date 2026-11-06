// Disposable loopback fixture: persist a real effect, then lose its HTTP reply.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
const directory=path.resolve(process.argv[2]);
if(!fs.existsSync(path.join(directory,'owned-recovery-fixture.json')))throw Error('Missing owned fixture marker.');
const database=path.join(directory,'operations.json'),events=path.join(directory,'service-events.jsonl');
fs.writeFileSync(database,'{}\n',{flag:'wx'});
const record=event=>fs.appendFileSync(events,JSON.stringify({...event,at:new Date().toISOString()})+'\n');
const server=http.createServer(async(req,res)=>{
  if(req.method!=='POST'||req.url!=='/submit'){res.writeHead(404).end();return;}
  let body='';for await(const chunk of req){body+=chunk;if(body.length>4096){res.writeHead(413).end();return;}}
  let request;try{request=JSON.parse(body)}catch{res.writeHead(400).end();return;}
  if(typeof request.operationId!=='string'||typeof request.customer!=='string'||!['red','blue'].includes(request.colour)){res.writeHead(400).end();return;}
  const saved=JSON.parse(fs.readFileSync(database,'utf8'));
  record({kind:'submission',operationId:request.operationId,alreadyPresent:Object.hasOwn(saved,request.operationId)});
  if(!Object.hasOwn(saved,request.operationId)){
    saved[request.operationId]={...request,status:'saved'};
    fs.writeFileSync(database,JSON.stringify(saved,null,2)+'\n');
    record({kind:'persisted',operationId:request.operationId});
  }
  // This is an actual broken connection after persistence, not a fake receipt.
  req.socket.destroy();
});
server.listen(0,'127.0.0.1',()=>{
  const ready={pid:process.pid,url:`http://127.0.0.1:${server.address().port}`,started:new Date().toISOString()};
  fs.writeFileSync(path.join(directory,'service-ready.json'),JSON.stringify(ready),{flag:'wx'});
  console.log(JSON.stringify(ready));
});
process.on('SIGTERM',()=>server.close());
process.on('SIGINT',()=>server.close());
