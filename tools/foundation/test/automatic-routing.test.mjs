import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {discoverCatalog} from '../catalog.mjs';
import {selectRoute} from '../router.mjs';
import {renderMethodDelivery} from '../method-delivery.mjs';
import {prepareRoutingRequest,routingRequestBytes} from '../jev-provider.mjs';

function library(t,count,{long=false}={}) {
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'bgz-auto-routing-'));
  t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  for(let i=0;i<count;i++) {
    const dir=path.join(root,`method-${String(i).padStart(3,'0')}`);fs.mkdirSync(dir);
    fs.writeFileSync(path.join(dir,'SKILL.md'),`---\nname: method-${i}\ndescription: Inspect candidate ${i}\n---\n${long?'Reference context. '.repeat(250):''}\nActual procedure ${i}: preserve the supplied task and inspect the actual output.\n`);
  }
  return discoverCatalog({roots:[root]});
}

test('a useful specialist after twelve plausible alternatives remains eligible for actual instruction comparison',async t=>{
  const catalog=library(t,24),wanted=catalog.find(x=>x.name==='method-23');
  const result=await selectRoute({request:'Compare the supplied inputs and produce the requested result.',catalog},{decide:async ({phase,candidates})=>{
    if(phase==='rank')return{selectedIds:candidates.map(x=>x.id),ranks:candidates.map(x=>({id:x.id,score:x.id===wanted.id?0.36:0.9}))};
    if(phase==='complement')return{selectedIds:[]};
    return{selectedIds:candidates.filter(x=>x.id===wanted.id).map(x=>x.id),strategy:'single'};
  }});
  assert.equal(result.status,'selected');assert.equal(result.selected[0]?.id,wanted.id);
});

test('comparison reaches operative instructions after a long introduction',async t=>{
  const catalog=library(t,1,{long:true});let observed=false;
  const result=await selectRoute({request:'Inspect the supplied output.',catalog},{decide:async ({phase,candidates})=>{
    if(phase==='rank')return{selectedIds:candidates.map(x=>x.id)};
    observed=candidates[0].excerpt.includes('Actual procedure 0:');
    return{selectedIds:observed?[candidates[0].id]:[],strategy:'single'};
  }});
  assert.ok(observed,'The actual procedure, not only introductory prose, must reach comparison');
  assert.equal(result.selected.length,1);
});

test('default delivery includes all selected procedures even when their combined length exceeds the old cutoff',()=>{
  const entries=[{id:'sound',name:'sound'},{id:'vector',name:'vector'}];
  const bodies={sound:'Sound procedure. '+'.'.repeat(7000),vector:'Vector procedure. '+'.'.repeat(7000)};
  const output=renderMethodDelivery({status:'selected',selected:entries},{loadSelectedSkills:({selected})=>selected.map(x=>({...x,body:bodies[x.id]}))});
  assert.ok(output.includes(bodies.sound));assert.ok(output.includes(bodies.vector));
  assert.doesNotMatch(output,/Deferred complete body/);
});

test('complete procedures are sent once and wire-size packing counts context and question overhead',async t=>{
 const body='Complete operative procedure tail. '+'.'.repeat(6000);
 const request=prepareRoutingRequest({phase:'verify',context:{history:'context '.repeat(500)},candidates:[{name:'specialist',description:'Inspect the supplied input.',excerpt:body}]});
 assert.equal(JSON.stringify(request).split(body).length-1,1);
 const catalog=library(t,14,{long:true}),seen=new Set(),sizes=[];
 const result=await selectRoute({request:'Inspect supplied inputs.',taskContext:{history:'Current context. '.repeat(300)},catalog,budget:{comparisonBytes:24000}},{decide:async input=>{
   if(input.phase==='rank')return{selectedIds:input.candidates.map(x=>x.id)};
   sizes.push(routingRequestBytes(input));for(const c of input.candidates)seen.add(c.id);
   return{selectedIds:input.phase==='complement'?[]:input.candidates.slice(-1).map(x=>x.id),strategy:'single'};
 }});
 assert.equal(result.status,'selected');assert.equal(seen.size,14);assert.ok(sizes.length>1);assert.ok(sizes.every(n=>n<=24000));
});

