# Worker packets: plan, task row, brief, handback and repair

Use these inside the project's existing graph and task records. Replace every placeholder with exact project identities, paths and supported controls. The controller keeps contract and acceptance decisions; workers return actual evidence and preserve their own work. Use the [glossary](../../bg-build-with-me/references/glossary.md) meanings.

Review verdicts belong to [the verdict schema](../../bg-check-it-before-release/references/review-verdict.schema.json): `ready` only when required evidence passes and every finding is closed, `changes-required` for observed defects, `blocked` when required evidence or access is missing. Worker states, dependency acceptance and the founder-facing `done / partly / not done` checklist are separate fields, never verdicts.

## Plan template

```text
Project/plan/version: [existing identity]; original outcome; accepted DECISIONS.md IDs.
Done when: [every requirement ID -> observable acceptance -> command/evidence target].
Wave 0: [glossary/C4 IDs, contracts, stubs + hashes; sole owner; tested integration baseline].
Tasks: [IDs, dependency gates, disjoint paths, worktrees, owners]; sole integration writer/destination.
Route: [worker route + ROUTES.md card]; lead; direct worker jobs; fresh independent checkers.
Usage: [known account aliases; observation source/time/reset; once-agreed ceiling/reserve].
Skeleton: [one early working end-to-end checkpoint]; whole-candidate checks; fresh checkers.
Holds/recovery: [authority, unresolved effects, release/resource restrictions, working recovery].
Questions: [only unanswered material decisions; owner/affected task; question-round link].
```

