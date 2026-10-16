---
description: "Prepare a neutral verifier review packet from raw git diff, DECISIONS.md, BRIEF.md and machine receipts with builder prose stripped"
argument-hint: "[<dir>] [--base <ref>] [--head <ref>] [--handback <file.json>] [--out <file.json>]"
disable-model-invocation: true
---

Run BGZFLOW's `review-pack` tool with the arguments given, then show its output and exit code:

```sh
node "${CLAUDE_PLUGIN_ROOT}/tools/review-pack/review-pack.mjs" $ARGUMENTS
```

If the path above still starts with a dollar sign, use this plugin's install folder, the one that holds `commands/` and `tools/`. With no arguments, run it with `--help` first.
