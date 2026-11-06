import test from 'node:test';
import assert from 'node:assert/strict';
import {cases} from './cases.mjs';
import {gradeRoute} from './grade.mjs';
import {parseArguments} from './run.mjs';

const selection=name=>({status:'selected',selected:[{id:'selected-method',name}]});
const bodies=[{id:'selected-method',body:'Actual nonempty instructions.'}];
test('all specialist tasks have meaningful primary and body-delivery checks',()=>{
  for(const item of cases.filter(item=>item.target))assert.equal(gradeRoute(item,{selection:selection(item.target),primaryId:'selected-method',bodies}).pass,true,item.id);
});
test('wrong primary, generic coordinator, fallback and missing bodies do not pass',()=>{
  const item=cases.find(item=>item.id==='direction');
  for(const data of [{selection:selection('design-content'),primaryId:'selected-method',bodies},{selection:selection('bg-personal-product-design'),primaryId:'selected-method',bodies},{selection:{...selection(item.target),status:'fallback'},primaryId:'selected-method',bodies},{selection:selection(item.target),primaryId:'selected-method',bodies:[{id:'selected-method',body:'   '}]},{selection:selection(item.target),primaryId:'ghost',bodies}])assert.equal(gradeRoute(item,data).pass,false);
});
test('appropriate existing specialist alternative is valid without requiring a fixed selection count',()=>{
  const item=cases.find(item=>item.id==='direction'),route={status:'selected',selected:[{id:'primary',name:'frontend-design'},{id:'support',name:'design-accessibility'},{id:'support2',name:'design-system'}]};
  assert.equal(gradeRoute(item,{selection:route,primaryId:'primary',bodies:route.selected.map(entry=>({...entry,body:'Instructions'}))}).pass,true);
});
test('all negative tasks reject any design method but accept a completed empty route',()=>{
  for(const item of cases.filter(item=>item.noDesign)){
    assert.equal(gradeRoute(item,{selection:{status:'selected',selected:[]}}).pass,true,item.id);
    assert.equal(gradeRoute(item,{selection:selection('design-content'),bodies}).pass,false,item.id);
    assert.equal(gradeRoute(item,{selection:{status:'fallback',selected:[]}}).pass,false,item.id);
  }
});
test('live opt-in and reviewed build/output paths are mandatory before importing a provider',()=>{
  assert.throws(()=>parseArguments([]),/No network calls/);
  assert.throws(()=>parseArguments(['--live']),/reviewed built/);
  assert.throws(()=>parseArguments(['--live','--plugin','build','--output','run','--retry']),/Unknown/);
  assert.ok(parseArguments(['--live','--plugin','build','--output','new-run']).plugin);
  assert.equal(parseArguments(['--live','--plugin','build','--output','new-run','--catalogue','installed','--cases','arithmetic']).catalogue,'installed');
  assert.throws(()=>parseArguments(['--live','--plugin','build','--output','new-run','--catalogue','all']),/Catalogue/);
  assert.throws(()=>parseArguments(['--live','--plugin','build','--output','new-run','--cases','arithmetic,arithmetic']),/unique known/);
  assert.throws(()=>parseArguments(['--live','--plugin','build','--output','new-run','--cases','invented']),/unique known/);
});
