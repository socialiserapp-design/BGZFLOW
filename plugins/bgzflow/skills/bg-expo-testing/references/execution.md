# Execute, reconcile and inspect evidence

Use the project's qualified EAS CLI and selected controller. Confirm current `--help` for commands that have changed or are unfamiliar. The examples below use `eas`; an installed binary or an explicitly selected npm version can supply it. Keep shell-specific syntax in the appropriate shell. Never interpolate untrusted issue/flow content into shell commands.

## Workflow path

From the actual app root, with existing authorised credentials:

```sh
eas workflow:validate .eas/workflows/qa-swarm.yml --non-interactive
eas workflow:run .eas/workflows/qa-swarm.yml --ref <candidate-ref> --json --non-interactive
eas workflow:status <workflow-run-id> --json --non-interactive
eas workflow:view <workflow-run-id> --json --non-interactive
eas workflow:logs <workflow-run-or-job-id> --json --non-interactive
```

Select the workflow appropriate to the task. `--ref` identifies repository code; omitting it can upload local project contents. Record which candidate was actually submitted, including relevant local changes. A Git revision label alone cannot establish what a local upload contained.

Retain the returned run identity before doing more work. Follow the original run through completion using supported waiting/status capabilities with a bounded cadence or event notifications. A failed/cancelled workflow can return useful status JSON with a nonzero exit; inspect the result before treating it as a transport failure. Do not relaunch because a wait expired or the host disconnected.

If the initial response is lost, inspect existing project runs and request evidence to reconcile the original start. If its outcome cannot be determined, hold only the duplicate-start decision and report the uncertainty. Restarting a paid workflow can repeat every external action in its lanes.

For an authorised cancellation, target the exact owned run:

```sh
eas workflow:cancel <workflow-run-id> --non-interactive
```

Verify cancellation and any remaining sessions; never cancel unrelated project jobs. A dashboard rerun may create a new run and reuse some results. Inspect which jobs will execute and whether old evidence still matches the candidate, fixtures and environment.

## Direct-device path

Use the official simulator skill for availability, start and controller setup. Capture the returned session ID privately; then query readiness. The current start result does not itself include a ready status.

```sh
eas simulator:availability --json
eas simulator:get --id <session-id> --json --non-interactive
```

Only interact when the session is ready. Use the chosen controller's actual supported commands; agent-device commands can run through `eas simulator:exec`, while Argent uses its documented remote setup. Inspect fresh semantic targets after screen changes. For currently available native `simulator:control` operations, consult CLI help rather than assuming parity with another controller.

Each concurrent lane needs its own session configuration and workspace. Never overwrite another run's session file or share one device between independent drivers. Select safe metadata fields; full simulator JSON and session configuration can contain access capabilities.

When the owned session is no longer needed:

```sh
eas simulator:stop --id <session-id> --json --non-interactive
eas simulator:get --id <session-id> --json --non-interactive
```

Confirm a terminal state and retain any errors. Do not infer cleanup from a swallowed stop error or a collector's successful exit. If a user explicitly requested a continuing preview, preserve it under that request and report its service-controlled lifetime.

## Evidence assessment

Inspect every required lane, not only the final report job. Check candidate/build, platform, flow version, initial state, start/finish status, process result and meaningful per-step observations. Confirm screenshots/recordings are readable and match the app and state claimed. Read back the authoritative effect separately where needed.

Keep these distinctions in the project record:
- **Observed pass:** the scoped expectation is supported by actual observations and required effect checks.
- **Observed failure:** a reproducible expectation failed on the identified candidate and conditions.
- **Unverified/incomplete:** missing lane, skipped check, unavailable device/service, timeout, contradictory report, stale evidence or incomplete run.

A simulator or workflow status describes execution, not product correctness. An agent report is an assertion to assess. Neither a report file nor an arbitrary number of screenshots proves complete coverage. A confident PASS must not override contradictory logs or observations.

For a defect, keep steps, expected/actual outcome, conditions, evidence and scope. Distinguish a faulty flow or fixture from an app defect. Repair only within authority; preserve the original failure and recheck affected behaviour. Repeated runs should test a hypothesis, not hide flakiness.

Store evidence through the approved private route. Avoid publishing session links, signed artifact download URLs, tokens, personal data or unredacted agent logs. Report useful outcomes and access-controlled evidence references to the owner.

## Current contracts and their limits

The researched CLI uses simulator states `NEW`, `QUEUED`, `STARTING`, `IN_PROGRESS`, `STOPPED`, `ERRORED`; the last two are terminal, and only `IN_PROGRESS` denotes a running device. Workflow terminal states are `SUCCESS`, `FAILURE`, `CANCELED`; jobs can also be `SKIPPED` or pending cancellation. Reconfirm these contracts if writing automation against a different version. Treat unknown states as unknown, not success.

Primary implementation references: [simulator start](https://github.com/expo/eas-cli/blob/main/packages/eas-cli/src/commands/simulator/index.ts), [get](https://github.com/expo/eas-cli/blob/main/packages/eas-cli/src/commands/simulator/get.ts), [stop](https://github.com/expo/eas-cli/blob/main/packages/eas-cli/src/commands/simulator/stop.ts), [workflow status](https://github.com/expo/eas-cli/blob/main/packages/eas-cli/src/commands/workflow/status.ts), [view](https://github.com/expo/eas-cli/blob/main/packages/eas-cli/src/commands/workflow/view.ts), [manage runs](https://docs.expo.dev/eas/workflows/manage-workflow-runs/).
