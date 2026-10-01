---
description: "Fix a batch in parallel, combine repairs, then retest the whole journey"
argument-hint: "<bug list | findings file | from last check>"
disable-model-invocation: true
---

Bugs: $ARGUMENTS

Use the provider's qualified standard tier, or heavy-write after root-cause diagnosis. Workers run installed jev-audit during fast checks, repair confirmed findings in the same job and return structured before/after evidence. `record piece` runs admission; rejection returns to that same worker and counts toward failed-twice. Workers' build quality work is not a whole-review fix wave.

**Gate:** run `swarm-gate status` and follow `${CLAUDE_PLUGIN_ROOT}/docs/swarm-gate.md`. Reuse the ledger; if absent, use `/swarm` phase 0's single resource/usage question and `start`. `record fix-wave` opens the one repair batch before dispatch, enforcing the two-wave cap. Briefs use SWARM/PIECE/KIND fix/OWNS, quality skills, fast checks only and proof handback; non-Claude leads reserve with `dispatch`. Collect all outcomes with `record job` and all returns/deferrals with `record piece`. After merging use `record candidate`, then `check-suite`, `check-journey`, `check-review` in order, and `record result` after each actual check. Retain finding IDs and close with exact-candidate proof. Blocks go to the lead; third-wave permission comes only from the human's word in chat.

You are the lead. Read `${CLAUDE_PLUGIN_ROOT}/skills/bg-finish-the-whole-job/references/swarm-rules.md` and load `${CLAUDE_PLUGIN_ROOT}/skills/bg-finish-the-whole-job/SKILL.md`. Recover exact whole-candidate findings, ownership, approval, contracts, acceptance script and repair counts; never blindly resume the last shared-directory job.

0. **Resources.** Follow shared rules 1–4. Reuse this swarm's approval; if absent, run `node "${CLAUDE_PLUGIN_ROOT}/tools/swarm-resources/swarm-resources.mjs" --swarm <task-id>`, ask once and save the explicit set.
1. **Collect.** Give every input bug a stable ID, reproduction, expected/actual result and owner. For "from last check", use the latest whole-candidate findings. Confirm each with the cheapest evidence; recover or pin wave-0 contracts and whole acceptance before repair.
2. **Fix all groups at once.** Group by owned paths and verified original worker. Advance each owned branch to the **failed combined candidate SHA** before repair. Preserve prior commits and dirty work (commit owned changes or retain a named stash reference); verify ancestry, fast-forward where possible or merge preserving both behaviours. A new branch starts at wave zero then advances to that failed candidate. Never reset or use a stale repair base. Fence/reconcile old writers before reassignment. Use approved proven resources within the gate limit/reserve and record exact dispatch identities. Every worker reads/uses the quality skills under rule 7, uses fast checks only and returns exact proof/confidence. No single-fix review or deploy.
3. **Re-integrate every wave.** One writer combines all repairs, verifies decision IDs and pins a new SHA. Preserve commits and dirty work; never retest the old SHA.
4. **Rehearse the repair.** Rerun the golden journeys and one rollback on the real platform with matching runtime, bindings, database version and provider accounts. Record actual rehearsal output against the new SHA. Never dispatch another review or review a repair.
5. **Respect the total cap.** Two fix waves across the release ID; a third needs founder chat authority with open blocker IDs and a recommendation. Only reproduced wrong-money, data-loss, security/privacy or missing-rollback findings block; everything else goes after-launch. Accept passing rehearsal with no open blocker. UI-changing releases finish with the founder phone/capable-device design-match result, then authorised small launch and one hour live watching.

**Mailbox:** For every active worker, run `bg-mail watch --project <project> --to lead` in the background beside that job's native `status --wait`. Every brief says never end a job just to ask: post with `bg-mail`, give a safe default, keep working where safe and wait in the same job only when required. Reply immediately, then rearm the mailbox watch while the job remains active.
