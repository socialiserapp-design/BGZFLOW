---
name: bg-continue-my-project
description: Use when resuming a project after an interruption, crash, account or host change, or a break: carry on, where were we, what did we already do, status of in-flight jobs, or recovering work without losing or duplicating it.
---

# BG Continue My Project

## When to use

Use for continuation, crash recovery, account or host handover, or status. For a status-only request, report the reconciled state and stop. Use the [glossary](../bg-build-with-me/references/glossary.md), requirement IDs, C4 names and the [delivery contract](../bg-build-with-me/references/decision-and-delivery-contract.md). Load or retain [BG Efficiency](../bg-efficiency/SKILL.md) and the selected current/next bodies.

## Numbered checklist

1. **Recover intent → current checkpoint.** The project checkpoint is one page ([template](../../templates/CHECKPOINT.md); about 1,500 words, within BGZFLOW_CHECKPOINT_KB) of current state: outcome, CURRENT RULES, OWNERS, candidate, open findings, holds, uncertain effects and next actions. History lives in `ARCHIVE.md` beside it and is never deleted. Read history and other notes through the notes map (`notes-map ask "<question>"`; build it with `notes-map build <folder>`; if unavailable, `rg -n` on headings) and code through CodeGraph or graft. Never open a notes or log file over BGZFLOW_BIG_READ_KB whole. Start a fresh chat for each stage from a handover of 2 KB or less ([template](../../templates/HANDOFF.md)) instead of continuing one long chat. Read the map, agreed plan, actual answers, `DECISIONS.md`, approved designs, current owner and latest handback. Locate retained source, artifacts and evidence before concluding anything is missing. Carry the original outcome, constraints and observable acceptance forward. When files disagree with the map, record the discrepancy and inspect the smallest evidence needed. Rescan no repository wholesale and paste no whole history.
2. **Reconcile reality → state and file table.** Record exact source, artifact, configuration and dependency versions, branch, dirty and untracked files, environment and tests. Keep proposed, implemented, tested, integrated, accepted, deployed and verified-in-use states distinct. Label inspected facts versus reported facts. List exact live-identical and staged-only files with both hashes, or the reason a comparison is missing. Reuse unchanged version-bound evidence; preserve failures and recovery artifacts. Confirm the state folder (`.bgzflow/`, checkpoint, decisions) is versioned or snapshotted.
3. **Fence ownership → session and effects table.** Identify the controller, each task, job and thread, original launch directory, worktree and surviving command. For every job record marked running or queued, check whether its process is alive: a dead process makes the record **uncertain**, never active. Reconcile timed-out, closed-window and interrupted requests (payments, builds, publications, store submissions, provider jobs) by their durable operation identity before any retry. Check task and shared-resource owners. Within an unfinished stage, continue the same supported session; fence the old owner's dispatch authority and pending effects before handing a terminal job to a successor. Never start a competing controller, infer duplicates from titles, or clean up, move, reset or archive work incidentally.
4. **Resolve continuation → exact-target receipt.** Apply the [worker route](../bg-build-with-me/references/worker-route.md) and the [account and cloud checklist](references/account-cloud-checklist.md). Match task, job, thread, host session ID, original directory, owner, worktree and candidate before repair. Never infer that "resume last" selects a named worker under a shared parent directory; changing directory does not relocate its history. Without a verified route, preserve the work and hold only that repair. Request a supported exact continuation or a fenced terminal-job ownership handoff through the existing lead.
5. **Recover skills and capacity → continuation packet.** Restore missing or changed selected bodies and mandatory guidance; record actual reads separately from tool execution. Reuse the matching bounded current/next selection or record the one-pass fallback. Observe usage before material dispatch and near the once-agreed ceiling. Recommend only an exact known account alias. Agents handle routine sign-in and reauthentication with saved credentials or a password manager wherever supported; an account change happens only on the founder's explicit direction, asking only for a required human step. For an account change within the same stage, preserve the same host session or thread and verify actual resumed execution. A switch stays pending until that evidence exists. Separate local background work from qualified cloud work at no extra spend; mark local-only tasks `waiting-for-PC`.
6. **Continue the unfinished outcome → next-action record.** Name one concrete authorised next step, owner, prerequisite and result route. Continue independent ready work around scoped holds. The lead plans, dispatches directly, reads short results and decides; workers do the heavy reading, coding, testing and checking. Use one background wait, then exact result pickup; no polling loop or forwarder. Keep two repair rounds at most before reporting open findings. Follow [BG Finish the Whole Job](../bg-finish-the-whole-job/SKILL.md) for integration.
7. **Account for evidence → continuation handback.** Use the short handover checklist (`state`, `ownership`, `uncertain-effects`, `next-action`); the full [evidence gate](../bg-check-it-before-release/references/enforcement.md) runs only at review and release. Report every failed, blocked, stale or unknown required check and its owner. Verify actual recipient receipt when another owner must act; otherwise keep the delivery gap. Return the candidate for independent checking through [BG Check It Before Release](../bg-check-it-before-release/SKILL.md). Record validation is never acceptance or release authority. Update `CHECKPOINT.md` and write the handover.

