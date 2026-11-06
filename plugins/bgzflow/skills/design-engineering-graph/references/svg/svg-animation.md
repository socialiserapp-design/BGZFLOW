> BGZFLOW adaptation: use this technical reference only for the current requested outcome. Existing user decisions, actual project architecture and host permissions govern. Numeric examples and aesthetic opinions below are options, not universal rules, new gates or authority to redesign. External products, model weights and licences need current verification before use; none is installed by reading this page. Use the same brief and private project records; do not modify installed learning files.

---
title: svg-animation
summary: Pick the engine by where the file lives — inline + CSS/WAAPI for interactive UI, SMIL or embedded CSS keyframes for a self-contained file loaded as an image, a library only for gesture or timeline work. Stroke drawing, transform-origin, measured rendering cost, group choreography, reduced motion, size.
tags: [svg, animation, smil, css, waapi, performance]
---

# Animating SVG

The first decision is not the easing; it is **where the file lives**, because that fixes which engine can reach it. Everything in [animation-decision-framework](../motion/animation-decision-framework.md), [easing-curves](../motion/easing-curves.md), and [duration-table](../motion/duration-table.md) still applies — an SVG is just DOM with a coordinate system.

## Engine decision

```text
Where does the SVG render?
├── Inline in the page (React, HTML)
│   ├── State-driven, interruptible, reacts to input → CSS transitions or WAAPI
│   └── Gesture-driven, spring, timeline choreography  → Motion / GSAP (match the project's stack)
├── Loaded as <img>, background-image, email, social upload, Figma
│   → self-contained: CSS @keyframes or SMIL where the target renderer supports them; SMIL for
│     motion paths and attribute animation; image contexts may disable interaction entirely
└── Needs a runtime anyway (rich after-effects export) → Lottie/Rive, and only then
```

When the library is GSAP, its official `gsap-plugins` skill owns the plugin API. That covers DrawSVG's visible-segment values, MorphSVG and MotionPath, available through the relevant GSAP package/version; verify current distribution and licence terms before use. Durations, easing and reduced motion still come from this graph ([skill-router](../meta/skill-router.md)).

Compare embedded CSS, SMIL and the existing runtime on the actual target. Email, social imports, design tools and sanitizers may strip animation; image contexts also differ from inline SVG. Measure file size and provide accessible naming at the embedding surface; no fixed size advantage is guaranteed.

## The techniques

- **Stroke drawing.** `stroke-dasharray` and `stroke-dashoffset` set to the path length, animate offset to 0. Read the exact length with `path.getTotalLength()` or use `pathLength="1"` so the CSS is `stroke-dasharray: 1; stroke-dashoffset: 1`. `stroke-linecap: round` for polished ends.
- **Check `transform-origin` for the element.** Many SVG elements default to (0,0), while root SVG and SVG in an HTML layout context have different defaults. Set `transform-box: fill-box; transform-origin: center` (or the pivot you mean — a shoulder, a hinge) or every rotation orbits the corner.
- **Measure rendering cost.** SVG transforms and opacity are not automatically compositor-only or GPU accelerated. Geometry, filters, masking, nesting and the browser can change paint/compositing behaviour. Profile the actual scene before deciding which properties or scale are affordable. `will-change: transform` only after a first-frame hitch ([performance-discipline](../motion/performance-discipline.md)).
- **Choreograph with groups.** Animate `<g>` layers (arm, eyes, body), not hundreds of paths; stagger 30–80ms; paired parts share duration and easing.
- **Motion paths.** SMIL `<animateMotion><mpath href="#route"/></animateMotion>` with `rotate="auto"`, or CSS `offset-path: path("…")` when inline.
- **Reduced motion.** Inline: the usual media query. Self-contained: `@media (prefers-reduced-motion: reduce)` inside the file's `<style>` still works when loaded as an image; SMIL cannot read it, so a SMIL-only file needs a static fallback asset.

## Size discipline

An animated SVG is a text file that ships on every load. Budget ~10–30 KB for a hero mascot, ~2 KB for an icon. Reuse geometry with `<use>`, animate transforms instead of redrawing, round coordinates, and run SVGO with animation-safe flags ([svg-creation](svg-creation.md)). A flipbook of 60 vectorized frames is the case where size explodes — see [video-to-vector-pipeline](video-to-vector-pipeline.md) for de-duplication and frame budgets.

## When to apply

Animating any icon, illustration, mascot, logo reveal, chart transition, or loader that is vector; deciding between Lottie, Rive, and native SVG; reviewing an animated SVG someone dropped in.

## Gotcha

Inline SVG inherits the page's `prefers-reduced-motion` handling only if you wrote it. A copied animated icon with its own `<style>` keyframes and no media query is the most common reduced-motion miss in generated UI, and [review-checklist](../meta/review-checklist.md) row 6 catches it.

## Sources

- supermemoryai/skills `svg-animations` — engine choice, stroke drawing, SMIL timing, transform-origin.
- greensock/gsap-skills (MIT) `gsap-plugins` — DrawSVG, MorphSVG and MotionPath semantics; source-described plugin interfaces; verify current terms/version.
- MDN Web Animations API, SMIL Animation; svg.dog engine comparison.
- Related: [animation-decision-framework](../motion/animation-decision-framework.md), [morphing-icons](../motion/morphing-icons.md), [svg-path-morphing](svg-path-morphing.md), [performance-discipline](../motion/performance-discipline.md), [prefers-reduced-motion](../motion/prefers-reduced-motion.md).
