---
description: "Run one heavy command, such as a full test suite or a native build, at a time on this machine"
argument-hint: "[--label TEXT] -- <command> [args...] | status"
disable-model-invocation: true
---

Run BGZFLOW's `bg-heavy` tool with the arguments given, then show its output and exit code:

```sh
node "${CLAUDE_PLUGIN_ROOT}/tools/bg-heavy/bg-heavy.mjs" $ARGUMENTS
```

If the path above still starts with a dollar sign, use this plugin's install folder, the one that holds `commands/` and `tools/`. With no arguments, run it with `--help` first.
