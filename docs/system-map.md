# The system map

BGZFLOW keeps one map of the system you are building: what exists, what is changing and how far each change has got. One owner keeps it and everyone else reads it. It is advice only. It never blocks a release and never asks anyone a question.

## What the map holds

- **The inventory.** Repos, worktrees, services (and which depend on which) and the deployments your config files declare. `bgz setup` finds them. Entries you add by hand win over what it finds.
- **The changes.** For each task: what changed, where (paths), the effect, and its stage.
- **The impact.** A changed path points to its service, then to the services that depend on it and their deployments.
- **The flags.** The map says when a fresh scan differs from the stored one (rerun `bgz setup`), when a worktree has no task owner, and when a record claims more than git can prove.

## Where it lives

- `.bgzflow/project.json`, under `system`: the `owner`, the `integration_branch`, the `detected` scan and your `manual` entries.
- `.bgzflow/work-graph.json`: each task may carry a `change` object (see the [work-graph reference](../skills/bg-finish-the-whole-job/references/work-graph.md)).

There is no new tracker or database. The scan never opens `.env` or other secret files.

## The five stages

| Stage | It means | What proves it |
|---|---|---|
| `plan` | Agreed, not built | The default: a task with no `change` is here |
| `committed` | The work is in a commit | Git: the commit exists |
| `integrated` | The commit is on the integration branch | Git: it is an ancestor of the integration branch (`system.integration_branch`, else the repo default), or the task's `integration.state` is `integrated` |
| `deployed` | It is running in its target environment | The owner records it with `--evidence` |
| `production-verified` | The live check passed | The owner records it with `--evidence` |

The map shows the higher of the recorded stage and the stage git proves. A `deployed` or `production-verified` record without evidence is still saved, but shows as "claimed, no evidence". Nothing is refused.

## Who may write

The owner is the work graph's `integration_owner`, else `system.owner`, else `lead`. Only the owner writes: pass `--as <role>` (or set `BGZFLOW_ROLE`) and it must match. If it does not, nothing changes and the command prints a line for you to put in your handback instead. Anyone can read the map.

Workers do not write the map. They end each handback with one line per change:

```text
Changed: <what> | where: <a, b> | effect: <text>
```

## Using it

```text
bgz map                                  # the whole picture
bgz map --brief                          # 3 to 5 plain lines for the checkpoint, handoff and inbox
bgz map --json                           # the same, for scripts
bgz map record T3 --handback h-T3.md --as lead
bgz map record T3 --what "Retry failed payments" --where "src/checkout" --effect "A failed payment retries once" --commit 4f2a9c1 --as lead
bgz map record T3 --stage deployed --evidence "deploy run 1234 finished" --as lead
bgz map live api-worker --evidence "serving build 4f2a9c1" --as lead
```

`record` reads a handback's `Changed:` lines, or takes one change by hand. `live` confirms an active deployment into your `manual` entries.

## How it travels

It reuses what you already keep, so there is nothing new to read.

- **Handback and brief.** The [brief](../templates/BRIEF.md) asks for the `Changed:` lines, and each handback ends with them.
- **Inbox.** `record` and `live` print a one-line summary. The owner posts it to the project's shared inbox.
- **Checkpoint.** The owner pastes `bgz map --brief` into the System map section of [`CHECKPOINT.md`](../templates/CHECKPOINT.md), which stays one page.
- **Handoff.** A fresh chat runs `bgz map` when it resumes, so a handoff needs no copy of the map.
