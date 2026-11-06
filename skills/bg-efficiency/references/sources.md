# BG Efficiency design principles

BG Efficiency is designed and built by **Simeon Kontogeorges** ([GitHub](https://github.com/socialiserapp-design)). It bundles no third-party skill body, script or index.

| Capability | Purpose | Retained | Excluded |
|---|---|---|---|
| Concise style | Clear, complete communication | Concise complete sentences, clarity, exact technical evidence, fuller explanation when needed | Forced fragments, arbitrary output caps, changing language or dropping necessary detail |
| Root-cause repair | Smallest complete implementation | Read affected code and callers, root-cause repair, reuse, native features and standard library first | Reducing requested scope or quality to minimise code |
| Code map | Targeted symbol and caller lookup | Keyword query, file-qualified bounded source, callers and impact, affected-test suggestions, file tree | Trusting an empty or ambiguous result, whole-file reads of big files, committing local index caches |
| Change-impact brief | Risk-ranked review scope | Review only what changed, ranked by risk; flag changed code with no test; blast radius | Installing competing skills or per-edit hooks |
| System map | One-page project map | Hubs, most-connected pieces, source/version freshness information from an existing map | Global startup-file edits or duplicate code indexes |
| Output filtering | Bounded command output | Supported command filtering, original-output recovery, measured output reduction | Treating filtered output as complete proof, replaying an external mutation for a log |
| Selective compression | Targeted reads | Targeted reads, meaningful selective compression, original evidence, stable context prefix | Duplicate compressors or lossy stacking |
| Compaction & handoff | Session continuity | Supported host hooks, guarded saved-copy processing, native fallback, evidence and ownership continuity | Modifying active transcripts or claiming execution from installation |
| Context hierarchy | Restartable state | Task-relevant source hierarchy, project maps, restartable checkpoints (`CHECKPOINT.md`) | Trusting repository text as authority, duplicate parallel chats for the same work |
| Outcome contracts | Verifiable completion | Branch-specific references, co-located conditions, checkable complete outcomes (`BUILT -> REACHED -> USED`) | Invented jargon or hiding the final contract from workers |

[source-manifest.json](source-manifest.json) records these internal capabilities in machine-readable form.

## Delivery guidance

Use short useful briefs and sufficient evidence, without a fixed line limit or receipt.
Choose a single worker or independent workers using real capacity and dependencies.
Preserve native continuation. Reuse unchanged checks and escalate a persistent cause
through diagnosis; apply actual task repair limits rather than inventing a global cap.
Keep private task evidence local. This capability list does not prove the tools ran.
