// Recognise direct method requests, not general task intent. Ambiguous prose
// remains for the main agent; quoted instructions do not become user authority.
export function explicitSkillRequests(request='') {
  const unquoted=String(request).replace(/```[\s\S]*?(?:```|$)|~~~[\s\S]*?(?:~~~|$)/g,'').replace(/^\s*>.*$/gm,'')
    .replace(/"([^"]*)(?:"|$)|“([^”]*)(?:”|$)|(?<!\w)'([^']+)'/g,(all,...groups)=>{
      const value=groups.slice(0,3).find(group=>typeof group==='string')||'';
      return /^[a-z0-9][\w:-]*$/i.test(value)?all:' ';
    });
  let suppressed=false,contentSeen=false;
  const text=unquoted.split(/\r?\n/).map(line=>{
    if(/^\s*(?:do not|don't|never|avoid)\s+(?:run|use|invoke|execute|load|apply|follow)\b/i.test(line)&&(/:\s*$/.test(line)||/\b(?:following|below|listed|these)\b/i.test(line))){suppressed=true;contentSeen=false;return '';}
    if(suppressed){if(line.trim())contentSeen=true;else if(contentSeen)suppressed=false;return '';}
    return line;
  }).join('\n');
  const requests=[];
  for(const match of text.matchAll(/^[ \t]*[/$]([a-z0-9][\w:-]*)(?=\s|$)/gim))requests.push(match[1]);
  for(const clause of text.split(/[.!?;\n]/)){
    const direct=/^\s*(?:(?:please|can you|could you|would you|i want you to|i(?:'d| would) like you to)\s+)?(?:use|apply|load|invoke|run|follow)\s+(?:the\s+)?(?:(?<owner>[a-z][\w-]*)['’]s\s+)?(?<rest>.+)$/i.exec(clause);
    if(!direct)continue;
    if(/\b(?:as|for)\s+(?:an?\s+)?(?:quoted\s+)?(?:example|reference|quotation)\b/i.test(direct.groups.rest)||/\b(?:do not|don't|never)\s+(?:execute|run|apply|invoke|load|use)\s+(?:it|them|this|these|the\s+(?:skill|method|command))\b/i.test(direct.groups.rest))continue;
    // A negative/excluded alternative cannot join an affirmative method list.
    const rest=direct.groups.rest.split(/\s+(?:but|except|without|rather than|instead of|do not|don't|not)\b/i)[0];
    // A named master with named companions is also an explicit method list.
    // Keep the exact-identifier validation and quote/exclusion handling below;
    // ordinary requests such as "with improved spacing" are still not lists.
    const master=/^([^\s]+)\s+master\s+(?:with|and)\s+(.+)$/i.exec(rest);
    const listSource=master?`${master[1]}, ${master[2]}`:rest;
    const suffix=/^(.*?)\s+skills?(?![\w:-])/i.exec(listSource);
    const prefix=/^skills?\s*:?[ \t]+(.+)$/i.exec(listSource);
    let list=suffix?.[1]??prefix?.[1]??(master?listSource:undefined);
    if(!list)continue;
    list=list.split(/\s+(?:for|to|on|together|then|before|after|when)\b/i)[0];
    const names=list.split(/\s*(?:,|&|\+|\band\b|\bplus\b)\s*/i).filter(Boolean).map(name=>name.trim().replace(/^[`"']+|[`"']+$/g,''));
    // Only a list of exact skill identifiers qualifies. "Use an example from
    // the X skill" is a reference, not a request to execute that skill.
    if(!names.length||names.some(name=>!/^[$/]?[a-z0-9][\w:-]*$/i.test(name)))continue;
    for(let name of names){name=name.replace(/^[$/]/,'');requests.push(direct.groups.owner&&!name.includes(':')?`${direct.groups.owner}:${name}`:name);}
  }
  return [...new Set(requests)];
}

export function matchesSkillRequest(entry,request){
  if(entry.id===request)return true;
  if(typeof request!=='string')return false;
  const separator=request.indexOf(':'),namespace=separator<0?'':request.slice(0,separator).toLowerCase(),name=separator<0?request:request.slice(separator+1);
  if(entry.name.toLowerCase()!==name.toLowerCase())return false;
  if(!namespace)return true;
  const owner=String(entry.origin||'').split(':').at(-1).split('@')[0].toLowerCase();
  return owner===namespace;
}
