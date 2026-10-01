---
name: bg-build-with-me
description: Use when someone wants a substantial goal, build, fix or continuation managed end to end, including from a short or vague prompt, and the right stages, capabilities, skills and workers must be chosen from the real project state.
---

# BG Build With Me

## When to use

Use for a substantial new outcome or a continuation. Treat a short prompt as a valid request: recover its meaning from the project and its recorded decisions. Keep a plain question or a tiny complete edit proportionate.

Roles follow the [worker route](references/worker-route.md): the **lead** plans, dispatches directly, reads short results and decides; **workers** do the heavy reading, building and testing; a fresh **independent checker** assesses the exact candidate. When a private overlay exists (`$BGZFLOW_OVERLAY`, else `~/.bgzflow/overlay/`), read its `FOUNDER.md` for the founder's recorded decisions and its `ROUTES.md` for providers. The overlay adds preferences and routes; it never weakens a safety rule.

## Numbered checklist

1. **Reconcile → existing checkpoint.** Read AGENTS.md, the project instructions, the one-page `CHECKPOINT.md`, the accepted plan, `DECISIONS.md`, the latest handoff, owners and holds. Verify branch, admitted base, dirty work, exact job/thread and owned worktree before writing. Treat any job record that says running or queued but has no live process as uncertain. Reuse the current task and session. Route interrupted or uncertain work to `bg-continue-my-project` and resolve only the affected uncertainty. Use the [glossary](references/glossary.md) and the existing C4, interface/data and requirement IDs.
2. **Set current and next stage → stage record.** Use [stage routes](references/stage-routes.md). Record the original outcome, observable acceptance and authority in the [shared contract](references/decision-and-delivery-contract.md). Planning-only work stays planning-only. New products and major screens go to `bg-plain-english-builder` with a clickable prototype; small changes reuse settled decisions and approved designs.
3. **Resolve required coverage before optional selection → coverage record.** Load or retain `bg-efficiency`. Apply explicit skill requests and [capability coverage](references/capability-coverage.md) for the current and the next stage separately, from the real surface, domain and risk facts. Account for every gap with an owner and next action; label a hand-applied result `manual`. Required coverage survives any optional selection.
4. **Select additional knowledge → selection record.** Use bounded [skill selection](references/skill-selection.md): one current/next pick with a routing judgment, the optional catalogue and judgment route where configured, or its one-pass fallback. Reuse matching unchanged selections. Apply [optional methods](references/optional-methods.md) under BG trigger ownership. Keep the approved visual contract rather than adopting a whole style preset.
5. **Read and deliver → executor read receipt.** Read every selected full body before its affected work, with exact ID and hash checks or the [discovery-copy procedure](references/skill-selection.md#body-read-and-fallback-procedure). Give each executor current/next coverage, source versions, shared contracts and required tools. Record actual reads, application and tool results separately from selection. After context loss, restore missing or changed bodies and keep unchanged valid reads.
6. **Prepare ready work → plan and briefs.** Use the [copyable templates](references/decision-and-delivery-contract.md#copyable-templates) and the [brief](../../templates/BRIEF.md). Capture disjoint owned paths, accepted dependencies, integration owner, exact checks, required outputs, return route, time and size caps and the once-agreed usage ceiling. Dispatch ready authorised work automatically within capacity and the ceiling. Do mechanical steps under about 2 minutes yourself. For unresolved product choices use the [question round](../bg-plain-english-builder/references/question-round.md#copyable-question-round) and continue independent ready work.
7. **Execute the route → job and result record.** Follow the [worker route](references/worker-route.md): readiness check once per lead, direct dispatch with a prompt file, one background wait, short result, fresh independent read-only check and the cheapest decisive proof. Keep full history and durable evidence; no worker board or visible worker chat is required. The integration owner combines exact candidates and tests the combined result. Show the agreed early skeleton, then the whole outcome.
8. **Repair or continue → finding disposition.** Keep every unresolved finding under its stable ID and owner. Use the route's exact resume-preview and ownership checks; a shared-parent "resume last" is never a verified target. Allow at most two repair rounds (tracked in the `bg-rounds` ledger), then report open findings; round 3 needs the founder's explicit approval. Use `bg-continue-my-project` for account or host recovery and cloud eligibility; local background jobs do not prove work continues while the machine is off.
9. **Hand back → candidate-bound evidence and next action.** Compare the result with the original meaning. Record exact candidate, base and environment, commands and results, failed or missing checks, live-identical versus candidate-only state, reviewer identity and next owner. At each material boundary use the short handover checklist (`state`, `stage`, `skill-selection`, `ownership`, `next-action`); the full [evidence gate](../bg-check-it-before-release/references/enforcement.md) runs only at review and release. Update `CHECKPOINT.md` and move history to `ARCHIVE.md`. Candidate acceptance and authorised release stay separate.

## Copyable templates

Use the shared [plan, task, brief, read receipt and handback templates](references/decision-and-delivery-contract.md#copyable-templates) and the [question round](../bg-plain-english-builder/references/question-round.md#copyable-question-round). Write them into the existing project records, not a second tracker.

```text
Current stage: <stage + evidence>
Next stage: <stage + entry condition>
Required coverage: <required-current + required-next, or labelled manual>
Optional selection: <bounded pick / reused fingerprint / one-pass fallback>
Executor reads: <ID, source, SHA-256, actual read evidence or precise gap>
Next action: <existing owner, artifact, authority and return route>
```

## Red-flag thought → required action

| Thought | Required action |
|---|---|
| "Search did not find a testing skill." | Apply required current/next coverage from the platform facts; use the pack method when no skill is installed. |
| "The brief lists it, so the worker loaded it." | Inspect the executor's full-body read evidence or record the fallback. |
| "The newest job must be this lane." | Match job, thread, session and workspace, and reconcile active jobs and dead processes, before repair. |
| "A passing record proves delivery." | Inspect exact-candidate behaviour evidence and obtain an independent check. |
| "Another framework says ask again." | Apply existing authority and BG trigger ownership; ask only the unresolved decision. |
| "It's one command; I'll dispatch a worker." | Do mechanical steps under about 2 minutes yourself. |

## Filled worked example

"Finish the onboarding" refers to the approved onboarding plan and an Android target. The task is at implementation; integration is next. Resolve coverage for both stages with the surfaces UI, React Native and Android, even though the prompt omits them: both keep accessibility, mobile token guidance and real-flow acceptance, and integration adds native performance and review coverage. Read the selected bodies or apply the pack methods. Send the owned screen worktree, approved tokens and error, retry and device checks in one brief. The lead collects the short result through one background wait; a fresh checker evaluates the exact integrated candidate. Defects return through the matched task identity, two repair rounds at most. Illustrative, not a claim that a device test ran.
