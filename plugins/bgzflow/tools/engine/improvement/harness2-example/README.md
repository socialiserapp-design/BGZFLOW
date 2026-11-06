# Offline Harness2 bridge

BGZFLOW-authored adapter for one synthetic Markdown agenda workflow. This is an engineering mechanism proof, not a model-quality experiment or a live Lucian integration. No dependencies are installed and no model/provider calls are made.

Supply the unchanged Google Research Harness2 checkout, the BGZFLOW snapshot CLI, and installed Node/Python runtimes explicitly:

```powershell
& <python.exe> prove.py --harness <harness2-checkout> --engine <portable-core/tools/engine/cli.mjs> --node <node.exe> --evidence <fresh-evidence-directory>
```

The evidence directory must be new. The proof uses only synthetic records and local files. Never point it at live data. All run directories, goal specifications, engine outputs, manifests, effect journals, artifact bytes, candidate hashes, the unchanged core ledger and registry decisions remain in that directory.

## Boundaries

The only accepted candidate is `recipe.json` with exactly `version` (integer 1) and `selection` (`all`, `omit-last`, or `reverse`). Unknown and duplicate keys, commands, paths, scripts, authority and checker replacements are rejected. The builder command, interpreter, input identity, exact-byte checker and artifact acceptance live outside that surface. This is trusted local execution, not an OS sandbox for arbitrary hostile code. A future real proposer would need separately qualified execution confinement.

`AgendaAdapter` implements the benchmark seam and `BridgeSubstrate` implements materialisation, execution, trajectory reading and preflight. Every rollout calls the actual BGZFLOW CLI with fixed Python builder/checker commands. Run identity binds exact input/recipe bytes and all trusted Python/engine module hashes. Cached reuse checks the real artifact, effect journal, manifest, goal and engine output; changed identity, corruption or unfinished evidence causes rejection without another effect. This is bounded local replay protection, not a distributed exactly-once guarantee.

The independent exact-byte checker is separate from the builder and recipe. Held-out inputs are absent from training contexts. Registry promotion independently rereads all configured held-out artifacts and requires matching exact recipe identity and complete case coverage. Failed and invalid candidates retain decisions without changing the active version. Rollback restores a previously stored exact recipe version and is exercised through the engine.

## Narrow compatibility and limitations

Google source is unchanged at commit `1cfe254e8d25b15f37048c3730134686abe60335`, Apache-2.0, copyright Google LLC. It is imported, not copied or relicensed. BGZFLOW-authored files here are separate adapter/example work; the existing BGZFLOW snapshot retains its own licence and notices.

The proof invokes unchanged `core.recursion.run_parallel` directly in one process with `k=1`, one proposer worker and one rollout worker: four rollouts and three proposal stages. A deterministic scripted proposer substitutes for model calls. The stock core prompt registry recognises only `codex`/`opencode`, so SurfaceSpec uses `codex` solely to select existing prompt text. It does not import or run the reference Codex substrate/launcher, and adapter validation still limits the effective surface to JSON.

This does not qualify Google's complete scheduler on Windows: `schedule._write_summary` uses POSIX `fcntl`; WSL was unavailable in the authorised session. There is no scheduler, provider, browser, user-account, billing or customer deployment proof. The synthetic improvement from an intentionally defective baseline is not evidence of superiority over agents.

The installed efficiency/Jev instructions were read. Jev service calls were deliberately omitted to obey this brief's stricter offline/no-model-call boundary. Raw failures are retained rather than hidden: attempt 01 exposed the stock prompt-name constraint; attempt 02 rejected promotion because Windows core materialisation used CRLF while an in-memory hash used LF. Promotion now uses the exact materialised recipe bytes, with no whitespace normalisation.
