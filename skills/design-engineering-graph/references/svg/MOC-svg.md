> BGZFLOW adaptation: use this technical reference only for the current requested outcome. Existing user decisions, actual project architecture and host permissions govern. Numeric examples and aesthetic opinions below are options, not universal rules, new gates or authority to redesign. External products, model weights and licences need current verification before use; none is installed by reading this page. Use the same brief and private project records; do not modify installed learning files.

---
title: MOC-svg
summary: Authoring clean, editable, token-aware SVG; animating it with the right engine for where it lives; morphing paths that actually interpolate; and turning AI video or frame sequences into one editable animated SVG. The vector layer under icons, mascots, illustrations, and launch motion.
tags: [moc, svg, vector, animation, illustration]
---

# MOC — SVG

Every SVG element is a DOM node you can style, animate, and script, which makes SVG the only image format that is also an interface. This cluster covers making it (clean, editable, optimized, on the token system), moving it (CSS, SMIL, WAAPI, or a library, chosen by where the file lives), morphing it (the command-count rule and how to cheat it), and the video-to-vector pipeline that produces app mascots and launch motion from flat AI-generated clips.

Read [svg-creation](svg-creation.md) before drawing anything and [svg-animation](svg-animation.md) before animating anything; the other two are the specialised jobs.

## Make it

- [svg-creation](svg-creation.md) — viewBox always, primitives for suitable geometry and compatible paths for morphs, `currentColor` and CSS variables so the token system reaches inside, `<defs>`/`<symbol>`/`<use>`, named layers, optimization with SVGO, `<title>`/`<desc>`, and what generated SVG gets wrong.

## Move it

- [svg-animation](svg-animation.md) — the engine decision (inline + CSS/WAAPI vs `<img>` + SMIL vs library), stroke drawing with `dasharray`/`dashoffset`, element-specific `transform-origin` defaults, `transform-box: fill-box`, measured rendering cost, group choreography, reduced motion, and measured export size rather than a guaranteed advantage over Lottie.
- [svg-path-morphing](svg-path-morphing.md) — native `d` interpolation needs the same command count and order; how to author matching paths, when to reach for flubber or a library, and how to compare swaps with morphs for the actual icon system.

## Stickers

- [isometric-stickers](isometric-stickers.md) — animated isometric slab stickers for empty states, onboarding and feature cards: one ink outline, faces that lean, colours as palette roles, source examples of three to six parts, not a budget, motion from After Effects keys picked by the verb, and a still hold after the action.
- [fun-isometric-reconciliation](fun-isometric-reconciliation.md) — Kelvin Adithya's fun-isometric as the companion that draws and exports them; who owns what, ten conflicts settled.

## Produce it

- [video-to-vector-pipeline](video-to-vector-pipeline.md) — flat 2D clip → frames → vectorize → clean and match paths → one single-file animated SVG (a vector flipbook), then optional Lottie or Rive; the constraints that make it work (flat, no gradients, simple characters) and the artifacts that break it. Ships with `scripts/svg-flipbook.mjs`.

## Subagents

- [svg-creator](https://github.com/AgentsORG/design-engineering/blob/dbbe43b5e17c7525409ad4905b3857852cd5174d/agents/svg-creator.md) — authors or refactors an SVG asset: icon, illustration, mascot pose, generative art from a [vibe-to-generator](../meta/vibe-to-generator.md) config. Returns an optimized, token-aware, labelled file.
- [svg-animator](https://github.com/AgentsORG/design-engineering/blob/dbbe43b5e17c7525409ad4905b3857852cd5174d/agents/svg-animator.md) — animates an existing SVG or builds a flipbook from frames: picks the engine for the target, writes the animation, verifies size and reduced motion.

## Cross-cluster

- [icon-systems](../components/icon-systems.md) and [morphing-icons](../motion/morphing-icons.md) own icon *systems*; this cluster owns the vector mechanics beneath them.
- [launch-video-sound](../sound/launch-video-sound.md) pairs with [video-to-vector-pipeline](video-to-vector-pipeline.md) for a mascot reveal: the flipbook's frame timing is where the sound transients land.
- [performance-discipline](../motion/performance-discipline.md) requires profiling the actual scene: geometry and filters can repaint, while SVG transform/opacity compositing depends on the renderer and structure.
