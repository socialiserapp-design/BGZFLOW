---
description: "Investigate independent angles in parallel and return one sourced answer"
argument-hint: "<question>"
disable-model-invocation: true
---

Question: $ARGUMENTS

**Gate:** use `swarm-gate status` and `${CLAUDE_PLUGIN_ROOT}/docs/swarm-gate.md`; reuse the ledger or `/swarm` phase 0's resource/tier/usage question and `start`. Briefs use SWARM/PIECE/KIND research/OWNS, quality skills, fast checks only and proof handback. Use the approved provider's heavy-read tier, READ_ONLY true, OWNS [] and UNSPLIT true. Non-Claude leads use `dispatch` before launch. `record job` and `record piece` collect every outcome and structured evidence. Record the combined synthesis and run ordered exact-candidate checks if required. Honour blocks without routine human approval.

If missing, ask for the question in one line and stop. You are the lead. Read `${CLAUDE_PLUGIN_ROOT}/skills/bg-finish-the-whole-job/references/swarm-rules.md` and load `${CLAUDE_PLUGIN_ROOT}/skills/bg-build-with-me/SKILL.md` and `${CLAUDE_PLUGIN_ROOT}/skills/bg-efficiency/SKILL.md`. Research is read-only against project/external systems; workers may save only owned evidence/results. No product edits, deploys or spending.

0. **Resources.** Follow shared rules 1–4: run `node "${CLAUDE_PLUGIN_ROOT}/tools/swarm-resources/swarm-resources.mjs" --swarm <task-id>`, ask once and save approval, or reuse this same swarm's set.
1. **Pin and split.** Wave 0 pins the question, sources/candidate identities, method, shared terms, ownership and answer acceptance. Split into 2–6 independent angles that could change the conclusion; use one job if only one angle matters.
2. **Check access, then investigate together.** Verify effective internet, login, filesystem, service/log and test-runner access before dispatch; a write flag proves nothing. Offline angles use read-only jobs with snapshots/context copied inside their cwd. Internet/login/live-log/Python angles use a proven access route and disposable writable scratch where required, with no repo/product/external mutations; supply snapshots if live access is unavailable. Spread ready angles across approved proven resources within checkpointed limits/ceiling/reserve and exact overlay settings. Record each job/thread/session/cwd/owner at dispatch. Each returns sources/paths/versions, uncertainty and confidence in 15 lines or fewer. Verify before claims; no implementation or per-angle reviews. Long proof stays in owned files.
3. **Combine once.** Resolve disagreements against evidence and acceptance without inventing results. Give one answer in 12 lines or fewer: conclusion, confidence/reason, key proof, limits and recommendation. Save the combined evidence in the task record. If the brief requires independent checking, check the whole synthesis once.

Stop when answered. Missing evidence stays a gap; start no follow-on work without an authorised brief.

**Mailbox:** For every active worker, run `bg-mail watch --project <project> --to lead` in the background beside that job's native `status --wait`. Every brief says never end a job just to ask: post with `bg-mail`, give a safe default, keep working where safe and wait in the same job only when required. Reply immediately, then rearm the mailbox watch while the job remains active.
