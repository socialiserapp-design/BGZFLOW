<!-- Worker capability card: one per route (provider + host + mode). Fill it from observed behaviour, with dates.
     Public template: no account names, emails or secrets. Your real routes live in the private overlay's ROUTES.md,
     by alias only. A route is qualified only with evidence from a harmless test job. -->
# Route card: <route alias>

- Roles: lead / worker / independent checker
- Provider, host, model and effort: <e.g. a CLI coding agent on a subscription; a cloud agent>
- Qualified: <system-clock date> by <job ID>; evidence: <path>

## Permissions recipe
- Start with the intended filesystem, approval and network access: <exact flags or config>
- Verify effective access (a write flag alone proves nothing): <command + expected output>

## Git
- Can push: yes, to <remote/branch> / no. If no: commit to a branch every <N> minutes; the lead fetches.
- Credentials: <credential helper or secret name>; never a token in a remote URL.

## Dispatch and wait
- Dispatch: <command + prompt file>
- One background wait: <mechanism>; no polling loop
- Watchdog: a job queued more than 5 minutes is stuck. Reconcile its record, cancel it, then redispatch.
- Status: <command>. A job recorded running or queued whose process is dead is uncertain.

## Results
- Short result lands at: <path + format>. Full evidence at: <path>.
- Executor identity and exit status recorded at: <path>.

## Cleanup and kill
- Cancel or kill a job: <command>
- Clean up resources named with the job ID prefix: <command>
- Resume the exact job or thread: <command>; never resume "last" from a shared parent folder.

## Limits
- Usage source: observed / reported / unknown; reset: <when>
- Machine-off cloud: yes / no, with evidence of entitlement, environment, sole writer and return

## Optional: skill catalogue and judgment route
<!-- Only if you run one. Without it, the pack's capability coverage and one-pass fallback apply. -->
- Catalogue: <location + how to search it + how to read a body by ID with a hash check>
- Judgment tool: <command>; cost per call: <free / paid>; one call per stage change, never per message
- Fallback when unavailable: record the one-pass selection and continue safe work
