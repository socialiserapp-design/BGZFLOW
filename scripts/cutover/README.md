# Manifest-owned cutover

These Node modules are copied into a newly prepared private cutover kit. The kit supplies its own manifests, raw before copies, public release payload and platform launchers. Preparing a kit does not apply it.

APPLY journals the exact paths and before/after hashes before every write or directory creation. Native plugin commands run against an isolated configuration copy in the kit's runtime. Only their verified package and named plugin configuration results are copied to the destination through the journal. Incidental native backups remain in the runtime.

Sealing records unexpected destination changes as foreign. UNDO validates the journal and raw backups, restores each changed file and removes created directories only when empty. Foreign siblings, including files created during APPLY or after sealing, are preserved. An altered installation-owned file or linked target is refused. There is no recursive target deletion in UNDO.

Claude's `.claude.json.backup.*` entries directly under `.claude/backups`, and `.in_use` subtrees under Claude or Codex plugin caches, are host-owned. They are excluded from target comparisons, before copies, copying and ownership journals. APPLY records their current metadata at its start; it never restores that observation. All other paths keep exact byte and inventory checks. UNDO leaves those entries alone and retains the complete cache version whenever its `.in_use` subtree is present, checking again during removal. If a marker arrives after removal starts, UNDO replaces only its own already-removed cache files. Unreadable marker metadata conservatively retains the version. The retained version is recorded for repeatable UNDO checks.

Kit-owned payloads, before copies and runtime paths are stored as `kitRelative` paths in the manifest and resolved from the manifest's own directory. A nested Codex refresh may reference its parent kit. Live destinations stay absolute. This lets a prepared kit be kept outside temporary storage or moved as one directory without changing its destination authority.

Each kit has a durable phase and operation identity. An interrupted operation must be reconciled before any retry. Codex refresh remains separate and requires the destination Codex app to be closed; rehearsal uses a throwaway home without closing any live app.

Native commands default to 600 seconds. Set `BGZFLOW_NATIVE_TIMEOUT_MS` to a positive integer in milliseconds to override it; an explicit helper timeout takes precedence. Each attempt keeps its own receipt, including timeout and failure details.

`APPLY.ps1 -Resume` (`apply.mjs --resume`) and `CODEX-REFRESH.ps1 -Resume -CodexAppClosed` continue a failed isolated native operation using the same staged home, skipping completed operations. Resume verifies the recorded stage identity, original backups, source payload and all live targets against the ownership journal and failure snapshot. Volatile host entries remain excluded. Live drift, unexpected changes, an in-flight operation or a failure during live commit refuses resume and directs the owner to UNDO. Resume never rebuilds a mutated staged home or retries the live commit partially.
