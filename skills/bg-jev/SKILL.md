---
name: bg-jev
description: Use before dispatching, routing, reading files, checking a build or judging a worker: ask Jev (a fast, cheap judge) one scored question instead of reasoning it out; recipes for test failures, diff risk, skills, grades and unasked changes.
---

# BG Jev

Jev answers many small questions about a situation in about one second for a fraction of a cent. Use it for judgements; code keeps every limit and every weight. Run `node "${CLAUDE_PLUGIN_ROOT}/tools/bgz.mjs" jev <command>` (`bgz jev` where installed). No key, or any error, prints `{"ok":false}`: carry on with the main model once. Never print the key. Calls are logged (ids and answers only) to `~/.bgzflow/jev-ledger.jsonl`.

## Ten rules (from Simeon Kontogeorges, MIT)
1. Ask about a situation, never for an essay. 2. Fan many questions into one call. 3. Use the confidence, not just the answer. 4. Put weights and thresholds in code. 5. Describe each score level as a situation. 6. Give it the real state, not your summary. 7. Fail open: a Jev error never blocks work. 8. Let Jev guard actions (hooks) and read files (`jev file`). 9. Let it open files and run one gated command (`jev ask --cmd`). 10. Keep a ledger and grade the results.

## Question types
- **noul**: yes/no with a probability. **choice**: one of named options. **score**: a level from `--levels "l0|l1|l2"`, each level a described situation.

## Confidence
Below 0.5: send to the lead or a person. 0.9 or above: act. In between: confirm with one cheap check. These bands are in code (`bgz jev` prints `band`).

## Everyday commands
- `jev score --preset goal-clarity --state @brief.md`: weighted clarity of a goal before building (`outcome` 0.35, `constraints` 0.25, `verification` 0.25, `authority` 0.15). Interrogate the user on `missing_dimensions` until `value >= 0.88` (`ready_to_execute: true`), then stop asking and build.
- `jev score --preset diff-risk --diff <ref>`: weighted risk of a diff (money/data 0.35, security 0.25, customer stop 0.2, scope 0.1, proof 0.1).
- `jev route --job @brief.md`: one choice before dispatch. Pick a role from STATUS section 1, then a model and effort score; code still applies STATUS allowance and job limits.
- `jev file <path> --q "..."` / `jev files <globs> --q "..."`: ask a file, never open it. Skips node_modules, .git, binaries, files over 200 KB; at most 255 files.
- `jev skills --brief brief.md --write`: liberal list of skills (keeps score 0.35 or more, anything the brief names, the BG skills for the stage) written into the brief as "Skills to load".
- `jev grade <output> --brief <brief> --role <role> --worker <model/tool>`: rubric score (met checks with evidence, stayed in scope, claims backed by proof, cost). Run it on every finished job. `jev league` shows the average by role and worker; reorder STATUS fallbacks from it.
- `jev arch --base <ref>`: logic and architecture leads per file and for the whole diff. `jev unasked --base <ref> --asks DECISIONS.md,brief.md`: changes nobody asked for (customer stops, new rules). Leads for the lead and the reviewer, not verdicts. Run both when a builder finishes.
- `jev plan --plan <plan file> --asks DECISIONS.md,brief.md`: the same unasked check on a plan, before the first dispatch, so an extra is caught while it is still one line of text. Advice for the handback only: it never blocks dispatch and adds no review round. No asks text, or any Jev error, prints `{"ok":false}`: carry on once without it.

## Recipes (level 10)
- **Test failure type**: `jev ask --cmd "npm test" --q "Is this failure flaky, real or environment?" --type choice --options flaky,real,environment`. Real: fix. Flaky: rerun once. Environment: report the missing piece.
- **Risk before the paid review**: `jev score --preset diff-risk --diff <base>`. High: look at the named parts first.
- **Do the fix's tests pass**: `jev ask --cmd "<the test command>" --q "Did every test pass and did none get skipped or deleted?"`. Confirm with the exit code too.

## Guards (hooks)
Gates judge risky Bash, Write/Edit content with credentials and injected text in tool output; block only at 0.9 or more and only for irreversible or protected targets. `BGZFLOW_JEV_GATES=off` turns all of it off. A blocked command says "blocked: final; ask the lead, rule 8".

## Fixed test set
`jev bench` runs frozen job cards. Only before promoting a skill or changing which model fills a role; never routinely.
