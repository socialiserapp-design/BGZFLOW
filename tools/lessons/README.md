# Lessons to rules

Record a problem once. Review it when the same key has two open lessons, or one lesson has `--severity high`. On due groups or weekly, follow the [review procedure](../../skills/bg-finish-the-whole-job/SKILL.md#lessons-to-rules). Promotions need builder edits, tests, one independent check and authorised release before closure; this tool only records outcomes, never edits or activates rules.

Run with Node 18 or newer, without installation:

```sh
node tools/bgz.mjs lessons add --project example --stage rehearsal --key stale-rehearsal-data --what "Rehearsal used yesterday's copy." --evidence proof/rehearsal.txt
node tools/bgz.mjs lessons due
node tools/bgz.mjs lessons due /projects/one /projects/two --json
node tools/bgz.mjs lessons review --key stale-rehearsal-data --outcome promoted --to tools/test/current-data.test.mjs
node tools/bgz.mjs lessons review --key obsolete-check --outcome dismissed --reason "Superseded by the current result check."
node tools/bgz.mjs lessons status
```

`bgz lessons` is shorthand for `node <plugin>/tools/bgz.mjs lessons`; the package also declares that Node entry as its `bgz` bin. Plugin installation does not promise a global shell command. The direct entry `node <plugin>/tools/lessons/lessons.mjs` accepts the same arguments after `lessons`. No network, dependencies or background process is used. The read-only SessionStart hook shows one due-count line for the current project; missing, malformed or larger-than-1-MB logs stay silent. Use the CLI to diagnose or review those histories.

Roots default to the current folder; `--root DIR` selects another. `add` accepts one root; `due`, `review` and `status` accept multiple explicit roots and deduplicate canonical paths. They do not crawl folders. `--json` returns structured results. Exit 0 means success; 2 means invalid input or a storage error. Help lists every flag.

Storage follows the existing project convention: `<project>/.bgzflow/lessons.jsonl`. Keep it private and backed up with project state. Each lesson has `id`, ISO UTC `date`, `project`, `stage`, `what` (at most 200 characters), short kebab-case `key`, optional `evidence` and optional `severity` (`normal` or `high`). IDs and dates are generated unless supplied; supplied dates use `YYYY-MM-DDTHH:mm:ss.sssZ`. Duplicate IDs are rejected so an uncertain add can be reconciled before retrying. Use non-secret project aliases and evidence references. Credential-shaped inputs are rejected without echoing them; heuristic screening cannot identify every secret, so never supply credentials or signed URLs.

Every finish report appends its 1–2 line "What went wrong" as one short line per problem. For a clean result, append `--what nothing --key no-incident`; those records count in totals but never become open lessons. Reuse an existing pattern key where appropriate. Grouping is deterministic and exact-key only; the lead handles semantic duplicates with recorded reasons, never by rewriting history.

Reviews append a `type: review` event with its own ID/date, key, outcome, destination/reason and the IDs it closes in each root. `promoted` requires `--to`; `dismissed` requires `--reason` and may also record `--to`. Closed occurrences never resurface. New occurrences remain open and can trigger another review. Repeating a review with no new open occurrences appends nothing. Multi-root review is not a cross-folder transaction: after interruption, inspect status and retry the same roots/outcome; already closed IDs stay closed. Writers use the existing owned-path and lock helpers; linked storage and malformed history are refused without overwriting it.

The fixture `test/fixtures/failures.jsonl` contains five generic failure scenarios dated 5 October, plus one explicitly synthetic recurrence. The high-severity UI tag is a test classification. Seed an isolated project's `.bgzflow/lessons.jsonl` with this file to see two due groups. Do not use it as live incident evidence.
