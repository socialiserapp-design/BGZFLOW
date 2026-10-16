# Skill tests and the skill gate

Every BGZFLOW skill carries its own eval cases. A changed skill goes live only if the skill gate passes: the new version must pass its cases at least as often as the version it replaces, and must never make a trigger case worse than having no plugin at all.

## The two rules

1. **A changed skill goes live only if the gate passes.** Run the gate for every skill whose `SKILL.md` or references changed, against the version that is live now. A failing gate holds that skill's change; other skills that pass can still ship.
2. **Every real failure becomes a test first.** When a skill leads an agent wrong in real work, write a case that reproduces it before changing the skill. Run it on the current version and confirm it fails; then fix the skill and confirm it passes. A case that never failed proves nothing about the fix.

## Where the cases live

```text
skills/<skill>/evals/<case>/
├── case.yaml       # the prompt, run limits and graders
└── scaffold.sh     # optional: builds files in the empty workspace before the run
```

Cases use the `claude plugin eval` case format ([official docs](https://code.claude.com/docs/en/plugin-evals)). Each case runs in a fresh, empty, isolated session with only the plugin loaded, three times by default, and again with no plugin (the baseline arm). `claude plugin eval` will not read an eval folder inside `skills/`, so the gate stages a copy of the plugin with one skill's cases moved to a top-level `evals/` folder. Never point `claude plugin eval` at `skills/<skill>/evals` directly.

Name cases by kind:

- **Behaviour cases** (`<prefix>-<what>`) check what the agent does. Tag them `quality`, `efficiency` or both. Give each one grader on the result (the reply or a file) and, where it matters, one on the steps (`tool_used`, `tool_order`). Every behaviour case also carries a `skill-fired` indicator, which is reported but not scored.
- **Trigger cases** (`trigger-<what>`) check when the skill fires. A should-fire case (tag `trigger-should-fire`) has one `tool_used: Skill` grader. A should-not-fire case (tag `trigger-should-not-fire`) uses `min: 0`, `max: 0` and `arm: both`, so it is scored against the no-plugin baseline too. The gate treats every case whose name starts with `trigger-` as a trigger case.

## Add a case

1. Copy a sibling case folder and rename the folder; set `name:` to the same text.
2. Write the prompt the way a person would type it, without naming the skill. Put every fact the task needs in the prompt, or create files with `scaffold.sh` (POSIX shell, `set -eu`).
3. Prefer free graders: `regex` over the reply or a file, `tool_used`, `tool_order`, `file_exists`. Use an `llm` grader only for short replies, written as concrete PASS and FAIL conditions.
4. Keep cases public-safe: generic names ("the founder", "a project"), no real people, projects, paths, accounts or secrets.
5. Check that every case still loads, at no cost: run the gate's stand-in test (`node --test tools/skill-gate/skill-gate.test.mjs`), then load the staged suite with a zero cost ceiling, which parses every case and starts no run (`claude plugin eval <staged-copy> --max-cost-usd 0 --trust-plugin`).

Useful patterns from the existing cases:

| Check | Grader |
|---|---|
| Reply has at most N non-blank lines | `regex`, `match: not_contains`, pattern `^\s*(?:\S.*(?:\n\s*)+){N}\S` |
| A file was written once, not retyped | `tool_used`, `tool: Write`, `input_match: '\.sql"'`, `min: 1`, `max: 1` |
| A large file was searched, not read whole | `tool_used`, `tool: Read`, `input_match: '^(?!.*"(?:limit\|offset)").*name\.log'`, `max: 0`, `arm: both` |
| Code or SQL was not echoed into chat | `regex` on `last_message`, `match: not_contains` |

## Run the gate

Live run, comparing the working copy with the previous release (a git ref or a folder holding the old plugin):

```sh
node tools/skill-gate/skill-gate.mjs --run --previous <git-ref-or-folder> [--skill bg-efficiency] [--runs 3]
```

Without `--skill` it gates every skill that has an `evals/` folder. For each skill it stages both plugin copies outside the repository, runs `claude plugin eval` on each with the baseline arm on, and writes a JSON report per skill into the work folder it prints. Each run is a real model call on your account: cases × runs × 2 arms × 2 sides, plus judge calls for `llm` graders. Use `--max-cost-usd`, `--runs 1` or `--skill` to bound it. By default it grants `Write` and `Edit` (`--allow-tools` changes that) and runs scaffold scripts (`--no-scaffold` skips them; the cases that need one then fail on both sides equally). It passes `--trust-plugin`, so only gate plugin versions you would run yourself. Cases do not use `Bash`, because shell tools need an OS sandbox that native Windows lacks; use WSL2 for any future case that does.

Offline, on saved results (`aggregate-result.json` or `--json` output from `claude plugin eval`):

```sh
node tools/skill-gate/skill-gate.mjs --skill bg-efficiency --candidate new.json --previous old.json [--none base.json] [--out report.json]
```

The verdict is one short paragraph, for example:

```text
PASS bg-efficiency: candidate passed 8/12 cases (67%), previous 6/12 (50%).
  output tokens per case: candidate 1,240, previous 2,310 (-46%), no plugin 1,900.
```

Exit 0 means pass, 1 means fail (or a run could not finish), 2 means bad usage.

## How the gate decides

- A case passes when its score (mean over runs of the share of graders passed) reaches `--threshold`, 1.0 by default, as in `claude plugin eval`.
- **Pass:** the candidate's pass rate is at least the previous version's on the same cases, and on every trigger case the candidate scores at least the no-plugin baseline. The baseline comes from the candidate run's no-plugin arm unless `--none` names another result.
- **Inconclusive, so fail:** a run that stopped early (`partial`), a run that hit a usage or rate limit, judge graders skipped by a cost ceiling, or cases missing from one side. Rerun rather than read these as regressions.
- **Notes, not blocks:** a case that passed before and fails now, or a trigger case that fires less reliably than before. Read them before shipping.
- **Output tokens** per case are reported when the results carry per-run usage. The result schema does not document a usage field yet (unverified), so the gate reads `usage.output_tokens`, `usage.outputTokens` or `outputTokens` when present and says "not in these results" otherwise. A token saving is never a reason to accept a lower pass rate.
