---
name: bg-finish-the-whole-job
description: Use when an agreed plan must become one working, integrated product through parallel workers: build it, finish the app, make all the pieces work together, or complete an unfinished combined deliverable of code, documents, video or research.
---

# BG Finish the Whole Job

## When to use

Use for an agreed build, a substantial implementation or an unfinished combined deliverable. Recover settled discovery and approved designs rather than restarting the project. For documents, video or research, owned sections and assets replace code branches, and the assembled artifact replaces the build.

Use the [BG glossary](../bg-build-with-me/references/glossary.md) and the project's identifiers; invent no parallel state meanings. Load or retain `bg-efficiency` throughout, including in every brief. Select current/next stage skills through the bounded [skill selection](../bg-build-with-me/references/skill-selection.md) and reuse unchanged selections. Load the parallel-work and worktree guidance before dispatch. Deliver the actual selected bodies and verify worker reads and relevant tool use. A pile of task receipts is never a working product.

## Numbered checklist

1. **Recover the delivery contract → checkpoint.** Update the one-page `CHECKPOINT.md` with requirement IDs, approved design, exact candidate, owners, surviving workers, dirty work, holds and uncertain effects. Carry the lead's authorised scope and permission level into workers, subject to host restrictions. Reconcile an uncertain request before retry; a new chat does not authorise replay.
2. **Build the work graph → schema-v1 task graph.** Read [work-graph.md](references/work-graph.md) when turning the approved plan into assignments. Produce tasks with dependencies, disjoint owned paths, shared contracts, tests, selected capabilities, model tier, return recipient and integration state. Every requirement has an owner and an evidence target. Resolve material shared boundaries before either side implements them.
3. **Establish wave 0 → contracts, stubs and a tested baseline.** Follow [swarm-procedure.md](references/swarm-procedure.md): pin shared glossary and C4 identifiers, contracts and stubs, and a runnable integration baseline. Name one controller and one integration writer in the checkpoint's OWNERS block. Reuse suitable isolated workspaces or create them with supported controls. Preserve unrelated work and record baseline failures.
4. **Launch the ready swarm → dispatch and exact job map.** On plan approval, automatically dispatch the largest independent ready set that real host capacity, integration throughput and the agreed usage ceiling support. Follow the [worker route](../bg-build-with-me/references/worker-route.md): the lead plans, dispatches directly, reads short results and decides; workers do heavy reading, coding and testing; a fresh checker checks. Fill each [brief](../../templates/BRIEF.md) under the [worker packet rules](references/worker-packet.md). Record native job and thread identities, executor identity, actual activity and return path. Short status and results reach the lead while full worker histories stay saved; separate visible worker chats or a live board are optional. A host that supports four agents cannot launch a hundred: drain the ready queue as slots free. Before resuming a worker thread, verify the intended job and thread, effective write access and Git common directory against the recorded assignment; a mismatch or unknown blocks that resume.
5. **Build first, check once → built branches, one combined head, one full run.** Workers build every package in parallel and run **only fast checks on their own files**: type check, lint and the unit tests they touched. Never the full suite and never a shared test database. Keep many workers thinking but only one heavy local run (full test suite or native build) at a time per machine, queued through `bg-heavy -- <command>` (see [BG Efficiency](../bg-efficiency/SKILL.md) for how to run it); when the machine is saturated, move independent packages to cloud workers. They fix their own fast-check failures in the same job and commit on their own branch. There is no review of each job and no full run after each merge. When every package is built, **one integration job** merges all branches in dependency order, resolves conflicts keeping both behaviours, verifies the accepted `DECISIONS.md` IDs are present in the combined candidate, and runs the full suite and critical customer journeys **once** on the combined head, through `bg-heavy`. If that run fails, it finds the merge that broke it (rerun the failing tests on the combined head without that branch) and hands the failure to that branch's owner in the fix wave. Verify the exact resume target before any fix; never blindly resume "last" under a shared parent directory. Record every clone or worktree and every integrated commit SHA in the project ledger, with resolved path, owner, branch and integration destination, before handback.
6. **Show one early skeleton → demonstration and decision record.** Give the founder one working end-to-end skeleton at the agreed early checkpoint, then the whole integrated project. Continue independent work while any material product question is resolved. Add no routine founder or premium approval after each worker result.
7. **Rehearse, review once, repair by rehearsal.** After the combined full suite once, apply the automated ladder: Playwright for web; Maestro on EAS for every mobile candidate; occasional unchanged-flow BrowserStack real-device sampling; then rehearse the exact candidate on the real platform with those golden journeys and one rollback. The agent reads failure artifacts rather than live-tapping. The founder device check is design-only. Then the lead dispatches one fresh read-only review per stable release ID, limited to reproduced wrong-money, data-loss, security/privacy or missing-rollback blockers. Other findings go after-launch. Consolidate blockers to the same owners within two fix waves. Pin repairs and rerun rehearsal, never another review. The lead accepts passing rehearsal with no open blocker; no ready verdict is required. For UI changes the founder final phone/capable-device design check precedes the small launch; only their mismatch blocks on design. Launch within authority, watch live errors for one hour, fix forward or roll back, then widen.

