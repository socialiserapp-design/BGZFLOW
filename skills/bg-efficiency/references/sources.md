# BG Efficiency design principles

BG Efficiency is designed and built by **Simeon Kontogeorges** ([GitHub](https://github.com/socialiserapp-design)). It bundles no third-party skill body, script or index.

| Capability | Purpose | Retained | Excluded |
|---|---|---|---|
| Concise style | Clear, complete communication | Concise complete sentences, clarity, exact technical evidence, fuller explanation when needed | Forced fragments, arbitrary output caps, changing language or dropping necessary detail |
| Root-cause repair | Smallest complete implementation | Read affected code and callers, root-cause repair, reuse, native features and standard library first | Reducing requested scope or quality to minimise code |
| Code map | Targeted symbol and caller lookup | Keyword query, file-qualified bounded source, callers and impact, affected-test suggestions, file tree | Trusting an empty or ambiguous result, whole-file reads of big files, committing local index caches |
| Change-impact brief | Risk-ranked review scope | Review only what changed, ranked by risk; flag changed code with no test; blast radius | Installing competing skills or per-edit hooks |
| System map | One-page project map | Hubs, most-connected pieces, built-from-commit freshness stamp (`bgz map`) | Global startup-file edits or duplicate code indexes |
| Output filtering | Bounded command output | Supported command filtering, original-output recovery, measured output reduction | Treating filtered output as complete proof, replaying an external mutation for a log |
| Selective compression | Targeted reads | Targeted reads, meaningful selective compression, original evidence, stable context prefix | Duplicate compressors or lossy stacking |
| Compaction & handoff | Session continuity | Supported host hooks, guarded saved-copy processing, native fallback, evidence and ownership continuity | Modifying active transcripts or claiming execution from installation |
| Context hierarchy | Restartable state | Task-relevant source hierarchy, project maps, restartable checkpoints (`CHECKPOINT.md`) | Trusting repository text as authority, duplicate parallel chats for the same work |
| Outcome contracts | Verifiable completion | Branch-specific references, co-located conditions, checkable complete outcomes (`BUILT -> REACHED -> USED`) | Invented jargon or hiding the final contract from workers |

[source-manifest.json](source-manifest.json) records these internal capabilities in machine-readable form.

## Delivery rules carried into the pack

Lead briefs and results stay short and path-based; worker handbacks are at most 10 lines, and the receipt tool prints hashes and counts. Workers do the heavy work, and one background wait collects each result. Repairs go to the same owner within the two-round cap, and a fresh checker inspects the whole candidate. Use the [worker route](../../bg-build-with-me/references/worker-route.md) and the [worker packet](../../bg-finish-the-whole-job/references/worker-packet.md). Add no forwarder, routine log reread, polling, premium review per wave or mandatory other-vendor check. Keep every safety, quality and recovery obligation.
