# swarm-status

Run `node tools/swarm-status/swarm-status.mjs [project] [--hours <number>] [--json]`. Defaults to every project, active/uncertain records and results from the last three hours. It reads records only; it never cancels jobs or writes status back.

Sources are `bg-swarm`'s state directory and each private overlay resource table's `Jobs` directory. Scanning includes job files nested up to four levels, skips symlinks and reports unreadable/malformed records as gaps. Configure job directories, not credential homes. Other providers export their existing metadata there through their qualified route; this tool does not authenticate or query remote services.

Accepted job fields include `id` or `name`, `status` or `state`, `workspaceRoot`/`request.cwd`/`cwd`, local `pid`, `createdAt`/`startedAt` or numeric `started`, terminal timestamps, `exitCode`, `request.model`/`request.effort` or explicit `model`/`effort`, and optional `resource`, `taskId`, `owner`, `criticalPath`, `waitingOn`, `summary`/`title`. Local `bg-swarm` command arrays supply explicit model/effort flags. Output omits the command array and raw logs. `PROJECTS.md` uses longest workspace-path matching; otherwise the workspace folder supplies the project name.

PID presence proves no job ownership. Correlate process start time and job-owned heartbeat before acting. Missing/unobserved local PIDs make active records uncertain; age is a warning. Durable IDs are counted once across mirrors. Logical identity uses project plus normalized goal/slug/task ID or saved GOAL, and sorted owned files relative to the worktree. Summary fallback is visibly weak; different owned pieces remain separate. Default settings are unverified. Completed/failed result lines retain the path of the record containing them through deduplication.

The CLI also shows the current project's gate state: job/hour limit used, check/fix reserve, readable allowance or unavailable, blocked logical steps/reasons, wave count and whether release is open. `swarm-gate status` supplies the same JSON on every host.

JSON and text include stale/unknown/mirrored IDs, recent completed/failed/cancelled IDs, result pointers, preserved exit codes, configured provider coverage and scan gaps. Missing exports mean that provider is unobserved. Null/array/malformed records are explicit gaps, not crashes. The scanner ignores approval/proof state files and never rewrites or cancels jobs.

Exit 0: report produced (inspect any gaps). Exit 2: bad usage or unreadable/invalid overlay. Only the owning lead may reconcile and cancel its jobs. Unit tests: `node --test tools/swarm-status/test/swarm-status.test.mjs`.
