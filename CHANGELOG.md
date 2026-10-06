# Changelog

All notable changes to BGZFLOW. Versions follow the `VERSION` file; each public release is a single commit on `main` with a matching tag.

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
