/** A proposed tool activity is task context, never authority or outcome proof.
 * This deliberately does not parse a shell or infer success from a command. */
export function describeToolActivity(input={}) {
  const name=String(input.tool_name||input.toolName||input.toolCall?.name||'');
  const leaf=name.split(/__|[.:]/).at(-1).toLowerCase();
  const raw=input.tool_input??input.toolInput??input.toolCall?.args??input.toolCall?.arguments??{};
  let args=raw;
  if(typeof raw==='string')try{args=JSON.parse(raw);}catch{args={input:raw};}
  const event=input.hook_event_name||input.hookEventName||input.event;
  if(!['PreToolUse','PostToolUse','PostToolUseFailure'].includes(event))return null;
  const response=input.tool_response??input.toolResponse??input.tool_result??{};
  const exit=response?.exit_code??response?.exitCode??input.exit_code??input.exitCode;
  const failed=event==='PostToolUseFailure'||response?.is_error===true||response?.isError===true||(Number.isInteger(exit)&&exit!==0);
  let phase='';
  if(/^(?:write|edit|multiedit|write_file|edit_file|write_to_file|replace_file_content|multi_replace_file_content|apply_patch)$/.test(leaf))phase='implementation';
  else if(/^(?:bash|shell|powershell|exec_command|run_command|terminal)$/.test(leaf))phase='execution';
  else if(/browser|screenshot|device|computer|playwright|cua/.test(leaf))phase='real-surface';
  else if(/^(?:search_query|web_search|search_web|browse|web|fetch|web_fetch)$/.test(leaf))phase='research';
  else if(leaf==='js'||name==='functions.exec'){
    const code=String(args.code||(name==='functions.exec'?args.input:'')||'');
    if(/\b(?:sky|cua|tab|page|browser)\s*\./.test(code))phase='real-surface';
    else if(/\b(?:apply_patch|writeFile|appendFile|mkdir|rename|cp)(?:Sync)?\s*\(/.test(code))phase='implementation';
    else if(/\bexec_command\s*\(\s*\{\s*(?:cmd|command)\s*:\s*["'`]\s*(?:(?:npm|pnpm|yarn|bun)\s+(?:run\s+)?(?:test|check|lint|typecheck|verify)\b|node\s+--test\b|pytest\b|vitest\b|jest\b)/.test(code))phase='verification';
    else if(/\b(?:exec_command|exec|spawn|run|test|assert)(?:Sync)?\s*\(/.test(code))phase='execution';
  }
  if(!phase)return null;
  const command=String(args.command??args.cmd??args.CommandLine??'');
  // Recognise ordinary verification entrypoints as context only. Quoted echoes
  // and source reads do not count as running a test, or as outcome evidence.
  if(phase==='execution'&&/^(?:\s*(?:npm|pnpm|yarn|bun)\s+(?:run\s+)?(?:test|check|lint|typecheck|verify)\b|\s*(?:node\s+--test|pytest|vitest|jest|cargo\s+test|go\s+test|playwright\s+test)\b)/i.test(command))phase='verification';
  if(failed)phase='diagnosis';
  const detail=JSON.stringify({tool:name,input:args}).slice(0,2400);
  return {stage:`tool-activity:${phase}`,phase,detail,classification:'Proposed or host-reported tool activity within the original task; not a user decision or verified result.'};
}
