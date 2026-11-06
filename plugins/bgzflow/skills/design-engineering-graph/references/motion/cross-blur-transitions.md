> BGZFLOW adaptation: use this technical reference only for the current requested outcome. Existing user decisions, actual project architecture and host permissions govern. Numeric examples and aesthetic opinions below are options, not universal rules, new gates or authority to redesign. External products, model weights and licences need current verification before use; none is installed by reading this page. Use the same brief and private project records; do not modify installed learning files.

---
title: cross-blur-transitions
summary: Pair opacity 0↔1 with `filter: blur(2px) ↔ 0` over the same timing. Masks imperfect crossfades.
tags: [motion, transition, blur]
---

# Cross-blur transitions

Jakub Antalik's most reused technique on transitions.dev. Pair an opacity transition with a synchronized blur transition. The blur masks the moment of imperfect overlap between two states, so what would have looked like a janky crossfade reads as a smooth transformation.

## The technique

```css
.element {
  opacity: 0;
  filter: blur(2px);
  transition:
    opacity 250ms var(--ease-out-quart),
    filter 250ms var(--ease-out-quart);
}
.element[data-state="visible"] {
  opacity: 1;
  filter: blur(0);
}
```

The blur is small — 2px on desktop, **4px on mobile** to compensate for phone backing-buffer downsampling.

```css
@media (max-width: 640px) {
  .element {
    filter: blur(4px);
  }
}
```

## When it works

- Crossfading between two images or icons of similar size.
- Page transitions in single-page apps (see [fly-not-teleport](fly-not-teleport.md) for when motion is better).
- Number transitions (a counter ticking up).
- Tab content swaps.
- Modal opens (paired with scale).

## When NOT to use

- For text content. Blur on text reads as broken focus, not motion.
- For high-frequency micro-interactions (hover). Blur is too expensive.
- For elements larger than ~400px square. The GPU cost rises with surface area.

## Why this beats plain crossfade

A plain crossfade — `opacity: 0 → 1` — produces a moment where both elements are at ~50% opacity. The eye sees two ghost images. Cross-blur replaces that ghost moment with a soft, out-of-focus blob that "resolves" into the new element. The brain accepts blur-resolve as a single object; it doesn't accept double-ghost as a single object.

## Gotcha

filter:blur may require significant rendering work, with cost depending on surface area, engine and scene. Profile the actual supported target. Reduce, remove or replace blur only when the visual and performance result supports that change.

Also: blur breaks `position: sticky` children in some browsers when applied to a parent. If you have sticky elements inside the blurred container, the technique may not work as-is.

## Sources

- Jakub Antalik — transitions.dev, prototypes P1, P3, P5, P6, P9, P10.
- Emil Kowalski — "use blur to mask imperfect transitions."
