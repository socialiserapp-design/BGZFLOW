---
description: "Compile, validate, and run Google Graph Engineering execution graphs, 2-failure circuit breakers, and Context Graph precedents"
argument-hint: "<compile|validate|transition|assess|context|precedent|advisory|stages> [options]"
disable-model-invocation: true
---

Run BGZFLOW's `graph` tool with the arguments given, then show its output and exit code:

```sh
node "${CLAUDE_PLUGIN_ROOT}/tools/graph/graph.mjs" $ARGUMENTS
```

If the path above still starts with a dollar sign, use this plugin's install folder, the one that holds `commands/` and `tools/`. With no arguments, run it with `--help` first.
