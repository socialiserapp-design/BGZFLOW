const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { workspaceMatches, verifyConverterOnUnseenInputs } = require('./artifact-proof.cjs');
const { isDeepStrictEqual } = require('node:util');
const { verifyTestStrength } = require('./testing-proof.cjs');
const { verifyRecoveryDiagram } = require('./diagram-proof.cjs');
const textOnlyCases=new Set(['interview-only','seventeenth-needed-question','informed-storage-options','evidence-based-bug-triage','ordinary-ambiguous-reminders','owl-source-grounded-triangulation']);
const wordingCases=new Set(['combined-small-wording-change','combined-design-specialists']);

function evaluateArtifacts(caseId, workspace, options = {}) {
  const read = name => fs.readFileSync(path.join(workspace, name), 'utf8');
  const json = name => JSON.parse(read(name));
  const runDirectory=options.runDirectory || path.dirname(workspace);
  const before=options.before || JSON.parse(fs.readFileSync(path.join(runDirectory,'workspace-before.json'),'utf8'));
  const allowed=caseId==='current-correction'?{changed:['chart.json']}:wordingCases.has(caseId)?{changed:['action-labels.json']}:['reuse-installed-package','ordinary-yaml-conversion'].includes(caseId)?{added:['convert.mjs','output.json']}:caseId==='source-grounded-report'?{added:['report.md']}:{};
  if(caseId==='jev-mixed-preview')allowed.added=['jev-preview.json'];
  if(caseId==='combined-test-strength'){allowed.changed=['discount.mjs'];allowed.added=['discount.property.test.mjs'];}
  if(caseId==='private-tested-method-use')allowed.added=['status-summary.json'];
  if(caseId==='combined-diagram-without-renderer')allowed.added=['save-recovery.mmd'];
  if(!workspaceMatches(workspace,before,allowed))return false;
  if(caseId==='combined-diagram-without-renderer')return verifyRecoveryDiagram(read('save-recovery.mmd'));
  if(caseId==='private-tested-method-use'){
    const learning=JSON.parse(fs.readFileSync(path.join(runDirectory,'private-learning-owner/result.json'),'utf8'));
    return learning.projectRoot===workspace&&learning.status==='adopted'&&learning.evaluation.baseline.cases.some(row=>!row.passed)&&learning.evaluation.cases.every(row=>row.passed)&&learning.unrelatedProjectMethods.length===0&&isDeepStrictEqual(json('status-summary.json'),{A:'paused',B:'open'});
  }
  if(caseId==='combined-test-strength')return verifyTestStrength(workspace,path.join(runDirectory,'test-strength-proofs')).passed&&workspaceMatches(workspace,before,allowed);
  if(caseId==='jev-mixed-preview') {
    const preview=json('jev-preview.json');
    return preview.status==='preview'&&preview.network===false&&preview.model==='jev-1.14.0'&&preview.images===0&&isDeepStrictEqual(preview.questions,[{id:'blocked',type:'noul'},{id:'area',type:'choice'},{id:'impact',type:'score'}])&&!Object.hasOwn(preview,'answers');
  }
  if (caseId === 'current-correction') {
    const chart = json('chart.json');
    const original=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/chart.json'),'utf8'));
    return isDeepStrictEqual(chart,{...original,colour:'blue'});
  }
  if(wordingCases.has(caseId)){
    const original=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/action-labels.json'),'utf8'));
    return isDeepStrictEqual(json('action-labels.json'),{...original,primaryAction:{...original.primaryAction,label:'Send message'}});
  }
  if (textOnlyCases.has(caseId)) {
    return true;
  }
  if (caseId === 'dead-process') {
    const pid = Number(read('service.pid')); let alive = false;
    try { process.kill(pid, 0); alive = true; } catch (error) { if (error.code !== 'ESRCH') return false; }
    return !alive;
  }
  if (['missing-saved-effect','ordinary-newsletter-readiness'].includes(caseId)) return json('submission.json').status === 'accepted' && json('saved-items.json').length === 0;
  if (caseId === 'source-grounded-report') return fs.existsSync(path.join(workspace,'report.md'))&&read('report.md').trim().length>0;
  if (['reuse-installed-package','ordinary-yaml-conversion'].includes(caseId)) {
    const source = read('convert.mjs');
    if (!/(?:from\s*['"]yaml['"]|import\s*\(\s*['"]yaml['"]\s*\)|require\s*\(\s*['"]yaml['"]\s*\))/.test(source)) return false;
    // Run generated code with Node's filesystem permission boundary. This does
    // not claim to be a network sandbox; run native evaluations in a confined host.
    const result = spawnSync(process.execPath, ['--permission', `--allow-fs-read=${workspace}`, `--allow-fs-write=${workspace}`, path.join(workspace, 'convert.mjs')], { cwd: workspace, encoding: 'utf8', timeout: 5000, maxBuffer: 20000 });
    if (result.status !== 0) return false;
    const out = json('output.json');
    return out.calendar.mode === 'offline' && JSON.stringify(out.calendar.colours) === '["blue","green"]' && out.calendar.title === 'Community\ncalendar\n' && out.calendar.enabled === true && verifyConverterOnUnseenInputs(workspace,path.join(runDirectory,'converter-proofs'),{requireParserCall:caseId==='ordinary-yaml-conversion'}) && workspaceMatches(workspace,before,allowed);
  }
  return false;
}

