// Primary-turn guidance only: local assets, no classifier, network call or request logging.
import { prepareRequest, methodGuidance } from '../tools/engine/method-policy.mjs';
import { runHook, contextOutput } from './lib/io.mjs';

await runHook('h10-method-guidance', async ({ input }) => {
  const event = input.hook_event_name ?? input.hookEventName ?? 'SessionStart';
  const context = event === 'UserPromptSubmit'
    ? 'Apply the BGZFLOW default task guidance automatically: investigate material uncertainties with permitted primary evidence, verify actual results on the real surface, preserve intent and use the efficiency method. For substantial work (coding, architecture, research, OSS search, reports, legal/financial docs, UI/media), use Google Graph Engineering (bgz graph), the Universal 8-Domain Eval Engine (bgz eval), and the 6-stage Harness 2 loop: run a 30-second Pre-Flight Scout first then ask decisive questions to compile a Task Eval Card (bgz eval codesign), enforce 4-Channel x 4-Angle saturation on research/OSS searches (bgz eval research), enforce Build-vs-Buy and architecture bounds (bgz eval architecture), lock every document/report claim, exhibit, citation and statutory/domain precondition with zero hallucinations (bgz eval claims), cross-foot all math/tables (bgz eval math), pass deterministic_join and independent_verifier (with builder reasoning stripped) plus Step 2 Jev Attack, block delivery and force auto-correction on any eval failure, after 2 failed attempts run bgz graph assess, and record every user correction via bgz eval learn. Keep simple requests direct.'
    : methodGuidance(await prepareRequest());
  return contextOutput(event, context);
});
