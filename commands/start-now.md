---
description: "List work-graph tasks that are planned or ready and whose dependencies are done"
argument-hint: "[<project-dir>] [--graph <file>] [--json]"
disable-model-invocation: true
---

Run BGZFLOW's `start-now` tool with the arguments given, then show its output and exit code:

```sh
node "${CLAUDE_PLUGIN_ROOT}/tools/start-now/start-now.mjs" $ARGUMENTS
```

If the path above still starts with a dollar sign, use this plugin's install folder, the one that holds `commands/` and `tools/`. With no arguments, run it with `--help` first.
