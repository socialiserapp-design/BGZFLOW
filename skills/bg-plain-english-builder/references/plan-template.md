# Discovery plan and prototype templates

Review verdicts use the [review verdict schema](../../bg-check-it-before-release/references/review-verdict.schema.json) vocabulary `ready|changes-required|blocked`: `ready` when required evidence passes and every finding is closed, `changes-required` for observed defects, `blocked` when required evidence or access is missing. Worker states, dependency acceptance and the readiness checklist's `done / partly / not done` are separate fields, never verdicts.

Fill these blocks in the project's plan record; the one-page [checkpoint](../../../templates/CHECKPOINT.md) points to it. Replace each bracket with evidence, or a named gap with owner and affected task. Keep original requirement IDs, the [glossary](../../bg-build-with-me/references/glossary.md), the [decision and delivery contract](../../bg-build-with-me/references/decision-and-delivery-contract.md) and the schema-version-1 [work graph](../../bg-finish-the-whole-job/references/work-graph.md#task-schema). The lead/worker/checker route overrides older references to worker boards or extra outside review gates.

## Copyable plan

```text
PLAN: [project/task ID, revision, path, exact base, content hash]
Status: [draft / approved scope + source / affected work held]
Owners: lead [session]; integration writer [one]; same in checkpoint OWNERS
Outcome: [whole result; people and situations; success measures]
Requirements: ID | intent/source | behavior | important failure | acceptance evidence
Scope: [included outcome; exclusions; kept deferred scope]
Authority/holds: [source; allowed and forbidden actions; owner/revisit]

Decisions (DECISIONS.md): ID | actual choice | source/time | chosen and rejected
  alternatives + reason | approval scope/version | affected work | superseded by
Evidence/assumptions: ID | claim | answer/code/external/inference/gap | source,
  version, date (system clock) | confidence H/M/L + why | cost if wrong
  | confirmed/corrected/asked/deferred/open | affected work | owner
Research: question | primary source/version | date checked | finding | effect
Coverage: category | requirement IDs | answered/evidenced/inapplicable/deferred/open
  | evidence or reason | open choice | owner | kept task/revisit trigger
Questions: [the single question-round record; prerequisites; answers]

Experience: journey [entry -> action -> result -> recovery]; prototype [packet
  below]; directions [chosen/rejected + source; unapproved stays so]; visual
  lock [design-contract version]; surfaces [capabilities, accessibility,
  native checks]
Engineering: glossary and architecture map [versions; component IDs; changes and
  gaps -> owner]; contracts [input, output, error, identity, data ownership];
  trust/privacy/lifetime [who sees and acts; retention/deletion; permissions;
  secrets by name only, never a value or a token in a URL]; failure/recovery/
  performance [offline, cancel, retry, uncertain effects, limits]; approach
  [choice + rejected alternatives, tied to product decisions]

Execution (existing work graph only):
Graph: [the work graph's schema-version-1 envelope and tasks]
Task rows: [canonical Task row with actual read receipts]; job-level permissions
  in a brief override shared boilerplate, and the brief says so
Shared resources: [one owner each: contracts, lockfiles, integration, devices, accounts]
Wave 0: [pinned shared contracts/stubs + runnable baseline before dependent work]
Readiness: [per task: ready, or exact dependency/authority/tool/capacity gap + owner]
Map: requirement -> task/owner -> test or procedure -> expected -> evidence path
Acceptance: [command + cwd + setup + expected + environment, or exact observed
  procedure; evidence native/manual/fixture/unrun + path/hash + limitation]

Resources: accounts [nonsecret aliases; allowance; source/time; reset; shared
  quota]; usage ceiling [agreed once; reserve; used/remaining/unknown]; dispatch
  [bounded jobs; capability tier; caps in minutes, KB and repair rounds; no
  silent account switch or metered fallback]; local-only [device/secret/signing/
  access needs; owner; waiting-for-PC trigger]; included cloud [verified
  entitlement, repository, environment, tools, return; no extra spend; push
  pre-authorised in the brief or a branch commit every N minutes; an unknown
  qualification holds only those tasks]

Return:
Skeleton: [one early end-to-end slice; trigger; runnable access; checks]
Whole product: [integrated identities; full requirement map; customer, failure,
  accessibility, security, device and performance checks; open findings]
Readiness report (mandatory): [page + EVERY original ask; see below]
Review: [fresh independent checker, never a builder; exact candidate; checks
  accepted DECISIONS.md IDs and the whole readiness report; lead accepts ready]
Repair: [same verified job/thread/workspace; two rounds; a third only with the
  founder's explicit approval; stable finding IDs in the `bg-rounds` ledger]
Release authority/holds: [who may release what; separate from review acceptance
  and production verification]
Handoff: [worker packet + cover of 2 KB or less; pointers (paths, commits, line
  ranges), not copied logs; one live-log path per job; required outputs listed
  and checked at handback; readiness report carried into delivery AND review]
Handoff check (evidence-gate keys; keep unchanged): intent | decisions | research
  | architecture-and-contracts | acceptance | work-and-dependencies | next-action
Change history: [revision | decision/source | affected tasks/checks | kept findings]
Next: [ready work launches on approval inside the ceiling; held work + owner/trigger]
```

