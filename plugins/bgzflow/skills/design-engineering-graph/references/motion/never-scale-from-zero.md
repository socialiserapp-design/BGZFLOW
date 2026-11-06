> BGZFLOW adaptation: use this technical reference only for the current requested outcome. Existing user decisions, actual project architecture and host permissions govern. Numeric examples and aesthetic opinions below are options, not universal rules, new gates or authority to redesign. External products, model weights and licences need current verification before use; none is installed by reading this page. Use the same brief and private project records; do not modify installed learning files.

---
title: never-scale-from-zero
summary: Choose an entrance scale that fits the approved effect; 0.95 plus opacity is one restrained recipe, while scale(0) can suit deliberate reveals.
tags: [motion, gotcha, css, starting-style]
---

# Choosing entrance scale

Starting at `scale(0)` creates a pronounced growth effect. That may fit a deliberate illustration or product interaction, but a quiet panel often benefits from a smaller scale change or no scale. Preserve the approved effect and compare actual readability, focus and timing.

## Trade-offs of a zero-scale entrance

- A zero-sized element is initially invisible; how long it remains difficult to perceive depends on duration, curve, size and display. There is no universal 30 ms visibility boundary.
- Growing from one point is visually emphatic; use it when that is the intended character rather than assuming it is always wrong.
- Tiny scale values render to subpixel positions, causing blur and shimmer on the first frames.

## A restrained recipe: 0.95 plus opacity

```css
.modal {
  opacity: 0;
  transform: scale(0.95);
  transition:
    opacity 200ms var(--ease-out-quart),
    transform 200ms var(--ease-out-quart);
}
.modal[data-state="open"] {
  opacity: 1;
  transform: scale(1);
}
```

- Try `scale(0.95)` for a small size change where the approved direction calls for it; this is not a required value or a ban on zero-scale effects.
- Pair with `opacity: 0 → 1`. The opacity does most of the visibility work.
- Both transitions on the same duration and curve — they should feel like a single move.

For more theatrical entries (rare moments, see [delight-impact-curve](../philosophy/delight-impact-curve.md)), `scale(0.85)` or even `scale(0.5)` can work if paired with a spring curve. A zero-scale reveal can also fit the requested effect; check the actual result and accessible alternative.

## @starting-style — the modern CSS way

Where the intended browsers support it, `@starting-style` defines starting values when an element has no prior rendered style:

```css
.modal {
  opacity: 1;
  transform: scale(1);
  transition:
    opacity 200ms,
    transform 200ms,
    display 200ms;
}
@starting-style {
  .modal {
    opacity: 0;
    transform: scale(0.95);
  }
}
```

No `data-state` toggle, no JavaScript. The element animates in the moment it's added to the DOM (or becomes `display: block` from `display: none`).

For the *exit* in the same model, use `transition-behavior: allow-discrete` and animate the `display` property — modern browsers support this.

## Fallback for browsers without @starting-style

Use a `data-mounted` attribute set in JS one frame after mount:

```tsx
const [mounted, setMounted] = useState(false);
useEffect(() => {
  requestAnimationFrame(() => setMounted(true));
}, []);

return <div data-mounted={mounted} className="modal">…</div>;
```

```css
.modal {
  opacity: 0;
  transform: scale(0.95);
  transition: opacity 200ms var(--ease-out-quart), transform 200ms var(--ease-out-quart); /* never `all` */
}
.modal[data-mounted="true"] {
  opacity: 1;
  transform: scale(1);
}
```

This is one React fallback. Prefer an existing reliable transition implementation and cancel or reconcile pending frame work on unmount.

## When to apply

Use when the requested entrance benefits from a restrained scale/fade. Modals, popovers, tooltips and drawers may instead use their existing native transition, a different approved effect or an instant change.

## Gotcha

`@starting-style` supplies a starting style when there is no usable previous rendered style; it is not limited to a component’s first-ever mount. For elements that mount and unmount repeatedly (e.g. dropdowns opened multiple times), the pattern still works if you `display: none` between opens and rely on the transition-behavior trick. But on rapid open/close, you may see flicker — at that point switch to the `data-mounted` fallback or use a library like Radix that handles this for you.

## Sources

- Emil Kowalski — Component Building Principles, [emilkowalski/skill](https://github.com/emilkowalski/skill).
- web.dev — `@starting-style` and `transition-behavior` references.
- Related: [responsive-feedback](responsive-feedback.md), [transform-mastery](transform-mastery.md), [easing-curves](easing-curves.md).
