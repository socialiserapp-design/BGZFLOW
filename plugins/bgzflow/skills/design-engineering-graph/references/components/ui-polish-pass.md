> BGZFLOW adaptation: use this technical reference only for the current requested outcome. Existing user decisions, actual project architecture and host permissions govern. Numeric examples and aesthetic opinions below are options, not universal rules, new gates or authority to redesign. External products, model weights and licences need current verification before use; none is installed by reading this page. Use the same brief and private project records; do not modify installed learning files.

---
title: ui-polish-pass
summary: The invisible finish, as a pass — antialiasing, constant weight on interaction, tabular numbers, no layout shift, real characters, states that stay put, a z-index scale, hit areas, optical alignment, native page scrollbars, designed empty states, inert decoration, no flash on refresh.
tags: [components, polish, finish, layout-shift, states]
---

# The UI polish pass

A finished interface is mostly invisible work: text that renders crisply, numbers that don't jiggle, hover states that don't shift layout, focus rings that don't clash, hit areas you never miss. No single item is noticeable on its own; their absence is. Select the checks relevant to the requested change; this is not a mandatory every-component pass or release gate. If the pass finds the structure itself is wrong, escalate to [feeling-right](../philosophy/feeling-right.md).

## The pass

1. **Antialiased smoothing once at the root**; fonts subsetted.
2. **Keep state feedback stable.** If a weight change shifts text or neighbouring controls, reserve space or choose another treatment. An approved weight change is valid when measured geometry and readability remain sound.
3. **`tabular-nums` on anything that changes** — counters, prices, timers.
4. **No layout shift from dynamic content.** Skeletons, placeholders, and images carry the dimensions (or `aspect-ratio`) of the loaded state.
5. **Real typographic characters** and `text-wrap: balance` on headings — see [line-behavior](../typography/line-behavior.md).
6. **Interaction states that stay put.** Hover transitions only the properties that change, ~150ms ease-out. A small press scale such as 0.96 is one option, not a floor. Use the approved interaction; focus indicators must remain visible and may use the project’s colour treatment. `::selection`, if styled, stays a legible tint. `will-change` only for transform/opacity/filter, only after observing a first-frame hitch.
7. **A fixed z-index scale** (`--z-dropdown: 100`, `--z-modal: 200`, `--z-tooltip: 300`, `--z-toast: 400`) — or avoid it with `isolation: isolate` so children can't leak above unrelated UI. DOM order first, then one global file of sequential layers ([z-index-strategy](../surface/z-index-strategy.md)).
8. **Accessible hit areas:** use appropriate platform guidance and applicable WCAG criteria; 44px touch / 40px desktop are usability examples. Preserve useful density and avoid overlapping targets.
9. **Align by eye.** Trailing-icon padding = text-side padding − 2px; play triangles nudge 1–2px toward the point; asymmetric SVGs are fixed in the viewBox.
10. **Keep scrolling discoverable and usable.** Native scrollbars are a sound default; an approved accessible custom treatment is also legitimate. Verify contrast, input and platform behaviour.
11. **Empty states teach**: headline, one line, primary action — sized to the filled state so completing the action doesn't shift the layout. See [empty-loading-states](empty-loading-states.md).
12. **Decorative elements are inert**: `pointer-events: none`, `user-select: none`.
13. **No flash on refresh.** Persisted interactive state is set before first paint, never default-then-correct.
14. **Anchors clear the sticky header** (`scroll-margin-top`); fixed bottom chrome pads `env(safe-area-inset-bottom)`.

## Frequent offenders

| Problem | Remedy |
|---|---|
| Bold-on-hover tabs shift layout | Constant weight, color signals state |
| Digits jiggle | `font-variant-numeric: tabular-nums` |
| Content jumps as images load | Explicit dimensions or `aspect-ratio` |
| `scale(0.9)` on press | `scale(0.96)` |
| Brand-colored focus ring | Neutral ring |
| `z-index: 9999` | Scale, or `isolation: isolate` |
| 20px icon with a 20px hit area | Pseudo-element to 44px |
| Custom page scrollbar | Native; customize only small scrollers |
| Blank div for an empty list | Headline + line + action, sized like the filled state |
| Theme flashes on refresh | Persist + set before render |

## When to apply

The build works and now needs the last ten percent; "feels unfinished" with no single dimension obviously wrong; before any review. [disambiguation](../meta/disambiguation.md) routes *looks right* to [feeling-right](../philosophy/feeling-right.md), *feels finished* here, *should ship* to [review-checklist](../meta/review-checklist.md).

## Gotcha

Polish applied to the wrong structure is thrown away with the structure. If hierarchy or spacing is wrong, this pass is premature; fix the layout, then polish.

## Sources

- Emil Kowalski's design-engineering practice on polish, distilled by HKTITAN.
- Related: [review-checklist](../meta/review-checklist.md), [responsive-feedback](../motion/responsive-feedback.md), [touch-and-focus](touch-and-focus.md), [line-behavior](../typography/line-behavior.md), [depth-and-nesting](../surface/depth-and-nesting.md).
