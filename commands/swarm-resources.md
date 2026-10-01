---
description: "Inspect installed and proven worker routes, save explicit approval or dated qualification"
argument-hint: "[--json] [--swarm <id>] [--approve <ids> | --save-proven <proof.json> | --observe <nonsecret-status.json> | --refresh-models --policy <private-policy.json>]"
disable-model-invocation: true
---

Run BGZFLOW's `swarm-resources` tool with the arguments given, then show its output and exit code:

```sh
node "${CLAUDE_PLUGIN_ROOT}/tools/swarm-resources/swarm-resources.mjs" $ARGUMENTS
```

If the path above still starts with a dollar sign, use this plugin's install folder, the one that holds `commands/` and `tools/`. With no arguments, run it with `--help` first.
