---
description: "Check that each changed skill passes its eval cases at least as often as the previous release"
argument-hint: "--run --previous <git-ref-or-folder> [--skill <name>] [--runs N] | --skill <name> --candidate <result.json> --previous <result.json>"
disable-model-invocation: true
---

Run BGZFLOW's `skill-gate` tool with the arguments given, then show its output and exit code:

```sh
node "${CLAUDE_PLUGIN_ROOT}/tools/skill-gate/skill-gate.mjs" $ARGUMENTS
```

Read `docs/SKILL-TESTS.md` first. `--run` calls the model and uses account allowance; the saved-results form does not. A partial run or a usage-limit hit is a fail to rerun, never a regression. With no arguments, run it with `--help` first.
