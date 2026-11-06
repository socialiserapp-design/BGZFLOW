---
name: design-animation-review
description: Inspect and improve actual animation timing, gesture handoff, interruption, choreography and frame performance using Emil Kowalski's detailed standards and implementation recipes. Use for motion review, janky interactions, drawers, toasts, transitions or coordinated animation; preserve approved effects.
---

# Animation review and repair

Use the existing request and latest approved visual direction. Review means inspect and explain; implement repairs only when the task authorizes them. Do not begin with a canned introduction or a second questionnaire. Pair with design-motion for broader direction; this skill supplies detailed craft review and code recipes rather than another design authority.

1. Identify the affected interaction, actual framework/library versions, trigger frequency, current purpose and supported devices. Inspect existing implementation and tokens. Do not invent a device result from code.
2. Load [review procedure](references/review-procedure.md) for the relevant dimensions: response, easing, origin, interruption, enter/exit relationships, rendering cost and accessibility. Load [standards](references/STANDARDS.md) when a curve, duration or gesture detail is useful. Numbers and taste preferences are starting points, never automatic blocks or permission to remove approved motion.
3. Exercise the real interaction normally and with rapid reversal, repeated input, keyboard/touch, reduced motion and affected responsive layouts. Check whether an animation delays feedback, prevents an action, moves focus or obscures the real state. An animated success is not evidence of a saved effect.
4. For observed stutter, use the available performance trace to distinguish busy JavaScript, repeated React state updates, inherited-variable recalculation, layout/paint and expensive filters. Prefer an existing appropriate primitive. Compositor behavior depends on browser/content; transform/opacity is a useful starting point, not a guarantee. Check installed library support before prescribing upgrades.
5. When repairing requested code, load only the relevant [interaction recipes](references/RECIPES.md) or [choreography patterns](references/CHOREOGRAPHY.md). Adapt to existing tokens and accessibility. Cancel/retarget decorative work without dropping actual input; clean up owned animation handles on unmount. Do not add a hold, confirmation step, loop, dependency or migration merely because an example contains it.
6. Verify the changed interaction on the actual available browser/device and read back its underlying effect when applicable. Report concrete defects, measured behavior and unverified surfaces separately from aesthetic suggestions. Preserve the approved result unless the user chooses a different direction. No mandatory verdict table, release block or new record.

The detailed methods and examples are substantive adaptations of the MIT-licensed upstream library; see [source and modifications](SOURCE.md). Loading this skill does not run code, contact a service or prove runtime behavior.
