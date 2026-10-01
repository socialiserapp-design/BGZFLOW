---
description: "Map a notes folder, then read only the lines a question needs"
argument-hint: "<build|ask|show> ..."
disable-model-invocation: true
---

Run BGZFLOW's `notes-map` tool with the arguments given, then show its output and exit code:

```sh
node "${CLAUDE_PLUGIN_ROOT}/tools/notes-map/notes-map.mjs" $ARGUMENTS
```

If the path above still starts with a dollar sign, use this plugin's install folder, the one that holds `commands/` and `tools/`. With no arguments, run it with `--help` first.
