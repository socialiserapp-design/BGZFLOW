import {isDesignMethod} from './cases.mjs';

/** Grade actual route results and loaded bodies; no semantic keyword scoring. */
export function gradeRoute(testcase,{selection,primaryId,bodies=[],error}={}){
  const reasons=[];
  if(error)reasons.push('Route or body delivery raised an error.');
  if(selection?.status!=='selected')reasons.push('No completed Jev selection; fallback is not a live route pass.');
  const selected=Array.isArray(selection?.selected)?selection.selected:[];
  const primary=selected.find(entry=>entry.id===primaryId);
  if(!testcase.noDesign&&(!primary||!testcase.primary.includes(primary.name)))reasons.push('Primary method does not match the requested specialist task.');
  if(testcase.noDesign&&selected.some(entry=>isDesignMethod(entry.name)))reasons.push('Unrelated or literal-only task received a design method.');
  if(!testcase.noDesign&&selected.length===0)reasons.push('Design task received no methods.');
  for(const entry of selected){
    const body=bodies.find(item=>item.id===entry.id);
    if(!body||typeof body.body!=='string'||!body.body.trim())reasons.push(`Selected method ${entry.name} has no loaded body.`);
  }
  if(bodies.some(body=>!selected.some(entry=>entry.id===body.id)))reasons.push('Loaded body does not belong to the completed selection.');
  return {pass:reasons.length===0,reasons,primary:primary?.name||null,targetSelected:testcase.target?selected.some(entry=>entry.name===testcase.target):null,selected:selected.map(entry=>entry.name)};
}