Use one supported background wait, then exact result pickup, for finished, failed and interrupted work, from the original launch directory. No forwarder, polling loop or routine log or transcript dump. Before yielding, preserve the exact return path or name the supervision gap. For work while the machine is off, use included cloud execution only after verifying entitlement, repository and environment access, sole ownership and return; cloud briefs pre-authorise push or require a commit to the branch every N minutes. Mark local-only tasks `waiting-for-PC` and reconcile them on return. Use the [account and cloud checklist](../bg-continue-my-project/references/account-cloud-checklist.md), keeping additional spend at zero unless authorised, local recovery and real-proof gaps.

## Copyable templates

Use the [task row, worker prompt, handback and consolidated repair templates](references/worker-packet.md) and the [brief](../../templates/BRIEF.md). For material unresolved product choices use the [question round](../bg-plain-english-builder/references/question-round.md#copyable-question-round); reuse settled decisions from `DECISIONS.md`.

```text
Combined candidate: immutable head/artifact/config/environment; baseline; sole integration owner.
Coverage: requirement -> task/contract -> exact combined-head test/output/hash.
Decisions: accepted DECISIONS.md IDs -> present in combined head (yes/no + evidence).
Skeleton: shown artifact; real/mocked parts; actual decision reference.
Collection: original directory; job/thread; executor; exit status; one wait; result location.
Build: every package built; fast checks per worker; one integration job; one full run; breaking merge (if any).
Findings: stable ID; owner; fix wave 0/1/2; reproduction/closure; next action; left for the founder.
Independent check: once, on the combined head; one read-only review per release ID; reviewer != builder;
  reproduced blocker classes or after-launch; rehearsal evidence and lead decision recorded.
Authority/recovery: current holds; working recovery; no release from a test result.
```

## Red-flag thought → required action

| Thought | Action |
| --- | --- |
| "All workers said done." | Inspect their exact changes, integrate and test the combined candidate. |
| "Let me get this one job reviewed before the next." | No per-job review: build first, check once on the combined result. |
| "Run the full suite after this merge to be safe." | Workers run fast checks only; the integration job runs the full suite once, after all merges. |
| "The interface can be settled later." | Pin one shared contract and its tests before dependent implementation. |
| "This review found new defects, so the old ones disappear." | Keep every open finding ID until exact repair and retest evidence closes it. |
| "More accounts or models must mean more allowance." | Read supported usage or keep a dated report; ask only for missing planning information. |
| "The decision was agreed, so it must be in the build." | Verify each accepted DECISIONS.md ID against the combined candidate. |

Report an approaching usage ceiling and preserve a handover; never silently switch accounts or buy capacity. Keep approved looks and all scoped holds. Engineering integration, independent acceptance, release authority and production verification stay separate states.

## Filled worked example

The [worked example](references/swarm-procedure.md#worked-example) shows build first, check once: contracts, two workers building in parallel with fast checks only, one integration job and full run at H1 that finds which merge broke it, two checkers by area, and one fix wave closing both findings at H2. A rejected or blocked verdict keeps the affected findings open. Illustrative, not evidence that a live swarm ran.
