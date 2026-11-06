> BGZFLOW adaptation: use this technical reference only for the current requested outcome. Existing user decisions, actual project architecture and host permissions govern. Numeric examples and aesthetic opinions below are options, not universal rules, new gates or authority to redesign. External products, model weights and licences need current verification before use; none is installed by reading this page. Use the same brief and private project records; do not modify installed learning files.

---
title: transform-opacity-only
summary: Transform and opacity often avoid layout and paint; select other properties when the effect needs them and verify actual rendering cost.
tags: [motion, performance, css]
---

# Choose animation properties by measured cost

`transform` and `opacity` are commonly composited without layout or repaint, but compositing is not guaranteed by a property name. Other properties have different costs: size changes can require layout, colours can require paint, and filters or clipping may use accelerated paths depending on browser, content and layer state. Profile the requested effect on its intended environment.

## A low-cost starting point

```css
/* Often a low-cost path */
transition: transform 200ms, opacity 200ms;

/* May require layout; measure when the effect needs actual geometry changes */
transition: width 200ms, height 200ms, top 200ms, left 200ms, margin 200ms;
```

Compare a transform-based implementation when animating size or position is costly. Do not replace a required layout change with a visual transform that leaves incorrect flow, text scaling, hit areas or accessibility; a small measured layout animation can be appropriate.

## The compose-with-translate pattern

To animate position without `top` / `left`:

```css
.menu {
  transform: translateY(0);
  transition: transform 200ms var(--ease-out-quart);
}
.menu[data-state="closed"] {
  transform: translateY(8px);
  opacity: 0;
}
```

To animate size without `width` / `height`:

```css
.button {
  transform: scale(1);
  transition: transform 120ms;
}
.button:active {
  transform: scale(0.97);
}
```

Be aware: `scale()` scales children too. If you don't want that, use a wrapper with `transform: scale()` and counter-scale inside, or animate `padding`/`gap` with caution (slower, sometimes necessary).

## Framer Motion / Motion gotcha

The execution path of Motion shorthands, CSS variables and transform strings depends on the library/browser version and animation. Do not infer a guaranteed GPU or main-thread path from syntax alone. If a trace shows a busy-main-thread problem, compare these forms and verify the installed implementation:

```tsx
// Candidate transform-string form; verify the execution path in this runtime
<motion.div animate={{ transform: "translateY(0px)" }} />

// Readable shorthand; its execution path depends on the implementation
<motion.div animate={{ y: 0 }} />
```

## When this breaks

- **`clip-path`** can be useful for reveals, but acceleration and repaint cost depend on shape, browser and content — see [clip-path-tricks](clip-path-tricks.md) for usage.
- **`box-shadow`** may cause repaint. Compare it with opacity on a pre-rendered shadow or `filter: drop-shadow()` where the visual semantics match; neither swap guarantees a performance gain.
- **`filter: blur()`** can be accelerated yet costly on large surfaces; measure the target browser and layer rather than assuming it is cheap.
- **`background-color`** is fine for hover, gradient changes may also be viable when supported and measured; fading an overlay is another option.

## Gotcha

A `will-change: transform` on every element is *worse* than none. The browser pre-allocates GPU layers, exhausting memory on mobile. Apply `will-change` only on the element about to animate, and remove it after. Or skip it entirely — modern browsers detect transform animations automatically.

## Sources

- Emil Kowalski — performance rules, Sonner internals.
- Emil Kowalski, skills (MIT, github.com/emilkowalski/skills, a81dbca): skills/animation-performance/SKILL.md (shorthands and CSS variables, drop-shadow swap).
- web.dev — "High performance animations" reference table.
