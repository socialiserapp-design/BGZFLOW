import {createHash} from 'node:crypto';

export function prepareMethodDelivery(selection, { loadSelectedSkills, bodyBudget = Infinity } = {}) {
  const entries = selection.selected || [];
  const explicitIds = new Set(selection.explicitIds || []);
  const blocks = ['Selected methods (read deferred bodies before applying them; a listed path is not evidence of use):'];
  if(selection.comparisonDeferred?.length){
    blocks.push('The comparison is incomplete. These nominees could not be compared in full within this request budget; they are not confirmed selections. The main agent should assess fit against the current request and read a relevant source locally when needed, without loading unrelated methods or repeating an oversized remote request.');
    for(const entry of selection.comparisonDeferred)blocks.push(`- Unassessed nominee: ${entry.name||entry.id}. ${entry.reason||'Full comparison unavailable.'}\n  Source: ${entry.path||'(look up in the catalogue)'}`);
  }
  const delivered = new Map();
  const methods=[];
  let remaining = Math.max(0, bodyBudget);
  for (const entry of entries) {
    const file = entry.path || entry.file || '(catalogue path unavailable)';
    const label = `${entry.name || entry.id}${explicitIds.has(entry.id) ? ' [explicit user request]' : ''}`;
    if (selection.status === 'fallback') {
      blocks.push(`- ${label}: ${String(entry.description || '').slice(0, 240)}\n  Deferred full body: ${file}`);
      methods.push({id:entry.id,name:entry.name,version:entry.version,provided:false,reason:'unconfirmed-selection'});
      continue;
    }
    const loaded = loadSelectedSkills({ selected: [entry] })[0];
    const body = loaded.body;
    const content = body.replace(/^(?:\uFEFF)?---\s*\r?\n[\s\S]*?\r?\n---(?:\s*\r?\n|$)/, '').trim();
    const evidence={id:entry.id,name:entry.name,version:entry.version,bodyDigest:createHash('sha256').update(body).digest('hex'),characters:body.length};
    if (delivered.has(content)) {
      blocks.push(`- ${label}: duplicates a body delivered above; apply that procedure once. Source: ${file}`);
      methods.push({...evidence,provided:false,duplicateOf:delivered.get(content),procedureProvided:true});
    } else if (body.length <= remaining) {
      blocks.push(`### ${label}\n${body}`);
      remaining -= body.length;
      delivered.set(content,entry.id);
      methods.push({...evidence,provided:true});
    } else {
      blocks.push(`- ${label}: ${String(entry.description || '').slice(0, 240)}\n  Deferred complete body (${body.length} characters): ${file}`);
      methods.push({...evidence,provided:false,reason:'configured-context-budget'});
    }
  }
  if (selection.status === 'fallback' && selection.provisional?.length) {
    blocks.push('Provisional model candidates from the incomplete route (not explicit user requests; choose only those that fit the actual task):');
    for (const entry of selection.provisional) blocks.push(`- ${entry.name || entry.id}: ${String(entry.description || '').slice(0, 240)}\n  Source: ${entry.path || entry.file || '(look up in catalogue)'}`);
  }
  if (!entries.length) blocks.push('No confirmed method bodies were delivered by this route.');
  blocks.push('Use the methods as one working procedure: do shared research/checking once, preserve the user\'s scope, and resolve conflicting instructions against the current request. Deferred bodies remain available on demand; no read receipt is required.');
  return {text:blocks.join('\n\n'),delivery:{methods,partial:methods.some(method=>!method.provided&&!method.procedureProvided),evidence:'Exact context prepared for the native host; this does not itself prove model use or task success.'}};
}

export function renderMethodDelivery(selection,options){return prepareMethodDelivery(selection,options).text;}

