---
description: "Ask Jev, the fast cheap judge: file questions, routing, skill picks, guardrail scores and worker grades"
argument-hint: "<ask|file|files|score|route|skills|arch|unasked|grade|league|outcomes|improve|bench|regress> [options]"
disable-model-invocation: true
---

Run BGZFLOW's `jev` tool with the arguments given, then show its output and exit code:

```sh
node "${CLAUDE_PLUGIN_ROOT}/tools/jev/jev.mjs" $ARGUMENTS
```

Same as `bgz jev`. A failed or missing Jev prints {"ok":false,...} and exits 1; fall back to the main model once. The key is read from TYPESAFE_API_KEY or ~/.typesafe_key and is never printed. With no arguments, run it with `--help` first.
