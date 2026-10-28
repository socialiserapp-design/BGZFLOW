---
name: bg-plain-english-builder
description: Use when a new product, major feature or changed goal is described in everyday words, fragments or examples and needs discovery questions, current research, a clickable prototype and a complete buildable plan before building starts.
---

# BG Plain English Builder

## When to use

Use for a new or materially changed outcome. Fragments, dictation and examples are valid input: infer the necessary professional work without inventing features or product choices. Reuse settled plans for small changes. Load or retain `bg-efficiency` and the [shared glossary](../bg-build-with-me/references/glossary.md).

The lead asks the product questions, makes decisions and dispatches bounded worker jobs for research, prototypes and detailed planning through the [worker route](../bg-build-with-me/references/worker-route.md). Give workers exact paths and questions; the lead reads short results instead of rereading whole repositories. Keep the current lead and worktree.

## Checklist

1. **Stage 0 Whole-System X-Ray, Zero-Bottleneck Self-Setup & Adaptive Short-Prompt Expansion (`bgz egm` + `bgz goal`).** Read the map, current owner, one-page checkpoint, retained work and `DECISIONS.md`. Run `bgz egm xray` across all 6 system lifecycle stages (`Inputs -> State/Exclusivity -> Queue/Epochs -> Generator/Budget -> Delivery/Fallbacks -> Trace/Learner`) and `bgz egm autosetup` (auto-provisioning `.bgzflow/traces/execution-trace-schema.json` without asking user permission). Run `bgz egm mentor --prompt ...` to block sycophantic symptom-patching, teach relevant architecture principles in plain English, and expand the user's short everyday prompt into plain-English intent (`bgz goal compile --prompt ... --display plain_only|plain_plus_spec`), automatically attaching the domain's Expert Unknown-Unknowns Playbook (`origin: "standard_quality_check"`). Output: one brief stating the intended outcome, unasked system X-Ray findings, plain-English architecture lessons, and the genuinely unresolved branches.
2. **Select expertise (Open-World, never hardcoded to fixed personas).** Apply the router's required stage and platform [coverage](../bg-build-with-me/references/capability-coverage.md), autoloading [BG EGM Co-Architect](../bg-egm-coarchitect/SKILL.md) and [Research Scout & Open-Source Discovery](../research-scout-ground-truth/SKILL.md), then dynamically discover relevant domain specialists across any field (software, research, law, marketing, finance, operations, creative or everyday goals). Combine useful interviewing and brainstorming methods into one coherent interview. Read selected bodies; reconsider after meaningful answers or research. Output: selected skill versions, actual reads and the current/next-stage rationale.
3. **Explore the vision in STE Plain English & Co-Design the Task Eval Card (`bgz eval codesign`).** Follow [question rounds](references/question-round.md). Every user-facing question, option and summary must obey **BGZFLOW Plain-English Plain English** (`bgz goal check-ste` and `bgz jev score --preset ste-plain-english`, `pass_at: 0.85`: short sentences, one idea per sentence, zero internal code/hook/tool jargon). Score goal clarity with `bgz jev score --preset goal-clarity --state @brief.md` (`outcome`, `constraints`, `verification`, `authority`): keep asking targeted plain-English questions on `missing_dimensions` until `value >= 0.88` (`ready_to_execute: true`), then lock the Task Eval Card (`bgz eval codesign`) and compile the plain-English answers into `.bgzflow/active-goal.json` via `bgz goal compile`. For long-horizon work, let the founder opt into milestone check-ins when key outcomes are reached. Output: coverage and decision rows in the existing brief, each accepted decision recorded in `DECISIONS.md` with a system-clock timestamp at the moment it is made.
4. **Mandatory 4x4 Open-Source Discovery ("Download Instead of Build") & Pre-Decision Ground-Truth Research (`bgz eval research` + `bgz skill-forge`).** Before locking any architectural, legal, scientific, commercial or technical decision, run a **4-Channel (`github,social_dev,community_forums,registries_or_papers`) x 4-Angle (`problem_symptom,mechanism_architecture,ecosystem_alternatives,recent_breakout`)** open-source and ground-truth search (`bgz eval research`) so you discover and download existing permissive (`MIT`/`Apache-2.0`/`BSD`) tools, packages, or skills (`bgz skill-forge`) instead of building solved components from scratch. Verify every external assumption against primary documentation or a live probe (`swarm-gate record ground-truth` and `bgz eval claims`). Output: dated primary sources, verified open-source Build-vs-Buy picks (`bgz eval architecture`), ground-truth probes and their effect on the plan.
5. **Show the experience & Multimodal Visual QA.** New products and major screens get a clickable prototype before implementation. Follow the [prototype interface](references/planning-loop.md#prototype-interface) through [BG Personal Product Design](../bg-personal-product-design/SKILL.md): at least eight genuinely different directions for a new look and no universal dark or glass default. Small changes reuse approved designs. Lock the actual approved look and interaction; record rejected alternatives. When visual slices are built, verify every real device or browser screenshot with Multimodal Jev 1.14 (`bgz verify --visual --screenshot <path> [--mockup <path>] [--find-box <target>]`) so broken layouts or missing controls block completion automatically. Output: the filled prototype packet, the actual decision source and remaining scoped questions.
6. **Engineer the agreed outcome, Rebuild-vs-Evolve Triage & Stateless 6-Lens Goldfish Pre-Code Gate (`bgz egm goldfish`).** Derive architecture, domain terms, interfaces and data, trust boundaries, failure and recovery, compatibility, performance and verification from the founder's choices. Classify each subsystem explicitly as `rebuild` (replace broken legacy UI/wrappers cleanly from the approved spec and list retired source-shape guard tests), `evolve` (surgical improvement to a sound module), or `keep-shared-brain` (preserve verified domain/backend logic while rebuilding the surface cleanly). Pass the specification through the **Stateless Zero-Context 6-Lens Goldfish Gate (`bgz egm goldfish`)** under the strict No-Code Rule: implementation code stays locked (`codeUnlocked: false`) until all 6 lenses (`Root-Cause/YAGNI`, `State/Epoch-Cancellation`, `UX/Zero-Black-Holes`, `Cost/Token-Ceiling-Chunking`, `Lineage-Trace/Learner`, `Migration/Rollback`) pass. Output: shared contracts, subsystem `triageMode`, passing Goldfish receipt, and requirement IDs.
7. **Make execution ready.** Fill the [plan template](references/plan-template.md#copyable-plan) in the existing project record. Map every requirement to end-to-end vertical slices (never split a slice into "Stage A UI shell" and "Stage B wiring"), dependencies, capabilities and tools, and observable **USED** outcome contracts (`BUILT -> REACHED -> USED`). Name integration and review owners; include the account portfolio, dated allowance, once-agreed usage ceiling and existing authority and holds. Mark included-cloud versus local-only tasks. Agree the early working-skeleton checkpoint (and any opted-in milestone check-ins) and the whole-product handback. Output: a complete plan, a work graph in the existing schema and an acceptance map.
8. **Hand off.** Reflect the whole intended result back in plain language. Stop discovery when `goal-clarity >= 0.88` and every relevant coverage row is answered, evidenced, irrelevant with a reason, or explicitly deferred by the founder. Hold dependent undefined work, keep its requirement and continue independent ready work. On plan approval, launch ready workers through [BG Finish the Whole Job](../bg-finish-the-whole-job/SKILL.md) within the agreed ceiling, with no routine launch approval. Require delivery and final review to return the **readiness report**: one plain-English page plus every original ask marked done / partly / not done, with evidence and the next action for each. Deferred or unverified asks stay visible; a worker's subset never replaces the full list. Output: exact plan and prototype decisions, copyable briefs, the readiness-report obligation and its owner, and the next stage.

The [planning loop](references/planning-loop.md) supplies detailed coverage. Planning prototypes are exploration; this stage never silently deploys or starts production implementation.

## Copyable templates

Use these canonical templates inside the existing plan and checkpoint:

| Artifact | Copy from |
| --- | --- |
| Complete plan and assumptions/evidence ledger | [Plan](references/plan-template.md#copyable-plan) |
| Prototype, decisions and visual lock | [Prototype packet](references/plan-template.md#copyable-prototype-packet) |
| Task with owned paths and acceptance | [Task row](../bg-finish-the-whole-job/references/worker-packet.md#task-row), validated against the [work graph](../bg-finish-the-whole-job/references/work-graph.md#task-schema) |
| Bounded worker assignment | [Brief](../../templates/BRIEF.md) and [worker prompt rules](../bg-finish-the-whole-job/references/worker-packet.md#worker-prompt) |
| Exact-candidate return | [Worker handback](../bg-finish-the-whole-job/references/worker-packet.md#worker-handback) |
| Questions, answers and dependent branches | [Question round](references/question-round.md#copyable-question-round) |
| Accepted decisions | [DECISIONS.md](../../templates/DECISIONS.md) (the index; engineering decisions are numbered [ADRs](../../templates/ADR.md) in the code repo's `docs/adr/`) |

Use this short cover note with the full plan and linked packets:

```text
Outcome/users:
Existing project/owner/evidence:
Requirements: ID | behaviour | important failure | acceptance evidence
Decisions: ID | founder's choice/source/time | rejected alternative | unresolved/deferred work
Design: clickable prototype/reference | actual approval | shared contracts/glossary
Work: task | prerequisite | owned scope | executor/capabilities | integration owner
Resources: account allowance source | agreed ceiling | local/cloud requirements
Delivery: early skeleton | whole-product checks | reviewer | release authority/holds
READINESS REPORT (mandatory): one plain-English page + EVERY original ask
  | done / partly / not done | evidence or named gap | next action and owner for EACH
Delivery handoff: readiness-record path + exact candidate + report owner
Final-review handoff: verify the page and the complete source-matched checklist; missing
  rows, missing evidence or unsupported done claims need correction before ready
Next: stage | owner | exact plan/artifacts
```

"Test everything" expands to the whole applicable requirement and risk coverage in the shared vocabulary, not just existing scripts. The founder never needs to invent a technical test checklist.

## Red-flag thought → required action

- "They named only three skills" → consider all relevant expertise, not only their examples.
- "A rough prompt means they want a rough product" → ask and engineer the complete intended outcome.
- "A question is deferred, so omit that feature" → keep its requirement and the affected dependency.
- "They already agreed broadly" → invent no new visual choice, spending or release authority.
- "Planning needs several extra review rounds" → the lead decides; a fresh independent checker examines the exact finished candidate; two repair rounds at most, then return open findings.
- "Resume the last job from the parent folder" → verify the intended recorded job, thread and workspace before any repair; route an identity gap to the existing lead.

## Filled worked example

Walk the [illustrative example](references/plan-template.md#filled-worked-example) through all coverage categories, a sample question round, the prototype choice, one complete task in the existing schema, acceptance and the skeleton/whole-product return. Its product choices stay unapproved. Reuse settled decisions from `DECISIONS.md` and the overlay; the example neither starts a new interview nor authorises building anything.

## Handoff evidence

At the plan handoff use the short handover checklist (the full record gate runs only at review and release), covering `intent`, `decisions`, `research`, `architecture-and-contracts`, `acceptance`, `work-and-dependencies`, `next-action`. Read the actual artifacts and decisions; matching records alone cannot establish semantic quality. Run no extra gates on every message.
