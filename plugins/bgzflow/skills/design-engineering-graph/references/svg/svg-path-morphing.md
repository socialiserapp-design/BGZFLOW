> BGZFLOW adaptation: use this technical reference only for the current requested outcome. Existing user decisions, actual project architecture and host permissions govern. Numeric examples and aesthetic opinions below are options, not universal rules, new gates or authority to redesign. External products, model weights and licences need current verification before use; none is installed by reading this page. Use the same brief and private project records; do not modify installed learning files.

---
title: svg-path-morphing
summary: A native morph interpolates only between paths with the same number and order of commands — author both shapes on one point budget, or hand the mismatch to flubber. Choose morphing or a swap according to the approved icon system.
tags: [svg, morphing, paths, icons, animation]
---

# Path morphing

Browsers interpolate the `d` attribute (CSS `d: path()` or SMIL `<animate attributeName="d">`) with one unbreakable rule: **both paths must have the same number of commands, in the same order, of the same type.** Four cubic curves morph into four cubic curves; a rectangle of four lines cannot morph into a circle of four arcs without help. Everything about morphing follows from that rule.

## Author to the rule

- **Draw both states on one point budget.** Decide the command list first (say `M` + 8 `C` + `Z`), then place the points for shape A and shape B. Extra detail in one state is a mismatch; add degenerate points to the simpler shape instead.
- **Keep the start point and winding direction the same** or the morph rotates through itself.
- **Convert primitives to paths** with the same structure — a circle becomes four cubic arcs, a rect four lines plus close, and the two won't match each other.
- **Match subpaths.** A shape with two holes needs two holes in the other state; collapse an unused hole to a zero-area subpath rather than deleting it.

```css
.shape { d: path("M4 12 C4 7 8 4 12 4 C16 4 20 7 20 12 C20 17 16 20 12 20 C8 20 4 17 4 12 Z"); transition: d 240ms cubic-bezier(0.25, 1, 0.5, 1); }
.shape[data-state="square"] { d: path("M4 4 C4 4 12 4 12 4 C12 4 20 4 20 4 C20 4 20 20 20 20 C20 20 4 20 4 20 Z"); }
```

## When the paths don't match

Use **flubber** (`interpolate(pathA, pathB)`) — it resamples both shapes to matching point counts and returns an interpolator you drive from any engine. GSAP's MorphSVG and KUTE do the same inside their runtimes. The cost is a dependency and a JS loop; per [dependency-discipline](../philosophy/dependency-discipline.md), reach for it only when the morph is the product (a logo transformation, a shape-shifting hero), when it meets the actual icon or illustration need and integration cost.

## Compare a morph with a swap

Play → pause, copy → check, menu → close: one alternative is a **swap** — the outgoing icon scales to 0.3, fades, and blurs 3px while the incoming does the reverse, spring with zero bounce, both icons rendered at once so the reverse direction animates too. It reads as a real change; a timid morph between unrelated shapes reads as a glitch. [morphing-icons](../motion/morphing-icons.md) covers the constrained system where morphing *is* right (same-shape icons rotate; different shapes interpolate coordinates on a fixed line budget); [fly-not-teleport](../motion/fly-not-teleport.md) covers the continuity principle.

## Performance

Animating `d` repaints each frame. Acceptable for one icon or a hero shape; combine with `transform`/`opacity` for everything else on screen, and profile multiple simultaneous paths before committing to the approach ([performance-discipline](../motion/performance-discipline.md)).

## When to apply

Logo transformations, shape-shifting heroes, chart shape transitions, and the icon systems that were designed to morph. Not for every state change.

## Gotcha

When behaviour differs across browsers, inspect feature support, computed values, path command compatibility, timing and embedding restrictions. Matching point counts alone is insufficient: command types, sequence, parameters and subpaths must match for native interpolation. Normalising to compatible absolute cubics is one repair; verify both states and intermediate frames on the target browsers.

## Sources

- SVG 2 / CSS `d` property interpolation rules; veltman/flubber.
- supermemoryai/skills `svg-animations` — the command-matching rule.
- Related: [morphing-icons](../motion/morphing-icons.md), [fly-not-teleport](../motion/fly-not-teleport.md), [svg-animation](svg-animation.md), [dependency-discipline](../philosophy/dependency-discipline.md).