Copy the Task row, Worker prompt and Worker handback from their single owner, the [worker packet](../../bg-finish-the-whole-job/references/worker-packet.md), and the [question round](question-round.md#copyable-question-round) from discovery. Keep schema field names, state meanings and requirement IDs unchanged; put extra planning context in the plan, never in undeclared task-schema properties.

## Readiness report

Delivery and final review both carry this mandatory report: a required delivery artifact, not an optional summary or a substitute for technical receipts. The delivery owner keeps it in the project's single readiness record, linked to the exact candidate.

```text
Readiness page: [project | exact candidate | date from the system clock]
  What works; how a request flows; what runs automatically versus only being
  instructed; what is missing; readiness limits; next owner and action.
  Unfinished asks: [every ID not done]
Checklist row, one per original ask: ID | original ask and source
  | done / partly / not done | candidate-bound evidence or named gap
  | remaining work | next action and owner
```

List every original ask, including deferred, blocked, failed and unverified ones; none counts as done. A worker's subset never replaces the full list or certifies other owners' delivery. `done` needs evidence for the whole ask; `partly` means work or proof remains; `not done` means delivery is absent or unestablished. Every row has a next action and owner; a done row may say "No repair; keep the evidence." Missing original wording is a source gap for the lead to recover; never invent or drop an ask.

The final reviewer verifies the page and every row against the original asks and evidence. A missing ask, a duplicate standing in for another, an empty next action or an unfinished ask absent from the page needs correction before `ready`. A complete report is still not product readiness: installation, runtime proof and release authority stay separate.

## Copyable prototype packet

```text
Project / requirement IDs / plan revision:
Phase: exploration / awaiting decision / approved (source required)
UI owner / owned paths / design-contract path and version:
Known answers, chosen/rejected references, open material choices:
Surfaces and realistic content:
Core clickable path and observable success:
States: empty, loading, success, error, retry, offline, cancel, permission, long content
  [each: required behavior or inapplicable reason]
New look: at least eight genuinely different directions; more on request.
Direction | composition/type/material/interaction difference | trade-off | artifact/version
Recommendation and reason:
Access: start command, cwd, exact artifact hash
Simulated data/actions and limits; native checks still required:
Accessibility/input/motion/device checks:
Decision: person/source/time | chosen direction/flow/version | rejected alternatives
Visual lock: approved tokens/components/interactions/reference images + surface versions
Unapproved/deferred scope: requirement/task | deferral source | owner/revisit trigger
Return: short comparison/result to the lead; full evidence in the existing record
```

## Filled worked example

**Illustrative, not a live run.** A fictional founder runs a small dance studio. Answers are hypothetical, nothing is approved, and commands and paths are fictional. Gaps stay visible: no approved look, hosting account or measured allowance. The plan's author builds, interviews and approves nothing.

Prompt: "Students keep messaging me to book classes. I want them to book on their phones." Original asks: REQ-01 book or cancel a place from a phone; REQ-02 a waitlist that offers a freed place to the first person waiting; REQ-03 the owner edits the timetable and sees bookings; REQ-04 a reminder before class; REQ-05 pay for class passes online.

### Evidence and assumptions ledger

| ID | Kind, source | Finding, confidence | Cost if wrong / state |
| --- | --- | --- | --- |
| E1 | Answer: prompt | Students book on phones, not by message; H | Wrong audience / confirmed |
| E2 | Code: studio site repo, base commit | Static pages; no accounts or database; H | False reuse / confirmed |
| E3 | External: email pricing page, checked on planning date | Free tier covers expected reminders; M | Reminders stop / confirmed; affects REQ-04 |
| E4 | Inference | About 60 students, 12 classes a week; L | Wrong capacity target / open; ask the owner |
| E5 | Gap | No hosting account known | Release blocked / open; lead; holds release tasks only |

### Illustrative question round

Known already, not re-asked: phone booking; an owner view.

| Q | Choice in plain words | Recommended | Impact / cost of a wrong guess |
| --- | --- | --- | --- |
| Q1 | Who books? A students; B parents too, for children; C only the owner | B | Sets accounts; a wrong guess shuts out families |
| Q2 | Sign-in? A emailed link; B password; C name and phone each time | A | A wrong guess loses bookings or exposes names |
| Q3 | Full class? A waitlist with automatic offer; B owner promotes; C none | A | A wrong guess leaves gaps or adds admin |
| Q4 | Free cancellation until? A 2 hours before; B any time; C owner decides | A | A wrong guess empties classes or angers students |
| Q5 | Reminders? A email the day before; B paid text; C none | A | Attendance versus running cost |
| Q6 | Payment in version 1? A at the studio; B online passes; C online per class | A | Fees, tax and risk; a wrong guess adds cost |
| Q7 | Which look? 2-4 finalists after comparing all eight directions | From the clickable comparison | A look locks only after real artifacts exist |

Hypothetical reply: "Your recommendations, except Q6: leave payments out and ask me again after the first month." Record Q1-Q5 as recommended and Q6 as the founder's explicit deferral: REQ-05 stays, founder-owned, revisited after a month of live bookings; payment work is held. Q7 waits for the real comparison. A real session records the actual source, time and exact round shown; otherwise every choice stays unapproved.

Dependent next round: only after a real Q1=B, ask "How many children can one parent account book for? A any number (recommended); B up to three." Q1=A makes it inapplicable, so never ask it. Q3=A adds an offer notice with a time limit; Q3=B would need an owner promotion screen.

### Coverage walk-through

| Category | Basis | Consequence and kept work |
| --- | --- | --- |
| People and situations | Q1=B, E1 | Students, parents and the owner; teachers wait until asked |
| Complete journey | Q1-Q4, REQ-03 | Timetable, book, confirm, remind, attend or cancel; owner's day view |
| Content/output quality | Derived | True places-left counts; studio time zone |
| Priorities | Q6 deferred | Booking and waitlist first; REQ-05 held with owner and trigger |
| Visual and interaction | Q7 open | Eight directions requested; nothing approved |
| Platforms and devices | E1, derived | Phones and the owner's laptop; an older phone for constrained-device checks |
| Accessibility | Derived | Large text, screen-reader labels, keyboard, reduced motion, contrast; device evidence unrun |
| Identity and permissions | Q1=B, Q2=A | Parents act for linked children; only the owner edits the timetable |
| Privacy and data lifetime | Derived; retention open | Names, emails, bookings; deletion on request; retention set before storage work |
| Money and margin | Q6 deferred, E3 | No charges in version 1; costs inside the ceiling; reopen if payment enters scope |
| Failure and recovery | Derived | One winner for the last place; duplicate-free retries; offline shows the last timetable and says why booking waits |
| Operations and support | Derived | Owner exports bookings; failed reminders visible; logs hold no personal details |
| Success measures | Derived; confirm | Booking in under a minute on a mid-range phone; no double bookings under concurrency |
| Acceptance and release | Derived | Prototype decision, one skeleton, whole product; opening to students needs the founder's release authority |

Coverage is accounted for, not approved. A missing code fact is an evidence gap, never a founder deferral; only the reply above defers anything.

### Prototype choice

Through the [prototype interface](planning-loop.md#prototype-interface) the UI owner gets the packet: phone and laptop surfaces, synthetic content (long names, an empty week, a full class) and the path timetable -> class -> book -> confirm -> cancel -> waitlist. It returns eight directions differing beyond colour: calm timetable, studio poster, bold rhythm, paper flyer, photo-led, minimal list, card deck, calendar-first. Illustrative choice: calm timetable, for scanning places left; rejected: bold rhythm (heavy motion on older phones), photo-led (no studio photos). With no real decision, link, hash and approved tokens stay "none yet". States: empty week, loading, booked, full with waitlist, cancelled, offline, error with duplicate-free retry, owner-only screen, long names. Simulate storage and email visibly; test keyboard, focus, readable text and reduced motion on real devices before acceptance.

### Work graph and one task row

Wave 0 task T0 lands first: the booking contract (book, cancel and waitlist inputs, outputs and errors; identity; idempotency key for retries; offline state; reconcile uncertain effects before retry), data schema, stubs and a runnable baseline. T1 builds the timetable and owner view, T2 booking, T3 reminders, T4 approved-look screens (held for the visual lock), T5 online payment (held: REQ-05 deferred, still in the readiness report). One complete row:

```json
{
  "id": "T2",
  "requirement_ids": ["REQ-01", "REQ-02"],
  "outcome": "Book, cancel and waitlist with no double booking or lost place",
  "dependsOn": [{"id": "T0", "gate": "integrated"}],
  "owned_paths": ["src/booking/", "tests/booking/"],
  "contract_refs": [{"id": "CONTRACT-BOOKING", "path": "contracts/booking.json", "version": "v1-at-W0"}],
  "skills": {"selection_ref": "docs/plan.md#skills", "current": ["bg-finish-the-whole-job", "bg-efficiency"],
    "next": ["bg-check-it-before-release"], "read_receipts": []},
  "model_tier": "economical-qualified",
  "account": "alias-1",
  "owner": "booking-worker",
  "workspace": "worktrees/T2",
  "baseline": "W0",
  "permissions": {"inherit_from": "lead session", "effective": null, "authority_ref": "docs/plan.md#authority"},
  "tests": [{"id": "TEST-BOOKING-FAST", "requirement_ids": ["REQ-01", "REQ-02"],
    "command": "npm run test:booking", "cwd": "worktrees/T2",
    "expected": "Book, cancel, waitlist and last-place race pass; one booking wins",
    "evidence_path": ".bgzflow/evidence/T2/fast.txt"}],
  "acceptance_command": "npm run test:booking",
  "return": {"recipient": "integration writer", "control": "one background wait; pickup by job ID",
    "worker_id": null, "request_id": null, "job_id": null, "thread_id": null, "history_ref": null,
    "evidence_location": ".bgzflow/evidence/T2/"},
  "worker_state": "planned",
  "dependency_acceptance": {"state": "pending", "by": null, "candidate": null, "evidence_refs": []},
  "integration": {"owner": "integration writer", "state": "unqueued", "candidate": null, "combined_head": null, "evidence_refs": []},
  "open_findings": []
}
```

The row carries every field the [task schema](../../bg-finish-the-whole-job/references/work-graph.md#task-schema) requires, like the canonical [Task row](../../bg-finish-the-whole-job/references/worker-packet.md#task-row), and records admission, not live status. Identity fields stay null until launch returns them; verify `effective` permissions at launch: a write flag alone does not prove inheritance. Replace labels such as W0 with full commit IDs and add the schema's optional receipt extension at dispatch. Task tests are fast checks; the full suite and critical journeys, such as "full class, waitlist, freed place offered", run once in `whole_candidate_checks` after integration. Gate choice follows the work graph: `integrated` on landed wave 0 here; a lane needing T1's code takes `accepted-dependency` pinned to T1's accepted commit.

### Acceptance, skeleton and whole-product return

Resources: the founder agrees the usage ceiling once (existing subscription, no extra spend, two workers at a time, 45 minutes per job, two repair rounds). T2 and T3 need no device or secret, so they run in included cloud with branch pushes pre-authorised; the older-phone check is local-only.

Skeleton: on one integrated candidate a student books a class, it shows in the owner's day view, and cancelling frees the place. Show it to the founder once, ask only new material questions and keep independent work moving.

Whole product: every agreed flow and identity, the requirement-to-test map, approved-reference versus running-screen comparisons, and accessibility, constrained-device, privacy, recovery and performance evidence. The canonical Worker prompt carries the readiness obligation. A fresh independent checker reviews the exact integrated candidate with [BG Check It Before Release](../../bg-check-it-before-release/SKILL.md); the lead accepts `ready` itself or returns consolidated defects to the same workers, two rounds at most. Opening to students waits for the founder's release authority.

Readiness page (candidate C7): "Partly delivered; not ready for students. Two asks done, two partly, one not done. Students can book, cancel and join a waitlist; the owner sees the day's classes. Booking runs automatically; reminders are scheduled but unproven. Unfinished: REQ-02, REQ-04, REQ-05."

| Original ask | Status | Evidence or gap | Next action and owner |
| --- | --- | --- | --- |
| REQ-01 | done | J1 and J2 passed on C7 | Checker: keep evidence |
| REQ-02 | partly | Checks pass; older-phone journey unrun | Device worker: constrained-device check on C7 |
| REQ-03 | done | J3 passed on C7 | Checker: keep evidence |
| REQ-04 | partly | Scheduler passes with a stub; no real send | Reminders worker: one real send to a test inbox |
| REQ-05 | not done | Deferred by the founder in round 1 | Lead: raise with the founder after a month of live bookings |

Both handoffs carry the page and all five rows with C7; the reviewer reconciles them with the original asks and checks the page names every unfinished ask.
