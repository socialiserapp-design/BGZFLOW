---
description: "Enforce the active swarm's resources, usage, ownership, retry, check and release rules"
argument-hint: "start|refresh-models|dispatch|record|check-dispatch|check-suite|check-journey|check-rehearsal|check-review|check-release|status|presets"
disable-model-invocation: true
---

Run BGZFLOW's `swarm-gate` tool with the arguments given, then show its output and exit code:

```sh
node "${CLAUDE_PLUGIN_ROOT}/tools/swarm-gate/swarm-gate.mjs" $ARGUMENTS
```

Read `docs/swarm-gate.md` for the ledger and CLI contracts. Blocks go to the lead with one next step. Non-Claude leads must reserve every dispatch with this CLI and run check-release before any named production release.

Use `refresh-models` after phase-0 approval/start, `record qualification` for asynchronous exact-flags returns and `record piece` with a structured handback for admission. Jev is optional in private policy; status retains reported usage and warnings. Code decides exact rules. Use a stable releaseId, record rehearsal golden journeys/rollback against the SHA, and allow one read-only review per release, never repairs. No ready verdict is needed. UI changes require the founder final device design-match result.