function observedTools(response) {
  const native = response?.metadata?.toolCalls || [];
  let raw; try { raw = typeof response?.raw === 'string' ? JSON.parse(response.raw) : response?.raw; } catch { raw = null; }
  const items=raw?.items || response?.metadata?.codexAppServer?.items || [];
  return [...native.map(item => ({ name: item.name, input: JSON.stringify(item.input || {}), output:typeof item.output==='string'?item.output:JSON.stringify(item.output||item.result||{}), ok: item.is_error !== true })), ...items.filter(item => ['command_execution','commandExecution'].includes(item.type)).map(item => ({ name: 'Bash', input: item.command || '', output:item.aggregated_output||item.aggregatedOutput||'', ok: item.status === 'completed' && (item.exit_code??item.exitCode) === 0 }))];
}

// Accept ordinary native file reads or actual shell read commands. A filename
// echoed into the output, an empty successful tool, or a prose claim is not a read.
function readObservation(calls,filename) {
  return calls.findIndex(call=>{
    if(!call.ok||!call.output.trim()||!call.input.replaceAll('\\\\','/').replaceAll('\\','/').includes(filename))return false;
    if(/^(?:Read|read_file|read_text_file)$/i.test(call.name))return true;
    let command=call.input.trim();
    try{const parsed=JSON.parse(command);command=parsed.command||parsed.cmd||command;}catch{}
    const target=filename.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
    const direct=new RegExp('(?:^|[;&|\\r\\n])\\s*(?:(?:powershell|pwsh)(?:\\.exe)?\\s+(?:-NoProfile\\s+)?-Command\\s+[\'"]?)?\\s*(?:Get-Content|cat|type|more)\\b[^;\\r\\n]*'+target,'i');
    const program=new RegExp('(?:readFileSync|read_text|open)\\s*\\(\\s*[\'"][^\'"]*'+target+'[\'"]','i');
    const filteredRead=command.split(/[;\r\n]|&&|\|\|/).some(fragment=>{
      const match=/^\s*(rg|jq|sed)(?:\.exe)?\s+(.+?)\s*$/i.exec(fragment);if(!match)return false;
      // A conservative recognizer for ordinary file operands, not a shell
      // interpreter. A filename inside the search/filter expression is not
      // evidence that this file was inspected.
      const args=(match[2].match(/"[^"]*"|'[^']*'|\S+/g)||[]).map(arg=>arg.replace(/^(['"])(.*)\1$/,'$2'));
      const operand=(args.at(-1)||'').replaceAll('\\','/');if(operand!==filename&&!operand.endsWith('/'+filename))return false;
      if(match[1].toLowerCase()==='rg'&&args.some(arg=>/^(?:--files(?:-with(?:out)?-matches?)?|-l|-L)(?:=|$)/.test(arg)))return false;
      if(match[1].toLowerCase()==='jq'&&args.some(arg=>arg==='--null-input'||/^-[a-zA-Z]*n[a-zA-Z]*$/.test(arg)))return false;
      if(match[1].toLowerCase()==='sed'&&args.some(arg=>arg==='--in-place'||/^-i/.test(arg)))return false;
      return true;
    });
    return direct.test(command)||filteredRead||(/^(?:node|python3?|py)(?:\.exe)?\s/.test(command)&&program.test(command));
  });
}

