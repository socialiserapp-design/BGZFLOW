import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';

export function snapshot(root){
  const result={};
  function scan(dir){for(const item of fs.readdirSync(dir,{withFileTypes:true})){
    if(item.isSymbolicLink())throw Error('Linked fixture files are unsupported.');
    const file=path.join(dir,item.name);
    if(item.isDirectory())scan(file);else if(item.isFile())result[path.relative(root,file).replaceAll('\\','/')]=createHash('sha256').update(fs.readFileSync(file)).digest('hex');
  }}scan(root);return result;
}
export function prepare(workspace,id){
  if(fs.existsSync(workspace))throw Error('Preserve the existing workspace; choose a fresh one.');
  fs.mkdirSync(workspace,{recursive:true});
  const write=(file,body)=>{fs.mkdirSync(path.dirname(path.join(workspace,file)),{recursive:true});fs.writeFileSync(path.join(workspace,file),body,{flag:'wx'});};
  const json=(file,value)=>write(file,JSON.stringify(value,null,2)+'\n');
  if(id==='local-sound')json('animation.json',{duration:3,canvas:{w:800,h:450},fps:30,contacts:[{name:'small-tap',at:0.4,x:150,y:230,width:40,height:40},{name:'card-land',at:1.3,x:400,y:220,width:220,height:100},{name:'confirmation',at:2.4,x:650,y:200,width:60,height:60}]});
  if(id==='supplied-vector-frames'){
    const svg=(x,colour)=>`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 40"><defs><linearGradient id="ink"><stop stop-color="${colour}"/></linearGradient></defs><rect data-art="parcel" x="${x}" y="8" width="16" height="20" fill="url(#ink)"/></svg>\n`;
    write('frames/001.svg',svg(8,'#2368ab'));write('frames/002.svg',svg(8,'#2368ab'));write('frames/003.svg',svg(28,'#2b8a56'));write('frames/004.svg',svg(48,'#754da1'));
  }
  if(id==='natural-stage-shift'){
    json('channels.json',[{id:'lark',name:'Lark & Willow'},{id:'cedar',name:'Cedar Studio'}]);
    write('NOTES.md','Historical SDK note: call exportChannels(rows). This note predates the current local SDK.\n');
    write('vendor/channel-sdk.mjs','export function exportChannels({channels,format}){if(format!=="rows"||!Array.isArray(channels))throw Error("Expected {channels, format: rows}");return channels.map(({id,name})=>({key:id,label:name}));}\n');
  }
  if(id==='retry-payment')write('payment.mjs',`import fs from 'node:fs';
export function pay({operationId,purchaseId,amount,ledgerPath,failBeforeSave=false}){
 if(!operationId||!purchaseId||!Number.isInteger(amount)||amount<=0)throw Error('Invalid payment');
 const ledger=fs.existsSync(ledgerPath)?JSON.parse(fs.readFileSync(ledgerPath,'utf8')):[];
 if(failBeforeSave)throw Error('Temporary save failure');
 const receipt={operationId,purchaseId,amount,receipt:'r-'+(ledger.length+1)};
 ledger.push(receipt);fs.writeFileSync(ledgerPath,JSON.stringify(ledger));return receipt;
}\n`);
  if(id==='follow-up-recovery')json('labels.json',{button:'Save',font:'system',layout:'compact',colour:'blue'});
  return snapshot(workspace);
}
