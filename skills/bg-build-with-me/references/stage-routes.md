# Stage routes and acceptance

This is a routing contract, not a scheduler. Resolve installed sibling skills through the host's skill discovery or their exact installed paths. A missing required skill or tool is an explicit gap, never a fictional invocation. One job can run independent lanes at different stages; impose no project-wide stage barrier.

## At every admission or material transition

1. Record the current and next stage with the actual facts.
2. Apply [capability coverage](capability-coverage.md) separately for both stages before any optional search.
3. Make one bounded [selection and routing judgment](skill-selection.md), reuse a matching one, or record the labelled one-pass fallback.
4. Verify each executor's [actual full-body reads](skill-selection.md#body-read-and-fallback-procedure).
5. Update the [checkpoint](../../../templates/CHECKPOINT.md). Start the next stage in a fresh short chat from a [handoff](../../../templates/HANDOFF.md) of at most `BGZFLOW_HANDOFF_KB`, and start one sooner when a chat passes `BGZFLOW_CHAT_MB`. A fresh chat keeps the project memory (checkpoint, decisions, archive); it never restarts the work.

Keep the [glossary](glossary.md) terms and existing IDs. Keep exactly one current start prompt and move superseded prompts to `archive/`. Every compulsory pointer must resolve. When a selection tool is unavailable, apply the same coverage table manually and label native execution unrun.

The lead plans, dispatches, reads short results and decides. Workers do the heavy work, and a fresh independent checker inspects read-only. One background wait returns a short result to the lead; full history stays retained. There is no polling loop and no forwarding agent. Apply the two-round repair cap and the exact resume-identity rule in [worker-route.md](worker-route.md); never blindly resume the latest job from a shared parent folder. A worker board and an other-vendor checker are optional, never prerequisites. Alternative host and peer routes stay separately qualified.

| Observed need | Stage skill | Boundary evidence |
|---|---|---|
| New idea, significant new outcome, unexplored product choices | [bg-plain-english-builder](../../bg-plain-english-builder/SKILL.md) | Thorough discovery record, research, represented design, user understanding, requirement coverage, contracts, dependencies and acceptance |
| Existing interrupted or unclear work | [bg-continue-my-project](../../bg-continue-my-project/SKILL.md) | Actual owners, source and artifact versions, pending requests, holds and effects reconciled; same-task next action |
| Agreed plan with independently ready work | [bg-finish-the-whole-job](../../bg-finish-the-whole-job/SKILL.md) | Actual execution, tests and repairs, integrated candidate, requirement-to-evidence coverage, unresolved findings preserved |
| Whole result ready for independent assessment | [bg-check-it-before-release](../../bg-check-it-before-release/SKILL.md) | Exact-candidate judgement against the original requirements, applicable commercial checks, concrete repair findings or acceptance |
| Accepted candidate and actual release authority | [bg-ship-and-recover](../../bg-ship-and-recover/SKILL.md) | Exact authorised artifact and configuration, deployment receipt, observed production checks and compatible recovery evidence |
| UI or UX at any stage | [bg-personal-product-design](../../bg-personal-product-design/SKILL.md) alongside that stage | Stage-appropriate design evidence: discovery records the proposed or approved direction and open choices; implementation and integrated acceptance need actual rendered, device and customer-flow checks with blocking findings resolved |

Select specialists by need, never all at once: questioning, research and domain modelling in discovery; architecture, interface and security design for cross-boundary decisions; the [optional methods](optional-methods.md) for planning, parallel work, debugging and testing in execution; platform performance, accessibility, payments and release expertise for the matching surfaces. Reuse an existing skill's meaningful method and resolve explicit conflicts.

## Adapt the same stages to the medium

| Outcome | Useful specialist families | Whole-outcome checks |
|---|---|---|
| App, site or service | Domain and interface design, security, UI, native and web tests, payments, observability, platform release | Connected customer journeys, failure and recovery, suitable devices, security, accessibility, performance and exact deployment |
| Video, audio or image | Creative brief, references and brand, selected media tools, editing, captions and audio, appropriate rights | Inspect the final assembled output: timing, sound, captions, identity, product fidelity, format and requested content. A contact sheet cannot prove motion or audio |
| Document, slides or spreadsheet | Subject expertise, source research, document structure, formulas and data, native format tools | Substantive accuracy, units, sources and calculations, editable structure and rendered pages or slides. Recalculation alone cannot prove the model is correct |
| Marketing, research or pricing | Customer research, positioning, claims and evidence, relevant channels and analytics, unit economics | Faithful audience and offer, real proof, coherent deliverables and actual observed outcomes where requested. No implied campaign, publication or spend |

Use engineering architecture and contracts only where they apply: a media plan uses asset, scene and output contracts, and a research plan uses source, method and output requirements. Keep C4 diagrams, code worktrees, emulators and release infrastructure for work that needs them. Give a small complete request a proportionate direct route; thorough discovery is for real uncertainty, not a ritual that makes a simple edit expensive.

Interpret common requests completely:
- "Do the UI": establish the intended experience and approved visual direction, cover interactions and every relevant state, implement coherently and verify on the target surfaces. A decorative theme is never the whole job.
- "Test everything": derive the applicable checks from the agreed product and risks, connect features into real customer journeys and include failure behaviour. Existing test scripts are evidence, not the definition of completeness.
- "Finish it": reconcile what already exists, close every agreed requirement and finding, integrate and verify; release only under actual authority.
- "Make it professional": find out what that means for this audience and product, offer concrete examples, resolve subjective choices and set an observable quality bar.

Stage completion is scoped. A source fix is not native device proof; worker completion is not acceptance; acceptance is not deployment; deployment is not production verification. Never relabel missing evidence as inapplicable to obtain a pass.
