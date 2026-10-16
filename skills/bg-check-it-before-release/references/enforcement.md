<!-- Release policy: rehearsal and one narrow review; historical record fields below are accounting. -->
# Enforcement: what records prove and what they cannot

Instructions guide behaviour. Only actual host permissions, verified controls, candidate-bound commands and independent inspection establish what happened. Keep four states apart: documentation, installation, route proof and customer acceptance. Every skill uses this one reference and one gate, `scripts/evidence_gate.py`.

Record three facts separately: a skill body was **read**, a tool was **executed**, and the method was **applied**. Reading is not running, and running is not applying.

## When the full record gate runs

Run the full record check (`evidence_gate.py`) only at **review** ([BG Check It Before Release](../SKILL.md)) and at **release** ([BG Ship and Recover](../../bg-ship-and-recover/SKILL.md)). Plans, status notes and every other handover use this short handover checklist:

```text
Handover: task ID | stage | exact candidate or artifact
State: done / partly / not done, each with its evidence path
Owner: one accountable owner now | who receives it next
Open findings: stable ID | owner | next action | repair round 0-2
Next action: one concrete step | owner | where the result will appear
```

Keep an agent handoff to BGZFLOW_HANDOFF_KB (2 KB) or less, with pointers (paths, commits, line ranges) instead of copied logs or transcripts. A skill's profile check IDs (see [Profiles](#profiles)) are the items its checklist covers. Read the actual artifacts: matching records cannot establish semantic quality.

## Record gate procedure

Use it once per material owner handover. Keep the existing task, profile and check IDs and the shared [glossary](../../bg-build-with-me/references/glossary.md).

