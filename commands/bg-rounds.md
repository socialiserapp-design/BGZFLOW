---
description: "Keep the repair-round ledger; a third round needs recorded approval"
argument-hint: "<open|close|next|status> <package> [finding-id...]"
disable-model-invocation: true
---

Run BGZFLOW's `bg-rounds` tool with the arguments given, then show its output and exit code:

```sh
node "${CLAUDE_PLUGIN_ROOT}/tools/bg-rounds/bg-rounds.mjs" $ARGUMENTS
```

If the path above still starts with a dollar sign, use this plugin's install folder, the one that holds `commands/` and `tools/`. With no arguments, run it with `--help` first.
