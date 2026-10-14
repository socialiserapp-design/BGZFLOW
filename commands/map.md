---
description: "Show the one system map: repos, worktrees, services, deployments and each task's change by stage; the owner records changes and confirms live deployments"
argument-hint: "[<dir>] [--brief] [--json] | record <task-id> ... --as <role> | live <deployment> --evidence <text> --as <role>"
disable-model-invocation: true
---

Run BGZFLOW's `map` tool with the arguments given, then show its output and exit code:

```sh
node "${CLAUDE_PLUGIN_ROOT}/tools/map/map.mjs" $ARGUMENTS
```

If the path above still starts with a dollar sign, use this plugin's install folder, the one that holds `commands/` and `tools/`. With no arguments, run it with `--help` first.
