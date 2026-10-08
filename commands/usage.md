---
description: "Read-only report of where tokens went in local transcripts: thinking, tool input, replies, cache and wake-ups"
argument-hint: "[--since ISO] [--until ISO] [--root dir] [--codex dir | --no-codex] [--json]"
disable-model-invocation: true
---

Run BGZFLOW's `usage` tool with the arguments given, then show its output and exit code:

```sh
node "${CLAUDE_PLUGIN_ROOT}/tools/usage/usage.mjs" $ARGUMENTS
```

If the path above still starts with a dollar sign, use this plugin's install folder, the one that holds `commands/` and `tools/`. With no arguments, run it with `--help` first.
