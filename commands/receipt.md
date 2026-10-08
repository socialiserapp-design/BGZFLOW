---
description: "Print paths, sizes, line counts and SHA-256 hashes for a handback, so nobody types them"
argument-hint: "<file-or-dir> [more...] [--json]"
disable-model-invocation: true
---

Run BGZFLOW's `receipt` tool with the arguments given, then show its output and exit code:

```sh
node "${CLAUDE_PLUGIN_ROOT}/tools/receipt/receipt.mjs" $ARGUMENTS
```

If the path above still starts with a dollar sign, use this plugin's install folder, the one that holds `commands/` and `tools/`. With no arguments, run it with `--help` first.
