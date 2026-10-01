# Planning that evolves with the conversation

Use the checklist in the [skill](../SKILL.md) as the single discovery procedure. Run the [question procedure](question-round.md#procedure) while exploring the vision, and fill the [plan](plan-template.md#copyable-plan) when making execution ready. Store outputs in the existing brief, plan, work graph and checkpoint; keep one tracker.

## Current and next expertise

Load BG Efficiency; read its [sources](../../bg-efficiency/references/sources.md) only when a task needs their detail. Apply the [required capability coverage](../../bg-build-with-me/references/capability-coverage.md) for the current and next stage, then choose further installed skill bodies; an [optional catalogue and judgment route](../../bg-build-with-me/references/skill-selection.md#optional-catalogue-and-judgment-route) may rank candidates in one bounded pass. Reuse a matching selection, or record the one-pass [fallback](../../bg-build-with-me/references/skill-selection.md#body-read-and-fallback-procedure) when a route is unavailable. Record actual body reads and tool use separately.

Use planning guidance for each task's consumed and produced interfaces and for requirement coverage, and domain guidance for established names and edge cases. Fold useful interview methods into this one question procedure ([optional methods](../../bg-build-with-me/references/optional-methods.md); if installed, e.g. `grill-me` or Superpowers `brainstorming`). The lead/worker route, existing records and the agreed checkpoint cadence override imported one-question-at-a-time defaults, fresh-agent loops and routine approval gates. Revisit the selection when scope, platform or risk changes materially, not on every message.

The lead owns questions and decisions and sends substantial source inspection, research, prototyping and detailed planning to bounded worker jobs through the [worker route](../../bg-build-with-me/references/worker-route.md). Each job gets the exact outcome, source paths, owned outputs, caps in minutes and KB, and a short-result contract with full evidence in files. Read the result and the decisive evidence; send a targeted follow-up for any gap. The lead does mechanical steps under about 2 minutes itself.

## Research without a reminder

Inspect retained evidence and relevant code first. When capability, compatibility, licensing, cost or maintenance affects a decision, verify it in dated primary sources. Treat videos and examples as leads, and confirm consequential claims in authoritative documentation or code. Record unavailable evidence and the work it affects. Stop a research branch once it supports its decision. Never install or run a discovered repository just to show activity.

Keep four sources distinct: the founder's actual answers, facts from inspected code, sourced external facts and assumptions. Record the exact source, version and inference. A code default describes current behavior; it does not establish the founder's preference. When evidence contradicts an assumption, correct it in the same ledger and carry the change into affected tasks and tests.

## Coverage and stopping rule

Use these categories in the plan's coverage table. For non-software work, substitute the domain's equivalents.

| Category | Establish before dependent work |
| --- | --- |
| People and situations | Audience, context, need and exclusions |
| Complete journey | Entry, core job, result and cross-surface continuation |
| Content/output quality | What useful, correct output means; what is unacceptable |
| Priorities | Whole outcome, sequencing and explicit deferred scope |
| Visual and interaction | Chosen experience, rejected alternatives, actual approval |
| Platforms and devices | Required surfaces, capability gaps and native checks |
| Accessibility | Applicable input, reading, motion and assistive needs |
| Identity and permissions | Who acts, who sees data, limits on consequential actions |
| Privacy and data lifetime | Collection, storage, deletion and cross-device expectations |
| Money and margin | Business model, customer price, fees, costs and existing spend authority |
| Failure and recovery | Offline, interruption, retries, uncertain effects and restoration |
| Operations and support | Who maintains the product, observes failures and helps users |
| Success measures | Observable useful outcome; acceptable quality and performance |
| Acceptance and release | Prototype decision, skeleton, whole-product return, the founder's involvement and standing holds |

Ask only unresolved product, experience and business choices, in the numbered [question rounds](question-round.md#procedure). Derive routine engineering from evidence instead of handing it to the founder.

Discovery finishes when every relevant category is answered, evidenced, inapplicable with a reason, or explicitly deferred by the founder. An assumption without evidence stays open. For each deferral keep the requirement, task, owner and revisit trigger. Hold only the work that needs the answer, and continue independent ready work. Worked examples in this skill are illustrative; they never stand in for the founder's answers.

## Prototype interface

For every new product or major screen, build a clickable prototype before dependent implementation. For a new look, ask [BG Personal Product Design](../../bg-personal-product-design/SKILL.md) for at least eight genuinely different [rendered directions](../../bg-personal-product-design/references/techniques.md#eight-or-more-rendered-directions), more on request. Vary composition, hierarchy, density, typography, material, motion and interaction where useful; eight palette swaps fail. Fit each look to the product and its audience; there is no universal dark or glass house default. A small change reuses the genuinely approved design.

Give the UI owner the required surfaces, core journey, realistic content, states, accessibility needs, approved and rejected references and open choices in the [prototype packet](plan-template.md#copyable-prototype-packet). The [design contract](../../bg-personal-product-design/references/design-contract.md#copyable-design-plan) owns the UI fields and [acceptance artifacts](../../bg-personal-product-design/references/design-contract.md#ui-acceptance-artifacts). Discovery continues meanwhile, without a second UI kit or repeated taste research. Each surface follows its own conventions: a chat surface uses equivalent text actions and truthful status rather than imitating a desktop layout.

The UI owner returns a runnable click path plus representative empty, loading, success, error, offline, cancel and permission states, marks what is simulated, and shows the actual versions under consideration. Record the founder's exact choice and its scope. Then pin the approved tokens, components, interactions, reference images and surface versions through the design contract. Lock only a look the founder actually approved; a generated screenshot or silence is not approval. Carry rich effects on capable devices, and reduction of only the affected effects on constrained devices, into the implementation checks.

## Complete execution handoff

Use the [plan template](plan-template.md#copyable-plan), the shared [glossary](../../bg-build-with-me/references/glossary.md), existing architecture IDs and contracts, and the schema-version-1 [work graph](../../bg-finish-the-whole-job/references/work-graph.md#task-schema). Keep original requirement and finding IDs. Give every task exact owned paths, dependency gates, real commands or concrete observed procedures, expected outcomes and evidence destinations. Record unknown ownership, product code or commands as explicit readiness gaps; never invent an executable script.

Record dated allowance evidence, the usage ceiling agreed once, the reserve, and which tasks need the local machine versus verified included cloud. Plan approval launches ready independent workers within that ceiling through [BG Finish the Whole Job](../../bg-finish-the-whole-job/SKILL.md), with no separate launch approval. Keep one lead and one integration writer. Return one early working skeleton, continue agreed independent work, then send the whole integrated candidate to [BG Check It Before Release](../../bg-check-it-before-release/SKILL.md).

Carry the mandatory [readiness report](plan-template.md#readiness-report) into both the delivery assignment and the final-review handoff: one plain-English page plus every original ask marked `done`, `partly` or `not done`, with evidence or a named gap and a next action and owner for each. A worker-only list, task receipts or a test count never replace it. The final reviewer verifies it against the original asks and the exact candidate before any `ready` verdict.

Follow the worker lifecycle: direct dispatch, one background wait, a short result, fresh independent checking and at most two repair rounds under stable finding IDs; a third needs the founder's explicit approval. Bind each repair to the recorded job, thread and workspace; never blindly resume the last job from a shared parent folder. After the cap, report the unresolved findings. The lead accepts a `ready` verdict itself and asks the founder only about undecided product, design or business choices, spending, release outside the brief's authority, or findings open after two rounds, each with a recommendation. Apply existing scope, authority and holds. Add no extra outside plan-review rounds, worker board, forwarding agent, polling loop or routine log dump; the lead implements nothing beyond mechanical steps under about 2 minutes.

Apply the [shared enforcement reference](../../bg-check-it-before-release/references/enforcement.md) once, at the material handoff. Record native, manual, fixture and unrun evidence separately. Send needed changes to shared contracts or enforcement to their owner through the handback.
