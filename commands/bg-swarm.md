---
description: "Launch, list, stop and clean up local background workers"
argument-hint: "<launch|status|stop|reap> [options]"
disable-model-invocation: true
---

Run BGZFLOW's `bg-swarm` tool with the arguments given, then show its output and exit code:

```sh
node "${CLAUDE_PLUGIN_ROOT}/tools/bg-swarm/bg-swarm.mjs" $ARGUMENTS
```

If the path above still starts with a dollar sign, use this plugin's install folder, the one that holds `commands/` and `tools/`. With no arguments, run it with `--help` first.
