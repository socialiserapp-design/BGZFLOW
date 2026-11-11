import {fileURLToPath} from 'node:url';
import {historyDelivery} from './history-delivery.mjs';
import {latestWorkRequest} from './stage-selection.mjs';

/** Recognised host edit results justify a reminder, never a completion verdict. */
export function completionReviewContext(input={}) {
  if((input.hook_event_name||input.hookEventName||input.event)!=='PostToolUse')return null;
  const name=String(input.tool_name||input.toolName||input.toolCall?.name||'').split(/__|[.:]/).at(-1).toLowerCase();
  if(!/^(?:write|edit|multiedit|write_file|edit_file|write_to_file|replace_file_content|multi_replace_file_content|apply_patch)$/.test(name))return null;
  const result=input.tool_response??input.toolResponse??input.tool_result??{};
  const exit=result?.exit_code??result?.exitCode??input.exit_code??input.exitCode;
  if(result?.is_error||result?.isError||result?.error||input.error||result?.success===false
    ||(Number.isInteger(exit)&&exit!==0)||/^(?:denied|failed|cancelled|canceled|error)$/i.test(result?.status||''))return null;
  if(result?.changed===false||result?.changes===0||result?.files_changed===0)return null;
  const message=typeof result==='string'?result:String(result?.output??result?.message??'');
  if(/^(?:no (?:files? |file )?changes?(?: made| needed| to apply)?|nothing (?:changed|to (?:change|do))|already up[ -]to[ -]date)[.!\s]*$/i.test(message.trim()))return null;
  let args=input.tool_input??input.toolInput??input.toolCall?.args??{};
  if(typeof args==='string')try{args=JSON.parse(args);}catch{args={};}
  if(!args||typeof args!=='object')args={};
  if(typeof args.old_string==='string'&&args.old_string===args.new_string)return null;
  return 'Recognised edit returned without a reported error; review guidance only, not proof of a change or result.';
}

/** Deliver once per substantive request and native context generation. AGY context is ephemeral. */
export function completionReviewGuidance(input,state) {
  const request=latestWorkRequest(state);
  if(!request)return '';
  const start=state.events.findIndex(event=>event.id===request.id);
  // If the source request aged out of this bounded event view, retain eligible later activity.
  const relevant=state.events.slice(start<0?0:start+1).some(event=>event.activity?.completionReview);
  if(!relevant)return '';
  const claim=historyDelivery(state,{ephemeral:Boolean(input.conversationId)});
  if(!claim(`completion-review:${request.id}`))return '';
  const audit=fileURLToPath(new URL('../../skills/bg-full-spectrum-audit/SKILL.md',import.meta.url));
  const expo=fileURLToPath(new URL('../../skills/bg-expo-testing/SKILL.md',import.meta.url));
  const integration=fileURLToPath(new URL('../../skills/bg-finish-the-whole-job/references/integration-and-real-use.md',import.meta.url));
  return `BGZFLOW completion review\nBefore reporting a software feature or repair complete, read ${audit} and apply its appropriate scope automatically. The main agent chooses scope from the actual request: feature journey and its wider effects; repair cause, callers and regressions; whole product/codebase when requested or a demonstrated wider issue requires it. Reuse applicable evidence and recheck changed behaviour. For other work, verify the requested result proportionately. This reminder is not evidence that a review happened.\nFor usable slices and worker handbacks, follow ${integration}. The lead owns integration, authorised installation and real-use checks on the user's required surface. Tie evidence to the same candidate and running artifact. Keep built, delivered and used successfully distinct; a test count, HTTP response or worker report cannot prove the whole app works. Advance ready work and its existing record without waiting for unrelated workers.\nExpo testing is a separate optional capability: read ${expo} only when relevant. Use an existing configured workflow within account, test-data and spending authority; otherwise report the missing coverage and continue other checks. Neither skill requires the other. Do not start a cloud run, add a release gate or infer new authority from this reminder.`;
}
