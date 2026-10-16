---
description: "Compile plain-English prompts into signed goal checklists, check STE plain English, and inspect or update .bgzflow/active-goal.json"
argument-hint: "<lock|compile|check-ste|status|set-wait|withdraw-item> [options]"
disable-model-invocation: true
---

Run BGZFLOW's `goal` tool with the arguments given, then show its output and exit code:

```sh
node "${CLAUDE_PLUGIN_ROOT}/tools/goal/goal.mjs" $ARGUMENTS
```

If the path above still starts with a dollar sign, use this plugin's install folder, the one that holds `commands/` and `tools/`. With no arguments, run it with `--help` first.
