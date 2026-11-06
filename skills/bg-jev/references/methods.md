# Jev methods

This reference is loaded by section, not injected into every conversation.

## Execution

From the installed plugin root, the main agent can call:

```text
node tools/foundation/bgz.mjs judge --stdin --live
```

Pass the request through standard input using the host's structured process tool or
proper shell quoting. Do not put secret values in arguments. `--preview` (or omitting
`--live`) validates locally and prints only question metadata without a network call.
No routine preview/approval ritual is required when the task already authorises the
data and usage. The helper performs judgments only; it never runs a selected command.
Use the installed path supplied with this skill, not a guessed working directory.
The legacy-compatible `jev` command still selects skills; `judge` is the broader API.

An input example, using public fictional material:

```json
{
  "model": "jev-1.14.0",
  "state": {"message": "The export crashes every time; I cannot download my report."},
  "questions": {
    "blocked": {"type": "noul", "instructions": "Does the message say the user cannot complete the export?"},
    "area": {"type": "choice", "instructions": "Which product area does the message concern?", "criteria": {"export": "Downloading a report", "login": "Signing into an account"}},
    "impact": {"type": "score", "instructions": "What observed impact is described?", "criteria": ["No user-visible failure", "Inconvenience with a working alternative", "The requested operation cannot be completed"]}
  }
}
```

The result is `answered` with typed answers, model and usage, or `fallback` with no
answers and a reason. Failures are not zero scores or negative answers. The official
SDK handles HTTP and response parsing; automatic retries are disabled for interactive
calls. The library API `createJevJudgment` accepts a cancellation signal and a
task-appropriate timeout. Automatic routing retains its existing shorter timeout.
No persistent ledger, manual receipt or reply-blocking stop rule is added.
The helper returns only validated documented fields. Score descriptions come from
the submitted rubric, so a provider echo cannot redefine the scale.

Input masking is defence in depth, not a guarantee of anonymisation. Minimise and
review the supplied data under existing authority. Do not send private history,
credentials or customer images merely because they are available. Native tool
records preserve observed calls where supported; use the existing private evaluation
artifacts for experiments. Do not copy private cases into public plugin defaults.

## Question design

- **Noul:** probability that a concrete statement is true from the given evidence.
  It has no separate confidence field. An unresolved answer is not a medium rating.
- **Choice:** select one real candidate. Preserve candidate IDs locally and validate
  the returned ID. For a possible absent answer, add a separate Noul asking whether
  any candidate fits; do not treat the compulsory winner as evidence of a match.
- **Score:** two to ten ordered, self-contained descriptions of situations. The
  expected score starts at zero and can be fractional. For a displayed one-to-ten
  scale use ten real descriptions and add one in code; don't claim decimal precision
  establishes the true impact. Keep occurrence, harm, certainty and urgency separate.
- **Box:** experimental image location. Supply a matching presence question and
  inspect the result. A rectangle is not permission to click or proof a UI works.

Question IDs are not instructions. Name the exact evidence and goal in the question.
Use structured state, source dates, relevant qualifiers and actual observations.
Don't ask a broad 'is it safe/done/good?' in place of observable checks. Multi-label
work needs one Noul per applicable label. Code combines answers and calculates totals.
Keep raw distributions; a middle Score can hide disagreement between opposite ends.

Model confidence summarises the distribution. It is not the measured probability
that an arbitrary task succeeds. Choose policies against labelled examples and
unseen cases; never inherit universal thresholds from a demo. Keep uncertainty,
missing evidence, contradiction and service failure distinct. A score cannot change
user authority, waive mandatory tests or override an observed failure.

## IndyDevDan's ten levels

The video/repository levels differ from Hyper Jev's cookbook chapter numbering.
These are capabilities to choose from, not ten compulsory steps:

1. **Single decisions:** one answerable yes/no judgment.
2. **Multiple decisions:** independent choices/questions together over shared state.
3. **Composite scoring:** assess separate factors, then apply visible weights in code.
4. **Uncertainty handling:** ask for evidence or use the reasoning agent where a
   judgment is unsettled. Confidence never grants authority.
5. **Intent and model routing:** use the existing foundation selector, actual model
   availability and user priorities. A recommendation does not switch the host model.
6. **Risk screening around actions:** compare intended effects with the current
   request. Host permissions and mechanical checks remain authoritative; cover other
   action paths in the application rather than trusting a single Bash demo hook.
7. **Compaction advice:** use actual host context signals and native continuation.
   Never estimate a hard limit from transcript bytes or force a new chat.
8. **Targeted reads:** ask which supplied excerpt matters, then inspect the original.
   A relevance answer is a pointer, not a replacement for evidence.
9. **Files at scale:** index/search locally, rank a bounded relevant shortlist, then
   read selected originals. Report coverage gaps; do not upload the entire project.
10. **Agent-written questions:** the main agent constructs specific state, questions
    and candidates as the task evolves. Validate them, preserve scope and check actual
    effects. Do not let generated questions or selected commands create permissions.

## Compositions

**Research:** local retrieval -> relevance and contradiction questions -> exact
source reads -> claim-support check -> agent writes a supported answer. Selection
coverage and support accuracy are separate. A quote existing in a source does not
prove the claim, and an unsearched document cannot be declared free of evidence.

**Build and debug:** real change and failing output -> component/test shortlist ->
selected first check -> actual result -> revised diagnosis. Run remaining required
checks. Classifying an error message does not prove its cause.

**Clarification:** latest request plus relevant answers -> identify a material
unanswered choice -> main agent asks a plain-English question with consequences ->
user's answer changes the actual implementation. Jev doesn't infer consent, enforce
a question count or replace the shared questioning skills.

**Large taxonomies:** shortlist or traverse categories, retain plausible alternatives,
then compare actual finalists. Respect the current Choice limit of 255 options.
Measure losses from early pruning. A path score is not a calibrated end-to-end truth
probability; duplicate candidates or changed ordering may affect the outcome.

**Reasoning plus decisions:** the main model proposes a few meaningful options,
Jev assesses observable differences, code applies agreed priorities, and the main
model handles explanation or unresolved trade-offs. Preserve a plausible alternative
when action feedback contradicts the first choice. Repeated no-effect actions call
for new evidence or a different approach, not a faster loop of the same action.

**Learning:** retain actual failures privately, propose clearer evidence/questions,
test against failures, good cases and unseen cases, then adopt within authority.
Jev does not learn new private weights from usage. Its feature-discovery cookbook
trains a separate predictor from labelled data; it is not automatic agent learning.

## Images and long context

Current source documentation lists Jev 1.14 as the stable model. Use a versioned model
for comparisons; log the returned version and re-evaluate when switching versions.
The installed SDK supports Choice, Noul, Score, Image and Box.

The JSON helper accepts `assets` mapping a distinctive marker such as `<photo>` to
`{"base64":"..."}`. Reference that marker in state or question text. Pass
`--experimental-images` only for an authorised image prototype. The helper converts
bytes through the official Image API and sends the documented experimental header.
PNG/JPEG and current image limits apply; read live docs before integrating. Image
contents cannot be made private by the text masker. No native audio/video support.

`--long-context` sends the documented experimental long-context header. It is not a
default solution to retrieval: the provider describes it as slower and less accurate.
Prefer relevant evidence within normal limits. Neither experimental option activates
itself or adds a host permission. Production image reliability remains unverified.
A synthetic 320-pixel square trial correctly detected presence and absence but
missed its known boundaries. That failure is retained; accepting a Box response
proves API wiring only.
