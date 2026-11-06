> BGZFLOW adaptation: use this technical reference only for the current requested outcome. Existing user decisions, actual project architecture and host permissions govern. Numeric examples and aesthetic opinions below are options, not universal rules, new gates or authority to redesign. External products, model weights and licences need current verification before use; none is installed by reading this page. Use the same brief and private project records; do not modify installed learning files.

---
title: animation-decision-framework
summary: Compare motion’s purpose, frequency, accessibility and actual cost while preserving the approved experience.
tags: [motion, animation, decision]
---

# Animation decision framework

The most-skipped step in design engineering is asking "should this animate at all?" Do not assume either animation or its removal is the right answer; the current task, approved experience and observed behaviour decide. Read this before reaching for keyframes.

## The decision tree

1. **How often does the user encounter this?** See [delight-impact-curve](../philosophy/delight-impact-curve.md).

   | Frequency | Decision |
   |---|---|
   | Very frequent (shortcuts, command palette, tab switches) | Keep interaction immediate and motion unobtrusive; assess rather than imposing a frequency cutoff |
   | Tens of times a day (hover, list navigation) | Near-imperceptible, or nothing |
   | Occasional (modals, drawers, toasts) | Standard animation |
   | Rare or first-time (onboarding, success) | The delight budget lives here |

   **Keyboard input is not a motion disqualifier.** Preserve immediate response, focus and the user’s motion preference; assess an effect by its purpose and cost. **Data the user is reading or acting on** (charts, tables, numbers) doesn't move for style; animate only a real change in value.
2. **What is the purpose?** Explain the relevant value rather than selecting a compulsory single label:
   - **Feedback** — confirm the action happened (press, hold-to-confirm fill).
   - **Spatial consistency** — show where something came from or went (see [fly-not-teleport](fly-not-teleport.md)).
   - **State indication** — make a state change legible.
   - **Preventing a jarring change** — bridge content that would otherwise teleport.
   - **Explanation** — show how something works where the actual task benefits.
   - **Delight** — purposeful expression within the approved product, considering repetition and user control.

   Reasons to examine rather than automatic permission:
   - **Decoration** — can support an approved expressive direction, but should not obstruct the task.
   - **Filling time** — animation to mask slow code (fix the code).
   - **"Because we can"** — Framer Motion is installed and we should use it.

3. **Which tool?** The cheapest that works: CSS transition (state you toggle) → `@starting-style` (entry on mount) → CSS animation (predetermined motion while the page is busy) → WAAPI (JS control, CSS performance) → Motion (springs, layout, exits, gestures). If the job is a whole component (toast, drawer, menu), use a library ([dependency-discipline](../philosophy/dependency-discipline.md)).
4. **What easing curve?** Use an approved curve or compare appropriate built-in and custom curves. See [easing-curves](easing-curves.md).
5. **How long?** Use the product’s timing and measured responsiveness; 100–160 ms button feedback is an example, not a ceiling. See [duration-table](duration-table.md).
6. **What property?** Compare likely compositor-friendly properties with any geometry or paint changes the effect actually needs. See [transform-opacity-only](transform-opacity-only.md).

## Quick checks before adding any animation

- Does it help the approved experience without harming usability? Do not delete requested motion merely because the interface would function without it.
- Does it survive [prefers-reduced-motion](prefers-reduced-motion.md)? If not, fix it.
- Will it look right at 25% playback speed? If not, the timing is off.
- Would it still feel right on the 50th encounter? See [delight-impact-curve](../philosophy/delight-impact-curve.md).

## Application heuristics

- **Persistent elements:** if a component is present before and after a state change, consider a shared transition, crossfade or instant change according to meaning, support and motion preferences. See [fly-not-teleport](fly-not-teleport.md).
- **Symmetric vs asymmetric timing:** enter and exit often want different durations. Exits can be faster. See [duration-table](duration-table.md).
- **Stagger only when grouping helps comprehension.** Random stagger reads as noise.

## Gotcha

The bug is almost never "this needs more animation." The bug is almost always "this animation is doing the wrong thing." Adding motion to fix bad UI compounds the problem. Fix the UI first.

## Sources

- Emil Kowalski — animation decision tree (frequency-first).
- Emil Kowalski, skills (MIT, github.com/emilkowalski/skills, a81dbca): skills/animate/SKILL.md (frequency tiers, purposes, tool ladder), skills/find-animation-opportunities/SKILL.md (function test).
- Related: removing what fails this gate → [animation-removal-hazards](animation-removal-hazards.md).
- Benji Taylor — "animation should serve architecture."
