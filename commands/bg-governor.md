---
description: "Guard disk, heavy processes, build concurrency and unsafe bulk thread archives"
argument-hint: "<disk|build-slots|archive-check|queued|reap> ..."
disable-model-invocation: true
---

Run BGZFLOW's `bg-governor` tool with the arguments given, then show its output and exit code:

```sh
node "${CLAUDE_PLUGIN_ROOT}/tools/bg-governor/bg-governor.mjs" $ARGUMENTS
```

If the path above still starts with a dollar sign, use this plugin's install folder, the one that holds `commands/` and `tools/`. With no arguments, run it with `--help` first.
