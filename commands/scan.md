---
description: "Deterministic fake-effect, secret, SQL RLS and trust-baseline scanner (plus non-production two-customer probe check)"
argument-hint: "[<dir>] [--two-customer <probe.json>] [--json]"
disable-model-invocation: true
---

Run BGZFLOW's `scan` tool with the arguments given, then show its output and exit code:

```sh
node "${CLAUDE_PLUGIN_ROOT}/tools/scan/scan.mjs" $ARGUMENTS
```

If the path above still starts with a dollar sign, use this plugin's install folder, the one that holds `commands/` and `tools/`. With no arguments, run it with `--help` first.
