# Changelog

All notable changes to BGZFLOW. Versions follow the `VERSION` file; each public release is a single commit on `main` with a matching tag.

## 0.9.2 (2026-10-15)

**BGZFLOW Next: outcome contracts, pre-decision ground truth, Jev goal-clarity interrogation, 3-model vertical slices, and rebuild-vs-evolve triage.**

- **Pillar 1 — Universal Outcome Contracts (`BUILT -> REACHED -> USED`) & Vertical-Slice Real-Surface Verification**: `swarm-gate start` and piece admission now accept `outcomeContract`, and `swarm-gate record slice` records per-slice verification on the real surface (device/simulator, browser, live API or primary document) before the next slice begins. Splitting a vertical slice into a "Stage A UI shell" and "Stage B wiring" is banned.
- **Pillar 2 — Mandatory Pre-Decision Ground-Truth Research ("The Zernio Rule")**: `swarm-gate record ground-truth` records verified or refuted primary-source/API probes (`{claim, source, status, evidence}`) before architectural, legal, scientific or commercial decisions are locked.
- **Pillar 3 — Open-World Jev-Calibrated Goal Interrogation (`goal-clarity >= 0.88`)**: `bgz jev score --preset goal-clarity --state <text|@file>` scores `outcome` (0.35), `constraints` (0.25), `verification` (0.25) and `authority` (0.15), returning `ready_to_execute: true` at `>= 0.88` and `missing_dimensions` below it. Never hardcoded to fixed user personas; includes opt-in milestone check-ins for long-horizon tasks.
- **Pillar 4 — 3-Model Upfront Council + Single Vertical-Slice Executor + Cross-Model Adversarial Verifier**: worker briefs and `swarm-gate` dispatches support `ROLE: architect | executor | verifier`.
- **Pillar 5 — Rebuild vs. Evolve Subsystem Triage & Guard-Test Retirement**: pieces, briefs and handbacks support `TRIAGE: rebuild | evolve | keep-shared-brain` (`triageMode`) and `retiredGuards` (`[{file, reason}]`, allowed only in `rebuild` mode). Two counted failures on a legacy patch automatically set `rebuildRecommended: true` on the failure ledger.
- **All self-improvement and communication tools preserved**: `bgz lessons` (`due`, `rework`, `add`, `review`), `bgz jev` (`grade`, `league`, `outcomes`, `improve`, `arch`, `unasked`, `plan`), `bgz facts`, `bgz map`, `bg-mail`, `BUILT/REACHED/USED` and `bg-plain-english-builder` remain 100% intact.

## 0.9.1 (2026-10-14)

**The system map counts each repo once.**

