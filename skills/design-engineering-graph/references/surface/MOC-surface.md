> BGZFLOW adaptation: use this technical reference only for the current requested outcome. Existing user decisions, actual project architecture and host permissions govern. Numeric examples and aesthetic opinions below are options, not universal rules, new gates or authority to redesign. External products, model weights and licences need current verification before use; none is installed by reading this page. Use the same brief and private project records; do not modify installed learning files.

---
title: MOC-surface
summary: Color, shadow, border-radius, dark mode. The "background" choices that decide feel.
tags: [moc, surface, color, shadow]
---

# MOC — Surface

The decisions that look invisible but determine whether the UI feels considered or generated. Monochromatic with restraint usually beats colorful.

## Nodes

- [color-monochromatic](color-monochromatic.md) — A restrained palette option and its hierarchy trade-offs; preserve approved brand colour.
- [dark-mode](dark-mode.md) — Preserve the approved black or near-black palette and supported themes. Verify text, elevation, artwork and control contrast on actual grounds; no mandatory desaturation or ring recipe.
- [shadows-whisper](shadows-whisper.md) — A restrained shadow recipe; choose elevation strength and layers for the approved material and actual surfaces.
- [border-radius](border-radius.md) — Uniform radius everywhere is lazy. Capsule buttons need full package. Nested-radius rule.
- [visual-imperfection](visual-imperfection.md) — Optical alignment beats mathematical. Texture and noise beat flat. Imperfect shapes beat perfect geometry — in marketing.
- [contrast-and-color-scheme](contrast-and-color-scheme.md) — APCA over WCAG 2 for contrast math. theme-color and color-scheme meta. Interactions raise contrast. Avoid gradient banding.
- [color-scales-oklch](color-scales-oklch.md) — An optional OKLCH ramp recipe with per-step gamut checks. Preserve existing palettes and choose role, contrast and colour-space changes from the approved result.
- [depth-and-nesting](depth-and-nesting.md) — Inner radius = outer − padding. Shadows elevate, borders separate. Dark mode collapses shadows to a ring. Hairlines at 0.5px on retina, image outlines pure black or white at 10%, fades by mask, themes by flipping variables.
- [z-index-strategy](z-index-strategy.md) — Prefer DOM order to z-index; where you need it, one global file of sequential layer constants for app-wide layers and local values inside an isolated stacking context. No magic numbers, never mix the two, and know which properties create a stacking context or a clip.
- [color-token-tiers](color-token-tiers.md) — A primitive/semantic token architecture that can improve theme and role consistency. Follow the existing project architecture and naming; do not impose a new tier or role inventory.
- [palette-step-roles](palette-step-roles.md) — Map the approved palette to actual roles and measured contrast. Step labels, ramp counts, hue separation and action styling are recipes, not universal requirements.
- [gradient-interpolation](gradient-interpolation.md) — A gradient's interpolation space is a look, not a correctness setting. `in oklab` is the default (even brightness), `in oklch` arcs round the hue wheel and stays vivid (pick shorter or longer hue), sRGB muddies the middle. Opposite hues go grey in a rectangular space; big low-contrast gradients band; text on a gradient is measured at its worst region.

- [translucent-materials](translucent-materials.md) — Use translucent materials where the approved design benefits. Verify actual backdrop, contrast, hierarchy, rendering cost and supported transparency preferences; no mandatory glass treatment.
- [oklch-gamut-and-migration](oklch-gamut-and-migration.md) — Chroma ceilings swing with hue and lightness — clamp C holding L and H, layer P3 behind a media query over an sRGB base, add a hex floor only for pre-2023 browsers, and migrate hex/rgb/hsl to OKLCH value-for-value, reporting every change.

## Cross-cluster

- See [ai-default-tells](../anti-patterns/ai-default-tells.md) in [MOC-anti-patterns](../anti-patterns/MOC-anti-patterns.md) for surface tells (purple gradients, neon glows on dark mode).
