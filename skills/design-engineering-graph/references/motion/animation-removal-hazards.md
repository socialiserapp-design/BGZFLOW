> BGZFLOW adaptation: use this technical reference only for the current requested outcome. Existing user decisions, actual project architecture and host permissions govern. Numeric examples and aesthetic opinions below are options, not universal rules, new gates or authority to redesign. External products, model weights and licences need current verification before use; none is installed by reading this page. Use the same brief and private project records; do not modify installed learning files.

---
title: animation-removal-hazards
summary: Deleting an animation is not find-and-replace. Remove its start state, the code that waits for it, and the orphans it leaves; reduce before you delete, and keep motion that bridges a jarring change.
tags: [motion, removal, restraint, cleanup]
---

# Animation removal hazards

When an interface feels slow or over-animated, investigate the cause before deciding whether to tune, remove or preserve motion. Apply [animation-decision-framework](animation-decision-framework.md) within the requested scope. Motion can be load-bearing: careless removal may leave elements invisible, stall unmounts or expose layout jumps. Check the relevant hazards before an authorised removal.

## Hazards

- **Hidden start states.** `initial={{ opacity: 0 }}`, a keyframe with `fill-mode: forwards` starting from `opacity: 0`, or a reveal class waiting on an `IntersectionObserver`. Delete the animation and keep the start state, and the element never appears. Remove both together.
- **Code that waits.** `onAnimationEnd`, `transitionend`, and `setTimeout` calls sized to a duration keep pausing the UI for motion that no longer exists. Delete the wait with the animation.
- **Exit-delayed unmounts.** `AnimatePresence` holds a component in the DOM until its exit finishes, then fires `onExitComplete`. With no exit, unmount is immediate, so move that callback's work to the moment the component closes.
- **Layout animations masking a jump.** A `layout` prop or FLIP animation may be hiding a layout shift. If removing it exposes the jump, keep it and report the shift as its own finding.
- **Focus moved after motion.** Focus set in an animation callback must move immediately once the animation is gone.
- **Tests.** Selectors or waits keyed to animation classes or durations need the same removal.

## Example reductions when a simpler effect fits

| Today | Reduced to |
|---|---|
| Hover with scale, lift or shadow growth | Color or opacity only, ≤150ms, `ease` |
| Slide or scale entrance on a frequent surface | Opacity only, 150ms, ease-out |
| UI animation over 300ms | 200–250ms on the same curve |
| Stagger over 80ms per item or 300ms in total | 30ms per item, or fade the group as one |
| Infinite pulse, shimmer or glow on a persistent element | Play once, keep the static end state |

If a reduction loses useful meaning, compare preserving the approved effect, another implementation or removal. Do not delete it automatically.

## Cleanup

Delete what the removals orphaned: unreferenced `@keyframes` and animation utilities, `motion.div` back to `div` where no motion props remain, empty `AnimatePresence` wrappers, unused variants and imports, zero-reference entries in the Tailwind config or token files. Grep every removed name afterwards. If the motion library is no longer imported anywhere, propose dropping the dependency; don't uninstall it yourself ([dependency-discipline](../philosophy/dependency-discipline.md)).

## When to apply

"The app feels slow", "too much animation", "tone down the motion", or `/design-engineering motion remove` ([cmd-motion](../commands/cmd-motion.md)). Prime targets: keyboard-triggered menus, in-app route and tab transitions, fade-in-on-scroll on every section, hover lift on non-primary cards, charts that redraw from zero on every mount, numbers that count up on load, spinners and shimmer on loads under 300ms ([empty-loading-states](../components/empty-loading-states.md)).

## Gotcha

Deleting everything is also wrong. A toast that would otherwise teleport in, or a panel that shows where it came from, earns its motion; removing it trades slowness for disorientation. Explain material preserved behaviour and unresolved risks in the existing task record; no separate animation report is required.

## Sources

- Emil Kowalski, skills (MIT, github.com/emilkowalski/skills, a81dbca): skills/remove-animations/SKILL.md.
- Related: [animation-decision-framework](animation-decision-framework.md), [delight-impact-curve](../philosophy/delight-impact-curve.md), [marketing-vs-product-ui](../philosophy/marketing-vs-product-ui.md).
