# Changelog

All notable changes to BGZFLOW. Versions follow the `VERSION` file; each public release is a single commit on `main` with a matching tag.

## 0.5.0 (2026-10-08)

**The design skill can do far more, and every product still keeps its own look.**

- New looks library: 57 distinct looks in six families (quiet and editorial, technical and dense, soft and tactile, bold and expressive, glass, light and depth, platform-native), each with a full recipe (type, colour, space and shape, material, motion, signature details) and a "suits / avoid" line. No look is a default; a direction round draws from several families, flags common AI defaults and adapts each look to the product.
- New craft toolbox: typography and variable fonts with free font sources, colour and palette rotation, dark mode, responsive and adaptive layout, surfaces, micro-interactions, sound and haptics, icons and illustration, asset generation with provenance, data visuals, empty and loading states, onboarding, delightful details, interface words, screenshot QA and reference gathering. Where source skills disagreed, both options are kept with when-to-use guidance.
- New cinematic motion and 3D reference: decide the fit first, one motion grammar, recipes for 3D heroes, scroll stories, text reveals, transitions, shaders, particles, product turntables, cursor effects, data worlds and illustrated delight, library choices, a 3D asset pipeline and hard guardrails (performance, reduced motion, fallbacks).
- New motion by platform reference: the same effects on React Native and Expo, SwiftUI, Android Compose, Flutter and desktop, with an equivalence table.
- The skill has a new step that picks candidate looks and effect levels before exploring, and keeps heavy effects off frequent task paths. A sources page records where each part came from and what was dropped.
- New eval cases: a web landing section, a mobile settings screen, a redesign of a plain screen, two products that must look clearly different, three cinematic cases (fit check, marketing hero and scroll story, native app motion), and the locked-look case now also resists an end-of-pass "house style" push.

## 0.4.2 (2026-10-07)

**Design work starts from the product's page and ends on a real phone.**

