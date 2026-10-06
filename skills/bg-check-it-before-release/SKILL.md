---
name: bg-check-it-before-release
description: Use for whole-candidate real-platform rehearsal and the one read-only independent review per release, limited to reproduced money, data-loss, security/privacy and rollback blockers.
---

# BG Check It Before Release

Build every piece first with fast checks only. The lead coordinates; workers execute checks; one fresh independent reviewer reports to the lead. Retain [BG Efficiency](../bg-efficiency/SKILL.md), original requirements and accepted `DECISIONS.md` IDs. Use the [worker route](../bg-build-with-me/references/worker-route.md) for protected candidates and disposable test outputs. A builder never supplies independent approval.

Why: repeated reviews missed real launch failures: "every failure was something no review could see" ? runtime restrictions, missing bindings, provider limits, encoded paths, database roles/versions and restart after migration. Real-platform rehearsal is the main release proof.

1. **Freeze and test whole once.** Integrate every returned or explicitly deferred piece, pin the candidate SHA, artifact, configuration and environment. Run the full suite once through `bg-heavy`; retain command output, exit codes and counts. Failed checks need repair. Keep failed and interrupted evidence too.
2. **Rehearse on the real platform.** Within the brief's authority, deploy that exact candidate to preview, staging or hidden production with the same runtime, bindings, database version, secrets and real provider accounts. Refer to secrets by name; keep money in test mode. Use TestFlight or the internal track for apps. Execute every scripted golden journey and one rollback; cover retry, access, recovery and relevant devices. Capture actual output and installed/deployed identity. Fix each real error in the same owner's job, pin the repaired SHA and rerun rehearsal until it passes. Never send the founder unfinished testing work.
3. **Dispatch the single independent review.** Keep one stable release ID across repairs, resumes and swarms. Call `swarm-gate check-review` before a read-only dispatch with `CHECK: review`, `RELEASE_ID` and `REVIEW_TARGET: candidate`. Reject a contributing builder, resumed builder, second review or repair target. Only wrong money, data loss, security/privacy or missing rollback can block, each with a concrete reproduction. Put every other finding, including design, on the after-launch list. An unavailable reproduction is a lead investigation item.
4. **Record and repair.** Record each stable finding ID, category, reproduction, owner and disposition. Record review completion; its verdict never opens or closes release. Consolidate reproduced blockers to the same worker. Prove repairs by rerunning real-platform rehearsal and rollback on the new SHA; never re-review. After two fix rounds, send the founder open blockers with a recommendation; a third wave requires their word in chat.
5. **Finish design and launch.** The lead accepts passing rehearsal with no open blocker; never ask the founder to accept a review or candidate. For customer-visible changes only, the final step is the founder checking the verified build on their phone or a capable device through TestFlight, internal track or preview. Record their design-match result against the SHA. Only their "doesn't match the approved design" blocks on design; reviewers never block it. Under existing release authority, use [BG Ship and Recover](../bg-ship-and-recover/SKILL.md): switch it on for all intended customers, watch live errors for the first hour, then keep it or switch off and fix forward. Finished means switched on.

Use [the swarm gate](../../docs/swarm-gate.md) for `record rehearsal`, `record finding`, `record design-check` and exact-SHA release checks on every host. [Inspection records](references/inspection.md) and the [evidence reference](references/enforcement.md) preserve source, output hashes and controller identity; historical `ready` fields are accounting, never a release prerequisite. Records alone cannot prove workers really exercised the behaviour; inspect their actual proof and the real whole journey.

```text
Release: stable ID | SHA/artifact/config/environment | authority/holds
Whole suite: argv | actual exit/counts | output evidence
Rehearsal: deployed SHA | platform | golden journeys | rollback proof | output
Review: one fresh read-only job/thread | reproduced blocker categories | after-launch list
Repair: same owner | stable finding ID | repaired SHA | rerun rehearsal; no new review
UI only: founder chat reference | phone/capable device | exact SHA | matched/mismatch
Handback: evidence/limits | next owner/action | small launch and hour watching
```

Finish reports keep three verification levels separate: **BUILT** (compiles/tests pass), **REACHED** (deployed/staged and responds), **USED** (exercised on the real platform with current data through the real journey, observed by eye or a check inspecting the real result). Only USED may be called "working". Record evidence or gaps for each, including the data copy and its date; demo screenshots and stale copies cannot establish USED.

Required report fields: numbered next steps, each with **Confirm by:** a command, check or observation; if none, **All objectives complete.** End with **What went wrong:** 1–2 lines or "nothing", appended using `bgz lessons add` ([CLI](../../tools/lessons/README.md)). Apply the [lessons review procedure](../bg-finish-the-whole-job/SKILL.md#lessons-to-rules); never ask the founder to grade or accept work.
