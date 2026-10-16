---
description: "Exchange durable questions, acknowledgments, actions and replies between leads and workers without ending a job"
argument-hint: "<post|ack|act|reply|get|wait|list|watch|collect> --project ID ..."
disable-model-invocation: true
---

Run BGZFLOW's `bg-mail` tool with the arguments given, then show its output and exit code:

```sh
node "${CLAUDE_PLUGIN_ROOT}/tools/bg-mail/bg-mail.mjs" $ARGUMENTS
```

If the path above still starts with a dollar sign, use this plugin's install folder, the one that holds `commands/` and `tools/`. With no arguments, run it with `--help` first.
