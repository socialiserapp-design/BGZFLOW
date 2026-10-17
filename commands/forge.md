---
description: "Validate skill harmony and bridge to the Lucian Deep-Source Skill Forge and Clean-Room REA pipeline"
argument-hint: "[--name <slug>] [--from-rea|--from-book|--from-video|--from-paper|--from-teardown|--from-source <target>] [--check-harmony <file>]"
disable-model-invocation: true
---

Run BGZFLOW's `forge` tool with the arguments given, then show its output and exit code:

```sh
node "${CLAUDE_PLUGIN_ROOT}/tools/forge/forge.mjs" $ARGUMENTS
```

If the path above still starts with a dollar sign, use this plugin's install folder, the one that holds `commands/` and `tools/`. With no arguments, run it with `--help` first.
