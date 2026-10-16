# Lessons to rules

Record a problem once. Review it when the same key has two open lessons, or one lesson has `--severity high`. On due groups or weekly, follow the [review procedure](../../skills/bg-finish-the-whole-job/SKILL.md#lessons-to-rules). Promotions need builder edits, tests, one independent check and authorised release before closure; this tool only records outcomes, never edits or activates rules.

Run with Node 18 or newer, without installation:

```sh
node tools/bgz.mjs lessons add --project example --stage rehearsal --key stale-rehearsal-data --what "Rehearsal used yesterday's copy." --evidence proof/rehearsal.txt
node tools/bgz.mjs lessons add --project example --stage check --key repeat-break --what "Mail post failed in a sandbox." --system bg-mail --cause sandbox-write --release 0.6.0
node tools/bgz.mjs lessons list --open --key "stale-*"
node tools/bgz.mjs lessons due
node tools/bgz.mjs lessons due /projects/one /projects/two --json
node tools/bgz.mjs lessons review --key stale-rehearsal-data --outcome promoted --to tools/test/current-data.test.mjs
node tools/bgz.mjs lessons review --key obsolete-check --outcome dismissed --reason "Superseded by the current result check."
node tools/bgz.mjs lessons rework --since 2026-10-01
node tools/bgz.mjs lessons status
```

`bgz lessons` is shorthand for `node <plugin>/tools/bgz.mjs lessons`; the package also declares that Node entry as its `bgz` bin. Plugin installation does not promise a global shell command. The direct entry `node <plugin>/tools/lessons/lessons.mjs` accepts the same arguments after `lessons`. No network, dependencies or background process is used. The read-only SessionStart hook shows one due-count line for the current project; missing, malformed or larger-than-1-MB logs stay silent. Use the CLI to diagnose or review those histories.

Roots default to the current folder; `--root DIR` selects another. `add` accepts one root; `list`, `due`, `rework`, `review` and `status` accept multiple explicit roots and deduplicate canonical paths. They do not crawl folders. `--json` returns structured results. Exit 0 means success; 2 means invalid input or a storage error. Help lists every flag.

`list`, `due`, `rework` and `status` only read. They need no write permission, take no lock and do not use the owned-path check, so they work on a read-only root, a root on another drive or a root in a read-only sandbox. A missing `.bgzflow/lessons.jsonl` reads as no lessons. Their errors name the check that failed (`Lessons root does not exist`, `Lessons root is not a directory`, `Lessons root cannot be read`, `Lessons file is unreadable`) and never print a path or a stored value. `add` and `review` keep the owned-path and lock protection and still refuse linked storage. `list` prints id, date, project, stage, key, severity and status (`open`, `closed`, or `clean` for a `no-incident` record); `--open` keeps only open lessons and `--key` takes an exact key or a pattern with `*` (for example `stale-*`).

Storage follows the existing project convention: `<project>/.bgzflow/lessons.jsonl`. Keep it private and backed up with project state. Each lesson has `id`, ISO UTC `date`, `project`, `stage`, `what` (at most 200 characters), short kebab-case `key`, optional `evidence` and optional `severity` (`normal` or `high`) and optional incident fields `system`, `cause` (both short kebab-case) and `release` (a version or short commit such as `0.6.0`; a full 40-character hash is refused by the credential screen). Records written before these fields existed load unchanged. A `no-incident` record cannot carry them. IDs and dates are generated unless supplied; supplied dates use `YYYY-MM-DDTHH:mm:ss.sssZ`. Duplicate IDs are rejected so an uncertain add can be reconciled before retrying. Use non-secret project aliases and evidence references. Credential-shaped inputs are rejected without echoing them; heuristic screening cannot identify every secret, so never supply credentials or signed URLs.

Every finish report appends its 1–2 line "What went wrong" as one short line per problem. For a clean result, append `--what nothing --key no-incident`; those records count in totals but never become open lessons. Reuse an existing pattern key where appropriate. Grouping is deterministic and exact-key only; the lead handles semantic duplicates with recorded reasons, never by rewriting history.

Reviews append a `type: review` event with its own ID/date, key, outcome, destination/reason and the IDs it closes in each root. `promoted` requires `--to`; `dismissed` requires `--reason` and may also record `--to`. Closed occurrences never resurface. New occurrences remain open and can trigger another review. Repeating a review with no new open occurrences appends nothing. Multi-root review is not a cross-folder transaction: after interruption, inspect status and retry the same roots/outcome; already closed IDs stay closed. Writers use the existing owned-path and lock helpers; linked storage and malformed history are refused without overwriting it.

`rework` counts repeat fixes. It looks at every incident (a lesson that is not `no-incident`, optionally from `--since` a `YYYY-MM-DD` or full ISO date) and groups those that name both a `system` and a `cause`. A system and cause recorded two or more times is rework. The output gives each group's count, dates and releases, then `Repeat fixes: R of C classified incidents`, where R is the number of later occurrences in repeated groups and C the incidents that name a system and a cause. Incidents missing either field are counted separately and never grouped, so they cannot pose as repeats. Closing a lesson with `review` does not remove it from the count. The last line always says that deploy frequency, change failure rate and time to restore are not computed, because they need deploy and restore records this tool does not have; `--json` returns the same list in `notComputed` and no numbers for them.

The fixture `test/fixtures/failures.jsonl` contains five generic failure scenarios dated 5 October, plus one explicitly synthetic recurrence. The high-severity UI tag is a test classification. Seed an isolated project's `.bgzflow/lessons.jsonl` with this file to see two due groups. Do not use it as live incident evidence.