1. **Pin the contract (dispatcher).** Before work starts, create a schema-version-2 contract with `task_id`, `skill`, `phase`, the exact `source` (repository, base, revision), hashed `candidate_files`, `config_files` and `environment_files`, every contributing `builders` job and thread, the full profile `required_checks`, `evidence_types` and `prior_findings` (empty only when there are none). Output: the owner-controlled contract SHA-256, stored in the task packet. The worker never substitutes its own expected task, profile or pin.
2. **Record actual evidence.** Each receipt check has an `id`, a `status` and nonempty `evidence` references. Each referenced JSON binds `schema_version: 2`, `task_id`, `contract_sha256`, `check_id`, `kind` and a matching `status`. A `command` record holds the actual argv, cwd, runner job and thread, start and end times (system clock, UTC), exit code, timeout flag, stdout and stderr; a pass needs exit 0 and no timeout. A `document` record holds a conclusion and hashed inspected sources, for design and accounting only. A `gap` record holds a reason, an owner and a next action for `blocked` or `unknown` and never counts as a pass. Plain text alone never proves an executed check.
3. **Inspect independently.** A fresh, non-resumed independent checker inspects with read-only access, or with verified write access inside a disposable checkout. Every builder, repair and integration identity stays on record. Output: an [inspection result](inspection.md) that conforms to the [result schema](review-verdict.schema.json), with exact coverage, retained findings and closure, limitations and a `ready`, `changes-required` or `blocked` verdict. The checker's job **and** thread must both differ from every contributing builder's. A missing identity, a match on either, or a resumed builder fails. Any qualified provider may check.
4. **Capture through the controller.** The controller correlates the observed launch with the actual completed result and pins the exact result, the host trace and the full typed evidence and output inventory outside the builder's control. Output: a separately pinned capture holding the task and contract binding, the reviewer (observed provider, `fresh` true, explicit `read_only` boolean, `resumed` false), completed status, result reference, host trace reference and artifacts. Write access needs a controller-pinned execution record that proves a separate disposable checkout, verified write roots, a protected candidate and an unchanged candidate commit and bytes. A worker-written capture is not controller evidence.
5. **Validate once.** Run the [command](#command) against the real root and the protected pins. Output: gate JSON and its exit status. The gate rejects a stale candidate, config, environment or contract; changed output; a malformed, queued, failed or timed-out inspector; missing evidence; and a silently dropped prior finding. A timestamp alone never refreshes stale content.
6. **Return or repair.** The lead receives the short verdict and the cheapest decisive proof. Consolidate corrections to the existing owner within two repair rounds. Keep every finding under one stable ID through repairs and rehearsal reruns (`bg-rounds` ledger) and count rounds per package across resumes and handoffs. If findings stay open after 2 rounds, stop and escalate to the founder with the open IDs and a recommendation; round 3 needs the founder's explicit approval. Before a repair, match the exact existing job and thread; never resume "last" under a shared parent folder. A record grants no release authority; repairs are proved by rehearsal, never another review.

## Command

```text
python -B scripts/evidence_gate.py --contract CONTRACT --receipt RECEIPT --root PROJECT --contract-sha256 DISPATCHER_PIN --inspection-capture CONTROLLER_CAPTURE --inspection-capture-sha256 CONTROLLER_PIN
```

Add `--skill bg-ship-and-recover` at release. The default profile is `bg-check-it-before-release`, and the pinned contract must name the same skill. Python 3.9 or later; no dependency and no installation. Exit 0 is `PASS_RECORD`. Exit 1 is `FAIL_RECORD` and names the check or field to reconcile.

Version 1 receipts fail on purpose because they accepted prose as executed evidence. Keep their history without relabelling it, and migrate by recreating evidence from actual runs and fresh executed evidence, never by wrapping old claims. No convenience mode mints passing results or reviewer identities. Complete templates for contracts, runner records, results and captures, and the inspector prompt, are in [inspection.md](inspection.md); copy that file and the schema along with the gate when you use it in another repository.

Field summary: the result has `schema_version`, `task_id`, `contract_sha256`, `reviewer`, `status`, `verdict`, `coverage`, `findings` and `limitations`. Coverage equals the receipt checks (then the candidate checks, for an assessment). Each finding has `id`, `owner`, `next_action`, `requirement_ids`, `closure_requirement`, `severity` and `status`; a closed finding adds passing `closure_check_ids`. Keep every prior ID, owner, requirement and closure obligation. Each file reference is exactly `{path, sha256}` with a relative forward-slash path under `--root`; traversal, escapes and missing or stale files fail.

## Profiles

These are the check IDs in the gate's `PROFILES`. A contract may add checks and never removes one. At review and release the gate enforces them; at every other handover they are the checklist items.

| Skill | Profile check IDs |
|---|---|
| `bg-efficiency` | `context`, `evidence`, `next-action`, `routing`, `scope-preserved`, `tool-capabilities` |
| `bg-build-with-me` | `next-action`, `ownership`, `skill-selection`, `stage`, `state` |
| `bg-plain-english-builder` | `acceptance`, `architecture-and-contracts`, `decisions`, `intent`, `next-action`, `research`, `work-and-dependencies` |
| `bg-continue-my-project` | `next-action`, `ownership`, `state`, `uncertain-effects` |
| `bg-finish-the-whole-job` | `integrated-candidate`, `next-action`, `open-findings`, `requirements`, `verification` |
| `bg-check-it-before-release` | `authority-scope`, `candidate`, `coverage-accounting`, `findings-disposition`, `next-action`, `recovery`, `requirements`, `verdict` |
| `bg-ship-and-recover` | `authority-scope`, `candidate`, `handover`, `next-action`, `preflight`, `production-verification`, `recovery` |
| `bg-personal-product-design` | `accessibility`, `design-decisions`, `intent-and-profile`, `next-action`, `platform-and-performance`, `states-and-flows`, `visual-evidence` |

## Assessment and UI phases

For `bg-check-it-before-release`, pin `candidate_requirements` (the product obligations) separately from `required_checks` (the assessment accounting), and supply `candidate_checks` and `candidate_verdict` in the receipt. The accounting checks must pass. Product checks may pass, fail, be blocked or be unknown; each non-pass keeps hashed evidence (a typed `gap` when the check was not run), a finding ID, an owner and a next action. The independent inspection accounts for the same results.

- A complete `blocked` or `changes-required` assessment returns `PASS_RECORD` with `assessment_complete: true`: a rejecting verdict is honest, finished accounting. A missing or failed inspector cannot.
- A `ready` verdict with non-pass evidence or open findings fails.
- `PASS_RECORD` checks record consistency only. No result ever sets `candidate_accepted: true`.
- A self-written note or a newly self-pinned contract cannot authenticate a review or establish release authority.

Pin `command` evidence for executed checks; `verification` and `production-verification` cannot be downgraded to `document`. Planning UI pins `document` and stays design evidence. Runtime UI pins `visual` and binds the recorded design decision and approved tokens, the actual target source and surface, a reference-versus-running screenshot pair, command results for the token guard and the overflow check, and an explicit clipping result. Structural validity does not establish visual quality: the [design skill](../../bg-personal-product-design/SKILL.md) supplies the real techniques and captures.

## What each boundary establishes

| Boundary | Required evidence | Limit to keep in mind |
|---|---|---|
| Skills and methods | Current and next capability coverage; a full-body read receipt from each executor; observed application | A catalogue entry, a packet or another agent's read proves no loading and no application. Keep the fallback, including the host's native compaction, when a tool is unavailable |
| Isolation and dependencies | Owned worktree and base, disjoint allowlists, one owner per shared resource, accepted prerequisites and actual overlapping run intervals | Worktrees do not isolate credentials; intended parallelism does not prove overlap |
| Integration | One integrator, immutable contributions, checks on the exact combined head and the critical journeys, and each accepted `DECISIONS.md` ID verified against the combined candidate at composition and again at check | Worker-complete and dependency acceptance are not whole-product acceptance |
| Permission inheritance | The parent's and the child's actual sandbox, approval and network settings, plus the results of the operations the job needs | A write flag proves no inheritance of broader access. Report a denied operation; never bypass it |
| Usage | Dated usage from the host, known account aliases, the agreed per-project ceiling in minutes, KB or rounds, labelled estimates, a stop before the expected excess | No atomic quota reservation exists; unknown allowance stays unknown. Where spend cannot be metered, cap by time and size instead of an unenforceable money condition. Never make a silent login, purchase or API fallback |
| Account change | A logout and login led by the founder, the expected and observed session, reconciled pending jobs and effects, a resumed result | A kept transcript or sidebar entry is not continuation |
| Work while the machine is off (cloud) | Included entitlement at no extra spend; scoped private repository, commit, environment, tools and secrets; a sole writer; push pre-authorised in the brief or a commit to a branch every N minutes; a real return | Local background jobs are not cloud work. Device, signing and other local-only steps wait for the machine |
| Outcome and UI | Original requirements; customer, failure and risk journeys; approved tokens and the recorded change decision; clipping and overflow checks; a reference and running screenshot pair; one final-polish record per screen; the actual surface or device | A screenshot alone is no functional pass |
| Release and recovery | Existing authority; unaffected holds; the exact candidate rechecked; independent assessment; compatible production recovery | Add no founder-only technical unlock; keep host security and existing controls. Code rollback does not reverse money or data changes |

## Route options

The [worker route](../../bg-build-with-me/references/worker-route.md) is the one runtime procedure: the lead dispatches directly, waits once, reads a short result and decides, and full evidence stays in files. The alternatives serve a concrete need under the same owner rules.

| Route | Mechanism | Prove before relying on it |
|---|---|---|
| Default | The lead dispatches workers directly through the host's task tool: setup once, direct task, one background wait, result. Save the exact job, thread, session and directory | The wake-up notification reaches an idle lead; failure, timeout and cancel are collected without lost work |
| Fresh independent check | Git repository: a review-class job. Other work: a separate directory with its own resolved workspace root. Never resumed; job and thread differ from every builder's | The lead binds and inspects the exact combined head |
| Repair | Confirmed findings go to the same owner; job records reconciled against a live process (a job recorded as running or queued whose process is dead is uncertain, not active); matched resume preview; active-writer check; two rounds at most | The actual target qualifies. If it does not, reconcile terminal ownership and use a labelled successor |
| Native subagents or teams (alternative) | The host's own tasks and messages; deliver the selected bodies and project constraints | The host owner proves actual loading, receipt and behaviour |
| Native queue (alternative) | Supported controls with the exact recipient and task identity | Idle pickup, busy steer and restart are proven separately; queued is not read |
| Live board (alternative, when chosen) | A live board plus conversations on demand | That host's view is verified |
| Independent peer leads (optional) | Supported explicit-recipient queue or steer with a correlated receipt and action | Both directions, busy steer, idle wake and restart are qualified; no new relay or bridge |
| Peer fallback | The host's supported wake procedure for the same peer | Use it only where the host has the control; browser-only control cannot wake a native desktop app |

Use one background wait and short results. Use no forwarding agent, no polling of unchanged status, no routine log dump and no forced vendor, and make optional peer messaging no default dependency. Keep model and account observations in the overlay `ROUTES.md`. The host's job-index size is retention, not a worker cap.

## Acceptance, authority and holds

- The accountable lead accepts passing real-platform rehearsal with no open reproduced blocker, records it and continues; no ready verdict is required for release. Never ask the founder to confirm or accept a review, verdict or candidate. Ask the founder only for undecided product, design or business choices, spending, release actions outside the brief's authority, or findings still open after two repair rounds, each with a recommendation.
- The founder's latest explicit in-scope instruction governs over an older conflicting one, within the host's own security limits. It does not silently lift unrelated holds. Add no founder-only technical unlock and no repeated permission ceremony, and invent no approval service. Keep independent review, real platform security and existing scoped holds.
- Payment, store submission and live trading happen only when the brief names them.
- Installation, independent acceptance, release and verified-live behaviour are separate states. Worker completion, lead acceptance, release authority and production verification are four different facts.

## Limits of the gate

Local writable records cannot authenticate a host, a reviewer, a screenshot or a real command. Protected pins and controller captures must come from the host's qualified path, through the controller's own task state, outside the builder's write scope. A worker that controls both the pins and the records can fabricate a consistent set. The script does not intercept tools, install hooks, verify every manifest member, prove complete scope or authorise external action. Do not claim tamper-proof enforcement and do not add a service.

`PASS_RECORD` means structural completeness and matching hashes only. Every result carries `candidate_accepted: false`, `authorizes_external_action: false` and `host_action_interception_installed: false`. Reject missing, stale, mismatched and omitted evidence, and carry earlier finding IDs through repairs.

- Run the gate only with a real, owner-pinned contract and a supported Python. Otherwise report the exact gap and the manual checks.
- Missing Python or a failed tool stays a named gap. Manual, fixture or translated work is never called native execution and never replaces a missing native result.
- The bundled tests (`tests/test_evidence_gate.py`) cover the negative cases (missing, matching or resumed reviewer identity, queued or incomplete inspection, stale candidate, base, config or contract, tampered output hashes) and a distinct-reviewer positive control. They cannot prove semantic truth, tool interception or authenticated approval.
- Never patch the gate to make a candidate pass. Treat a change to the gate as a candidate that gets its own independent check.
- Qualify an unproven mechanism on lower-risk work before relying on it for money, customer data or publishing. Observe real body loading, useful worker overlap, dependencies, same-owner repair, integration and customer results, and keep the working recovery path until its replacement passes. Adopt it through current work and add no mandatory synthetic rollout gate, scheduler, watcher, relay or separate tracker.
