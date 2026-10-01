---
name: bg-personal-product-design
description: Use when designing, redesigning or polishing screens, flows or a new look for web, desktop, native or chat products, including rendering several distinct directions, locking the approved look and verifying the real customer journey on devices.
---

# BG Personal Product Design

## When to use

Use for a new product, major screen, interaction, redesign or visual refinement. Load or retain [BG Efficiency](../bg-efficiency/SKILL.md). Use the [glossary](../bg-build-with-me/references/glossary.md), requirement IDs, C4 identifiers and the [delivery contract](../bg-build-with-me/references/decision-and-delivery-contract.md); create no parallel names.

The lead plans, dispatches directly, reads short results and decides; workers do the substantial reading, design, coding and testing; a fresh independent checker checks, all through the [worker route](../bg-build-with-me/references/worker-route.md). Keep the actual job, thread and worktree identity. Use one background wait and a short result: no default worker board, forwarding agent, polling loop or mandatory second-vendor checker. Return consolidated repairs to the exact owned job, at most two repair rounds, then report open findings. Never blindly resume the last task from a shared parent directory.

"Personal" means the founder's own recorded choices: the project's `DECISIONS.md` and, when present, the overlay's `FOUNDER.md` (taste and preferences) and `PROJECTS.md` (each product's approved identity and exclusions).

## Numbered checklist

