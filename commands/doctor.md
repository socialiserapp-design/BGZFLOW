---
description: "Read-only checks for secrets inside URLs and for the context cost of enabled plugins"
argument-hint: "[<dir>] | urls [<dir>] | plugins [--usage]"
disable-model-invocation: true
---

Run BGZFLOW's `doctor` tool with the arguments given, then show its output and exit code:

```sh
node "${CLAUDE_PLUGIN_ROOT}/tools/doctor/doctor.mjs" $ARGUMENTS
```

If the path above still starts with a dollar sign, use this plugin's install folder, the one that holds `commands/` and `tools/`. With no arguments, run it with `--help` first.
