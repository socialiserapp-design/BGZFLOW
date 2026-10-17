---
description: "Keep per-project facts and search them with SQLite FTS5 BM25 ranking and 90-day recency decay"
argument-hint: "<for|search|add|accept|list> [options]"
disable-model-invocation: true
---

Run BGZFLOW's `facts` tool with the arguments given, then show its output and exit code:

```sh
node "${CLAUDE_PLUGIN_ROOT}/tools/facts/facts.mjs" $ARGUMENTS
```

If the path above still starts with a dollar sign, use this plugin's install folder, the one that holds `commands/` and `tools/`. With no arguments, run it with `--help` first.
