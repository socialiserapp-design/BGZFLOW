import fs from 'node:fs';
import { handleFoundationEvent } from './foundation.mjs';
import { inspectMechanicalSafety } from './mechanical-safety.mjs';
import { isCommandEntry } from './lib/command-entry.mjs';
import { captureEvent } from '../tools/foundation/continuity.mjs';

export function mapAgyInput(raw={},event='') {
  const call=raw.toolCall||{};
  const a=call.args||call.arguments||{};
  const name=String(call.name||'').toLowerCase();
  const base={...raw,hook_event_name:event||raw.hook_event_name||raw.hookEventName,session_id:raw.conversationId,cwd:a.Cwd||raw.workspacePaths?.[0]};
  if(['run_command','bash','shell'].includes(name))return {...base,tool_name:'Bash',tool_input:{cmd:a.CommandLine??a.command??a.cmd??''}};
  if(['write_to_file','write_file','write'].includes(name))return {...base,tool_name:'Write',tool_input:{file_path:a.Path??a.TargetFile??a.file_path,content:a.CodeContent??a.Content??a.content??''}};
  if(['edit_file','replace_file_content','multi_replace_file_content','edit','multiedit'].includes(name))return {...base,tool_name:'Edit',tool_input:{file_path:a.Path??a.TargetFile??a.file_path,new_string:a.Replacement??a.ReplacementContent??a.new_string??a.ReplacementChunks?.map(c=>c.ReplacementContent||'').join('\n')??''}};
  return base;
}
export async function handleAgyFoundation(raw,event,options={}) {
  const input=mapAgyInput(raw,event);
  const mechanical=inspectMechanicalSafety(input,options);
  if(mechanical.hookSpecificOutput?.permissionDecision==='deny')return {decision:'deny',reason:mechanical.hookSpecificOutput.permissionDecisionReason};
  const result=await handleFoundationEvent(input,options);
  const note=mechanical.hookSpecificOutput?.additionalContext;
  if(input.hook_event_name==='PreToolUse')return {decision:'allow'};
  // Native PostToolUse accepts an empty object; next invocation restores captured facts.
  if(input.hook_event_name==='PostToolUse') {
    if(note)captureEvent({...input,hook_event_name:'PostToolUseFailure',tool_name:'BGZFLOW JavaScript syntax check (failed or unavailable; inspect saved file)',tool_use_id:`${raw.stepIdx??'unknown'}:syntax`,error:note},options);
    return {};
  }
  if(input.hook_event_name==='Stop')return {decision:'stop'};
  if(note)result.injectSteps=[...(result.injectSteps||[]),{ephemeralMessage:note}];
  return result;
}
if(isCommandEntry(import.meta.url)) {
  try {
    const raw=fs.readFileSync(0,'utf8');
    const at=process.argv.indexOf('--event');
    process.stdout.write(JSON.stringify(raw.length<=2*1024*1024?await handleAgyFoundation(JSON.parse(raw||'{}'),at<0?'':process.argv[at+1]):{}));
  } catch {process.stdout.write('{}');}
}
