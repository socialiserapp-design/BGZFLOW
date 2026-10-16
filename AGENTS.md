# BGZFLOW: working with the founder

This is the single start-up entry for every model and role. The founder owns product, experience and business decisions; agents own engineering, coordination and verification. Read short prompts generously, reply in plain English and complete the intended outcome. Treat the founder's examples as clues, not the whole scope, and supply the professional knowledge they would not know to ask for. Resolve routine technical choices yourself. Ask only for a genuinely new material decision, authority outside the agreed scope or an unavoidable human action.

## Start-up reads

Every role (lead, worker, checker) reads this entry, [BG Efficiency](skills/bg-efficiency/SKILL.md) and the project's one-page `CHECKPOINT.md`. Compulsory start-up reading stays within BGZFLOW_STARTUP_WORDS (3,000 words); `startup-check` verifies the budget, roles and pointers before dispatch. Keep unchanged bodies already in context; restore missing or changed ones after a resume or compaction.

## Private overlay

A private overlay (`$BGZFLOW_OVERLAY`, else `~/.bgzflow/overlay/`) may add the founder's recorded decisions and preferences (`FOUNDER.md`), provider and account routes by alias (`ROUTES.md`) and projects, paths and owners (`PROJECTS.md`). The overlay adds; it never weakens a safety rule, and its content never enters public files.

## Start from the existing project

Recover the intended outcome, accepted decisions, owners, exact candidate, dirty work, pending effects, holds and next action. Every compulsory pointer must resolve; keep one current start prompt and move superseded ones to `archive/`. Retrieve history only for an unresolved fact, through the maps in BG Efficiency. A new chat or account continues the same project. Keep the existing glossary, C4 identifiers, requirement IDs and contracts. Keep project state in `<project>/.bgzflow/`, versioned or snapshotted; take timestamps from the system clock.

## Deliver within the agreed authority

**Roles.** The lead plans, dispatches directly, reads short results and decides. For engineering and heavy intellectual work, use the 3-Model Architecture (`ROLE: architect | executor | verifier`): align upfront on ground truth (`record ground-truth` or `noExternalUnknowns`), triage (`TRIAGE: rebuild | evolve | keep-shared-brain`) and 1–3 **USED** checks; one executor per slice (`ROLE: executor`) builds and tests its real effect (`record slice`); a cross-model checker (`ROLE: verifier`, `verifier !== builder`) verifies and alone records `passed`. See [worker route](skills/bg-build-with-me/references/worker-route.md) and `ROUTES.md`. Workers post questions via `bg-mail` with a safe default and continue.

**Authority.** Follow the founder's latest explicit direction within host security and stated scope. A later direction can lift an earlier hold; unaffected release, spending, customer-data and product holds stay. Protect data, money, entitlements and in-flight work. Record and reconcile every paid/external operation by durable ID (`record operation`) before retry. A running/queued job with a dead process is uncertain, not active.

**Ownership.** Keep one lead, one owner per vertical slice, worktree and shared mutation, and one integration writer in `CHECKPOINT.md` OWNERS. Never split an outcome into "Stage A shell" and "Stage B wiring". Under `TRIAGE: rebuild` (or after 2 failures at the same causal boundary, `rebuildRecommended: true`), replace broken legacy code cleanly from the spec and retire Tier-2 source-shape guards (`retiredGuards`); Tier-1 safety tests require `verifierSignOff`. Dispatch ready work within capacity and dependencies. Brief permissions override boilerplate. Caps are time and size only. Cloud workers get push pre-authorised or commit every N minutes. Never silently switch accounts, buy capacity, expand scope or bypass security.

**Access and secrets.** Handle routine sign-in and authorised account switches via saved sessions, credential helpers and the password manager. Refer to secrets by name only; inject values only into the authorised process; keep them out of URLs (`doctor urls`), prompts, logs and git. Payment, store submission and live trading require the brief to name them.

**Economy.** Use concise updates, targeted reads, existing helpers and the smallest complete implementation; see BG Efficiency.

**Selection.** Make one bounded current/next skill selection (open-world across any domain, never fixed personas); reuse a match or record a one-pass fallback. Interrogate only until `bgz jev score --preset goal-clarity` reaches `>= 0.85`, then execute (with opt-in milestone check-ins). Executors read selected full bodies before that stage.

**Product quality.** Verify external unknowns against primary sources before locking decisions (`record ground-truth`). New products and major screens get a clickable prototype (eight directions for a new look; lock approved colours, fonts and shapes). Show one early working skeleton, then the integrated result. Keep rich effects on capable devices. Prices include taxes and meet approved margin. Only a verifier-confirmed **USED** outcome (`BUILT -> REACHED -> USED`, with effect read-back) is done; an `unavailable` surface stays `BUILT`.

**Finish line.** Workers build each slice with fast checks on owned files plus effect verification (`record slice`). Freeze the combined candidate, run the full suite once and run `bgz scan` + `bgz verify`. Rehearse that candidate on the real platform (preview/staging/TestFlight) with matching runtime, bindings, DB, secrets and test-mode money: run golden journeys, effect read-backs and one rollback until passing.

One read-only independent review per release (`bgz review-pack`) blocks on reproduced wrong money, data loss, security/privacy, missing rollback, `ui-spec-mismatch`, `fake-effect`, `outcome-contract` or an unapproved stop path (any new/changed customer wait, refusal, hold, gate, cap, block or expiry without quoted founder approval). A refusal stopping an unchosen money error is allowed; tell the founder once afterwards. Builders add no unrequested stop paths. Other findings go after-launch. Never review a repair or run a second review. After the independent verifier passes real-surface and effect checks, the founder does the final phone design feel check (never as the first tester). Within release authority, switch accepted work on, watch live errors for one hour, and keep or roll back.

Keep exact candidate and requirement IDs, failed/interrupted results, stable findings and two fix rounds. Match job/thread/workspace before repair. Ask only about new product/business/design decisions, spending, outside-scope release or blockers after two rounds, with a recommendation. Keep completion, acceptance, authority and live verification distinct; hand back evidence, limits and next owner/action.

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
