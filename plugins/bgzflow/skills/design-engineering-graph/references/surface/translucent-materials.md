> BGZFLOW adaptation: use this technical reference only for the current requested outcome. Existing user decisions, actual project architecture and host permissions govern. Numeric examples and aesthetic opinions below are options, not universal rules, new gates or authority to redesign. External products, model weights and licences need current verification before use; none is installed by reading this page. Use the same brief and private project records; do not modify installed learning files.

---
title: translucent-materials
summary: Use translucent materials where the approved design benefits. Verify actual backdrop, contrast, hierarchy, rendering cost and supported transparency preferences; no mandatory glass treatment.
tags: [surface, glass, backdrop-filter, depth, accessibility]
---

# Translucent materials

A translucent bar lets content scroll under the chrome instead of losing a fixed strip of screen to it, and it keeps the user oriented about what is behind. That only works when the material says *where it sits* in the hierarchy and text on it stays legible over anything. Aesthetic glass can be valid when its content remains legible and its role intentional. [depth-and-nesting](depth-and-nesting.md) owns opaque elevation; this node is the see-through layer.

## Weight is hierarchy

- **Heavier, more opaque material for structure** (sidebars, tab bars); **lighter material to draw attention** to interactive pieces.
- **Inspect stacked translucency.** Multiple sampling/blur layers can be costly or reduce legibility. Reduce, simplify or use an opaque alternative where observation shows a problem; do not ban a measured approved stack.
- **Bigger reads thicker**: a sheet gets more blur and a deeper shadow than a chip. Shadow under glass can be heavier over busy content and lighter over a plain page.

```css
.toolbar {
  background: rgb(255 255 255 / 0.6);
  backdrop-filter: blur(20px) saturate(180%);
  border-top: 1px solid rgb(255 255 255 / 0.4); /* lit top edge */
}
```

## Focus and flow

- A **modal task** pairs the surface with a dimming scrim and pushes the page back. A **parallel, non-blocking panel** stays translucent and offset with no scrim, so the flow isn't broken. Stacked sheets dim and recede each parent a step.
- Where floating chrome overlaps scrolling content, fade a small blur or gradient mask at that edge instead of drawing a 1px divider, and only where they actually overlap ([sticky-and-scroll-tells](../layout/sticky-and-scroll-tells.md)).
- **Choose the material transition.** Blur plus scale is one option; a fade, native transition or instant state may better fit the requested experience, rendering cost and motion preferences.

## Text on glass

Flat mid-grey text dies over a changing backdrop. Raise contrast, step the weight up one, add a hair of tracking (~0.01em). Brand colour on translucency is legitimate when the actual composite remains readable and coherent with the approved identity. Measure contrast over the worst backdrop the bar can sit on ([contrast-and-color-scheme](contrast-and-color-scheme.md)).

## Preferences

```css
@media (prefers-reduced-transparency: reduce) {
  .toolbar { background: var(--surface); backdrop-filter: none; }
}
@media (prefers-contrast: more) {
  .toolbar { background: var(--surface); border-color: var(--border-strong); }
}
```

## When to apply

Sticky headers, tab bars, toolbars, sheets, popovers over media, and any `backdrop-filter` in a review.

## Gotcha

backdrop-filter sampling is affected by backdrop roots, stacking and clipping in browser-specific ways. Inspect the actual ancestor chain and supported browser rather than assuming every transform, overflow or isolation has the same effect.

## Sources

- Emil Kowalski, skills (MIT, github.com/emilkowalski/skills, a81dbca): skills/apple-design/SKILL.md (from Apple's WWDC material and accessibility talks).
- Related: [depth-and-nesting](depth-and-nesting.md), [sticky-and-scroll-tells](../layout/sticky-and-scroll-tells.md), [contrast-and-color-scheme](contrast-and-color-scheme.md), [prefers-reduced-motion](../motion/prefers-reduced-motion.md), [performance-discipline](../motion/performance-discipline.md).