"Test everything" means coverage of the agreed customer journeys, connected components, platforms, access and security, money and entitlements, failure/retry/recovery, accessibility and relevant performance. Existing tests contribute evidence; they do not define the scope. If product intent materially changes, use [discovery](../bg-plain-english-builder/SKILL.md) for the affected decisions and continue settled work. Never re-ask a question answered in `DECISIONS.md` or the overlay. Infer no new design, feature, spending or release authority. The agent owns technical receipts; no finite test run proves every possible behaviour.

## Copyable templates

Use the [task row, worker prompt and handback templates](../bg-finish-the-whole-job/references/worker-packet.md), the [checkpoint](../../templates/CHECKPOINT.md) and the [handover](../../templates/HANDOFF.md). Use the [question round](../bg-plain-english-builder/references/question-round.md#copyable-question-round) only for material unresolved product choices.

```text
Continuation checkpoint: project/task; original outcome; accepted decisions/holds.
State: exact source/artifact/config/environment; branch; dirty/untracked files.
Files: path | candidate SHA256 | live path/SHA256 or gap | live-identical/staged-only/unknown.
Owner: controller; integration writer; task/job/thread; host session ID; launch directory/worktree.
Jobs: job ID | executor | recorded status | process alive? | exit status | uncertain/active/terminal.
Pending effects: request ID | actual state/evidence | owner | reconcile-before-retry action.
Evidence kept: requirement/finding ID | exact candidate | native/fixture/manual/unrun | result.
Skills: current/next selection | exact body/hash/read receipt | actual tool use/gap.
Usage: account alias/source/time/reset | ceiling/reserve | observed/estimated/unknown.
Resume proof: intended identity | inspected target | terminal/active state | actual resumed result.
Next: one authorised step/owner/result path; blocked boundary/resume trigger; repair round 0/1/2.
```

## Red-flag thought → required action

| Thought | Required action |
|---|---|
| "A new chat means start again." | Recover the checkpoint, surviving work and current owner. |
| "The record says running, so it is running." | Check the process; a dead process makes the record uncertain. Reconcile before resume or retry. |
| "The timeout means it did nothing." | Reconcile that exact request and its external effects before retry. |
| "Latest must be my worker." | Inspect the exact target contract; hold only the mismatched repair. |
| "The transcript exists, so the account resume worked." | Require same-session identity and a real resumed result. |
| "Background means it runs with the machine off." | Qualify included cloud separately; keep local-only work for the machine's return. |
| "No evidence means delete the old work." | Preserve it, label the evidence gap and inspect within scope. |
| "I'll read the whole log to catch up." | Ask the notes map; read only the matching lines. |

## Filled worked example

Illustrative, not a live run: a notes app has T1/C1 integrated at H1 and UI worker T2/C2 with `F-NOTE-01` still open. The checkpoint keeps dirty UI files and the original parent launch directory. T2's record says running, but its process is gone, so T2 is uncertain. A resume preview points to T1's thread, not T2's. Hold the T2 repair, preserve C2 and its finding, and request exact T2 continuation from the routing owner; continue independent T3 test preparation. Any later sign-in must keep the recorded session identity. Once exact T2 continuation is proven, repair and test C2b, integrate through the sole writer, then send H2 for a fresh whole-candidate check. The project is not accepted from this checkpoint.
