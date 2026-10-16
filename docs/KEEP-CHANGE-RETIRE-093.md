# BGZFLOW 0.9.3 — Complete Keep / Change / Retire Audit Table

Written 15 Oct 2026 (`v0.9.3`) by `argon-reviewer` in response to the 3-model consensus (`claude-reviewer` in `BGZFLOW-093-VERDICT-CLAUDE.md` & `ARGON-BUILD-REVIEW-20261015.md`, `site-schema` in `BGZFLOW-INDEPENDENT-RESEARCH-PROPOSAL-1817.md` & `ARGON-FORENSIC-RESPONSE-1638.md`, and `argon-reviewer` in `BGZFLOW-3MODEL-OPTIONS-AND-REDESIGN.md`).

---

## 1. Skills (9 Total)

| Skill | Disposition | What Changes in `0.9.3` (and Why) |
|---|---|---|
| `bg-plain-english-builder` | **CHANGE** | Added Open-World Jev-Calibrated Goal Interrogation (`P(goal_clarity_and_constraints_known) >= 0.85`), Pre-Decision Ground-Truth Gate (or explicit `noExternalUnknowns`), Rebuild-vs-Evolve Triage (`rebuild \| evolve \| keep-shared-brain`), and Verifier-Only `USED` (`unavailable` surface stays `BUILT`). |
| `bg-build-with-me` | **CHANGE** | Fixed `references/durable-work.md:20` so strangler-fig ("Rebuild beside the old") applies **only** to `TRIAGE: evolve` on live shared backend paths and **never** to `TRIAGE: rebuild` of a rejected UI/flow. Updated `references/worker-route.md` for 3-Model Architecture (`architect \| executor \| verifier`). |
| `bg-finish-the-whole-job` | **CHANGE** | Removed `"fast checks only"` ambiguity in `SKILL.md`, `references/worker-packet.md`, and `references/swarm-procedure.md`: executors run fast unit/lint checks on owned files **plus** real-surface & effect read-back verification of their vertical slice. Banned Stage A shell / Stage B wiring splits. Added `bgz verify`, `bgz scan`, and `bgz review-pack`. |
| `bg-check-it-before-release` | **CHANGE** | Made `ui-spec-mismatch`, `fake-effect`, and `outcome-contract` first-class blocking categories (never deferred to `after-launch`). Added Blind Review Pack (`bgz review-pack`) and Effect Verification (`bgz verify`) before any founder design check. |
| `bg-ship-and-recover` | **CHANGE** | Replaced line 15 ("founder checks the verified build on their phone") so the independent verifier **must** run and pass the real-surface & effect check on simulator/device first ("the founder is never the first tester"). Enforced `Operation` records (`id`, `owner`, `intent`, `reconciliationMethod`) before any paid or external write. |
| `bg-continue-my-project` | **KEEP** | Kept project recovery, worktree reconciliation, and cloud/account checklists intact; aligned checkpoint recovery with slice-boundary handoffs. |
| `bg-efficiency` | **KEEP** | Kept bounded reading (`H2`), single heavy local slot (`bg-heavy`), and token discipline intact. |
| `bg-jev` | **KEEP** | Kept System One (`jev`) calibrated probability judgments (`noul`, `score`), `plan`, `arch`, `unasked`, `grade`, `outcomes`, and league tables intact. |
| `bg-personal-product-design` | **KEEP** | Kept product design principles and user-journey focus intact. |

---

## 2. Tools (26 Total: 23 Existing + 3 New in `0.9.3`)

