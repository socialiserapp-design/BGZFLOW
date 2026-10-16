---
description: "Verify an outcome contract on a real surface (including Multimodal Jev 1.14 screenshot/box QA) with served buildSha, backendVersion, verifier !== builder and effect read-back"
argument-hint: "<outcome.json | --json-text JSON | --visual --screenshot FILE> [--project <dir>] [--record]"
disable-model-invocation: true
---

Run BGZFLOW's `verify` tool with the arguments given, then show its output and exit code:

```sh
node "${CLAUDE_PLUGIN_ROOT}/tools/verify/verify.mjs" $ARGUMENTS
```

If the path above still starts with a dollar sign, use this plugin's install folder, the one that holds `commands/` and `tools/`. With no arguments, run it with `--help` first.
