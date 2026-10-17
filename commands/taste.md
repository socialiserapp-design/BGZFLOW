---
description: "Enforce LOCKED_IDENTITY protection on existing projects, run deterministic anti-slop UI checks, and bridge to the Lucian cross-project taste engine"
argument-hint: "<status|lock|unlock|verify-round|anti-slop> [options]"
disable-model-invocation: true
---

Run BGZFLOW's `taste` tool with the arguments given, then show its output and exit code:

```sh
node "${CLAUDE_PLUGIN_ROOT}/tools/taste/taste.mjs" $ARGUMENTS
```

If the path above still starts with a dollar sign, use this plugin's install folder, the one that holds `commands/` and `tools/`. With no arguments, run it with `--help` first.
