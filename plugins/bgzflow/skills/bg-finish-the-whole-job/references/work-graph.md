# Work dependencies and ownership

Use a dependency view only when the task has independent contributions or
prerequisites worth tracking. Keep it in the existing plan or task system.
A short list can be sufficient; no JSON work graph or extra ledger is required.

## Task schema

A useful task describes its outcome, owner, inputs or prerequisites, owned
resources, relevant methods, meaningful checks, current result and next action.
Use the host's native identities for execution where available. Do not invent
job IDs, model capacity, read receipts or required fields for unknown metadata.

The older JSON schema is retained in non-distributed source history for audit;
it is not a required input to the current foundation.

## Readiness and state invariants

### Route receipt extension

No route-receipt form is required. Preserve native dispatch/result identity,
working context and pending effects in existing records so work can be reconciled.
A message marked submitted is not the same as an observed running or completed
job. Unknown metadata stays unknown.

Before continuation, identify the actual old job, target and ownership. If a
native resume command cannot select it safely, reconcile the old writer and
use a supported successor handoff. Never resume an arbitrary latest job.

### Admission and integration rules

- Avoid cyclic or missing prerequisites. Check that independent writers do not
  overlap through files, linked paths, devices, schemas or shared services.
- Ready work has the needed inputs, authority, capable route and available
  resources. A task title or configuration entry does not establish these facts.
- When using a prerequisite's code, identify its actual version and verify the
  consumer-relevant contract. Do not mark it integrated merely to unblock a task.
- Integrate in dependency order with one owner. Inspect combined behavior and
  required checks. A successful merge alone proves no runtime result.
- A changed input or contract invalidates affected assumptions and evidence;
  continue unrelated valid work while resolving that specific dependency.
- Preserve failures, current user decisions and uncertain effects across repairs.
  A new commit, account or worker does not erase unresolved findings.
- Distinguish worker completion, integration, acceptance, release and observed
  live success. None grants authority for the next external action.

## Change record

Update the current view when a meaningful fact changes: a corrected user decision,
new owner, completed result, failed check or changed dependency. Preserve original
evidence and superseded decisions separately. Native events can supply some facts,
but a model-written state transition does not establish the effect itself.

## Start-now list

Choose genuinely ready useful work from this view. Do not fill all worker slots
or wait for every unrelated task. A ready task may still be better performed by
the current agent if delegation adds unnecessary cost or coordination.

Legacy graph/admission helpers are optional for an explicitly maintained older
integration. They are not automatic foundation enforcement and should not be
run to obtain permission or create paperwork for ordinary tasks.

See [worker packets](worker-packet.md), [parallel procedure](swarm-procedure.md)
and [shared rules](swarm-rules.md).
