---
description: "Check the start-up reading budget, the checkpoint and the owners block"
argument-hint: "[<project-dir>] [--json] [--budget <words>]"
disable-model-invocation: true
---

Run BGZFLOW's `startup-check` tool with the arguments given, then show its output and exit code:

```sh
node "${CLAUDE_PLUGIN_ROOT}/tools/startup-check/startup-check.mjs" $ARGUMENTS
```

If the path above still starts with a dollar sign, use this plugin's install folder, the one that holds `commands/` and `tools/`. With no arguments, run it with `--help` first.
