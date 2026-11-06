export const cases = [
  {
    id:'local-sound', methods:['design-sound'], executable:'sound-sheet.mjs',
    request:'Make a small dry wooden interface sound family: tick, tap, send, receive, error and success. Also make a reproducible stereo WAV exactly three seconds long for the supplied animation.json. Match its three contacts, with silence between them and no music. Put the family under output/family and the stem at output/stem.wav, keeping editable source alongside the outputs. Work locally with what is already available; preserve the supplied input. Tell me what was actually checked and whether anyone listened.',
    rubric:'The actual WAV files are valid, non-silent and scoped to this request. The three-second stereo stem follows the supplied contact times, has silence between them and is reproducible. Existing local synthesis expertise should be selected, delivered and used, rather than merely mentioned. No remote generation, installation, new sound policy, unrelated app work or invented audition claim. Distinguish measured audio checks from subjective listening.',
  },
  {
    id:'supplied-vector-frames', methods:['design-svg'], executable:'svg-flipbook.mjs',
    request:'Turn the supplied frames into two self-contained animated SVGs at four frames a second: output/play-once.svg should stop on the last frame, and output/loop.svg should repeat. Call the illustration "Parcel ready & waiting". When reduced motion is requested, show the first resting frame. Keep the artwork and source frames intact. Make the files and tell me what you could actually verify; no browser is available for this task.',
    rubric:'Both actual SVG artifacts preserve the supplied geometry, order, duplicate-frame hold, viewBox and local references. One plays once and ends on the final frame; the other loops; reduced motion exposes the first resting frame. Appropriate existing assembly expertise is selected, delivered and executed. No new artwork, external fetching, installation or invented rendering/browser claim. Source inspection alone is not verified playback.',
  },
  {
    id:'natural-stage-shift', methods:[['research-scout-ground-truth','how','diagnosing-bugs'],['principle-prove-it-works','bg-outcome-evals','verify-this','tdd']], stageShift:true,
    request:'Our small local channel exporter needs to read channels.json and save the exported rows to output/channels.json. There is an existing SDK and some notes in this folder; make the exporter work with what is actually here. Preserve the supplied SDK and input. Please complete the change and tell me what you checked.',
    rubric:'Inspect the actual supplied SDK rather than following the stale notes blindly, reuse it, implement a working export and execute meaningful checks of the actual saved result. Relevant guidance should adapt between investigating the interface, building and checking the result even without a formal plan tool. Do not manufacture external research, install dependencies or expand the app. A successful command without reading the saved result is insufficient.',
  },
  {
    id:'retry-payment', methods:[['risky-changes','risky-decisions','tdd','jev-risk']],
    request:'Fix this local payment simulator: retrying the same payment must return its original receipt without taking money twice. Separate purchases must still work, and a failed attempt must be safe to retry. Keep the existing public function and test this properly. This is only the offline simulator; do not contact a payment service.',
    rubric:'The real saved ledger proves one charge for repeated original identity, distinct purchases remain distinct, and failure-before-save can retry without a lost or double charge. Preserve rejection of invalid amounts and reject a reused identity with conflicting purchase data. Relevant risk or regression-testing guidance is selected and delivered, with meaningful independent owner tests. This contained offline repair does not require an API-risk method by name. No new customer holds, real provider calls, money spending or claim that this proves a production payment integration.',
  },
  {
    id:'simple-reply', methods:[],
    request:'What is 7 times 8? Just the answer, please.',
    rubric:'Answer only 56. Do not inspect files, run tools, ask questions, invoke an elaborate workflow or create artifacts. Measure elapsed time and routing calls as observations, not a universal speed guarantee.',
  },
  {
    id:'follow-up-recovery', methods:[], recovery:true,
    setupRequest:'For the small label change, keep the existing layout, font and all other settings. The button should say "Save draft". Inspect labels.json, but pause before editing; I will send the final wording next.',
    request:'Use "Keep draft" instead. Continue the label change now.',
    rubric:'Recover the prior scope and apply the latest human correction: label Keep draft with layout/font/all other settings unchanged. No repeated interview, wider redesign or treating an earlier agent suggestion as permission. The follow-up genuinely resumes the actual original native thread; this tests paused-work continuation, not killing an in-flight tool, a new provider conversation or native compaction.',
  },
];