test('default work budget supports a larger justified selection while explicit budgets still govern',async t=>{
 const catalog=library(t,35);
 const result=await selectRoute({request:'Apply the independently required procedures.',catalog},{decide:async({phase,candidates})=>phase==='rank'?{selectedIds:candidates.map(x=>x.id)}:{selectedIds:candidates.slice(0,1).map(x=>x.id),strategy:'single'}});
 assert.equal(result.status,'selected');assert.equal(result.selected.length,35);assert.ok(result.calls>32);
});

test('an oversized nominee cannot discard a checked fitting method in either input order',async t=>{
 const original=library(t,2),root=path.dirname(path.dirname(original[0].path));
 fs.appendFileSync(original[1].path,'\nLong unrelated reference. '+'.'.repeat(100000));
 const catalog=discoverCatalog({roots:[root]}),big=catalog.find(x=>x.path===original[1].path),small=catalog.find(x=>x.id!==big.id);
 for(const candidates of [[small,big],[big,small]]){
  let verifyCalls=0;
  const result=await selectRoute({request:'Apply the small relevant procedure.',catalog:candidates},{decide:async input=>{
   if(input.phase==='rank')return{selectedIds:input.candidates.map(x=>x.id)};
   verifyCalls++;assert.deepEqual(input.candidates.map(x=>x.id),[small.id]);
   return{selectedIds:[small.id],strategy:'single'};
  }});
  assert.equal(result.status,'partial');assert.equal(verifyCalls,1);
  assert.deepEqual(result.selected.map(x=>x.id),[small.id]);assert.equal(result.comparisonDeferred[0].id,big.id);
  const delivery=renderMethodDelivery(result,{loadSelectedSkills:({selected})=>selected.map(x=>({...x,body:fs.readFileSync(x.path,'utf8')}))});
  assert.ok(delivery.includes('Actual procedure'));assert.match(delivery,/comparison is incomplete/);assert.ok(delivery.includes(big.path));assert.ok(!delivery.includes('.'.repeat(100000)));
  const reused=await selectRoute({request:'Apply the small relevant procedure.',catalog:candidates,previous:result},{decide:()=>{throw Error('unchanged partial recommendation should be reused');}});
  assert.equal(reused.status,'partial');assert.equal(reused.calls,0);
 }
});

test('an entirely oversized nomination stays an honest fallback with its source retained',async t=>{
 const original=library(t,1),root=path.dirname(path.dirname(original[0].path));fs.appendFileSync(original[0].path,'.'.repeat(100000));
 const catalog=discoverCatalog({roots:[root]});let verifyCalls=0;
 const result=await selectRoute({request:'Inspect this procedure.',catalog},{decide:async({phase,candidates})=>{if(phase!=='rank')verifyCalls++;return{selectedIds:candidates.map(x=>x.id),strategy:'single'};}});
 assert.equal(result.status,'fallback');assert.equal(verifyCalls,0);assert.equal(result.selected.length,0);
 assert.equal(result.provisional[0].id,catalog[0].id);assert.equal(result.comparisonDeferred[0].path,catalog[0].path);
});

test('one changed source does not discard a different checked recommendation',async t=>{
 const catalog=library(t,2),changed=catalog[0],small=catalog[1];fs.appendFileSync(changed.path,'\nChanged after catalogue discovery.');
 const result=await selectRoute({catalog},{decide:async({phase,candidates})=>phase==='rank'?{selectedIds:candidates.map(x=>x.id)}:{selectedIds:candidates.map(x=>x.id),strategy:'single'}});
 assert.equal(result.status,'partial');assert.deepEqual(result.selected.map(x=>x.id),[small.id]);
 assert.equal(result.comparisonDeferred[0].id,changed.id);assert.match(result.comparisonDeferred[0].reason,/changed or is unavailable/);
});

test('fallback diagnostics retain fixed causes without serialising arbitrary exception text',async t=>{
 const catalog=library(t,1);
 const limited=await selectRoute({request:'Inspect it.',catalog,budget:{maxCalls:1}},{decide:async({candidates})=>({selectedIds:candidates.map(x=>x.id),strategy:'single'})});
 assert.equal(limited.diagnostics.failureCode,'routing-call-budget-reached');
 const privateText='Never publish this arbitrary provider response';
 const rejected=await selectRoute({catalog},{decide:async()=>{throw Error(privateText);}});
 assert.equal(rejected.diagnostics.failureCode,'selection-error');assert.ok(!JSON.stringify(rejected).includes(privateText));
});
