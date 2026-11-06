> BGZFLOW adaptation: use this technical reference only for the current requested outcome. Existing user decisions, actual project architecture and host permissions govern. Numeric examples and aesthetic opinions below are options, not universal rules, new gates or authority to redesign. External products, model weights and licences need current verification before use; none is installed by reading this page. Use the same brief and private project records; do not modify installed learning files.

---
title: cmd-svg
summary: "/design-engineering svg [create | animate | sticker] [target]" — author or clean an SVG on the token system, animate one with the engine its home allows, or turn frames or a clip into one editable animated SVG.
tags: [command, svg, build]
---

# /design-engineering svg

The second word picks the job. Without one, `create` applies to a new or messy file and `animate` to a clean file the user wants moving.

## svg create

1. Read [svg-creation](../svg/svg-creation.md) and [icon-systems](../components/icon-systems.md), plus [svg-animation](../svg/svg-animation.md) if the asset will move. Read [gotchas](../meta/gotchas.md) and [pov](../meta/pov.md), and take colours, stroke weight and the icon set from the project's contract.
2. Draw on a whole-number grid with named groups, `currentColor` or `var(--token, #fallback)` colours, and `<defs>` / `<symbol>` for repeats; or refactor the given file into that shape.
3. Run SVGO with `viewBox`, animated ids and `<title>` / `<desc>` preserved, then diff the render.
4. Return the file, its size before → after, and a [review-format](../meta/review-format.md) table for a refactor.

## svg animate

1. Decide whether it should move at all ([animation-decision-framework](../motion/animation-decision-framework.md)). If the file has unnamed groups or no `viewBox`, run `create` first.
2. Read [svg-animation](../svg/svg-animation.md), plus [svg-path-morphing](../svg/svg-path-morphing.md) for shape changes, or [video-to-vector-pipeline](../svg/video-to-vector-pipeline.md) for frames or a clip.
3. Pick the engine for where the file lives: inline CSS / WAAPI; the project's motion library; embedded keyframes or SMIL when it is used as an `<img>`; or `node <design-svg>/scripts/svg-flipbook.mjs` for frames. Take values from [easing-curves](../motion/easing-curves.md) and [duration-table](../motion/duration-table.md), and add the reduced-motion path.
4. Return the motion plan (trigger, engine, groups, values, reduced motion, size) and the file.

## svg sticker

An animated isometric sticker → [isometric-stickers](../svg/isometric-stickers.md); with fun-isometric installed → [fun-isometric-reconciliation](../svg/fun-isometric-reconciliation.md).

You may delegate to the `svg-creator` or `svg-animator` subagent where the host has them.
