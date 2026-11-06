> BGZFLOW adaptation: use this technical reference only for the current requested outcome. Existing user decisions, actual project architecture and host permissions govern. Numeric examples and aesthetic opinions below are options, not universal rules, new gates or authority to redesign. External products, model weights and licences need current verification before use; none is installed by reading this page. Use the same brief and private project records; do not modify installed learning files.

---
title: interfaces-reconciliation
summary: Jakub Krehel's interfaces skills (better-* domain skills, interface-review, break, state-machine, variant, explain-interface, build-design, teardown) as companions — which job each owns when installed, what this graph distilled from them, and twelve value conflicts settled. Exact values and WCAG criteria are his; motion ratios, the default press, APCA for design and the installer's pov stay here.
tags: [meta, companion, interfaces, reconciliation, accessibility, review]
---

# interfaces, reconciled

Jakub Krehel's skills (`npx skills add jakubkrehel/skills`, or the `interfaces` Claude Code plugin) split interface craft into six domain skills — `better-accessibility`, `better-layout`, `better-writing`, `better-typography`, `better-colors`, `better-ui` — an orchestrator, `better-interface`, and seven verb skills. Every domain skill blocks on evidence (a WCAG criterion, a visible break, an exact value missed) and treats a deliberate project convention as a preference, which is the same bar as [review-format](review-format.md). Most of its domain rules were already in this graph; what was new is distilled into [screen-reader-announcements](../components/screen-reader-announcements.md), [keyboard-patterns](../components/keyboard-patterns.md), [wcag-thresholds](../components/wcag-thresholds.md), [strings-and-locale](../components/strings-and-locale.md), [destructive-actions](../components/destructive-actions.md), [color-token-tiers](../surface/color-token-tiers.md), [palette-step-roles](../surface/palette-step-roles.md), [gradient-interpolation](../surface/gradient-interpolation.md), [logical-properties-rtl](../layout/logical-properties-rtl.md), [growth-and-overflow](../layout/growth-and-overflow.md), [grouping-by-space](../layout/grouping-by-space.md), [change-scoped-review](change-scoped-review.md), [stress-scenarios](stress-scenarios.md) and [reading-others-interfaces](reading-others-interfaces.md).

## Who owns what when it is installed

| Job | Companion | This graph keeps |
|---|---|---|
| Review a branch, PR or uncommitted change | `/interface-review` (user-invoked) | the table shape and [pov](pov.md); without it, [change-scoped-review](change-scoped-review.md) |
| Review a whole screen or flow across domains | `better-interface` | [review-checklist](review-checklist.md) rows still apply; [ui-reviewer](https://github.com/AgentsORG/design-engineering/blob/dbbe43b5e17c7525409ad4905b3857852cd5174d/agents/ui-reviewer.md) when not installed |
| Stress one component; walk its product states | `/break`, `/state-machine` (user-invoked) | [stress-scenarios](stress-scenarios.md) |
| Three variants of one piece behind a picker | `/variant` (user-invoked) | [prototype-picker](prototype-picker.md)'s decision record |
| How another site or effect was built | `/explain-interface` (user-invoked) | [reading-others-interfaces](reading-others-interfaces.md) |
| Build from a Figma file or image | `build-design` (needs a Figma MCP) | the contract precedence in [skill-router](skill-router.md) |
| A technical illustration, exploded view or teardown drawing | `teardown` | [diagram-decision](../diagram/diagram-decision.md) when it is really a diagram |

Respect actual invocation restrictions and supported host controls. If a method cannot be invoked, state the gap and continue useful authorised work rather than stopping to make the user run a command. No imported verdict scheme outranks the current task and project policy.

## Conflicts, settled

| Topic | interfaces | This graph | Settled |
|---|---|---|---|
| Button and heading case | one policy per element type; sentence case when none | [copy-voice](../components/copy-voice.md): Title Case | Consistency is the rule; with no policy, sentence case. [pov](pov.md) decides for this install |
| Validation timing | validate on submit, focus the first invalid field | [forms-validation](../components/forms-validation.md): hard check on blur | Both: blur for format errors on a field left, submit always re-runs, focuses and announces. Keep submission and duplicate-effect handling appropriate to the actual state; neither always enabled nor always disabled is a valid universal rule |
| Focus ring | prefer the browser's own; a custom one only as a verified token | [accessibility-baseline](../components/accessibility-baseline.md): a brand ring beats default blue | A brand ring is fine **when** it clears 3:1 against every colour it crosses and survives forced colours ([wcag-thresholds](../components/wcag-thresholds.md)) |
| Contrast math | WCAG 2.2 ratios | APCA first ([contrast-and-color-scheme](../surface/contrast-and-color-scheme.md)) | Design with APCA; a finding cites the WCAG ratio |
| Press scale | Source examples 0.96/150ms | Other examples use 0.97 | Use the approved feedback and stable actual hit geometry; no required scale or timing |
| Stagger | 100 ms between semantic chunks (title, body, actions) | 30–80 ms per list item ([stagger-choreography](../motion/stagger-choreography.md)) | Different units: chunks of one entrance 100 ms, items in a list 30–80 ms |
| Exit | 150 ms, opacity + 4px blur + fixed −12px | 60–80 % of the enter ([duration-table](../motion/duration-table.md)) | His values for the staged 300 ms entrance; the ratio for panels and overlays |
| Icon swap | cross-fade, scale 0.25 → 1, blur 4px → 0, bounce 0 | [review-checklist](review-checklist.md) row 5: transform one icon | Related geometry morphs or rotates ([morphing-icons](../motion/morphing-icons.md)); unrelated glyphs (play/pause, copy/check) take his cross-fade |
| Variant host | the real page, `?__variant=` link | [prototype-picker](prototype-picker.md): `/proto/<slug>` | The real page when the piece lives on one; a proto route when no page exists yet |
| Hover gate | `(hover: hover)` | `(hover: hover) and (pointer: fine)` ([touch-and-focus](../components/touch-and-focus.md)) | Either; Tailwind 4's `hover:` already compiles under `(hover: hover)` |
| Measure | 60–75 characters | 45–75, 65ch default ([line-length-tracking](../typography/line-length-tracking.md)) | choose the measure for the content, script, font and task; outside 45–75 characters is not automatically a defect |
| Neutrals | Pure grey is one option | Tinted neutrals are another | Preserve the approved palette; mixed warm/cool neutrals can also be intentional, and a finding needs an actual consequence |

## Gotcha

His skills cap a review at 15 findings and forbid inventing a diff scope. Running `better-interface` on a request that names a PR yields an instruction to run `/interface-review`, not a review. That is correct behaviour, not a failure: pass the command on.

## Sources

- Jakub Krehel, interfaces skills (MIT, github.com/jakubkrehel/skills, HEAD `592aedc`, plugin `interfaces` 1.17.0, read 2026-10-25): `AGENTS.md` (rule ownership, invocation), every `skills/*/SKILL.md`, and the reference files cited in each distilled node. Values are his; the glosses and settlements are this graph's.
- Related: [skill-router](skill-router.md), [routing-table](routing-table.md), [cinetic-reconciliation](../launch-video/cinetic-reconciliation.md) (the same pattern for a film companion).
