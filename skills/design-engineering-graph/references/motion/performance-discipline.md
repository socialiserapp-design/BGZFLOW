> BGZFLOW adaptation: use this technical reference only for the current requested outcome. Existing user decisions, actual project architecture and host permissions govern. Numeric examples and aesthetic opinions below are options, not universal rules, new gates or authority to redesign. External products, model weights and licences need current verification before use; none is installed by reading this page. Use the same brief and private project records; do not modify installed learning files.

---
title: performance-discipline
summary: Reduce unnecessary work using actual rendering traces. Choose appropriate animation properties, list rendering, loading and theme behaviour for the current app; no fixed row-count or property-only rule.
tags: [motion, performance, jank, virtualization, layout-shift]
---

# Performance discipline

Most jank is self-inflicted: DOM nodes nobody can see, properties the browser has to watch that never change, animation the GPU can't composite, content fetched at request time that could have been built, layout that moves after the user started reading. The fix is usually deleting or deferring work, not adding cleverness. [transform-opacity-only](transform-opacity-only.md) states the property rule; this node is the rest of the discipline.

## The budget and the tiers

60fps leaves 16.7ms per frame; a 120Hz screen leaves 8ms — design against 8. One layout pass on a complex page can exceed 100ms, a dozen dropped frames at once.

| Tier | Properties | Cost |
|---|---|---|
| Composite | `transform`, `opacity` (and, in current Chrome/Firefox, `filter`, `clip-path`, `background-color`) | Cheapest |
| Paint | `box-shadow`, `border-radius`, `color` | A redraw every frame |
| Layout | `width`, `height`, `padding`, `margin`, `top`/`left`, `border-width` | Re-measures, and moves the neighbours |

Swap down a tier: size → `scale()`, position → `translate()`, `display`/`visibility` → `opacity`, `box-shadow` → `filter: drop-shadow()`. Acceleration is something the browser may grant; property choice is what you control, so keep `translateY(100%)` for unknown-size elements even where a browser declines to accelerate percentages.

## Transitions and compositing

- **Name the properties.** `transition: all` makes every style change a candidate animation and forfeits the engine's optimizations. Tailwind's bare `transition` class compiles to `transition-property: all` — the same bug in disguise; use `transition-transform` or `transition-[opacity,scale]`.
- **Measure property cost.** Transform and opacity often avoid layout; filters and clipping have implementation-dependent costs. Geometry animation can be legitimate when required. Compare traces and visual correctness; 20 px blur is not a universal performance boundary.
- **`will-change` is a targeted fix.** Browsers promote layers just in time, and that occasionally eats the opening frame — a 1px hitch as motion starts. Apply `will-change: transform` (or `transform, opacity`) to the *animating element* after you observe the hitch. It does nothing for layout or paint properties, `will-change: all` defeats the hint, and every promoted layer holds GPU memory.
- **Profile inherited CSS-variable updates on a shared parent** — every descendant recalculates style. Set the property on the moving element. Vaul's drag, written as a `--swipe-amount` variable read by `translateY()`, turned laggy once a drawer held ~20 items. Suspect this whenever a `transform` animation degrades as content grows.

## Rendering work

- **Consider virtualisation when measured rendering or memory cost warrants it**, using an appropriate existing package. Item count alone is not a threshold; preserve focus, search, selection and accessibility.
- **Avoid unnecessary per-frame React renders.** A per-frame `setState` is a re-render storm. Write transforms through refs, WAAPI, or the library's own loop. Motion’s execution path depends on the installed library and browser; compare string and shorthand forms only when an actual trace identifies a bottleneck.
- **CSS/WAAPI for predetermined motion** (stays smooth under load); a JS loop only for dynamic, gesture-driven, or spring values. Vercel's dashboard tab indicator, a Motion shared-layout animation, dropped frames because the next page was loading at that moment; a CSS animation fixed it.

## Diagnosis order

Name the cause before changing code. In order of likelihood: (1) a non-composite property animates (layout first, then `box-shadow`, `border-radius`); (2) the jank coincides with navigation, fetching or hydration; (3) React re-renders per frame; (4) it worsens as content grows; (5) a CSS variable animates, directly or through Motion shorthands; (6) expensive blur/filter work in the actual scene; (7) only then `will-change`. Confirm with a Performance recording on a mid-range phone over remote debugging; desktop CPU throttling doesn't model a weak GPU or a small memory budget.
- **Pause off-screen work**: looping animations, video, timers — `IntersectionObserver` or `animation-play-state`, plus `visibilitychange` for hidden tabs.

## Loading and layout

- **Reserve space for everything asynchronous.** Images and video declare dimensions or `aspect-ratio`; skeletons match the loaded box; empty states are sized to the filled state; changing numbers use `tabular-nums`; hover weight changes preserve geometry.
- **Preload fonts and above-the-fold images**; lazy-load below the fold. A font without preload is a visible reflow on every cold load.
- **Choose rendering for actual content and access needs.** Static generation, revalidation and request-time rendering can all fit; preserve authentication, freshness and existing architecture instead of imposing build-time content.
- **Mute transitions during a theme switch**: add a `no-transitions` class, swap the theme, remove the class after a double `requestAnimationFrame`. Otherwise every color on the page tweens independently in a ragged cascade.

## Expanding panels

Animating `height` triggers layout every frame. Use `grid-template-rows: 0fr → 1fr`, a clip, or measure once and animate `transform` — see [clip-path-tricks](clip-path-tricks.md).

## When to apply

"It's slow", "it stutters", "it jumps", any list over ~50 rows, any diff that adds a transition, a font, a hero image, or a theme toggle. Slowness is measured, not judged: if the complaint is "feels wrong" rather than "drops frames", route to [easing-curves](easing-curves.md) and [duration-table](duration-table.md) instead.

## Gotcha

`will-change` sprinkled on every card "for performance" is the most common cargo cult in generated CSS. It costs a compositor layer per card and fixes stutters the cards never had. Remove it and add it back only where a first-frame hitch is reproducible.

## Sources

- Emil Kowalski's design-engineering practice on performance, distilled by HKTITAN.
- Emil Kowalski, skills (MIT, github.com/emilkowalski/skills, a81dbca): skills/animation-performance/SKILL.md (frame budget, tiers, swaps, Vaul and Vercel cases, diagnosis order).
- Related: [transform-opacity-only](transform-opacity-only.md), [debugging-animations](debugging-animations.md), [empty-loading-states](../components/empty-loading-states.md), [marketing-surface-rules](../layout/marketing-surface-rules.md).
