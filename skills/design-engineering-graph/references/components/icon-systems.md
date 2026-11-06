> BGZFLOW adaptation: use this technical reference only for the current requested outcome. Existing user decisions, actual project architecture and host permissions govern. Numeric examples and aesthetic opinions below are options, not universal rules, new gates or authority to redesign. External products, model weights and licences need current verification before use; none is installed by reading this page. Use the same brief and private project records; do not modify installed learning files.

---
title: icon-systems
summary: Keep coherent visual weight; intentional mixed sets are possible. 10-32px range. Match stroke to font weight. Lucide is overused.
tags: [components, icons]
---

# Icon systems

Icons are the most replicated UI element in a product. They are also the easiest to get wrong via mismatch — three icons from three different packs at three different stroke widths in the same UI.

## Pick one icon pack

Prefer a coherent set; intentionally mixed icons can be correct when their geometry and visual weight work together. The eye notices instantly, even if the user can't articulate why the UI feels off.

If you started with Material Icons and now want a feature that needs a custom icon, draw the custom icon to match Material's style (rounded, filled, 24px viewbox). Don't reach for Heroicons "just for this one."

To fetch icons, `better-icons` searches Iconify's sets from the CLI or an MCP server. If an authorised task uses better-icons, a pack prefix can constrain results for consistency; it is not a requirement to install or call that tool. Verify the licence of the actual chosen asset and preserve intentional mixed icon styles.

## Packs worth considering

| Pack | Style | Best for |
|---|---|---|
| **Lucide** | Outline, 24×24 | Solid default but overused — pick Phosphor or Hugeicons if you want differentiation |
| **Phosphor** | Multi-weight outline | More personality than Lucide, same coverage |
| **Hugeicons** | Wide library | Less common, distinctive |
| **Tabler** | Outline, 1.5px stroke | Cleaner than Lucide at small sizes |
| **Iconoir** | Outline, hand-drawn feel | Editorial / blog energy |
| **Heroicons** | Outline + solid pairs | Tailwind ecosystem |
| **Material Symbols** | Filled, variable | Apps that already use Material |

## Sizing

| Use | Size |
|---|---|
| Inline with body text | 16px |
| Toolbar buttons | 20px |
| Primary navigation | 20–24px |
| Hero / empty state | 32–48px |
| Marketing | 24–96px |

Below 14px, most icon packs lose detail. Above 32px, hand-drawn or larger-viewBox icons fare better than 24px-viewBox stretched up.

## Match stroke weight to font weight

If your font is **500 (Medium)**, your outline icons should have a **1.75–2px stroke** at 24px.
If your font is **400 (Regular)**, your icons should have a **1.5px stroke**.

Phosphor's "regular" weight is 1.5px; "bold" is 2.5px. Pick the one that matches your type.

## Icon transformations, not crossfades

When toggling an icon (e.g., chevron expand/collapse, play/pause, sun/moon), **rotate or transform** rather than crossfade between two icons. See [fly-not-teleport](../motion/fly-not-teleport.md).

- Chevron up/down: rotate 180°.
- Play/pause: replace via opacity *but* if you have the bandwidth, draw a single morphing path.
- Sun/moon: morph via shared geometry (lucide-animated.com has examples).

See [animations-dev-curriculum](../motion/animations-dev-curriculum.md) for the canonical resource on icon animation.

## Drawing and meaning

- Below ~12px, swap outline icons for the filled variant; 1px strokes vanish. Snap coordinates to whole pixels so 1× screens don't blur.
- Match the approved icon language: round and square caps are both valid. Preserve separate paths/fills where they carry meaningful appearance or behaviour; union only when compatible with the actual asset.
- Don't upscale: a 16px icon at 48px keeps its spindly stroke. Redraw it heavier. Favicons get a simplified mark hinted for 16px ([svg-creation](../svg/svg-creation.md)).
- One icon, one meaning: a chevron can't mean both "expand" and "next page"; a star can't mean both favourite and rating (heart for favourite).
- Pairs that differ only by a 180° turn (upload/download) need a second cue, such as a label or a baseline bar.
- 6–8px between an icon and its label; ambiguous metaphors (the floppy disk) get the text label.

## Illustration cohesion

Illustrations obey the icon system: same stroke weight, about three colours recoloured to the UI's tokens, light falling from the same side as the UI's shadows, one perspective per scene, negative space drawn in rather than padded on afterwards. Complexity matches the spot (a tooltip gets a small mark, not a scene), and they get redrawn, not scaled, for larger slots. Generic blob-and-character packs read as no budget; a typographic treatment or nothing beats them.

## When to apply

- Setting up a new design system: pick the pack, document it, lock it.
- Reviewing a PR that introduces a new icon: check the pack source.
- Auditing an existing UI: grep for `<svg>` elements from different packs.

## Gotcha

Icon stroke is `stroke-width`, not `border-width`. Setting `stroke-width: 2` on a 16px icon yields a different visual weight than 2px on a 24px icon (the smaller icon looks heavier). Either scale stroke proportionally or use a variable-weight icon pack like Phosphor.

## Sources

- guidelines.sh — "Never mix icon packs; match stroke to font weight; Lucide is overused."
- lucide-animated.com — icon animation patterns.
- Phosphor Icons — weight system documentation.
- Emil Kowalski's design-engineering practice, distilled by HKTITAN — the drawing, meaning and illustration rules.
- better-auth/better-icons (MIT; npm 1.0.4 on 2026-10-08, the repo's 1.0.5 is unpublished) — Iconify search and retrieval; the cross-pack pull is HKTITAN's reading of its tools.
