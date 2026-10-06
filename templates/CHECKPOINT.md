<!-- One page of CURRENT state: about 1,500 words, within BGZFLOW_CHECKPOINT_KB (8 KB).
     Move anything no longer current to ARCHIVE.md; never delete history.
     Update at every state change. Take timestamps from the system clock (e.g. `date -u +%FT%TZ`).
     Keep <project>/.bgzflow/ versioned or snapshotted. -->
# Checkpoint: <project>

Updated: <system-clock timestamp, UTC> by <role + job ID>

## Outcome
<!-- Intended result in two sentences, and how acceptance is observed. -->

## CURRENT RULES
<!-- The single block of rules in force now. Cite DECISIONS.md IDs instead of copying them.
     Superseded rules move to ARCHIVE.md. No second rules block anywhere else. -->
- 

## OWNERS
<!-- Exactly one lead and one integration writer. One owner per task, worktree and shared mutation.
     Only roles defined in AGENTS.md; `startup-check` flags unknown roles. -->
| Role | Who (role + job/thread/session) | Since |
|---|---|---|
| Lead | | |
| Integration writer | | |
| T1 owner | | |

## Candidate
<!-- Exact branch, base, commit, artifact, configuration, environment. One state:
     proposed / implemented / tested / integrated / accepted / deployed / verified-in-use. -->

## Worktrees (project ledger)
| Clone or worktree | Owner | Branch | Last integrated commit |
|---|---|---|---|

## Jobs
<!-- A job recorded running or queued whose process is dead is `uncertain`, never active.
     A job queued more than 5 minutes is stuck: reconcile, cancel, redispatch. -->
| Job ID | Executor | Recorded status | Process alive? | Exit | Result path |
|---|---|---|---|---|---|

## Open findings
<!-- Stable IDs across rounds; the `bg-rounds` ledger counts rounds. Round 3 needs the founder's explicit approval. -->
| ID | Severity | Owner | Round (0/1/2) | Next action |
|---|---|---|---|---|

## Holds and uncertain effects
<!-- Scoped holds, and each uncertain external effect with its durable operation ID. Reconcile before any retry. -->

## Next actions
1. <one concrete authorised step> | owner | prerequisite | result route