- BG Personal Product Design now reads the product's design page (`products/<product>.md` in the company design folder) first, when it exists, before any other design file.
- New looks are explored in Claude Design (or the project's design canvas) and the founder picks one there before any code; the picked target is then handed to the builder. Its sync step never runs automatically.
- A short real-phone check after any screen change: under the one-driver hold, on a test build or the production app on a company test account (never an emulator, never the founder's own apps), screenshot each changed screen and put it next to the approved picture. Clipped text, a wrong font or colour drift fails; fix and capture again.

## 0.4.1 (2026-10-06)

**Nothing the founder didn't ask for may stop a customer.** A release shipped a gate nobody approved, and customers' posts silently stalled; the review only looked at money, data, security and rollback.

- The one release review has a fifth reason to block: an unapproved stop path. That is any new or changed customer-facing wait, refusal, hold, gate, cap, block or expiry without the founder's written approval. The review lists every stop path it finds, approved or not, quotes the approval and where it is recorded, and blocks on any without one. The reproduction is the customer journey that now stops. A refusal that stops a money error the customer didn't choose is still allowed; the founder is told once afterwards.
- Builders build only what was asked. Adding an unrequested stop path is a defect, and every worker handback lists the stop paths it added (or none).
- `swarm-gate` accepts the new finding category `unapproved-stop-path`; existing finding records and categories work unchanged.
- New skill test cases: an unrequested gate must block; an approved one is listed and passes.

## 0.4.0 (2026-10-06)

**Skill tests first, then a cheaper way of working.** A changed skill must now prove it does at least as well as the version it replaces before it goes live.

- Every skill carries its own eval cases: behaviour cases plus one case where it should fire and one where it should not. BG Efficiency has nine behaviour cases, including the safety ones (a destructive action is still confirmed; failing tests are still reported in full).
- New skill gate (`bgz skill-gate`). It compares a skill's pass rate with the previous release and with no plugin at all. A skill passes only if it scores at least as well as before and no trigger case does worse than no plugin. A partial run or a usage-limit hit counts as a fail and is rerun, never read as a result. See `docs/SKILL-TESTS.md`.
- BG Efficiency 2.0, in four parts, most expensive first. Effort by role: readers and mechanical work low, leads medium, high only when a brief names it, and one level higher after a failure instead of retrying. Less typing into tools: scripts and SQL are saved to a file once and run by path, files are edited rather than rewritten, and logs, diffs and code are never pasted into chat. Less re-reading: a fresh chat per stage from a short handoff, and fewer wake-ups because finished work is handled in one go and idle leads hold inbound messages. Shorter replies: concise style everywhere and worker handbacks of at most 10 lines, with the detail in a named file.
- Every safety, quality, evidence and recovery rule from 0.3.2 is kept. Saving effort never cuts scope, tests or holds.
- New `bgz receipt` prints paths, sizes, line counts and SHA-256 hashes for a handback, so the model writes one pointer line instead of typing them. New `bgz usage` reads local transcripts and shows where tokens went: thinking, tool input and replies, cache share, and what woke each turn.
- Host settings (effort, output style, inbound hold) are given only as examples per host. Keys that could not be confirmed in official docs are marked unverified.
- The worker packet, swarm rules and checkpoint template now match: 10-line returns with a receipt line, role, model and effort per job, and a handoff at each stage end.

## 0.3.2 (2026-10-06)

- Added a local, append-only lessons log with add, due, review and status commands. Two open lessons with the same key, or one high-severity lesson, trigger review across explicitly selected projects.
- Reviews close the recorded occurrences without erasing history. New problems remain eligible. Promotions prefer a hard check and follow the normal tested, independently checked release path; live rules are never edited directly.
- Finish reports now separate BUILT, REACHED and USED, identify the data copy and date, give confirmation steps, and record what went wrong. Only USED supports a claim that something is working.
- SessionStart and the existing startup check show a single reminder when lessons are due. The read-only hook runs once per session, stays silent on errors, and adds no dependency. Added regression fixtures and tests for reporting, storage, validation and review closure.

## 0.3.1 (2026-10-04)

**Finished means switched on.** In real projects, finished and tested features were being parked behind switches that nobody turned on. Low-traffic products can never fill a percentage-rollout sample, so "hold on insufficient data" became permanent.

- Accepted work is now switched on for all intended customers after the real-platform rehearsal and the one review, followed by a one-hour live error watch. Healthy work stays on; failures are switched off and fixed forward.
- Work is switched on the moment its rehearsal passes, never on a later date. Finished work still off after 24 hours surfaces in project status as overdue, with one recommendation.
- Only a recorded founder decision keeps finished work off. Leads cannot invent holds.
- Percentage ladders (1/5/25/50/100) apply only above about 1,000 daily active users per platform; below that, release to everyone and watch for an hour. Missing data never means holding indefinitely.
- Kill switches remain mandatory for money, data and security paths, and switches are removed after 7 healthy days.
- Updated the release rules in `AGENTS.md`, `/swarm-ship`, Check It Before Release, Finish the Whole Job, Ship and Recover, and the app store and over-the-air guides.
- Rewrote the README.

## 0.3.0 (2026-10-01)

First public release. See [RELEASE-NOTES-v0.3.md](RELEASE-NOTES-v0.3.md).

## 0.2.0 (candidate-2, 2026-09-30)

- Synced the first swarm repair wave: proven routes, checkpointed limits and reserve, safe writer reassignment, cloud transport and untouched cloud contributions, explicit wave-0 worktree bases, isolated pinned tests/checkers, fresh integration SHA per fix wave, and release/production identity gates.
- Added dated route-proof storage and scoped validation; hardened approval and status schemas, mirrored-job deduplication, logical-task overlap warnings, stale/unknown reporting, provider coverage, recent results and exit-code preservation. Added focused regression tests.
- Set the public repository and marketplace owner to `socialiserapp-design/BGZFLOW`; retained the MIT licence and BGZFLOW contributors copyright.
- Rewrote the short viewer install/first-run README and replaced uncontrolled field observations with requirement-to-test evidence in `docs/proof.md`.
- Kept build-whole-then-test-whole in the startup entry within its 3,000-word limit; bumped VERSION and rebuilt host manifests.
- Whole-candidate verification and the independent verdict are recorded in the candidate handback. No with/without-plugin effectiveness evaluation or public remote-source installation is claimed; this entry grants no release authority.

## 0.1.0 (unreleased)

First public version of the BGZFLOW plugin.

- Eight skills, from the first idea to a launch, plus project templates and a private-overlay template.
- Hooks H1 to H5: checkpoint size cap, big-read guard, chat-size warning, real clock and state snapshot.
- Eight tools: `bg-heavy`, `bg-swarm`, `bg-rounds`, `doctor`, `notes-map`, `startup-check`, `swarm-resources` and `swarm-status`, also offered as slash commands where the host supports them.
- Seven public, model-neutral swarm commands and shared rules: approved resources, wave-0 contracts and acceptance, parallel builds with worker quality methods/proof/confidence, one integration, whole testing then independent review, and at most two fix waves.
- Overlay-driven resource discovery and read-only job status with scoped approval state, project labels, uncertainty/duplicate/route-mismatch flags and focused unit tests; example strongest-setting policy stays in the overlay template.
- Start-up entry adds the short build-whole-then-test-whole rule within the 3,000-word reading budget.
- One test entry, `npm test`, that runs every Node and Python suite.
- Host manifests for Claude Code, Codex, and Grok, generated from `VERSION`.
- Leak check for tracked files, git history, and author identities.
- Explicit `--working-tree` leak-check mode includes current untracked files and preserves the default history audit.
- Continuous integration for tests, manifest drift, the leak check, and gitleaks.
- Install, security, and attribution notes.
