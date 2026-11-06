> BGZFLOW adaptation: use this technical reference only for the current requested outcome. Existing user decisions, actual project architecture and host permissions govern. Numeric examples and aesthetic opinions below are options, not universal rules, new gates or authority to redesign. External products, model weights and licences need current verification before use; none is installed by reading this page. Use the same brief and private project records; do not modify installed learning files.

---
title: data-is-content
summary: Tables, charts, lists, dashboards deserve the same typography, alignment, and whitespace care as marketing pages.
tags: [philosophy, data, dashboards, tables]
---

# Data is content

Designers will spend a week on a hero image and 30 minutes on the table that users actually look at every day. That's backwards. Tabular data, charts, and lists are the most-viewed surfaces in most B2B and prosumer products — and they are usually under-designed.

The principle: data display IS content. Apply the same craft you'd apply to a marketing page.

## What "treating data as content" means

### Tables

- **Right-align numbers, left-align text, center icons.** Numbers compare easier when their decimal points line up.
- **Use tabular figures** (`font-variant-numeric: tabular-nums`). Without this, "$1,234" and "$987" don't align column-wise because proportional fonts size digits differently.
- **Borders are subtle or absent.** Heavy grid lines are an Excel tell. Use whitespace and very-low-opacity row dividers (e.g., `border-bottom: 1px solid rgba(0,0,0,0.05)`).
- **Sticky header.** Long tables need the column labels to stay visible. Subtle — no shadow, just a background.
- **Density.** Choose readable spacing for the actual audience and input method. Reuse an existing density setting if relevant; do not add a toggle solely for this recipe.
- **Row tracking.** Zebra stripes, dividers and whitespace are alternatives; use the approved style and evidence of scanning accuracy.

### Charts

- **One color per series, picked deliberately.** Most chart libraries default to a rainbow. Choose sufficient distinguishable series encodings for the actual data; no fixed colour count.
- **Useful chart scaffolding.** Preserve axes, legends, gridlines and tooltips that aid interpretation; remove only demonstrated clutter within scope.
- **Tooltips are content.** A line chart tooltip should show the value precisely + context (date, comparison to prev period). Not just "Y: 47."
- **Label the axes meaningfully.** "Date" is not a label. "Revenue, last 30 days" is.
- **Data transitions.** An instant update or motion can be appropriate. Preserve truthful values, readable continuity and user preferences; do not replay a decorative draw-in unnecessarily.

### Lists

- **Item hierarchy uses size, weight, color — not just spacing.** Title heavier and bigger. Subtitle lighter and smaller.
- **Hover state on every interactive row.** Subtle ([hover-states-subtle](../components/hover-states-subtle.md)).
- **Empty states matter most here.** See [empty-loading-states](../components/empty-loading-states.md) and [states-are-the-work](states-are-the-work.md).

## Specifically for B2B / data-heavy UIs

- **Density supports the task.** Analysts may need compact comparison or comfortable reading; preserve approved defaults and validate actual workflows.
- **Inline editing.** Click cell → edit → blur to save. Compare with modal or explicit-submit editing using actual error/recovery needs; no universal speed multiplier.
- **Keyboard navigation.** Arrows to move, Enter to edit, Esc to cancel. Every spreadsheet user expects this.

## When to apply

- Any product that surfaces data the user *reads* (not just receives).
- Dashboards, admin panels, analytics tools, finance apps, productivity apps, CRMs, log viewers.
- Even consumer apps with rich content lists (Notion, Linear, Things) — these are "data" in disguise.

## Gotcha

Don't apply marketing-page rules to data. Asymmetric layouts and "imperfect" alignment ([visual-imperfection](../surface/visual-imperfection.md)) are wrong here — data needs predictability. See [marketing-vs-product-ui](marketing-vs-product-ui.md).

The exception: data *visualizations* (charts, diagrams) can have personality. Tables and lists can also express the approved visual identity while keeping data relationships clear.

## Sources

- guidelines.sh — "Data display is content."
- Edward Tufte — *The Visual Display of Quantitative Information* (chartjunk, data-ink ratio).
- Linear, Notion, Pipedrive — modern data-as-content table design.
- Related: [marketing-vs-product-ui](marketing-vs-product-ui.md), [states-are-the-work](states-are-the-work.md), [empty-loading-states](../components/empty-loading-states.md).