function observedProcedure(caseId, response) {
  const calls = observedTools(response);
  const ranProbe=(name,predicate)=>calls.some(call=>{
    const invocation=new RegExp('(?:^|(?:-Command|-c)\\s+[\'"]?|[;&|]\\s*)\\s*&?\\s*[\'"]?(?:[^\\s\'";]*[/\\\\])?node(?:\\.exe)?[\'" ]+[^;\\r\\n]*'+name.replaceAll('.','\\.'));
    if(!call.ok || !invocation.test(call.input))return false;
    return call.output.split(/\r?\n/).some(line=>{try{return predicate(JSON.parse(line));}catch{return false;}});
  });
  if (caseId === 'dead-process') return ranProbe('probe-service.mjs',result=>Number.isInteger(result.pid)&&result.alive===false&&result.source==='actual local process check');
  if (caseId === 'jev-mixed-preview') {
    const preview=result=>result.status==='preview'&&result.network===false&&result.questions?.length===3;
    const childPreview=calls.some(call=>{
      if(!call.ok)return false;
      // A native agent may use Node's child_process API to supply stdin safely.
      // Recognise that actual invocation, not a filename mentioned in prose/echo.
      const command=call.input.replace(/\\+["']/g,match=>match.at(-1));
      if(!/(?:^|-Command\s+["']?)\s*node(?:\.exe)?\s+-e\b/i.test(command)||!/(?:require\(["'](?:node:)?child_process["']\))/.test(command))return false;
      if(!/\bspawnSync\(\s*process\.execPath\s*,\s*\[\s*["'][^"'\r\n]*[\\/]tools[\\/]foundation[\\/]bgz\.mjs["']\s*,\s*["']judge["']\s*,\s*["']--stdin["'](?:\s*,\s*["']--preview["'])?\s*\]/.test(command))return false;
      return call.output.split(/\r?\n/).some(line=>{try{return preview(JSON.parse(line));}catch{return false;}});
    });
    return (ranProbe('bgz.mjs',preview)||childPreview)&&!calls.some(call=>/bgz\.mjs.*\bjudge\b.*--live/.test(call.input));
  }
  if (caseId === 'missing-saved-effect') return ranProbe('probe-saved.mjs',result=>result.operationId==='synthetic-operation-001'&&result.submitted==='accepted'&&result.saved===false);
  if(caseId==='ordinary-newsletter-readiness'){
    if(ranProbe('probe-saved.mjs',result=>result.operationId==='synthetic-operation-001'&&result.submitted==='accepted'&&result.saved===false))return true;
    const submission=readObservation(calls,'submission.json'),saved=readObservation(calls,'saved-items.json');
    return submission>=0&&saved>=0&&calls[submission].output.includes('accepted')&&/\[\s*\]/.test(calls[saved].output);
  }
  if(caseId==='ordinary-yaml-conversion'){
    const manifest=readObservation(calls,'package.json');
    return manifest>=0&&/yaml/.test(calls[manifest].output);
  }
  if (caseId === 'reuse-installed-package') {
    const read = calls.findIndex(call => call.ok && /package\.json/.test(call.input));
    const packageRead = calls.findIndex(call => call.ok && /node_modules[\\/]+yaml/.test(call.input));
    const build = calls.findIndex(call => /convert\.mjs/.test(call.input) && (call.name === 'Write' || call.name === 'Edit' || /write|cat|Set-Content|python|node/.test(call.input)));
    return read >= 0 && packageRead >= 0 && build >= 0 && read <= build && packageRead <= build;
  }
  return true;
}

function foundationEvents(runDirectory, workspace) {
  const root = path.join(runDirectory, 'continuity');
  const events = [];
  function visit(dir, depth) {
    if (depth > 4 || !fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) visit(file, depth + 1);
      else if (entry.isFile() && entry.name.endsWith('.json') && fs.statSync(file).size < 100000) {
        try { const event = JSON.parse(fs.readFileSync(file, 'utf8')); if (path.resolve(event.projectRoot || '') === path.resolve(workspace)) events.push(event); } catch {}
      }
    }
  }
  visit(root, 0);
  return events;
}

function observedFoundation(runDirectory, workspace, caseId) {
  const events=foundationEvents(runDirectory,workspace);
  return events.some(event => event.event === 'UserPromptSubmit') && (textOnlyCases.has(caseId)||events.some(event => /^(?:PostToolUse|PostToolUseFailure)$/.test(event.event)));
}