Ask open questions with the single [question round](../../bg-plain-english-builder/references/question-round.md#copyable-question-round); never reopen decisions already in `DECISIONS.md`. Keep the plan in the existing record, not a new tracker.

## Task row

Illustrative, not a live run: valid JSON for the [task schema](work-graph.md#task-schema), from the notes app in the [worked example](swarm-procedure.md#worked-example). Bind real refs and identities before dispatch.

```json
{
  "id": "T1",
  "requirement_ids": ["REQ-NOTE-01", "REQ-NOTE-02", "REQ-NOTE-03"],
  "outcome": "Save/list notes and return contract errors without corrupting storage",
  "dependsOn": [{"id": "T0", "gate": "integrated"}],
  "owned_paths": ["src/storage/", "tests/storage/"],
  "contract_refs": [{"id": "CONTRACT-NOTES", "path": "contracts/notes.json", "version": "v1-at-H0"}],
  "skills": {"selection_ref": "existing-task/skill-selection", "current": ["bg-efficiency", "project-storage-skill"], "next": ["bg-check-it-before-release"], "read_receipts": []},
  "model_tier": "economical-qualified",
  "account": "signed-in-subscription-alias",
  "owner": "storage-worker",
  "workspace": null,
  "baseline": "H0",
  "permissions": {"inherit_from": "project-lead-session", "effective": null, "authority_ref": "existing-plan/authority-and-holds"},
  "tests": [{
    "id": "TEST-NOTES-STORAGE",
    "requirement_ids": ["REQ-NOTE-01", "REQ-NOTE-02", "REQ-NOTE-03"],
    "command": "npm run test:storage",
    "cwd": "assigned-worktree",
    "expected": "Save/list/error contract cases pass; no data loss",
    "evidence_path": "existing-task/evidence/storage.txt"
  }],
  "acceptance_command": "npm run test:storage",
  "return": {
    "recipient": "project-integration-owner",
    "control": "default worker route: direct job; one background wait; exact result with original cwd",
    "worker_id": null, "request_id": null, "job_id": null, "thread_id": null, "history_ref": null,
    "evidence_location": "existing-task/evidence"
  },
  "worker_state": "planned",
  "dependency_acceptance": {"state": "pending", "by": null, "candidate": null, "evidence_refs": []},
  "integration": {"owner": "project-integration-owner", "state": "unqueued", "candidate": null, "combined_head": null, "evidence_refs": []},
  "open_findings": [],
  "route_receipt": {
    "launch_cwd": null, "lead_session": null, "turn_id": null, "executor": null, "exit_status": null,
    "branch": null, "candidate": null, "dirty_files": [], "created_resources": [], "live_log": null,
    "repair_round": 0,
    "brief_ref": {"id": "T1-brief", "path": "existing-task/brief.md", "version": "planned-v1"},
    "identity_ref": {"id": "T1-identity", "path": "existing-task/receipt.md", "version": "planned-v1"},
    "skill_evidence_ref": {"id": "T1-skills", "path": "existing-task/receipt.md", "version": "planned-v1"},
    "command_outputs_ref": {"id": "T1-checks", "path": "existing-task/receipt.md", "version": "planned-v1"},
    "finding_lineage_ref": {"id": "T1-findings", "path": "existing-task/receipt.md", "version": "planned-v1"},
    "live_staged_ref": {"id": "T1-files", "path": "existing-task/receipt.md", "version": "planned-v1"},
    "usage_ref": {"id": "T1-usage", "path": "existing-task/receipt.md", "version": "planned-v1"},
    "result_location": null,
    "next_action": "Bind actual owner, identities, body reads, allowance and baseline before dispatch"
  }
}
```

## Worker prompt

The copyable brief is [templates/BRIEF.md](../../../templates/BRIEF.md); fill it rather than writing a second form. Compose every brief by these rules.

Its first fields are SWARM, PIECE, KIND and OWNS. Use the qualified provider tier for that kind; a heavy-read investigation is read-only, unsplit and owns no writes. Include concrete done-when checks matching the piece goal. On build/fix work, run the installed jev-audit skill during fast checks, repair confirmed findings in the same job and retain before/after findings and reported usage. Missing jev-codes is skipped. Return the [structured admission proof](../../../docs/swarm-gate.md#piece-admission); `record piece` parses real output and counts before integration. A rejected handback returns to the same job and counts toward failed-twice, without consuming a whole-review repair wave. Only the lead dispatches the one independent whole-candidate check after all pieces, integration, suite and journey.

1. **One current brief** per job; move superseded start prompts to `archive/`.
2. **Pointers, not copies:** paths, commits, line ranges and one canonical live-log path; never pasted logs, diffs or transcripts.
3. **Model role and effort** stated for the job: readers and mechanical edits `low` on the cheaper reader model; leads and builders `medium`; `high` or `xhigh` only when this brief names it (planning, hard debugging, release decisions). After a failed attempt, retry one level higher, never again at `low`. Set it with the host's own control, for example `effort:` in a subagent's frontmatter or `model_reasoning_effort` in a worker profile.
4. **Tool input once:** any script or SQL longer than a few lines is saved to a file once and run by path, never retyped or resent unchanged. Edit files in place instead of rewriting them whole. Scripts, not the model, write receipts (hashes, sizes, counts).
5. **One background wait** per job; no polling loop.
6. **Every compulsory pointer resolves** before dispatch (`startup-check`), and compulsory reading stays within `BGZFLOW_STARTUP_WORDS`.
7. **The brief wins.** Its job-level permissions override shared boilerplate, and it says so. Boilerplate carries no task-specific bans. When a worker-context file (such as a project `AGENTS.md`) contradicts the brief, the brief wins and the worker reports the conflict.
8. **Caps are time and size** (minutes, KB, rounds), never a condition the worker cannot check, such as a spending cap it cannot measure.
9. **Required outputs** are listed by path; the handback check confirms each exists, and the checker compares the result with the brief.
10. **Secrets by name,** injected only into the authorised service or process through a credential helper; never a token in a URL, git remotes included.
11. **Job-ID resource names:** every external resource the job creates carries the job ID prefix, is listed in the handback and is cleaned up before any retry.
12. **Cloud workers** get push pre-authorised in the brief, or commit to their branch every N minutes.
13. **Maps first:** `codegraph ...` or `graft ...` for code, `notes-map ask "<question>"` for notes, `rg -n` as the fallback; never open a notes or log file over `BGZFLOW_BIG_READ_KB` whole.
14. **System-clock timestamps,** never estimates.
15. **Only what was asked.** The worker adds no customer-facing wait, refusal, hold, gate, cap, block or expiry the brief does not ask for; an unrequested stop path is a defect. The handback lists every stop path added or changed, or none.

The template covers the goal, pointers, owned paths, permissions, caps, done-when and short return. Add these delivery fields:

- **Launch identity:** graph task ID, controller session and original launch cwd (for status, result and resume); job, thread, turn and request IDs once known, with the reason for any unknown.
- **Baseline:** current candidate and known baseline failures; use the owned worktree for every write and Git command.
- **Dependencies:** accepted task IDs, gates, full pinned commits and fast-check evidence; the stacked build baseline at the prerequisite commit or a verified descendant, with ancestry proof for every pin. Prerequisites use `accepted-dependency`; nothing is marked `integrated` early.
- **Shared resources:** owners of shared contracts, lockfiles, schemas, devices and test accounts. Request a scoped owner change through the controller instead of writing across a boundary.
- **Skills:** [BG Efficiency](../../bg-efficiency/SKILL.md) (the one compulsory efficiency guide), a parallel-work and worktree method, and the current and next bodies, read by the [body read procedure](../../bg-build-with-me/references/skill-selection.md#body-read-and-fallback-procedure). The next stage is [BG Check It Before Release](../../bg-check-it-before-release/SKILL.md), plus a verification-before-completion method where it applies. Selection comes from the [optional catalogue and judgment route](../../bg-build-with-me/references/skill-selection.md#optional-catalogue-and-judgment-route) or a named fallback. Record each body's hash, read tool, executor and time separately from tool use; restore missing guidance after context loss.
- **Carried state:** the lead's permission level, subject to host rules, with the observed effective setting; scope, approved look, holds, usage ceiling, uncertain effects (never replayed) and open finding IDs to keep until closure evidence. A packet or worktree is not a security boundary.
- **Build first, check once:** implement the whole owned outcome with fast checks only on your own files [type check, lint, the unit tests you touched: command + cwd + expected]; never the full suite or a shared test database. A native build or other heavy local run goes through `bg-heavy -- <command>`, one at a time per machine. Fix failures in the same job and commit on your branch. Worker completion is a built branch: one integration job runs the full suite once, through `bg-heavy`, and the independent check runs once on the combined result.
- **Repair:** only on the verified exact thread, never a blind "resume last" from a shared parent folder. If that thread is unavailable, preserve the work and hold only that repair until supported continuation or a terminal-job handoff that fences the old owner and effects. Stable finding IDs live in the `bg-rounds` ledger; round 3 needs the founder's explicit approval.
- **Conduct:** report blockers early and continue safe independent work. Never weaken a check or redesign a shared contract without its owner. Create no subordinate workers or leads. Return with the [handback](#worker-handback).

## Dispatch and pickup

The lead applies these around every job; exact commands live in the [worker route](../../bg-build-with-me/references/worker-route.md) and the host card in [ROUTES.md](../../../templates/ROUTES.md).

- **Tiny tasks:** do a mechanical step under about 2 minutes yourself instead of dispatching it.
- **Once per lead session,** validate and record the actual job directory and completion-watcher path; hold the affected dispatch or wait if either is invalid.
- **Wait once:** one background wait, then the exact result with the original launch cwd. No polling loop, forwarding agent or routine log or transcript dump; full evidence stays in owned files.
- **Batch wake-ups:** handle every finished job, notice and mailbox message in one turn; an idle lead holds inbound messages until its next planned wake instead of waking for each.
- **Executor and exit status:** record both for every job in `route_receipt` (host, model, effort and account alias that ran; exit code, `timeout`, `cancelled` or `unknown`).
- **Dead-process check:** before any resume or retry, reconcile job records with whether the process is alive. A `running` or `queued` record with a dead process is uncertain, not active.
- **Queued watchdog:** a job still `queued` after 5 minutes is checked once (is the process alive; did anything run?), then cancelled and redispatched once after reconciling. Record both job IDs.
- **Before any retry,** reconcile every uncertain external effect by its durable operation identity and clean up the job's recorded resources.
- **Before resuming a worker thread,** verify the intended job and thread, effective write access and Git common directory against the recorded assignment; a mismatch or unknown blocks that resume.
- **Ledger:** before handback, record every clone or worktree and every integrated commit SHA in the project ledger, with resolved path, owner, branch and integration destination.

## Worker handback

Every build/fix worker reads and uses test-driven-development, systematic-debugging and verification-before-completion under [shared swarm rule 7](swarm-rules.md), recording actual body reads or a named equivalent-method fallback. Completion never means independent acceptance.

**Short return (at most 10 lines).** Only this goes back in chat; everything else lives in the named evidence file.

```text
Result: [completed / failed / interrupted / blocked] on candidate [commit/artifact hash]; [one-line change].
Checks: [command -> pass/fail/unrun, exit code]; confidence high/medium/low because [reason].
Proof: [evidence file path(s)]; live log [the one canonical path].
Receipt: [path of the output of `node tools/receipt/receipt.mjs <output paths>`].
Gaps: [unrun checks, assumptions, blockers, requested shared-file changes, or none].
Stop paths: [each customer-facing wait/refusal/hold/gate/cap/block/expiry added or changed + the brief line that asked for it, or none].
Next: [owner] -> [queue exact candidate / same-worker repair / concrete blocker].
```

The receipt tool writes hashes, sizes and counts; never type them by hand. If it is missing, name the gap and use a saved script.

**Evidence file (not the chat return)**, at the path the brief names:

```text
Task / worker / request / job / thread / turn: [IDs]. Recipient: [exact integration owner].
Executor: [host / model / effort / account alias that ran]. Exit status: [code / timeout / cancelled / unknown].
Saved full history: [supported access location]. Live log: [the one canonical path].
Lead status route: [short result on the default route, or the verified board/host view].
Worker state: [completed / failed / interrupted / blocked reason in next action].
Candidate: [immutable commit/artifact hash]; baseline [identity]; workspace [path].
Branch and original launch cwd: [exact values]; effective permissions/network [observed/gap].
Changes: [behaviour + paths + dirty/untracked artifact manifest, if any].
Required outputs: [receipt path] (path | exists | size | SHA256 for every output the brief lists).
Requirements/checks: [ID: pass/fail/blocked/unknown; command/procedure; environment;
expected/actual; output path/hash]. Include actual user-flow evidence where it applies.
Bind each command to candidate/base/config/environment, cwd, start/end (system clock),
exit or timeout, decisive output and evidence SHA256; label native/fixture/manual/unrun.
Skills: [selected bodies/versions and read receipts]; tools/selection route: [actual use or gap].
Body evidence: [executor | exact source path | SHA256 | read tool/time | retained/new].
Live/staged: [file | candidate hash | live target/hash or comparison gap |
live-identical/staged-only/unknown]; a staged suite is not a live repair.
Findings: [stable ID / requirement / owner / status / closure or reproduction refs].
Lineage: [finding ID | original candidate/failure | repair round 0/1/2 | current candidate |
closure command/output/hash or open limitation]; never reset on a new commit or account.
Created resources: [job-ID-prefixed name | where | cleaned yes/no].
Uncertain effects: [none, or exact request and reconciliation needed before any retry].
Usage: [account alias or gap | observed/reported/estimated/unknown | source/time/reset |
once-agreed ceiling/reserve | next capacity action].
Result: [saved location/hash; job/thread correlation; wait/result outcomes].
Next action: [queue exact candidate / same-worker repair / concrete blocker + owner].
Dependency/integration acceptance: pending controller inspection.
```

**Handback check (lead).** The chat return is 10 lines or fewer; every required output exists in the receipt; every pointer resolves; executor, exit status and live-log path are recorded; created resources are listed; every listed stop path traces to the brief; evidence is pointers and hashes, not pasted logs. A gap stays a named gap and never becomes a pass.

## Consolidated repair

```text
Tasks/candidates: [IDs and immutable refs]. Combined head/artifact: [exact identity].
Integration owner and destination: [session/path/ref]; baseline and dirty state [refs].
Dependency acceptance: [task/gate/recipient/exact evidence/version].
Accepted decisions: [DECISIONS.md IDs checked against the combined head: present yes/no].
Integration results: [merge disposition; merge that broke the full run, if any;
contract/customer/regression checks + outputs].
Requirement coverage: [requirement -> contribution -> combined-head evidence].
Open findings: [stable ID; owner; expected/actual; reproduction; required repair/retest].
Closed findings: [same ID; exact repaired candidate; closure evidence].
Fix wave: [1 or 2; a third only with the founder's explicit approval + DECISIONS.md ID].
Next action/recipient: [same-worker repair batch / whole-candidate independent check].
Repair identity proof: [intended vs observed thread/lead session/original cwd/worktree/base;
terminal/active state; supported resume-candidate result; no conflicting owner/effects].
Independent checker: [fresh read-only job/thread, not a builder; exact combined head;
whole affected behaviour + earlier findings + briefs; ready/changes-required/blocked; output/hash].
Actual recipient receipt: [native return/message correlation, or named delivery gap].
```

Send one actionable repair batch per affected owner, including earlier open findings. Keep the same worker and the same finding IDs when the candidate changes. Bind the final combined handback to every agreed requirement and the exact build and configuration; component passes never replace whole-product checks. After 2 fix waves with findings still open, stop and give the founder the open IDs, each with a recommendation. On a `ready` verdict the lead accepts the combined result itself and records it.

Use the [worker route](../../bg-build-with-me/references/worker-route.md) for exact commands and target checks, and the [account and cloud checklist](../../bg-continue-my-project/references/account-cloud-checklist.md) for account switches and PC-off work. Never invent flags, account profiles or extra reviewers. Unknown native metadata stays an explicit gap for the lead to bind to the existing job result.

## Mailbox field

Each worker packet names the `bg-mail` project, lead/worker mailbox IDs, timeout and safe default policy. A question does not complete the job.
