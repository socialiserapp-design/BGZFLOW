---
description: "Detect the project's build, test and lint commands and save them in .bgzflow/project.json"
argument-hint: "[<project-dir>] [--json] [--dry]"
disable-model-invocation: true
---

Run BGZFLOW's `project-setup` tool with the arguments given, then show its output and exit code:

```sh
node "${CLAUDE_PLUGIN_ROOT}/tools/project-setup/project-setup.mjs" $ARGUMENTS
```

If the path above still starts with a dollar sign, use this plugin's install folder, the one that holds `commands/` and `tools/`. With no arguments, run it with `--help` first.
