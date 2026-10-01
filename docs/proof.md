# Verification evidence

BGZFLOW 0.2.0 has deterministic regression tests for the swarm gate and generic wave-2 fixes. The [gate cases](../tools/swarm-gate/test/gate.test.mjs), [whole local journey](../tools/swarm-gate/test/journey.test.mjs) and [29 wave-2 cases](../tools/test/swarm-wave2.test.mjs) exercise real local files and the gate executable. They are fixture-based coordination proofs, not live provider entitlement or deployment proofs.

| Requirement | Evidence cases |
| --- | --- |
| One ledger, wave zero, pieces and resource/usage defaults | S1–S3 |
| Configured model/effort, approved resource and current account scope | D1–D9, W2-04–16 |
| Job/hour ceiling, check/fix reserve, readable allowance only | U1–U5 |
| Two-failure diagnosis, Cause/Evidence, outside failures excluded | F1–F4 |
| Concurrent ownership and brief quality contract | O1–O3, B1–B2 |
| All pieces then integration and frozen suite; rehearsal, one review; two fix waves | C1–C6, A1, A11 |
| Exact-SHA release, blocking findings, human override | R1–R5 |
| No swarm false positives, build/preview exclusions, fail-open exception | H1–H10, R4 |
| Durable reservation, native launch, transport, correction and scope | A2–A15, A19, A21–A22, A27–A30; bg-swarm launch-plan cases |
| Effective release checkout, composed commands and configured-release recovery | A16–A18 |
| Canonical ownership and credential-directory aliases | A20, A25 |
| Remote DB pushes, printed release text, dry-runs and exact swarm selection | A23–A24, A26, A31–A32 |
| False/negated/quoted/conflicting dry-run forms on twelve release patterns | A33–A34 (72 parameter cases) |
| Linked snapshot roots/retention entries and linked log targets preserve external bytes | [R1–R2 storage cases](../hooks/test/storage-safety.test.mjs) |
| Failed ledger backup/replacement renames preserve the original | [R3 atomic cases](../tools/bg-swarm/test/atomic.test.mjs) |
| Global options cannot hide releases; option values and ordinary builds avoid false positives | [R4 release parsing cases](../tools/swarm-gate/test/release-global-options.test.mjs) |
| Bearer headers, API-key shapes and standalone tokens cannot reach the judgment runner | [R5 judgment case](../tools/swarm-gate/test/judgment.test.mjs) |
| Integrated start-to-rehearsed-release journey without production operations | J1 |
| Logical identity and result pointers retained through deduplication | W2-01–03, W2-17–29 |
| Real fast output, exact counts/diff, changed tests, new marker rejection and docs exception | [E1–E12](../tools/swarm-gate/test/admission.test.mjs), [I1–I6](../tools/swarm-gate/test/integration-evidence.test.mjs) |
| Batched optional judgment, labelled block/warn/pass bands, sanitized evidence, fallback and usage | [JV1–JV10](../tools/swarm-gate/test/judgment.test.mjs), [JV9](../tools/swarm-gate/test/edge-evidence.test.mjs), IS1–IS3/IS8 |
| Stop pre-filter, one-block guard, journey extra condition and human override precedence | IS4–IS10 |
| Classified escalation, lower-tier refusal, root-note repair and qualified different family | L1–L11, [L7](../tools/swarm-gate/test/ladder-extra.test.mjs) |
| Provider proposals, exact-flags qualification, same-tier fallback, discovery triggers and pinned jobs | [M1–M15](../tools/swarm-resources/test/model-map.test.mjs), [Q1–Q6](../tools/swarm-resources/test/qualification.test.mjs), [MW1–MW6](../tools/swarm-gate/test/model-workflow.test.mjs) |
| Ready Git identity without spawning Git and bounded previous map cycle | GIT1, M11 |
| Generated commands retain phase-0 refresh/admission/usage instructions | [MBG1](../scripts/test/build-manifests.test.mjs) |

Run all suites through `node tools/bg-heavy/bg-heavy.mjs --slots 1 -- node scripts/test-all.mjs`. The runner retains per-suite logs in `.tmp/test-all/` and prints counts and its actual exit code. `build-manifests --check` detects drift; `startup-check` checks the 3,000-word budget; `lintAvSafe` checks shipped code; `scripts/leak-check.mjs --json` scans tracked content, reachable history and commit identities. Host validation/installation uses isolated homes and a local-source scratch marketplace. The user's live installation is not a test target.

The tests were written before the gate, and missing behaviour failed before implementation. Added bypass regressions also failed before their fixes. Exact run results, host versions, install/smoke receipts and measured timings are bound to the candidate handback. Candidate acceptance is distinct from builder completion.

One real configured Jev request used a small sanitized answer-function fixture with two admission questions. The [receipt](evidence/jev-fixture.json) records model `jev-1.13.0`, 460 input tokens, 38 output tokens, 0.468 seconds reported API time and 1,714 ms wrapped elapsed time. No monetary cost was reported. All enforcement/qualification tests use controlled fixture responses; this call does not validate the whole candidate or establish classifier accuracy, provider entitlement or savings. A release has one independent whole-candidate review; repairs use regression tests and rehearsal, never another review.

Local-source host installation at implementation commit `50f6464b5b295fe648904bbd4eb1b15fd218b13f` passed with Claude Code 2.1.284, Codex CLI 0.159.0 and Grok 1.0.44. The [sanitized host receipt](evidence/candidate-2-hosts.json) records each required exit code and the installed gate's source hash. The installed hook blocked a bad dispatch and an unready release, and allowed a valid dispatch and ready exact-SHA release. Those smoke operations used a local fixture and sent no worker or production request. The final candidate handback records subsequent verification against the final tree.

No matched with/without-plugin evaluation has been performed for this version. These local tests establish no token or cash savings, faster delivery, billing access, Android acceptance, live worker qualification or public remote installation. Earlier uncontrolled private field observations are not used as evidence of public-plugin effectiveness.

The finish-line regressions `FL1?FL11` prove exact-SHA rehearsal/rollback, one review across swarms, refusal of repair reviews, reproduced blocker classes, after-launch reviewer design findings, repair rehearsal without another review, and the founder final UI design check. They use simulated provider routes and make no production release or independent approval claim. The release record audit test `test_release_record_does_not_require_a_ready_review_verdict` proves that historical verdict fields do not force a ready verdict at release. Candidate-specific full-suite, install-copy and undo receipts are recorded in the final handback; historical receipts above remain labelled historical.
