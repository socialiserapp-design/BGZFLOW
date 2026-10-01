---
description: "Record and verify a non-secret proof of the account that actually ran a job"
argument-hint: "<record|verify> --job ID --provider NAME --account ALIAS"
disable-model-invocation: true
---

Run BGZFLOW's `bg-route` tool with the arguments given, then show its output and exit code:

```sh
node "${CLAUDE_PLUGIN_ROOT}/tools/bg-route/bg-route.mjs" $ARGUMENTS
```

If the path above still starts with a dollar sign, use this plugin's install folder, the one that holds `commands/` and `tools/`. With no arguments, run it with `--help` first.
