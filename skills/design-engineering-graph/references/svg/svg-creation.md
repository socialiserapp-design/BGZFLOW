> BGZFLOW adaptation: use this technical reference only for the current requested outcome. Existing user decisions, actual project architecture and host permissions govern. Numeric examples and aesthetic opinions below are options, not universal rules, new gates or authority to redesign. External products, model weights and licences need current verification before use; none is installed by reading this page. Use the same brief and private project records; do not modify installed learning files.

---
title: svg-creation
summary: Author SVG that is clean, editable, and on the token system — viewBox always, compatible paths for morphing, currentColor and CSS variables, defs and symbols, named layers, SVGO with the right flags off, title and desc — and the tells of generated SVG.
tags: [svg, vector, icons, illustration, tokens, accessibility]
---

# Creating SVG

An SVG is markup, not a picture, and the quality of the markup decides everything downstream: whether it recolors with the theme, whether it can be animated without rewriting it, whether it is 2 KB or 200 KB, whether a screen reader can name it. Draw for the DOM you will have to live with.

## Structure

- **Use a suitable `viewBox` and sizing contract.** Intrinsic width/height can be valid for export, layout stability or a consumer that requires them. `viewBox="0 0 24 24"` defines the coordinate system; size comes from CSS. Hardcoded dimensions are how icons refuse to scale.
- **Choose a suitable grid and stroke alignment.** Odd-pixel centred strokes may need half-pixel coordinates; inspect the actual stroke width, rendered size and device-pixel ratio. A small icon may need a size-specific drawing — see [icon-systems](../components/icon-systems.md).
- **Keep suitable primitives; use compatible paths for path morphing.** Rectangles, circles and group transforms can animate directly. `<rect>` and `<circle>` are readable and small; a morph needs paths with matching commands ([svg-path-morphing](svg-path-morphing.md)).
- **Group by meaning, name the layers.** `<g id="arm-left">`, `<g data-layer="eyes">`. A mascot with unnamed groups cannot be animated by anyone, including you next week. Order groups back-to-front like a compositor.
- **`<defs>` for gradients, filters, masks; `<symbol>` + `<use>` for repeats.** One definition, many instances; the file stays small and one edit changes every instance.
- **Inspect embedded rasters.** A referenced or embedded image may be necessary to preserve an actual asset; do not call a raster-containing SVG a fully vector recreation. Compare size, privacy and export needs.

## Color that follows the system

- Set `fill="currentColor"` on monochrome icons and color them from CSS. This works for inline SVG; host CSS does not automatically reach an external SVG loaded through an image.
- Multi-color illustrations expose **CSS custom properties with fallbacks**: `fill="var(--mascot-skin, #f2c9a0)"`. For inline SVG, host variables can change the theme; external image contexts need a supported embedding or separate asset strategy ([depth-and-nesting](../surface/depth-and-nesting.md)).
- Keep the palette to the tokens — the palette required by the approved illustration; three colours is one restrained example ([icon-systems](../components/icon-systems.md) owns the illustration rules). Define reusable gradients in `<defs>` when gradients serve the approved illustration.

## Optimize, carefully

Run SVGO (`npx svgo file.svg --multipass`), but keep `viewBox` (`removeViewBox: false`), keep the ids and `data-*` you animate against (`cleanupIds` off for those), and keep `<title>`/`<desc>`. When several SVGs are inlined on one page, prefix their ids (`prefixIds`) so markers and gradients don't collide. Round path precision to 1–2 decimals; strip editor metadata, empty groups, and default attributes. Check the result renders identically before committing.

## Accessibility

Meaningful graphics: `role="img"` plus `<title>` (and `<desc>` for detail) as the first child, and `aria-labelledby` pointing at them. Decorative graphics: `aria-hidden="true"`, `focusable="false"`. Never an SVG with no accessible name that carries meaning, and never a labelled one that is decoration.

## Tells of generated SVG

Fixed `width`/`height` and no `viewBox`; every color a hardcoded hex; a hundred unnamed `<g>`s; primitives converted to 8-decimal paths; an embedded PNG; the same gradient defined four times; a `<style>` block with global selectors that leak when inlined. Each is cheap to fix and expensive to leave.

## When to apply

Drawing or refactoring any icon, illustration, mascot pose, logo, chart glyph, or generative art output; any SVG a [svg-animator](https://github.com/AgentsORG/design-engineering/blob/dbbe43b5e17c7525409ad4905b3857852cd5174d/agents/svg-animator.md) will animate; any SVG dropped in by a generator.

## Gotcha

Inline `<style>` inside an SVG becomes global CSS the moment the SVG is inlined into a page. Scope selectors under a root id, or move the styles to the page. And `<use>` cannot reach into a symbol's internals from the outside — expose what must be styled as CSS variables instead.

## Sources

- W3C SVG 2; SVGO documentation.
- supermemoryai/skills `svg-animations` — viewBox, defs, and grouping practices; HKTITAN — token-aware authoring and the generated-SVG tells.
- iart-ai/web-animation-skills (MIT) `svg-animation`, and Cathryn Lavery's `diagram-design` `export_svg.py` (namespaced `<defs>` ids) — prefixing ids on inlined SVGs.
- Related: [icon-systems](../components/icon-systems.md), [svg-animation](svg-animation.md), [svg-path-morphing](svg-path-morphing.md), [vibe-to-generator](../meta/vibe-to-generator.md).