- A repo with many linked worktrees is one repo in `bgz map` and `bgz setup`. The scan walks one checkout of it (the project's own, else the one on the integration branch, else the default branch) and still lists the others under worktrees. Before, every worktree was walked as separate code and the service counts ballooned.
- New optional `system.skip` in `.bgzflow/project.json`: a list of folders, relative to the project, that the scan leaves out (third-party reference clones, for example). `bgz setup` keeps it on rerun, and the full `bgz map` names the skipped folders.
- Advice only, as before: no new command, flag or prompt.

## 0.9.0 (2026-10-14)

**One system map, kept by one owner.**

- System map: `bgz map` shows the project's repos, worktrees, services and declared deployments, the changes in flight grouped by stage, and which services and deployments each change reaches. Read-only. `--brief` prints a few plain lines for the checkpoint, handoff and inbox; `--json` is for scripts. `bgz setup` now also saves the detected system in `.bgzflow/project.json`; entries you add by hand win.
- Five stages: plan, committed, integrated, deployed and production-verified. Git proves committed and integrated. The owner records deployed and production-verified with `bgz map record` and `--evidence`; without evidence they show as "claimed, no evidence" and nothing is refused. `bgz map live` confirms an active deployment.
- One owner writes the map: the work graph's integration owner, else the project owner, else the lead. Workers end each handback with `Changed: <what> | where: <paths> | effect: <how>` lines.
- Skills: Build With Me, Finish the Whole Job, Ship and Recover and Continue My Project each use the map inside their existing steps. The work-graph reference adds the optional task `change` object. The checkpoint template gains a System map section and the brief template asks for the `Changed:` lines.
- New `docs/system-map.md`, linked from the getting-started guide and the README. Advice only: no new gate, review round or question.

## 0.8.0 (2026-10-14)

**Start faster: a start-now list, a plan check for extras, automatic project setup, project facts and a getting-started guide.**

- Start-now list: `bgz start-now` lists the work-graph tasks that are planned or ready and whose dependencies are done, so the lead hands out every ready task at once. `--json` for scripts.
- Plan check for extras: `bgz jev plan` checks each line of a plan against what was asked and flags anything nobody asked for before work is handed out. Build With Me and Finish the Whole Job run it before dispatch. Advice only: it never blocks, adds no review round and asks no one anything.
- Automatic project setup: `bgz setup` detects the project's build, test and lint commands and saves them to `.bgzflow/project.json`. Starting or continuing a project runs it on its own. It asks nothing, keeps commands you entered by hand and never edits CLAUDE.md or AGENTS.md.
- Project facts: `bgz facts` keeps short per-project facts in `.bgzflow/facts.json`. `facts for` prints the facts for the files a brief touches so workers start with them, workers can propose facts in their handback evidence, and the lead accepts them with `facts accept`. Advice only.
- New getting-started guide (`docs/getting-started.md`), linked from the README and the install guide.
- README: version badge 0.8.0; the skills table lists all nine skills, including Jev.
- Fixed: the Jev improve test now passes in an exported copy with no git history.

## 0.7.1 (2026-10-14)

- BG Ship And Recover step 5: a passing rehearsal with no open reproduced blocker is the go-ahead, so the lead switches on without asking the founder to approve, confirm or authorise the release. Authority, budget, owner and holds come from the brief, the founder's decisions file or the release record; when none is recorded, the lead switches on and notes the gap in the handback. Only a recorded founder hold, new spending or an app-store submission the brief doesn't name waits for the founder. Skill gate: the switch-on case passes 1 of 3 runs (0.7.0: 0 of 3) and no reply asks the founder to approve the release; replies can still pause to ask where the release record lives.

## 0.7.0 (2026-10-14)

**Professional build methods from an architecture audit, built into the skills by default.**

- Know what is live: new `templates/LIVE-MANIFEST.md` (source, artifact, config and secret names, schema version, oldest supported app, rollback artifact); ship step 1 fills BEFORE, step 7 fills AFTER and compares it with what is serving.
- Decision records: new `templates/ADR.md` (Proposed, Accepted, Superseded); `templates/DECISIONS.md` is now the index; records live in the code repo's `docs/adr/` and are superseded, never deleted.
- Lanes follow the systems: BG Build With Me lists the bounded systems before splitting work; one owning lane per system, lanes meet only at a written, versioned contract, and one customer outcome is never split by platform, model or layer.
- Testing ladder: contracts first with consumer-driven contract tests and the oldest installed app checked before deploy; tests assert customer outcomes through real adapters in provider test mode with recorded fixtures; prequalify the test environment, so a failure there is a tool failure, not a product bug.
- Watch customer outcomes, not machinery: new `outcome-watch.md` reference (due work on time, newest customer output, money balance, a company canary); `templates/PROJECT-AGENTS.md` gains an outcome-checks section.
- New references: `durable-work.md` (one operation identity, outbox, idempotent consumers, check an unknown outcome by its original ID, one adapter per provider, rebuild beside the old) and `architecture-scorecard.md` (12 practices scored 0-4, keep / simplify / rebuild).
- Incidents record system, owner, cause and release; rework is a repeat fix of the same cause. Deploy frequency, change failure rate and time to restore are reported only from complete records.
- `bgz lessons list` (`--open`, `--key`, `--json`); `bgz lessons rework` (`--since`, `--json`) groups incidents by system and cause, shows the repeat share and says what it cannot compute; `add` takes `--system`, `--cause` and `--release`.
- `status`, `due`, `list` and `rework` read without any write or owned-path check, and errors name the failed check without paths. `add` and `review` screen a root path segment by segment, so an ordinary long forward-slash root is no longer refused.
- `bg-mail post` from a sandboxed worker spools to `.bgzflow/mail-spool/` when the inbox is not writable; `bg-mail collect --from DIR` imports by message id, is safe to repeat and copies by default (`--remove` deletes only what it imported).
- Five new eval cases (live manifest, outcome watch, unqualified environment, lanes by system, repeat cause scorecard).

## 0.6.0 (2026-10-09)

**Jev, the fast cheap judge, is used at all ten levels, and it grades the workers.**

- New `bgz jev` client (Node 20, no new dependencies): noul, choice and score questions in one request, a 3 s default timeout, fail-open on any error or missing key, and a ledger at `~/.bgzflow/jev-ledger.jsonl` that never holds state text or secrets. Subcommands: `ask`, `file`, `files`, `score`, `route`, `skills`, `arch`, `unasked`, `grade`, `league`, `outcomes`, `improve`, `bench`, `regress`.
- Levels 1-5: new `bg-jev` skill (ten rules, question types, confidence bands, weighted scores kept in code, one-choice routing before dispatch), linked from BG Efficiency, BG Build With Me, the worker route and skill selection.
- Level 6: three guardrail hooks sharing one script. A Bash gate (protected targets in code, then Jev on intent; blocks only irreversible at 0.9 or more or a protected target, warns between 0.5 and 0.9), a Write/Edit gate (paths outside the project, credentials in content) and a result screen for injected instructions (banner only, never a block). `BGZFLOW_JEV_GATES=off` or no key gives 0.5.0 behaviour exactly.
- Level 7: the chat-size hook asks Jev four questions on each prompt (task switch, boundary, history needed, mid-edit) to choose silent, notice, recommend or request. Size thresholds stay in code.
- Levels 8-9: `bgz jev file` and `bgz jev files` answer questions about files without opening them; the big-read guard now names `bgz jev file` first.
- Level 10: `bgz jev ask --cmd` runs one command through the level 6 gate and asks about the result; recipes for test-failure type, diff risk and fix confirmation.
- Performance: `grade` scores a finished job on a rubric, `league` shows the average by role and worker, `outcomes` adjusts grades by real outcomes (git reverts, review flags, lessons) in code with no model calls, run once a day by a SessionStart hook.
- Better workflows become skills: `improve` promotes a workflow that beats the role average by 0.1 over 3 or more jobs, with a drafter that is not the worker, the unasked check, a backup and a 5-job watch with automatic restore. `bench` keeps a fixed set of job cards that runs only before a promotion or a model swap. `regress` drafts a regression check for every recorded failure.
- Also: `skills` picks each job's skills liberally into the brief; `arch` and `unasked` give architecture and not-asked-for leads (warnings only); `bgz preflight` flags stray skills, long plugin overviews and `ANTHROPIC_API_KEY`; the one release review runs as three parallel specialist passes merged into one report; a brief template with skills and checks.

### Fixes after independent check

- One masker for everything that leaves the machine: `sanitize` (PEM blocks, tokens, URL and command-line passwords, secret assignments, emails, phone numbers) runs on every Jev question and state, every ledger line and every rewritten performance line. The result screen sends only sanitized web text, the Bash gate only sanitized command text, and the chat-size judge only user and assistant text.
- Secret files (`.env*`, `Secrets/`, `*key*`, `*.pem`, `*credentials*`, `id_*`) are skipped by every `bgz jev` file reader and refused when named on purpose.
- `bgz jev ask --cmd` children run without `TYPESAFE_API_KEY` or `FAST_JEV_KEY_FILE`, and a protected command (force push or delete on main/master) is refused in code first, even with no key or Jev down.
- Outage breaker: a Jev timeout or network error makes later calls fail open at once for 5 minutes, so an outage costs at most about 1.5 s per tool call. `BGZFLOW_JEV_BREAKER=off` turns it off.
- Hook switches: `BGZFLOW_JEV_SCREEN=off`, `BGZFLOW_JEV_BASH=off` and `BGZFLOW_JEV_WRITE=off` turn off one gate each. `BGZFLOW_OVERRIDE="<approved step>"` lets one approved step through once and is logged to `<BGZFLOW_HOME>/overrides.jsonl`. `writeAllow` in the overlay config, or `BGZFLOW_WRITE_ALLOW`, lists extra folders the write gate accepts.
- Neutral owner wording everywhere. The decisions file is `BGZFLOW_DECISIONS_FILE`, else the overlay config's `"decisionsFile"`, else `DECISIONS.md` (in the project or its `.bgzflow/` folder). Installs that keep their decisions in another file set one of the first two.
- STATUS defaults to `$BGZFLOW_OVERLAY/STATUS.md`, else `~/.bgzflow/overlay/STATUS.md`.
- The daily outcomes job runs detached with a time budget and a job cap (`--background=1`, `--max-jobs`, `--budget-ms`); it writes the day stamp only after it finishes and leaves a one-line notice the next session start shows once.
- `improve`: one promotion per skill per pass, never writes inside the installed plugin (source repo, `BGZFLOW_SKILLS_DIR` or `~/.bgzflow/skills-overlay`), a drafter from another vendor than the worker, safer rollback, and `--dry` skips the bench. `regress --dry` writes nothing, drafts go to `.bgzflow/regression-drafts/`, and rerunning the brief update leaves the file unchanged. `grade` logs the brief path so `bench seed` can open it.
- `bgz preflight` warns (never blocks) when the same skill name is in two folders.
- New `scripts/jev-links.mjs` links `bg-jev` into the Codex and Claude skill folders: run it after APPLY, and unlink before UNDO. It never replaces or removes a real folder.
- Tests: the six known-bug tests (X1-X6) are now real, passing tests; test fixtures build secret-looking values from pieces and use noreply identities, so the leak check is clean.

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
