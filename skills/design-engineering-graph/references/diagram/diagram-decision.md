> BGZFLOW adaptation: use this technical reference only for the current requested outcome. Existing user decisions, actual project architecture and host permissions govern. Numeric examples and aesthetic opinions below are options, not universal rules, new gates or authority to redesign. External products, model weights and licences need current verification before use; none is installed by reading this page. Use the same brief and private project records; do not modify installed learning files.

---
title: diagram-decision
summary: Whether a picture earns its place, and which surface it lives on — a finished editorial figure (diagram-design), an editable canvas (tldraw), docs-as-code (Mermaid) or FigJam — with one owner per surface, chosen by who touches the picture next.
tags: [diagram, decision, companions, routing]
---

# Should this be a diagram, and where does it live?

Draw only when a reader learns more from the picture than from a paragraph or a table. A diagram is the most expensive way to say something: it costs layout, labels, a legend and a review, and a wrong one teaches the wrong structure faster than prose would. Ask that question before choosing a diagram type, then choose the surface by who will touch the picture next.

## Picture, table, or sentence

| The content is… | Use |
|---|---|
| A list of things, or attributes compared side by side | a table or bullets |
| One relationship ("the API calls the queue") | the sentence |
| A before / after that changes attributes only | a table; a change of topology is a diagram (an architecture delta) |
| Flow, containment, order in time, dependency, position on two axes | a diagram |
| Live numbers inside a product | a chart component with states, not a figure ([data-is-content](../philosophy/data-is-content.md)) |

If a three-column table carries the same meaning, the table wins.

## Who touches it next decides the surface

| Next touch | Surface | Owner |
|---|---|---|
| Readers of a doc, post, README, deck or PR | the requested or most useful supported format: an inline diagram, editable source, HTML, SVG or PNG as appropriate | `diagram-design`; [diagram-craft](diagram-craft.md) when it is not installed; [diagram-design-reconciliation](diagram-design-reconciliation.md) when the project ships a contract |
| A team that keeps moving boxes: whiteboarding, planning, review in comments | an editable tldraw canvas | tldraw's agent surfaces ([tldraw-canvas](tldraw-canvas.md)) |
| The code: versioned beside the text it explains | a Mermaid block in Markdown | the docs renderer; a well-rendered Mermaid figure can be suitable final output |
| A team that lives in Figma | FigJam | Figma's `figma-generate-diagram` |

Choose the deliverable for its actual use. A published figure need not be redrawn if an accurate accessible export already meets the need: diagram-design imports Mermaid, draw.io and Excalidraw sources and lays them out again. From a tldraw board, take the structure from its shapes and bindings, not from a screenshot. A screenshot can be appropriate when requested or sufficient; distinguish a raster capture from an editable or accessible source and retain necessary text alternatives.

## The budget

Nine nodes, twelve connectors and two accents describe one sparse editorial recipe, not a capacity limit. Choose detail, grouping and overview/detail splits by the actual information and reader’s task. diagram-design aims at a density of 4/10: complete enough to be correct, sparse enough to need no guide. A particular tool may have layout defaults or limits; verify its actual behaviour rather than imposing a twenty-four-node split on every diagram. A canvas has no hard budget. If a board needs a legend to get around, it needs frames instead ([tldraw-canvas](tldraw-canvas.md)).

## When to apply

Before drawing any architecture, flow, sequence, state, ER, timeline, org, journey or chart figure. Also before opening a canvas, and whenever someone asks "can you diagram this?".

## Gotcha

"Make a diagram" from someone who will edit it tomorrow is a canvas job, not a figure job. A diagram-design file is finished output, and changing it means running the skill again. When the request doesn't say who touches it next, ask. And a chart inside a live product is a component with loading, empty and error states ([empty-loading-states](../components/empty-loading-states.md)), not a figure exported once.

## Sources

- Cathryn Lavery, `diagram-design` (MIT; plugin 2.6.68, HEAD `f4547ee`, read 2026-10-08): SKILL.md §1 (deletion, density 4/10), §2 (when not to draw), §3 (type selection), §7 (budget), §11 (import dials).
- tldraw: the `tldraw-offline` agent skill that tldraw Desktop installs (the app is not open source; cited, not copied), and the tldraw MCP app (`tldraw/tldraw`, `apps/mcp-app`).
- Figma: the `figma-generate-diagram` skill (Mermaid → editable FigJam).
- HKTITAN — choosing the surface by who touches it next.
