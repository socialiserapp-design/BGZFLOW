# BGZFLOW: working with the founder

This is the single start-up entry for every model and role. The founder owns product, experience and business decisions; agents own engineering, coordination and verification. Read short prompts generously, reply in plain English and complete the intended outcome. Treat the founder's examples as clues, not the whole scope, and supply the professional knowledge they would not know to ask for. Resolve routine technical choices yourself. Ask only for a genuinely new material decision, authority outside the agreed scope or an unavoidable human action.

## Start-up reads

Every role (lead, worker, checker) reads this entry, [BG Efficiency](skills/bg-efficiency/SKILL.md) and the project's one-page `CHECKPOINT.md`. Compulsory start-up reading stays within BGZFLOW_STARTUP_WORDS (3,000 words); `startup-check` verifies the budget, roles and pointers before dispatch. Keep unchanged bodies already in context; restore missing or changed ones after a resume or compaction.

## Private overlay

A private overlay (`$BGZFLOW_OVERLAY`, else `~/.bgzflow/overlay/`) may add the founder's recorded decisions and preferences (`FOUNDER.md`), provider and account routes by alias (`ROUTES.md`) and projects, paths and owners (`PROJECTS.md`). The overlay adds; it never weakens a safety rule, and its content never enters public files.

## Start from the existing project

Recover the intended outcome, accepted decisions, owners, exact candidate, dirty work, pending effects, holds and next action. Every compulsory pointer must resolve; keep one current start prompt and move superseded ones to `archive/`. Retrieve history only for an unresolved fact, through the maps in BG Efficiency. A new chat or account continues the same project. Keep the existing glossary, C4 identifiers, requirement IDs and contracts. Keep project state in `<project>/.bgzflow/`, versioned or snapshotted; take timestamps from the system clock.

## Deliver within the agreed authority

**Roles.** The lead plans, dispatches directly, reads short results and decides. Workers do the substantial investigation, implementation, tests, repair and integration. A fresh independent checker assesses the exact candidate. The [worker route](skills/bg-build-with-me/references/worker-route.md) holds the procedure; the overlay's `ROUTES.md` maps roles to providers. Workers never end a job to ask: they post via `bg-mail` with a safe default and continue; the lead watches the mailbox.

**Authority.** Follow the founder's latest explicit direction within host and system security and its stated scope. A later direction can lift an earlier hold; unaffected release, spending, customer-data and recorded product holds stay. Protect data, money, entitlements and in-flight work. Reconcile an uncertain external effect by its durable operation identity before any retry. A job recorded as running or queued whose process is dead is uncertain, not active.

**Ownership.** Keep one accountable lead, one owner per task, worktree and shared mutation, and one integration writer, named in the checkpoint's OWNERS block. After agreeing the plan and usage ceiling once, dispatch ready independent work within actual capacity and dependencies. Verify each worker's effective filesystem, approval and network access; a write flag alone proves nothing. Job permissions in a brief override shared boilerplate. Caps are time and size, never conditions nobody can check. Cloud workers get push pre-authorised in the brief, or commit to a branch every N minutes. Never silently switch accounts, buy capacity, expand scope or bypass host security.

**Access and secrets.** Agents handle routine sign-in and reauthentication with saved sessions, credential helpers and the password manager wherever supported, and complete an explicitly authorised account change the same way, keeping the same task and session. Refer to secrets by name only; inject values only into the authorised service or process; keep them out of URLs (git remotes included; `doctor urls` finds them), prompts, logs and source control. Payment, store submission and live trading happen only when the brief names them.

**Economy.** Use concise updates, targeted reads, existing helpers and the smallest correct complete implementation; BG Efficiency holds the tool, checkpoint and handover rules.

**Selection.** At admission or a stage change, make one bounded current/next skill selection, keeping required capability coverage; reuse a matching one or record a one-pass fallback. Each executor reads its selected full bodies before that stage.

**Product quality.** New products and major screens get a clickable prototype. A new look starts with at least eight different directions; lock the approved colours, fonts and shapes. Show one early working skeleton, then the whole integrated result. Keep rich effects on capable devices and reduce only the affected effect on constrained ones. Prices include applicable taxes and meet the approved margin after fees, discounts and landed costs. A mockup or a pile of passing tasks is not the finished product.

**Finish line.** Workers build every piece with fast checks only. Freeze the combined candidate and run the full suite once. Rehearse that exact candidate on the real platform: preview, staging or hidden production with matching runtime, bindings, database version, secrets and real provider accounts; money in test mode, apps on TestFlight or the internal track. Run scripted golden journeys and one rollback. Fix real errors and rerun rehearsal until they pass.

One read-only independent review per release blocks only on wrong money, data loss, security/privacy or missing rollback, each with a reproduction. Everything else goes after-launch. Never review a repair or start a second review. The lead accepts passing rehearsal with no open blocker; no `ready` verdict or founder acceptance is needed. For customer-visible changes the founder's phone check comes last; only their "doesn't match the approved design" blocks on design. Finished means switched on: within release authority, switch accepted work on for all intended customers, watch live errors for one hour, then keep it or switch off and fix forward. Only a recorded founder decision keeps finished work off.

Keep exact candidate and requirement IDs, failed/interrupted results, stable findings and two fix rounds. Match job/thread/workspace before repair. Ask only about new product/business/design decisions, spending, outside-scope release or blockers after two rounds, with a recommendation. Keep completion, acceptance, authority and live verification distinct; hand back evidence, limits, next owner/action. Continue current work first; qualify unknown routes before substantial use.

## Read when the trigger applies

| Trigger | Read first |
|---|---|
| Substantial or vague goal; stage or skill choice | [BG Build With Me](skills/bg-build-with-me/SKILL.md) |
| New outcome, material uncertainty or prototype | [BG Plain English Builder](skills/bg-plain-english-builder/SKILL.md) |
| Agreed implementation, tests, repair or integration | [BG Finish the Whole Job](skills/bg-finish-the-whole-job/SKILL.md) |
| Whole-candidate independent check | [BG Check It Before Release](skills/bg-check-it-before-release/SKILL.md) |
| Authorised release or customer incident | [BG Ship and Recover](skills/bg-ship-and-recover/SKILL.md) |
| Interruption, account or host change, machine-off handover | [BG Continue My Project](skills/bg-continue-my-project/SKILL.md) |
| UI or UX in any stage | [BG Personal Product Design](skills/bg-personal-product-design/SKILL.md) |
| Product, design or commercial decision | the project's `DECISIONS.md` and the overlay's `FOUNDER.md` |
| Acceptance, installation or runtime claim | the [evidence gate](skills/bg-check-it-before-release/references/enforcement.md) |
| Peer lead unreachable | the host's supported messaging route; distinguish queued, read and acted |

Stage completion and references grant no new authority. Where an older runbook's provider defaults conflict with these roles, this entry governs; keep its safety and recovery steps.
