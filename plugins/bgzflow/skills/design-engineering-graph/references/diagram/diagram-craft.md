> BGZFLOW adaptation: use this technical reference only for the current requested outcome. Existing user decisions, actual project architecture and host permissions govern. Numeric examples and aesthetic opinions below are options, not universal rules, new gates or authority to redesign. External products, model weights and licences need current verification before use; none is installed by reading this page. Use the same brief and private project records; do not modify installed learning files.

---
title: diagram-craft
summary: Design accurate readable diagrams with intentional grouping, connectors, typography and accessible equivalents. Preserve required detail and approved style; optional grid/colour/legend recipes are not limits.
tags: [diagram, svg, craft, review]
---

# Diagram craft

A designed diagram is mostly deletion. Every node is a distinct idea, every line carries information the layout doesn't already show, and the accent marks the one or two things the reader must see first. The figure is useful when the required meaning is accurate, readable and accessible; removal is not an end in itself. An installed diagram tool may supply useful rendering and geometry checks, but neither its style rules nor this node supersede current user decisions.

## Remove before you add

Run four tests before drawing. Can a node go? Can two nodes merge, because they always travel together? Can an arrow go, because the layout already implies it? Can a label go, because shape or color already says it? Use [diagram-decision](diagram-decision.md) to choose meaningful grouping and detail; its numerical recipe is not a node, connector, accent or callout cap.

## Signal

- **Use focal accents deliberately.** A restrained figure may highlight one or two elements; multiple semantic groups may need several accents ([color-monochromatic](../surface/color-monochromatic.md)). Everything else is ink, muted or soft.
- **Hierarchy by treatment, not by size alone.** Focal: accent tint fill, accent stroke. Service: white fill, ink stroke. Store: ink at 5 %. External: ink at 3 % with a 30 % stroke. Optional: dashed `4,3`. Trust boundary: dashed accent at 50 %. Identical boxes for every node erase the hierarchy.
- **A restrained print-style option:** borders, node radius 6 and type tags at 2. Pills, soft cards or shadows are valid when the requested identity and information benefit. A figure is print, so [shadows-whisper](../surface/shadows-whisper.md) does not apply here.

## Connectors: the six rules a figure fails on

1. Select connectors that express the actual relationship clearly. For an orthogonal recipe, elbows rounded at r=8 (r=6 in tight layouts) are starting points; diagonal, curved or radial edges can also be valid.
2. Where labels collide with strokes, compare a paper mask, nearby placement or another readable convention. Six to ten pixels is an example, not a fixed gap. Use a concise accurate label; there is no fourteen-character limit.
3. No shared or stacked strokes. Offset parallel routes by 12px or more; hop at a single crossing.
4. Connectors on one edge each get their own attach point at `L·k/(N+1)`, at least 12px apart.
5. No line passes behind a box it doesn't end at. Reroute it.
6. No label mask overlaps a node drawn after it. Draw arrows before boxes, so lines sit behind nodes.

Strokes are muted by default, accent on the headline path, a link color on HTTP and external calls, and dashed `5,4` for async or return paths.

## Grid, type, legend

A 4px grid, sans labels at weight 600 and mono technical sublabels are one coherent recipe. Use the approved type and geometry; mono can also be intentional. Place the legend where it supports the actual layout without obscuring content; a bottom strip is one option; widen the `viewBox` by about 60px to hold it. On a phone, keep the SVG's `min-width` at its viewBox width inside a local `overflow-x: auto` wrapper, so the figure scrolls and the page doesn't.

## Accessible SVG

`role="img"` with `aria-labelledby` naming a `<title>` and a `<desc>`. `<title>` is the first child, before `<defs>`. Prefix both ids with the figure's slug, never bare `title`, because figures get inlined side by side. `<desc>` is one sentence about the content, not the geometry. The general markup rules are [svg-creation](../svg/svg-creation.md)'s.

## Gotcha

AI-default diagrams have a look: dark mode with a cyan or purple glow, identical rounded boxes, a legend floating among the nodes, labels sitting on their lines, diagonal connectors, and Mermaid's auto-layout passed off as a design ([ai-default-tells](../anti-patterns/ai-default-tells.md)). A redraw keeps the content (components, relationships, grouping, direction) and throws away the source's coordinates, colors and fonts.

## Sources

- Cathryn Lavery, `diagram-design` (MIT; HEAD `f4547ee`, read 2026-10-08): SKILL.md §1, §4, §6, §7, §9, §12; `references/style-guide.md` (node treatments, stroke, radius), `references/primitives-core.md` (connector rules), `references/output-spec.md` (holding the canvas on a narrow screen).
- HKTITAN — distillation and cross-links.
