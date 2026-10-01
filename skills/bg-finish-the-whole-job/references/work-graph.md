# Work graph: plan to assignments

Use this when an approved outcome has more than one implementation lane. Store the graph in the project's plan and checkpoint records under `<project>/.bgzflow/`; it is portable data, not an installed dispatcher. Keep the existing requirement, glossary, C4, contract, task and finding IDs.

Review verdicts belong to [the verdict schema](../../bg-check-it-before-release/references/review-verdict.schema.json): `ready` only when required evidence passes and every finding is closed, `changes-required` for observed defects, `blocked` when required evidence or access is missing. Worker states, dependency acceptance and the founder-facing `done / partly / not done` checklist are separate fields, never verdicts.

## Task schema

This JSON Schema validates each task row; the [task row](worker-packet.md#task-row) shows example values to replace with real identities. Validate with the project's JSON Schema tooling when available; otherwise check the invariants below and label the validation manual. The schema neither inspects evidence content nor launches workers.

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "BGZFLOW work graph task",
  "type": "object",
  "required": ["id", "requirement_ids", "outcome", "dependsOn", "owned_paths", "contract_refs", "skills", "model_tier", "account", "owner", "workspace", "baseline", "permissions", "tests", "acceptance_command", "return", "worker_state", "dependency_acceptance", "integration", "open_findings"],
  "properties": {
    "id": {"type": "string", "minLength": 1},
    "requirement_ids": {"$ref": "#/$defs/ids"},
    "outcome": {"type": "string", "minLength": 1},
    "dependsOn": {
      "type": "array", "items": {
        "type": "object", "required": ["id", "gate"],
        "properties": {
          "id": {"type": "string", "minLength": 1},
          "gate": {"enum": ["accepted-dependency", "integrated"]}
        }, "additionalProperties": false
      }
    },
    "owned_paths": {"$ref": "#/$defs/ids"},
    "contract_refs": {"type": "array", "items": {"$ref": "#/$defs/ref"}},
    "skills": {
      "type": "object", "required": ["selection_ref", "current", "next", "read_receipts"],
      "properties": {
        "selection_ref": {"type": "string", "minLength": 1},
        "current": {"$ref": "#/$defs/ids"},
        "next": {"type": "array", "items": {"type": "string", "minLength": 1}},
        "read_receipts": {"type": "array", "items": {"$ref": "#/$defs/ref"}}
      }, "additionalProperties": false
    },
    "model_tier": {"type": "string", "minLength": 1},
    "account": {"type": "string", "minLength": 1},
    "owner": {"type": "string", "minLength": 1},
    "workspace": {"type": ["string", "null"]},
    "baseline": {"type": "string", "minLength": 1},
    "permissions": {
      "type": "object", "required": ["inherit_from", "effective", "authority_ref"],
      "properties": {
        "inherit_from": {"type": "string", "minLength": 1},
        "effective": {"type": ["string", "null"]},
        "authority_ref": {"type": "string", "minLength": 1}
      }, "additionalProperties": false
    },
    "tests": {
      "type": "array", "minItems": 1, "items": {
        "type": "object", "required": ["id", "requirement_ids", "command", "cwd", "expected", "evidence_path"],
        "properties": {
          "id": {"type": "string", "minLength": 1},
          "requirement_ids": {"$ref": "#/$defs/ids"},
          "command": {"type": "string", "minLength": 1},
          "cwd": {"type": "string", "minLength": 1},
          "expected": {"type": "string", "minLength": 1},
          "evidence_path": {"type": "string", "minLength": 1}
        }, "additionalProperties": false
      }
    },
    "acceptance_command": {"type": "string", "minLength": 1},
    "return": {
      "type": "object", "required": ["recipient", "control", "worker_id", "request_id", "job_id", "thread_id", "history_ref", "evidence_location"],
      "properties": {
        "recipient": {"type": "string", "minLength": 1},
        "control": {"type": "string", "minLength": 1},
        "worker_id": {"type": ["string", "null"]},
        "request_id": {"type": ["string", "null"]},
        "job_id": {"type": ["string", "null"]},
        "thread_id": {"type": ["string", "null"]},
        "history_ref": {"type": ["string", "null"]},
        "evidence_location": {"type": "string", "minLength": 1}
      }, "additionalProperties": false
    },
    "worker_state": {"enum": ["planned", "ready", "queued", "running", "completed", "failed", "interrupted", "waiting-for-PC"]},
    "dependency_acceptance": {
      "type": "object", "required": ["state", "by", "candidate", "evidence_refs"],
      "properties": {
        "state": {"enum": ["pending", "accepted", "invalidated"]},
        "by": {"type": ["string", "null"]},
        "candidate": {"type": ["string", "null"]},
        "evidence_refs": {"type": "array", "items": {"$ref": "#/$defs/ref"}}
      }, "additionalProperties": false
    },
    "integration": {
      "type": "object", "required": ["owner", "state", "candidate", "combined_head", "evidence_refs"],
      "properties": {
        "owner": {"type": "string", "minLength": 1},
        "state": {"enum": ["unqueued", "queued", "testing", "integrated", "repair-required"]},
        "candidate": {"type": ["string", "null"]},
        "combined_head": {"type": ["string", "null"]},
        "evidence_refs": {"type": "array", "items": {"$ref": "#/$defs/ref"}}
      }, "additionalProperties": false
    },
    "open_findings": {"type": "array", "uniqueItems": true, "items": {"type": "string", "minLength": 1}},
    "route_receipt": {
      "type": "object",
      "required": ["launch_cwd", "lead_session", "turn_id", "executor", "exit_status", "branch", "candidate", "dirty_files", "created_resources", "live_log", "repair_round", "brief_ref", "identity_ref", "skill_evidence_ref", "command_outputs_ref", "finding_lineage_ref", "live_staged_ref", "usage_ref", "result_location", "next_action"],
      "properties": {
        "launch_cwd": {"type": ["string", "null"]},
        "lead_session": {"type": ["string", "null"]},
        "turn_id": {"type": ["string", "null"]},
        "executor": {"type": ["string", "null"]},
        "exit_status": {"type": ["integer", "string", "null"]},
        "branch": {"type": ["string", "null"]},
        "candidate": {"type": ["string", "null"]},
        "dirty_files": {"type": "array", "items": {"type": "string", "minLength": 1}},
        "created_resources": {"type": "array", "uniqueItems": true, "items": {"type": "string", "minLength": 1}},
        "live_log": {"type": ["string", "null"]},
        "repair_round": {"type": "integer", "minimum": 0, "maximum": 2},
        "brief_ref": {"$ref": "#/$defs/ref"},
        "identity_ref": {"$ref": "#/$defs/ref"},
        "skill_evidence_ref": {"$ref": "#/$defs/ref"},
        "command_outputs_ref": {"$ref": "#/$defs/ref"},
        "finding_lineage_ref": {"$ref": "#/$defs/ref"},
        "live_staged_ref": {"$ref": "#/$defs/ref"},
        "usage_ref": {"$ref": "#/$defs/ref"},
        "result_location": {"type": ["string", "null"]},
        "next_action": {"type": "string", "minLength": 1}
      }, "additionalProperties": false
    }
  },
  "additionalProperties": false,
  "$defs": {
    "ids": {"type": "array", "minItems": 1, "uniqueItems": true, "items": {"type": "string", "minLength": 1}},
    "ref": {
      "type": "object", "required": ["id", "path", "version"],
      "properties": {
        "id": {"type": "string", "minLength": 1},
        "path": {"type": "string", "minLength": 1},
        "version": {"type": "string", "minLength": 1}
      }, "additionalProperties": false
    }
  }
}
```

Wrap the rows in a graph envelope: `schema_version: 1`, `project_id`, `plan_ref`, `decisions_ref` (`DECISIONS.md`), `lead_id`, `integration_owner`, `integration_workspace`, `baseline`, `shared_refs`, `usage_ceiling_ref`, `holds_ref`, `ledger_ref` (the project ledger of clones, worktrees and integrated commit SHAs, under `<project>/.bgzflow/`), `route`, `status_location`, `whole_candidate_checks` and `tasks`. Every reference resolves to an exact existing record or version. Account values are nonsecret aliases. The ceiling reference records each account's approved limit, observation source and time, reset and reserve, and separates estimates from hard host quotas. `route` names the verified native controls and the visibility rule; `status_location` points to the lead's short results on the default route, or to the supported live board on another. Record full-history access in each task's `return.history_ref`; unavailable IDs stay null until a real host result sets them.

`model_tier` names the needed capability, such as `economical-qualified`; `route_receipt.executor` records the model and effort that actually ran, because a tier alone proves nothing. A task's `tests` are its fast checks only: type check, lint and the unit tests it touched. The full suite and critical journeys live only in the envelope's `whole_candidate_checks`, run once by the integration job (build first, check once). `acceptance_command` is a real fast command for the finished assignment; for non-code work use the artifact or render checker, or record an observed acceptance procedure in `tests`.

## Readiness and state invariants

### Route receipt extension

`route_receipt` is the generic route evidence for one job. It is optional, so `schema_version: 1` rows without it stay valid, and every original field, enum and reference shape is unchanged. New assignments fill it and update its evidence at each actual transition. For a strict older consumer that rejects it, strip only `route_receipt` and keep its linked evidence in the checkpoint; never rename fields or silently invent schema version 2. New consumers validate it when present.

`return.job_id`, `return.thread_id` and the graph states stay authoritative; the receipt adds evidence, not parallel identities or states. `turn_id`, `lead_session` and the original `launch_cwd` complete the identity. `executor` names the host, model, effort and account alias that ran; `exit_status` holds the exit code or `timeout`, `cancelled` or `unknown`, and stays null until the job is terminal. `live_log` is the job's one canonical live-log path. `brief_ref` pins the exact brief dispatched, with its required outputs. `created_resources` lists every external resource the job made, each named with the job ID prefix and cleaned up before any retry. `repair_round` counts this package's fix waves and stops at 2; a founder-approved third wave is recorded in `DECISIONS.md` and the `bg-rounds` ledger, and the row names that approval in `next_action`.

Keep three moments separate:

- **Before initial launch**, require the task and contract, existing owner and lead session, original launch cwd, resolved workspace and branch, exact baseline, effective permissions, and capacity and hold evidence. Job, thread and turn IDs do not exist yet: leave them null with the reason `not-yet-launched` in the identity record. This never blocks admission.
- **After launch**, fill the actual job, thread, turn and request IDs and the result and history locations, and correlate them with the admitted task and checkout. If a required ID is hidden, record the exact correlation gap and reconcile the submitted job. Never redispatch only to obtain an ID, and never claim a correlation you did not observe.
- **Before resume**, require the exact job and thread plus the lead session, cwd, workspace and base from that launch, then match the supported resume target, ownership and effects state. A null, unknown or mismatched required ID blocks only that resume.

Evidence content follows the [worker packet](worker-packet.md). `identity_ref` binds the original launch cwd, lead session, actual job and thread, worktree and base, permissions and resume-target observation. The other refs bind body reads and tool use; candidate, config, environment and command outputs; unresolved finding lineage; live-identical or staged-only comparisons; and account and ceiling observations. `dirty_files` lists tracked and untracked paths, hashed in the command receipt. The route owner owns shared glossary and route changes; request them through the handback.

### Admission and integration rules

1. Verify unique task IDs, known dependencies, no cycles, full requirement coverage and tests covering every assigned requirement. Expand owned path patterns to catch overlaps, parent and child folders, symlinks and case aliases. One owner writes each shared contract, lockfile, schema and generated client, the integration head, and any shared device or test account.
2. A task is `ready` only when every dependency's gate passes on the pinned contract version, the required skill bodies and the workspace are reachable, the account route fits the approved ceiling, and no hold forbids it. `accepted-dependency` needs a named recipient to inspect the exact candidate and contract checks and record acceptance. At build admission, a dependent that needs prerequisite code uses `accepted-dependency` and a stacked checkout at the prerequisite's pinned commit; it never waits for final combined-head integration. The controller first inspects the exact returned candidate and fast-check evidence and records consumer-specific acceptance. Never turn `completed` straight into a passed dependency. Keep `integrated` for an already integrated baseline, such as wave 0, or a step that truly needs the final combined head.
3. Wave 0 contracts and stubs land on the integration baseline before implementation waves. Implementers may overlap against that stable contract; mocks still need real integration checks later. For a prerequisite not yet integrated, resolve its named branch to a full commit SHA and set the dependent's `baseline` to that commit, or to a verified descendant containing every prerequisite. Record the pins in the acceptance and packet evidence. Branch movement, invalidated acceptance or changed prerequisite code blocks the affected admission until it is re-pinned and re-checked. Integrate prerequisites before dependents in the single final integration job; never mark them integrated to unblock a build.
4. `completed` means the worker returned its exact candidate and checks. `accepted` means prerequisite evidence was inspected for a named consumer. `integrated` means that exact contribution is on a recorded combined head and the required combined checks passed. Project completion also needs whole-candidate acceptance. None of these states grants release authority.
5. A changed contract or rejected candidate invalidates the affected acceptances and ready dependents. Keep unaffected work running. Preserve pending effects and results, revise the contract visibly through its owner, and retest the affected consumers. A green historical head does not prove the current head passes.
6. A `running` or `queued` row whose process is dead is uncertain, not active: apply the [dead-process check](worker-packet.md#dispatch-and-pickup) before any resume, retry or redispatch.
7. Keep a small integration queue in the same record: task ID, candidate, baseline, prerequisites, changed paths, queue time (system clock), findings, next action and owner. The single integration writer updates it from real results and verifies every accepted `DECISIONS.md` ID against the candidate; the checkers verify them again. Workers return evidence; they never self-approve dependency or combined acceptance.

The controller can run [the pure admission helper](../scripts/admit_build.cjs) on the rows before dispatch. `admitBuild(task, tasks, contains)` takes one row, a `Map` of rows by ID and an ancestry check. It returns a proposed row with a pinned baseline and `accepted-dependency` edges. It returns `null` when evidence or ancestry is missing, when a prerequisite's owner accepted its own work, or when the acceptance evidence is not pinned to that exact candidate. `contains(head, commit)` must check real Git ancestry through the host (for example `git merge-base --is-ancestor`); the default accepts identical commits only. For several independent prerequisites, prepare one owned stacked build baseline and verify every pin is an ancestor; this is build input, not final integration. Keep the original graph until the controller records admission. The helper never launches workers and never proves capacity, permissions, requirement coverage or evidence truth.

The [worker packet](worker-packet.md) has a copyable task row; the [swarm procedure](swarm-procedure.md) has the dispatch and merge steps. The default `route` points to the [worker route](../../bg-build-with-me/references/worker-route.md) and a capability card in [ROUTES.md](../../../templates/ROUTES.md); label other routes as alternatives. Every route uses one background wait and exact result pickup, never a polling loop. Keep the same-owner repair lineage and the two-round cap (a third round only with the founder's explicit approval), then report unresolved findings. Whole-candidate acceptance needs a fresh independent check of the green combined head, with builder and checker jobs and threads distinct. A task is not finally done merely because its worker completed or its prerequisite was accepted.
