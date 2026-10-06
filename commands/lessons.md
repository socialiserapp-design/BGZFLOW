---
description: "Record lessons and review repeated patterns through the normal change path"
argument-hint: "<add|due|review|status> [roots...] [options]"
disable-model-invocation: true
---

Run BGZFLOW's `lessons` tool with the arguments given, then show its output and exit code:

```sh
node "${CLAUDE_PLUGIN_ROOT}/tools/lessons/lessons.mjs" $ARGUMENTS
```

If the path above still starts with a dollar sign, use this plugin's install folder, the one that holds `commands/` and `tools/`. With no arguments, run it with `--help` first.
