# Resource governor

Run `bg-governor disk --path <heavy-output-volume> --min-gb 10` before a native build, emulator start or full suite. A low-space exit (4) pauses the heavy action. Put AVD and large build data on a roomy volume; move only owned data and never follow junctions.

`bg-heavy` remains the machine-wide one-heavy-run queue. `bg-governor build-slots` adds provider capacity: Expo Starter has one shared build slot. Queue native builds against the smaller of machine and provider capacity.

`bg-governor reap` defaults to a dry run. It only lists or signals a process with a BGZFLOW launch receipt, a named owner, an explicit idle state and a matching creation identity. `bg-heavy` records its direct children as running; the owning controller can mark one idle through `setOwnedProcessState`. Busy, unregistered and reused PIDs are excluded. If the operating system's read-only identity lookup is unavailable, no process is eligible. It never deletes AVDs or caches.

`bg-governor queued --apply` claims a mutation-safe restart under an exclusive ledger lock before launching it. After the child exits it locks again, reads the latest ledger and merges only the claimed job's result; concurrent entries and fields survive. A non-zero child exit records `failed` and returns exit 4. A pending or uncertain restart is never automatically repeated. Queue, receipt and mailbox writes refuse linked paths, junctions and hardlinks.

`bg-governor archive-check --count N` blocks more than 20 Codex app archives. Bulk cleanup is offline only: close Codex, back up its database, use a supported database operation, and retain undo evidence.