| Tool | Disposition | What Changes in `0.9.3` (and Why) |
|---|---|---|
| `tools/bgz.mjs` | **CHANGE** | Registered 3 new top-level commands: `bgz verify`, `bgz scan`, and `bgz review-pack`. |
| `tools/swarm-gate/swarm-gate.mjs` | **CHANGE** | Added `record operation` and `record verification` (enforcing `verifier !== builder` for `passed` and keeping `unavailable` surfaces at `BUILT`). Added `noExternalUnknowns` option to `record ground-truth`. Added `ui-spec-mismatch`, `fake-effect`, and `outcome-contract` to blocking findings. Scoped 2-strike `rebuildRecommended` to the same causal boundary (excluding `environment`, `flaky`, `quota-or-rate`, `network`, `provider-outage`). Added 3-identical-errors loop breaker advice on `PostToolUseFailure`. |
| `tools/swarm-gate/admission.mjs` | **CHANGE** | Enforces 6-Record admission: requires `outcomeContract` with effect read-back (`effectReadBack`), requires `Operation` records when `paidOrExternalWrites` is true, keeps `surfaceStatus = 'BUILT'` when surface is `unavailable` or not yet verified by an independent `verifier`, and enforces Two-Tier Test Governance (`verifierSignOff` required to touch Tier-1 invariant tests; `{ file, reason, replacementProof }` for retired Tier-2 source-shape guards). |
| `tools/verify/verify.mjs` (**NEW**) | **ADD** | Effect & Surface Verifier (`bgz verify`): checks served build/backend identity (`buildSha`, `backendVersion`, `surface`), verifies effect read-back proofs (server state, DB row, provider status), catches fake-effect patterns in changed files, and outputs honest `BUILT` vs `USED` status. |
| `tools/scan/scan.mjs` (**NEW**) | **ADD** | Deterministic Security & Fake-Effect Scanner (`bgz scan`): checks secrets/publishable-key allowlists, SQL `security definer` / `using (true)` / missing owner filters, dependency `postinstall` risks, fake-effect anti-patterns (timers posing as work, canned AI text, no-op verification handlers, swallowed `catch {}` on money/ads switches), `.mcp.json`/skill hash baseline, and preview-only two-customer isolation probe support. |
| `tools/review-pack/review-pack.mjs` (**NEW**) | **ADD** | Blind Verifier Pack Generator (`bgz review-pack`): strips builder handback prose and self-certifying claims while preserving raw git diff (including code comments), `DECISIONS.md`/`BRIEF.md`, and machine scan/test receipts for independent cross-model verification. |
| `tools/lessons/lessons.mjs` & `lib.mjs` | **CHANGE** | Added `--scope project\|global`, `--review-by <YYYY-MM-DD>`, `--verified-by <verifier>`, and `--kind defect\|preference\|pattern`. Only defect/pattern lessons with `evidence`, `reviewBy`, and `verifiedBy` are promoted to `~/.bgzflow/company-lessons.jsonl`; preferences are never turned into blocking rules. |
| `tools/bg-mail/bg-mail.mjs` | **CHANGE** | Added explicit `ack` (`state: 'acknowledged'`) and `act` (`state: 'acted_upon'`, with `--effect`) commands alongside `post` (`open`/`queued`), `reply` (`answered`), `wait`, `watch`, `list`, and `collect`. |
| `tools/jev/*` | **KEEP** | Kept Jev client, calibrated `noul`/`score` primitives, `arch`, `unasked`, `plan`, `skills`, `grade`, `outcomes`, and `preflight` intact. |
| `tools/doctor/doctor.mjs` | **KEEP** | Kept repository & manifest health checks intact. |
| `tools/startup-check/startup-check.mjs` | **KEEP** | Kept compulsory startup word-budget gate (`< 3,000` words) and pointer verification intact. |
| `tools/facts/facts.mjs` | **KEEP** | Kept project fact store (`bgz facts`) intact as non-blocking advice. |
| `tools/map/map.mjs` | **KEEP** | Kept C4 system map (`bgz map`) intact. |
| `tools/notes-map/notes-map.mjs` | **KEEP** | Kept markdown/notes indexer intact. |
| `tools/project-setup/project-setup.mjs` | **KEEP** | Kept `bgz setup` project scaffolding intact. |
| `tools/receipt/receipt.mjs` | **KEEP** | Kept `bgz receipt` milestone receipt generator intact. |
| `tools/start-now/start-now.mjs` | **KEEP** | Kept `bgz start-now` entry check intact. |
| `tools/bg-heavy/*` | **KEEP** | Kept single heavy-build/test slot queue (`bg-heavy`) intact. |
| `tools/bg-governor/*` | **KEEP** | Kept host CPU/memory governor intact. |
| `tools/bg-rounds/*` | **KEEP** | Kept finding round counter intact. |
| `tools/bg-route/*` | **KEEP** | Kept route selector intact. |
| `tools/bg-swarm/*` | **KEEP** | Kept worker process launcher and atomic writer intact. |
| `tools/skill-gate/*` | **KEEP** | Kept skill body verification helper intact. |
| `tools/swarm-resources/*` | **KEEP** | Kept model-map and provider qualification discovery intact. |
| `tools/swarm-status/*` | **KEEP** | Kept swarm status reporter intact. |
| `tools/usage/*` | **KEEP** | Kept usage/allowance tracker intact. |

---

## 3. Hooks (9 Active Hook Scripts + Shared Libraries)

