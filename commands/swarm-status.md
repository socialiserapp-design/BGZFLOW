---
description: "Show swarm job activity, uncertainty, duplicates, route mismatches and recent results"
argument-hint: "[project] [--hours <number>] [--json]"
disable-model-invocation: true
---

Read `${CLAUDE_PLUGIN_ROOT}/skills/bg-finish-the-whole-job/references/swarm-rules.md` and load `${CLAUDE_PLUGIN_ROOT}/skills/bg-efficiency/SKILL.md`. This command is read-only and needs no resource approval. Run the tool with the arguments given:

```sh
node "${CLAUDE_PLUGIN_ROOT}/tools/swarm-status/swarm-status.mjs" $ARGUMENTS
```

If `${CLAUDE_PLUGIN_ROOT}` remains literal, use the installed plugin folder containing `commands/` and `tools/`. With no arguments, show all projects.

Also run `node "${CLAUDE_PLUGIN_ROOT}/tools/swarm-gate/swarm-gate.mjs" status` in the current project. Report limit used/reserved, blocked steps and reasons, fix-wave count and whether release is open. Include tier-map age/version, proposals/auto-adoption, escalated job/hour usage separately, Jev's actual reported usage/cost and recent fallback warnings. Status makes no Jev call. Keep completed/failed/cancelled results and record pointers. Age and PID presence never prove job ownership. Only the owning lead may cancel its own jobs after reconciliation. Preserve original outputs; never rerun a job to recover filtered evidence.
