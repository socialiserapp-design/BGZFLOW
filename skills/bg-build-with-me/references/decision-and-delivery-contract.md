# One shared contract, at the right level

Use the project's existing records and the [glossary](glossary.md). Keep requirement IDs, C4 identifiers, component names and interface and data versions. This file defines required meanings and copyable sections; it is not a new tracker or schema. Keep delivery's fields in its [task schema](../../bg-finish-the-whole-job/references/work-graph.md#task-schema) and [worker packet](../../bg-finish-the-whole-job/references/worker-packet.md).

Review verdicts are owned by the [verdict schema](../../bg-check-it-before-release/references/review-verdict.schema.json): `ready` only when required evidence passes and every finding is closed, `changes-required` for observed defects, `blocked` when required evidence or access is unavailable. Worker states, dependency acceptance and the founder's `done`/`partly`/`not done` checklist are separate fields, never verdicts.

## Product plan

State the original outcome, intended users and situations, observable success and failure cases, decisions and unresolved branches. Bind approved visual references separately from experiments. Cover contracts and trust boundaries, dependencies, ownership, target platforms and devices, the requirement-to-work-to-test mapping, and actual authority and holds. Record dated account capacity and the once-agreed project usage ceiling; label reported versus measured usage. Express every cap as time, size or rounds (minutes, KB, repair rounds), never as a condition nobody can enforce.

Default route: one lead talks with the founder and keeps short status and results in that chat. Workers do the heavy work, and their full job and thread history is retained. A fresh independent checker inspects the exact candidate. A live board and visible worker chats are optional, never prerequisites. Any other route (native subagents, peer leads, cloud workers) carries its own separately qualified visibility and communication contract. [worker-route.md](worker-route.md) holds the commands; the founder's concrete host and account mapping lives in the overlay `ROUTES.md` ([template](../../../templates/ROUTES.md)).

## Worker assignment and body delivery

Apply [capability coverage](capability-coverage.md) for the current and next stage before optional [skill selection](skill-selection.md). Carry exact skill IDs, body hashes, read paths or verified copies, catalogue adjustments, tools and explicit gaps. Each executor reads the bodies before the affected stage. Keep selection, delivery, actual read, application and tool execution distinct in the [read receipt](#executor-read-receipt). Handle denied, missing or changed sources with the [body read and fallback procedure](skill-selection.md#body-read-and-fallback-procedure).

The lead does any mechanical step of about two minutes or less itself instead of dispatching it. Write every other assignment as a brief ([template](../../../templates/BRIEF.md)):
- Keep a stable task ID, one owner, accepted prerequisites, owned worktree and paths, shared-resource claims and acceptance.
- List the required outputs. The handback check confirms each one exists, and the checker compares the result with the brief.
- State the job-level permissions and say that they override shared boilerplate. Boilerplate carries no task-specific bans. When a worker-context file disagrees with the brief, the brief wins.
- Carry pointers (paths, commits, line ranges), never copies of logs or transcripts. Name one canonical live-log path per job.
- Refer to secrets by name only and inject values only into the authorised service or process. Never put a token in a URL, including a Git remote; use a credential helper.
- Name every external resource the job creates with the job ID as prefix, record it, and clean it up before any retry.

Independent ready tasks can run at the same time; a shared deployment, schema, device or browser writer stays exclusive. Bind job, thread, lead session, requested launch cwd and resolved workspace as [worker-route.md](worker-route.md) describes. Preserve the admitted base and the exact candidate; a branch name alone is not enough.

## Integrated handback and review

Return one identifiable combined product: source, artifact, configuration and dependency identity; complete requirement coverage; customer-flow and applicable security, device and performance evidence; approved design comparisons; and remaining findings. A worker handback is a candidate for review, never an approval.

The integration writer verifies the accepted `DECISIONS.md` IDs against the candidate while composing it, and the checker verifies them again. A fresh, read-only independent checker inspects the exact candidate; builder and checker job and thread identities differ. The lead reads the short result, runs the cheapest decisive proof and decides. On a `ready` verdict the lead accepts the candidate itself and records the acceptance. The lead never asks the founder to accept a review, verdict or candidate.

Return consolidated fixes to the existing owners through verified repair identity. Keep every finding under one stable ID through repairs and re-checks, in the `bg-rounds` ledger. Count repair rounds per package across resumes and handoffs. If findings remain open after two rounds, stop and report the open IDs to the founder with a recommendation; a third round needs the founder's explicit approval. Routine tasks need no second vendor or premium review. An accepted candidate and release authority stay separate.

Ask the founder only about an undecided product, design or business choice, spending, a release outside the brief's authority, or findings still open after two repair rounds. Give a recommendation with each question.

## Copyable templates

Use these compact sections inside existing records. For full discovery use the [planning loop](../../bg-plain-english-builder/references/planning-loop.md) and the [question round](../../bg-plain-english-builder/references/question-round.md#copyable-question-round); never start a rival interview. For execution use the [worker packet](../../bg-finish-the-whole-job/references/worker-packet.md#worker-prompt) and [task schema](../../bg-finish-the-whole-job/references/work-graph.md#task-schema). Take every timestamp from the system clock; never estimate one.

### Plan

```text
Outcome / users:
Requirement IDs -> observable success and failure cases:
Decisions (DECISIONS.md IDs) / evidence / unresolved branches:
Approved visual reference + decision / shared contracts and versions:
Current stage / next stage / transition evidence:
Tasks + dependencies + owned paths + integration writer:
Account allowance (source/time) / agreed ceiling / caps (minutes, KB, rounds) / authority / holds:
Requirement -> task -> acceptance command or observed journey:
Skeleton checkpoint / whole-candidate review / permitted delivery:
```

### Task

```text
id: <existing stable task ID>
owner / lead / return route:
requirement_ids / contract_refs / accepted dependsOn:
owned_paths / owned worktree / branch / admitted base:
shared resources and exclusive owners:
required current / required next / optional selection + fingerprint:
skill IDs + source paths + hashes / body delivery / required tools:
required outputs / acceptance_command + expected behaviour / evidence location:
findings carried forward / authority / holds / next owner:
```

### Worker prompt

```text
GOAL: <original meaning and complete bounded contribution>
PROJECT: <launch cwd, resolved workspace, owned worktree, branch, base>
READ FIRST: <checkpoint and scoped context pointers: paths, commits, line ranges>
DO: <owned paths, accepted contracts, concrete actions>
PERMISSIONS: <job-level permissions; these override shared boilerplate>
SKILLS: <required current/next; optional result or fallback; exact body paths and hashes>
READ RECEIPT: <actual complete body reads or precise denied/missing/changed fallback>
DON'T: <task-specific exclusions, holds and shared-resource limits>
CAPS: <minutes, output KB, repair round>
DONE WHEN: <requirement IDs + observable acceptance + required outputs>
PROVE IT: <exact commands, runtime and evidence path; native vs fixture>
LOG: <one canonical live-log path>
RETURN: <short status, candidate SHA, changed paths, results, findings, next owner>
```

### Executor read receipt

```text
Executor / job / thread:
Current / next stage:
Selected ID or name / reason / expected source SHA-256:
Actual read path + SHA-256 / complete body read tool evidence:
Canonical / byte-equivalent discovery copy / reconciled new version / unavailable:
Adaptations / relevant actions / tool result or exact capability gap:
Next-stage body loaded now or required before transition:
```

A source mismatch needs scoped inspection; it is not a successful pinned read. A checklist fallback records its coverage and limits without claiming the missing skill loaded.

### Handback

```text
Status: done / partly / blocked (a candidate, not self-approval)
Task / owner / builder job + thread / lead session / executor exit status:
Launch cwd / resolved workspace / owned worktree / branch / admitted base:
Candidate commit / artifact + config + dependency hashes:
Changed owned paths / each required output present:
Requirement IDs -> exact command or behaviour -> evidence path + hash -> result:
Required/optional selection / actual full-body reads / tool gaps:
Native / fixture / manual / historical / unrun evidence:
Findings closed (proof) / still open (stable ID, owner, next action):
Checker job + thread + exact candidate (pending until independent check):
Repair round (0, 1 or 2) / uncertain effects / external resources created / live-identical vs candidate-only:
Next owner, action and trigger / preserved authority and holds / system-clock timestamps:
```

## Continuity and peer leads

Preserve the completed receipt, the exact next owner and action, pending requests, finding IDs, account and host, and either same-thread continuation or an explicit successor handoff. Store essential results in project evidence, outside any rolling job index the host prunes, and keep the project state folder (`<project>/.bgzflow/`) versioned or snapshotted. A saved note or queued message does not prove receipt or action. Before any resume or retry, reconcile job records against live processes as [worker-route.md](worker-route.md) and the [account and cloud checklist](../../bg-continue-my-project/references/account-cloud-checklist.md) describe.

Peer-lead messaging applies only when independent peer leads must talk to each other; ordinary worker jobs never need it. Reuse a supported exact-recipient route without taking over a screen or re-pinning global settings per project. Record sender, recipient and session, task, stable message ID, priority and evidence, and keep submitted, received or read, and acted on distinct. Qualify queued delivery, busy steer, idle wake and restart recovery separately. Keep an existing supported fallback for waking a stalled peer only where the host actually supports it, until its replacement is qualified; browser-only tools cannot wake a native desktop chat. Add no relay, runtime or duplicate worker.

A steer grants no new authority from the founder and no permission to replay an uncertain effect. An account or model change continues the same project and preserved work. For work while the founder's PC is off, use the continuation skill's eligibility and handoff checks.