| Hook | Disposition | What Changes in `0.9.3` (and Why) |
|---|---|---|
| `hooks/h1-checkpoint-cap.mjs` | **KEEP** | Enforces 8 KB `CHECKPOINT.md` cap so checkpoints stay one-page current state. |
| `hooks/h2-big-read-guard.mjs` | **KEEP** | Prevents reading >20 KB files whole without line slices. |
| `hooks/h3-chat-size.mjs` & `hooks/lib/compact-judge.mjs` | **CHANGE** | Fixed repeat-nag bug: records the last announced size band (`notice`, `recommend`, `request`) per transcript in `<BGZFLOW_HOME>/h3-state.json` so `H3` advises at most **once per size step** and prefers **slice boundaries** (never a hard context-% block). |
| `hooks/h4-clock.mjs` | **KEEP** | Injects accurate UTC date/time once per session/prompt. |
| `hooks/h5-state-snapshot.mjs` | **KEEP** | Saves lightweight state snapshot on Stop. |
| `hooks/h6-lessons-due.mjs` | **KEEP** | Surfaces due lessons once at session start. |
| `hooks/h7-jev-gates.mjs` & `hooks/lib/jev-gates.mjs` | **KEEP** | Code-first + Jev guardrails on destructive bash, live secrets, protected roots, and prompt injection screening. |
| `hooks/h8-outcomes.mjs` | **KEEP** | Runs daily background outcomes check (`bgz jev outcomes --background`). |
| `tools/swarm-gate/swarm-gate.mjs` (`hook`) | **CHANGE** | Adds 3-identical-errors loop-breaker warning in `PostToolUseFailure` to tell the agent to stop repeating the same failing command and switch approach. |

---

## 4. Templates (10 Total)

| Template | Disposition | What Changes in `0.9.3` (and Why) |
|---|---|---|
| `templates/BRIEF.md` | **CHANGE** | Updated to include `ROLE`, `TRIAGE`, `Ground truth verified` (or `noExternalUnknowns`), `Operation` IDs for paid/external writes, `Outcome contract` with effect read-back, Two-Tier test rules, and slice verification alongside fast checks. |
| `templates/CHECKPOINT.md` | **KEEP** | One-page state with `Outcome`, `CURRENT RULES`, `OWNERS`, `Candidate`, `Worktrees`, `System map`, `Jobs`, `Open findings`, and `Holds and uncertain effects`. |
| `templates/DECISIONS.md` | **KEEP** | Founder `DEC-NNN` and engineering `ADR-NNNN` index. |
| `templates/HANDOFF.md` | **KEEP** | 2 KB pointer-only stage/slice handoff template. |
| `templates/ADR.md` | **KEEP** | Architecture decision record template. |
| `templates/ARCHIVE.md` | **KEEP** | Historical state archive template. |
| `templates/LIVE-MANIFEST.md` | **KEEP** | Live deployed versions and services manifest. |
| `templates/PROJECT-AGENTS.md` | **KEEP** | Per-project `AGENTS.md` starter template. |
| `templates/ROUTES.md` | **KEEP** | Project routes and surface inventory template. |
| `templates/swarm-policy.json` | **KEEP** | Default provider tiers, Jev enforcement, and escalation policy. |

---

## 5. Retirements & Prohibitions in `0.9.3`

| Retired Pattern | Replaced By |
|---|---|
| **Stage A (UI shell) / Stage B (backend wiring) horizontal splits** | **End-to-End Vertical Slice Ownership**: every executor owns UI + hook + route + effect read-back for their slice. |
| **Builder self-certified `passed` / `USED` claims** | **Verifier-Only `passed`**: builders submit `built_ready_for_verification` with effect read-back proof; only an independent `verifier` (`verifier !== builder`) can mark `verification.status = 'passed'` (`USED`). |
| **Counting `unavailable` surfaces (e.g. locked Mac / no simulator) as `USED`** | **Honest `BUILT (surface unavailable)` state**: work stays `BUILT` until the real surface is run by the verifier. |
| **Pushing `ui-spec-mismatch` or `fake-effect` findings to `after-launch`** | **First-class blocker categories** in `swarm-gate.mjs` and `bg-check-it-before-release`. |
| **Using the founder's phone as the first real-device test** | **Mandatory verifier real-surface & effect rehearsal** before the founder ever sees the build. |
| **Blanket legacy source-shape regex tests blocking approved rebuilds** | **Two-Tier Test Governance**: Tier-1 behavioural safety invariants (locked without `verifierSignOff`) vs Tier-2 source-shape guards (retired individually with `reason` + `replacementProof`). |
