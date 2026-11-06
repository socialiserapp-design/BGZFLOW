> BGZFLOW adaptation: use this technical reference only for the current requested outcome. Existing user decisions, actual project architecture and host permissions govern. Numeric examples and aesthetic opinions below are options, not universal rules, new gates or authority to redesign. External products, model weights and licences need current verification before use; none is installed by reading this page. Use the same brief and private project records; do not modify installed learning files.

---
title: bento-grids
summary: Compose a coherent feature grid using useful tile variety, clear hierarchy, truthful statistics and responsive framing; tile counts and arrangements are examples.
tags: [faux-ui, bento, grid, marketing, layout, composition]
---

# Bento grids

A grid where every tile is a cropped window reads as generated however well each window is made: the same signal four times. Most of the quality is decided in the tile list, before anything is drawn ([unslop-pass](../anti-patterns/unslop-pass.md) names the three-cards-with-better-kerning failure; this node is the cure).

## The rules

- Give the requested message a clear visual hierarchy. A spanning hero tile can help; equal-weight comparisons can also be appropriate.
- Choose UI, component, stat, diagram, photo or statement tiles for the story. The source's one-third to one-half UI mix is an example, not a quota. Adjacent similar tiles or repeated chrome can be intentional in a comparison.
- Use supported figures with context and units. A multiplier such as “10x” needs actual evidence; do not invent numbers, customer names or endorsements to fill a layout.
- Size copy for its shown role and reading distance. The source's 48–72px stats and 17–24px captions are examples, not required scales or word limits.
- Keep a coherent spacing/radius system where the approved direction needs it. Vary density and grounds purposefully; avoid a mandatory checkerboard or single palette.
- Motion should communicate a useful relationship without obscuring reading. Lead/support timing such as 80–120ms is an example, not a fixed tile or cursor budget. Respect reduced motion and applicable pause controls.
- If using the Stageshow Stage abstraction, inspect its actual scale: independent tile stages can avoid shrinking all tiles through a page-wide transform. Other implementations need no Stage wrapper.
- Test bleed and content at actual responsive sizes. Recompose or stack when useful; hero-first ordering and a 10px font floor are not universal accessibility rules.

## Kinds of tile

| Kind | Holds |
|---|---|
| One component | A single control or panel at real size or larger, cropped by the tile |
| Hero UI | The one tile with a real screen, framed by [product-shot-framing](product-shot-framing.md) |
| Stat | One big number, a lead, a label, maybe one coloured glyph |
| Statement | One sentence in large type |
| Object | A card, chip, keycap or device, one light source, a real material |
| Diagram | A grid, heatmap or nodes and lines in one stroke weight, holding still |
| Collection | Logos, app icons, file tiles, bleeding off an edge |
| Photo | A licensed photograph; never a scene drawn in CSS or SVG passed off as one |

For example, a five-tile grid could combine a hero UI, components, a stat and a diagram; choose a different mix when the requested content calls for it. Layouts: hero and strip (2/3 + 1/3, then three), staggered pair, big square (a 2×2 hero in four columns), ruled (one container, 1px rules) for technical pages; an even 3×2 when its hierarchy suits the content.

## Plan it as a table

| Tile | Span | Kind | The one thing | Words |
|---|---|---|---|---|
| Inbox | 2×1 | Hero UI | One conversation arriving, selected | "Shared inbox" + a sentence |
| SLAs | 1×1 | Stat | "14m" left, in the warning colour | "Never miss a reply." |
| Assign | 1×1 | Component | The assignee menu, one person checked | "Assignments" |

This table is an optional sketch in the existing brief, not a required plan or approval step. Check that each tile contributes meaning and that repeated content or kinds are intentional.

## Objects

A drawn object gets one light source and the shadow of the tiles around it. A payment card keeps its real anatomy at any size: the chip about an eighth of the card's width, a third of the way down, contactless arcs beside it at half the chip's height, name and number along the bottom, the network mark bottom-right. A chip the size of an icon on a tile-sized card is the giveaway.

## When to apply

Any feature grid, bento section or set of feature cards on one page. [viewport-custom-design](../layout/viewport-custom-design.md) owns the page grid around it; [cards-design](../components/cards-design.md) owns product cards.

## Gotcha

One conversation threaded through five tiles ("Refund for order #4821" three times) feels like a story to its builder and reads as one signal repeated. Each tile gets its own specific moment.

## Sources

- Benji Taylor, Stageshow (MIT, HEAD `8020574`, read 2026-11-01): `references/bento.md` (rules, tile kinds, layouts, the planning table), `references/backgrounds.md` (grounds, objects and drawings). Paraphrased and condensed.
- Related: [MOC-faux-ui](MOC-faux-ui.md), [marketing-surface-rules](../layout/marketing-surface-rules.md).