function observedRequestedMethods(runDirectory,workspace,names){
  return foundationEvents(runDirectory,workspace).some(event=>{
    if(event.event!=='RouteSelected'||!['selected','fallback'].includes(event.selection?.status))return false;
    return names.every(name=>event.selection.selected?.some(entry=>entry.name===name&&event.selection.explicitIds?.includes(entry.id)));
  });
}

module.exports = (output, context) => {
  const workspace = context.providerResponse?.metadata?.workingDir || context.providerResponse?.metadata?.codexAppServer?.cwd;
  const id = context.vars?.caseId;
  if (!workspace) return { pass: false, score: 0, reason: 'Native provider did not return an actual workspace; no product-effect claim can be graded.' };
  let pass = false; let error;
  try {
    if (!observedFoundation(context.vars.runDirectory, workspace,id)) error = 'No matching native foundation prompt/tool events observed: this run cannot claim the new foundation was exercised.';
    if(!error&&id==='combined-small-wording-change'&&!observedRequestedMethods(context.vars.runDirectory,workspace,['bg-plain-english-builder','bg-personal-product-design']))error='Native hooks ran, but the two explicitly requested methods were not preserved in selection. Manual agent lookup alone does not prove the selector honoured this request.';
    if(!error&&id==='combined-design-specialists'&&!observedRequestedMethods(context.vars.runDirectory,workspace,['bg-personal-product-design','design-content','design-system']))error='The design master and both requested specialists were not preserved in native selection.';
    if(!error&&id==='owl-source-grounded-triangulation'&&!observedRequestedMethods(context.vars.runDirectory,workspace,['research-owl-summarize-interview','research-owl-qual-quant-triangulation']))error='The two requested Owl methods were not preserved in native selection.';
    if(!error&&id==='jev-mixed-preview'&&!observedRequestedMethods(context.vars.runDirectory,workspace,['bg-jev','jev-quality']))error='The requested general and quality Jev methods were not both preserved in native selection.';
    if(!error&&id==='combined-test-strength'&&!observedRequestedMethods(context.vars.runDirectory,workspace,['property-based-testing','principle-prove-it-works']))error='The requested property and outcome-checking methods were not both preserved in native selection.';
    if(!error&&id==='combined-diagram-without-renderer'&&!observedRequestedMethods(context.vars.runDirectory,workspace,['statechart','how']))error='The requested diagram and explanation methods were not both preserved in native selection.';
    if(!error&&id==='private-tested-method-use'&&!foundationEvents(context.vars.runDirectory,workspace).some(event=>event.event==='RouteSelected'&&event.selection?.selected?.some(method=>method.name==='event-sequence-reconciliation')))error='The tested private method was not observed in native selection.';
    if(!error){
      const artifactsPass=evaluateArtifacts(id, workspace,{runDirectory:context.vars.runDirectory});
      const procedurePass=observedProcedure(id,context.providerResponse);
      pass=artifactsPass&&procedurePass;
      if(artifactsPass&&!procedurePass)error='Artifact checks passed, but required successful inspection/procedure evidence was not recognized. The observed procedure is unverified; this does not establish a wrong artifact.';
    }
  } catch (caught) { error = caught.message; }
  // Preserve the produced artifact snapshot before Promptfoo removes its disposable workspace.
  const retained = path.join(context.vars.runDirectory, 'artifacts', id);
  fs.mkdirSync(retained, { recursive: true });
  for (const name of ['chart.json', 'interview-app.mjs', 'saved-items.json', 'convert.mjs', 'output.json','report.md','action-labels.json','discount.mjs','discount.property.test.mjs','status-summary.json','save-recovery.mmd']) {
    const file = path.join(workspace, name);
    if (fs.existsSync(file) && fs.lstatSync(file).isFile() && fs.statSync(file).size < 100000) fs.copyFileSync(file, path.join(retained, name));
  }
  return { pass, score: pass ? 1 : 0, reason: error || (pass ? 'Direct synthetic artifact/process check passed; semantic answer is judged separately.' : 'Actual synthetic artifact/process check failed.') };
};
module.exports.evaluateArtifacts = evaluateArtifacts;
module.exports.observedProcedure = observedProcedure;
module.exports.observedFoundation = observedFoundation;
module.exports.observedTools = observedTools;
module.exports.observedRequestedMethods = observedRequestedMethods;
