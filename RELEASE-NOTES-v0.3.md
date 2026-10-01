# BGZFLOW v0.3 release candidate

## What changed

- The standard test ladder is now unit/type/lint and Playwright, Maestro on EAS for every mobile candidate, occasional BrowserStack real-device sampling, then the founder's phone for design only. Golden journeys are the finish-line rehearsal.
- `bg-mail` keeps lead/worker questions inside the running job, wakes the lead through `watch`, handles concurrent replies safely and uses a declared safe default on timeout. Worker briefs and swarm workflows now wire that mailbox beside the native completion wait.
- `bg-governor` checks free disk, exposes Expo plan slots, inventories idle emulator/daemon candidates without changing AVD files and blocks unsafe bulk Codex archives. The dispatch gate now enforces the 10 GB disk floor, the one-heavy-local-run lock, observed Expo build capacity and the 20-thread archive limit before launch.
- `bg-route` records a non-secret proof of the account actually observed for a job and detects mismatches.
- The package-list check explicitly excludes `context/`, the cloud brief, private project state and overlays.

## Research choices

Adopted: failure-artifact-first Playwright and Maestro automation; explicit build concurrency; staged store rollouts; official submission APIs where already configured; vendor-neutral telemetry correlation; immutable rollback evidence; durable mailbox/account receipts. Kept: one early prototype, one whole-suite run, one real-platform rehearsal and one blocker-class independent review. Rejected: mandatory orchestration/monitoring vendors, repeated design review, live AI tapping, and a second functional pass on the founder's phone. Full sources and comparisons are in `docs/research/v0.3-findings.md`.

## Test and rehearsal result

The repaired integrated candidate ran 17 suites once at the final gate: **728 tests, 722 passed, 6 skipped and 0 failed**. An earlier attempted run found one environment-sensitive `bg-heavy` priority assertion because the full suite itself correctly ran below normal priority; the repair now verifies that `normal` preserves the caller's priority, and the final whole-suite run is green. The Grok/Claude cloud identity fixtures now preserve case-sensitive home paths, and the qualification CLI fixture uses an injected fixed clock rather than the wall clock.

The final staged tree passed a disposable Claude/Codex-home archive install and byte-for-byte UNDO rehearsal. The public archive excluded `context/`, `CLOUD-BRIEF.md`, `.bgzflow/` and both private/local overlay trees. Host marketplace CLIs were not used, so this proves the archive layout, installed startup tool and exact restoration of the disposable homes rather than a live marketplace/account installation.

## Decisions for Simon

None for this release candidate. Recommendation: keep Expo Starter's one-slot schedule until launch demand makes the measured queue delay worth an upgrade; any upgrade remains Simon's spending decision.
