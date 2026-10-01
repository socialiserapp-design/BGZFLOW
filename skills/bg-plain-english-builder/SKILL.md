---
name: bg-plain-english-builder
description: Use when a new product, major feature or changed goal is described in everyday words, fragments or examples and needs discovery questions, current research, a clickable prototype and a complete buildable plan before building starts.
---

# BG Plain English Builder

## When to use

Use for a new or materially changed outcome. Fragments, dictation and examples are valid input: infer the necessary professional work without inventing features or product choices. Reuse settled plans for small changes. Load or retain `bg-efficiency` and the [shared glossary](../bg-build-with-me/references/glossary.md).

The lead asks the product questions, makes decisions and dispatches bounded worker jobs for research, prototypes and detailed planning through the [worker route](../bg-build-with-me/references/worker-route.md). Give workers exact paths and questions; the lead reads short results instead of rereading whole repositories. Keep the current lead and worktree.

## Checklist

1. **Recover the starting point.** Read the map, current owner, one-page checkpoint, retained work and `DECISIONS.md`. Inspect the available facts. Output: one brief stating the intended outcome, known choices and the genuinely unresolved branches.
2. **Select expertise.** Apply the router's required stage and platform [coverage](../bg-build-with-me/references/capability-coverage.md), then relevant specialists. Combine useful interviewing and brainstorming methods into one coherent interview. Read selected bodies; reconsider after meaningful answers or research. Output: selected skill versions, actual reads and the current/next-stage rationale.
3. **Explore the vision.** Follow [question rounds](references/question-round.md). Ask concrete product, experience and business questions with options and a recommendation, in manageable numbered rounds. Cover the relevant decision tree thoroughly rather than minimising interaction. The founder may answer in ordinary language or accept the recommendations with named exceptions. Output: coverage and decision rows in the existing brief, each accepted decision recorded in `DECISIONS.md` with a system-clock timestamp at the moment it is made.
4. **Research while discovering.** Check current primary documentation, relevant code and existing solutions without waiting to be asked. Assess fit, constraints, cost, maintenance and licensing; videos and repositories help discovery but consequential claims need verification. Stop each branch when evidence supports its decision. Output: dated sources, findings and their effect on the plan.
5. **Show the experience.** New products and major screens get a clickable prototype before implementation. Follow the [prototype interface](references/planning-loop.md#prototype-interface) through [BG Personal Product Design](../bg-personal-product-design/SKILL.md): at least eight genuinely different directions for a new look and no universal dark or glass default. Small changes reuse approved designs. Lock the actual approved look and interaction; record rejected alternatives. Output: the filled prototype packet, the actual decision source and remaining scoped questions.
6. **Engineer the agreed outcome.** Derive architecture, domain terms, interfaces and data, trust boundaries, failure and recovery, compatibility, performance and verification from the founder's choices. Other domains (documents, video, research) use their own production contracts. Output: shared contracts and requirement IDs, with no hidden product change presented as a technical decision.
7. **Make execution ready.** Fill the [plan template](references/plan-template.md#copyable-plan) in the existing project record. Map every requirement to owned work, dependencies, capabilities and tools, and observable acceptance. Name integration and review owners; include the account portfolio, dated allowance, once-agreed usage ceiling and existing authority and holds. Mark included-cloud versus local-only tasks. Agree the early working-skeleton checkpoint and the whole-product handback. Output: a complete plan, a work graph in the existing schema and an acceptance map.
8. **Hand off.** Reflect the whole intended result back in plain language. Stop discovery when every relevant coverage row is answered, evidenced, irrelevant with a reason, or explicitly deferred by the founder. Hold dependent undefined work, keep its requirement and continue independent ready work. On plan approval, launch ready workers through [BG Finish the Whole Job](../bg-finish-the-whole-job/SKILL.md) within the agreed ceiling, with no routine launch approval. Require delivery and final review to return the **readiness report**: one plain-English page plus every original ask marked done / partly / not done, with evidence and the next action for each. Deferred or unverified asks stay visible; a worker's subset never replaces the full list. Output: exact plan and prototype decisions, copyable briefs, the readiness-report obligation and its owner, and the next stage.

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
| Accepted decisions | [DECISIONS.md](../../templates/DECISIONS.md) |

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
