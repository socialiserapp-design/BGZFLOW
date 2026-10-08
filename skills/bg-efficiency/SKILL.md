---
name: bg-efficiency
description: Use in every chat and role to cut usage without cutting scope, tests or holds: effort by role, scripts run from files, fresh chats from short handoffs, concise replies, maps before reads and receipts printed by tools.
---

# BG Efficiency 2.0

Apply on every turn, in every role and stage. Efficiency never cuts requirements, meaningful tests, safety, evidence, recovery or holds; it removes repetition. Measured usage: hidden thinking and tool input (commands, file writes, SQL) are most of the output, replies about 5%, and re-reading a long context every turn is the largest load. The checklist follows that order. Terms are in the [glossary](../bg-build-with-me/references/glossary.md); sources in [sources](references/sources.md).

Run BGZFLOW tools as `node "${CLAUDE_PLUGIN_ROOT}/tools/<name>/<name>.mjs"`; where the host leaves that unfilled, the plugin root is two folders above this skill.

## The four bundles

1. **Less thinking: effort by role.** Thinking is billed as output. Set effort per role, not one global level; the overlay's `ROUTES.md` (or the project's status file) says which model fills each role, and read-only search goes to a cheaper model.

   | Role | Default effort | Raise when |
   |---|---|---|
   | Reader, search, mechanical edit | low | it fails once, or the brief names a harder level |
   | Builder | medium (low for mechanical work) | after a failure, or the brief names it |
   | Checker | medium | the brief names a release review |
   | Lead | medium | planning, hard debugging or a release decision named in the brief |

   High or above runs only when a brief names it. **Raise one level after a failure; never retry at the same low level.** Host settings are in [tool harmony](references/tool-harmony.md#host-settings).
2. **Less typing into tools.** Tool arguments are output. Save a script, query or migration to a file once and run it by path (a CLI with `-f`, or a migration file); never retype or resend an unchanged one. Where only an inline tool exists, send small statements. Script many steps into one command that prints a summary. Edit files; never rewrite a whole file for a small change. Never paste code, logs or diffs into chat or briefs: give the path and line range.
3. **Less re-reading.** At each stage end write the [handoff](../../templates/HANDOFF.md) (BGZFLOW_HANDOFF_KB, 2 KB) and start a fresh chat from it, and before the transcript passes BGZFLOW_CHAT_MB; prefer a handoff to repeated compaction, which is itself a large request. Keep the context window no larger than the work needs. Batch wake-ups: one background wait per job, agent messages read together, and idle leads hold inbound messages where the host allows it. Keep always-on plugins, skills and tool servers lean per project; `doctor plugins` shows what each adds to every session.
4. **Shorter replies, every turn.** Use the host's concise style. Lead with the result; no preamble, narration or recap of what is already on screen. Progress updates are 1–3 sentences; worker handbacks at most 10 lines (result, proof path, gaps, next step), with detail in a named file. Write full detail for errors, failing tests, security warnings, destructive-action confirmations and any explanation asked for. Keep complete plain-English sentences, exact numbers and stated uncertainty.

## Kept from 0.3.2

5. **Map before reading.** Read code through the code map (sync it before the first query and after edits, checkout or rebase) and notes through `notes-map ask "<question>"`. Never open a notes or log file over BGZFLOW_BIG_READ_KB (64 KB) whole; read only the needed lines. If a map errors or returns an empty or ambiguous answer, use targeted `rg -n` and a source read and record why: **an empty answer never proves there is no caller or test**. Commands are in [tool harmony](references/tool-harmony.md).
6. **Path-based briefs, one background wait.** Briefs point to files, commits and line ranges, with one live-log path per job. Follow the [swarm lifecycle](../bg-finish-the-whole-job/references/swarm-procedure.md) (`bg-swarm` launches, lists and stops local workers). Use one background wait and exact result pickup: no forwarding agent, polling or log dump. Validate the job directory and watcher once per lead session. A job queued over 5 minutes is stuck: reconcile its durable identity, then `bg-governor queued --apply` restarts it once only if the operation is mutation-safe. Do steps under about 2 minutes yourself.
7. **Capacity.** Agree each account's ceiling once, observe usage before material dispatch, keep verified and estimated figures apart, and never sum shared quotas. Alternative providers come only from the overlay's routes; never silently switch accounts or buy capacity. One heavy local run (full suite or native build) per machine, through `bg-heavy -- <command>`; workers run focused tests and the full suite runs once per candidate; overflow goes to qualified [cloud workers](../bg-continue-my-project/references/account-cloud-checklist.md).
8. **Smallest complete change, bounded repair.** Trace callers, fix the cause and reuse existing helpers and the standard library. Send consolidated repairs to the same owner, keep each finding's stable ID, and count rounds with `bg-rounds`: after 2 rounds with findings open, stop and report the IDs; round 3 needs the founder's approval.
9. **Evidence stays separate.** Select skills through [capability coverage](../bg-build-with-me/references/capability-coverage.md) and one bounded [selection](../bg-build-with-me/references/skill-selection.md). A body read, a discovered tool and a successful run each need their own evidence ([evidence gate](../bg-check-it-before-release/references/enforcement.md)). Output filters keep the original for exact diagnosis; never stack lossy compressors or replay a mutation for a log; installed never means a compaction ran. Keep the [checkpoint](../../templates/CHECKPOINT.md) to one page and move history to `ARCHIVE.md`.

## Receipts are printed, not typed

The model writes one pointer line in the handback, for example `Receipt: node tools/receipt/receipt.mjs <handback-or-dir>`, and the tool prints paths, sizes, line counts, SHA-256 hashes and totals. The model adds only what no tool can know (selection judgment, gaps, usage source); see the [receipt template](references/tool-harmony.md#templates).

## When goals conflict

| Conflict | Resolution |
|---|---|
| Brevity vs plain English and safety | Short complete sentences; safety detail, errors and confirmations stay in full. No fragment styles or hard output caps. |
| Low effort vs retries | A failed attempt costs more than the thinking saved: raise one level after a failure. |
| Compression vs exact evidence | One filter per output; keep the original; quote exact errors and numbers. |
| Cache vs switching models | Pick model and effort at session start; use other models through workers, not a mid-session switch. |
| Delegation vs re-reading | Each worker builds its own context: fan out only for genuinely parallel work, with path-based briefs. |

## Measure before claiming

Claim a saving only with a comparable measurement: the same kind of work, before and after, by accepted outcome. `node tools/usage/usage.mjs --since <ISO>` reports where tokens went (output split, top tool spenders, cache share, what woke each turn). A changed skill, this one included, goes live only after the skill gate (`node tools/skill-gate/skill-gate.mjs --run --previous <ref>`) shows it passes its eval cases at least as often as the previous release. Fewer output tokens alone never prove money or allowance saved.

## Red flags

| Thought | Required action |
|---|---|
| "Retry at low effort; it'll pass." | Raise one level, then retry. |
| "I'll resend the script with one change." | Edit the saved file; run it by path. |
| "This chat has the context; keep going." | Write the handoff and start fresh at the stage end. |
| "The map came back empty, so nothing calls it." | Search with `rg -n`, read the source, record the gap. |
| "I'll type out the hashes and counts." | Run the receipt tool; write one pointer line. |

Templates: the [worker packet](../bg-finish-the-whole-job/references/worker-packet.md) for plans, briefs and handbacks; the [swarm worked example](../bg-finish-the-whole-job/references/swarm-procedure.md#worked-example) applies this skill end to end.