1. **Admit the task. Output: admission section in the existing task packet.** Verify worktree, branch, admitted base, dirty paths, owner, phase and holds. Read the checkpoint and the product's recorded identity. Load current/next [coverage](../bg-build-with-me/references/capability-coverage.md): this skill, efficiency, accessibility, a design-critique pass, UI craft and the matching platform and testing capabilities. Apply one bounded [selection](../bg-build-with-me/references/skill-selection.md) or its recorded one-pass fallback. Record actual reads separately from tools; keep mandatory coverage.
2. **Recover authority. Output: source and decision ledger in the [design contract](references/design-contract.md).** Read the exact token and component sources and the approved and rejected artifacts; pin hashes; distinguish current code, approved target, illustrative concept and functional acceptance. Use the founder's recorded preferences for concrete recipes, and the [starter foundation](references/starter-foundation.md) only as proposals. The latest direct instruction and recorded approval govern; a source comment alone never approves a running build. Assign unknown facts to their owner.
3. **Choose each surface's job. Output: surface brief and screen/state rows.** Choose Persuade for a decision or action, Operate for completing a task, Read for understanding, or Experience for the artifact itself. Map entry → core action → result → recovery, including loading, empty, error, retry, offline, cancellation, permission, draft, pending and unknown outcomes. Keep existing API and operation identities and semantics.
4. **Explore a genuinely new look. Output: direction matrix, rendered contact sheets and clickable prototypes.** Apply [the variation procedure](references/techniques.md#eight-or-more-rendered-directions). Start with at least eight materially different rendered options; offer more on request. Vary composition, type, shape, density, material, theme and motion, not just palette. A fixed house style from any preset or polish skill may be one direction; it is never the rule for the others. Never repeat the previous project's direction unless the founder asks for that continuity. There is no universal dark or glass default. New products and major screens get a clickable prototype by default; small changes reuse the approved design. A text table of options does not count as a rendered round.
5. **Lock what the founder actually chose. Output: approval record and approved-token manifest.** Bind the decision ID, system-clock timestamp, exact shown prototype and token hashes to the colour, font, corner, material and composition choices, supported and default modes, and permitted effect fallbacks. When the founder combines attributes, render the combined whole before recording approval. An approved look stays locked until the founder's new decision changes it; ask before changing it and never re-ask a settled decision. Technical fixes inside the lock continue under existing authority.
6. **Apply craft as actions. Output: token/component specification and, when assigned, the implemented candidate.** Resolve semantic roles into the chosen identity and platform units. Keep setting cards, switches, result boxes, glass and backgrounds available without forcing them onto every surface. Set a nested inner radius to `max(0, outer radius − inset)`; optically align visible glyphs without shrinking hit targets. Apply the [eight polish principles](references/techniques.md#eight-polish-principles) and the rendered-option workflow. Reject generic repeated layouts and invented values.
   - Apply the [motion and effects contract](references/motion-and-effects.md) to every effect; keep device and accessibility evidence.
7. **Build, polish every screen, see and repair. Output: candidate-bound visual, interaction and device evidence plus one final-polish record per screen.** Run the [surface checklists](references/design-contract.md#surface-checklists) on the actual supported app, browser or device. Keep full approved effects on capable devices; reduce only the measured offending effect and respect reduced motion and transparency. Judge the full look on a named judging device and test a constrained device separately. For Android, visibly test → repair → retest in development and in integrated acceptance; record emulator limits. Keep each product's recorded material exclusions. As the last design step on **every** app and web screen, run the [final polish pass](references/techniques.md#final-polish) (with a polish skill if one is installed): keep the chosen direction's or approved look's fonts, layout and tokens, and apply everything else it asks. If it calls for randomisation or code, actually run it and record the seed and output; never claim a run that did not happen. Rerun this step's checks on anything the polish changed. On chat-message surfaces, run only its wording, contrast and layout checks.
8. **Hand back for independent inspection. Output: exact candidate, checks, findings and next owner.** Supply the approved-token guard and decision ID, overflow and clipping result, approved-reference/running-app screenshot pair, real customer flow and exact device and environment. Separate planning and prototype evidence from runtime evidence under [UI acceptance](references/design-contract.md#ui-acceptance-artifacts). Apply the [evidence reference](../bg-check-it-before-release/references/enforcement.md) with `intent-and-profile`, `design-decisions`, `states-and-flows`, `accessibility`, `platform-and-performance`, `visual-evidence`, `next-action`. Pass to [BG Check It Before Release](../bg-check-it-before-release/SKILL.md): a fresh independent checker assesses the exact candidate; the builder never approves it.

## Copyable templates

Use the [design plan, token, component, screen/state and approval templates](references/design-contract.md#copyable-design-plan). Keep one existing task and graph; use the shared [worker packet](../bg-finish-the-whole-job/references/worker-packet.md), [work graph](../bg-finish-the-whole-job/references/work-graph.md) and [question round](../bg-plain-english-builder/references/question-round.md#copyable-question-round). Ask only genuinely unresolved product questions.

```text
UI worker brief
GOAL / requirement IDs / phase:
PROJECT: exact worktree, branch, admitted base, owner, job/thread:
READ (pointers): checkpoint; source hashes; decision IDs; selected current/next skill bodies:
DO: owned paths; screen/state rows; direction or approved-look boundary:
PERMISSIONS: job-level grants (override shared boilerplate); holds; excluded effects; other-owner files; live operations:
CAPS: time and size limits:
DONE WHEN: exact acceptance cases and candidate/device; required outputs:
PROVE: guard; overflow; screenshot pair; flow; accessibility/performance; final-polish record:
RETURN: short result + full evidence path; repairs stay with this owner:
```

```text
UI handback
Status / phase / original outcome:
Candidate/base + file/artifact/config hashes; job/thread + owner + executor:
Sources/approval IDs; selected bodies actually read; tools run or unavailable:
Changed screens/files; token changes and decision coverage:
Checks: command, exit, actual result, evidence path/hash, native/fixture/manual:
Final polish: each screen covered, what changed, seed/output if it ran code:
Open finding IDs + owner + next action:
Next: independent checker and exact candidate; remaining holds:
```

## Red-flag thought → required action

| Thought | Required action |
|---|---|
| "Eight recolours should count." | Replace them with distinct layout, type, material, density and shape directions rendered on equivalent content. |
| "The founder likes dark glass everywhere." | Recover this product's recorded choice; propose real variety for new work. |
| "This screenshot proves it works." | Exercise the customer flow and recovery; separate illustrative from functional evidence. |
| "The kit is approved, so its new font is approved." | Find the exact product decision and hash; otherwise keep it proposed. |
| "Make every device flat to be safe." | Profile full effects, reduce only the offending effect, keep approved exclusions. |
| "The polish pass is only a style preset; skip it." | Run it in full as the final step on this screen; only its fixed fonts and layouts are optional. |
| "The polish skill says use its font, so change the approved one." | Keep the approved look; its fonts and layouts are one style option, not the rule. |
| "Hide the overflow and call it fixed." | Inspect clipped content, repair the layout, rerun long-text and zoom cases. |
| "The source says 60 fps, so it passes." | Measure the exact candidate on the device; report unrun hardware checks. |
| "A record pass approves my candidate." | Return to the independent checker; keep phase and verdict distinct. |

## One filled worked example

For a fully filled screen specification, use the [filled example](references/design-contract.md#filled-example): a fictional screen with its approved recipe, states, exclusions and a later superseding decision. Planned runtime checks stay `unrun`; only the source and saved preview were inspected. The lead receives the candidate per the assignment, then owns commit, integration and the fresh independent check. Illustrative; no look is approved and no app is built by this example.
