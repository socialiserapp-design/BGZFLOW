> BGZFLOW adaptation: use this technical reference only for the current requested outcome. Existing user decisions, actual project architecture and host permissions govern. Numeric examples and aesthetic opinions below are options, not universal rules, new gates or authority to redesign. External products, model weights and licences need current verification before use; none is installed by reading this page. Use the same brief and private project records; do not modify installed learning files.

---
title: dashboard-tells
summary: Design dashboard hierarchy and metric formatting for the actual domain, audience and approved product style; cited screen measurements are examples, not limits.
tags: [components, dashboard, kpi, data, tables, app-screens, measured]
---

# Dashboard tells

The generated dashboard is a landing page with numbers on it: four tinted tiles, an icon in a coloured circle on each, a 48 px figure, a green "+100 %" pill and a sparkline nobody reads. taste-skill measured 23 real product screens (17 products, 1440–1512 px) and they share none of it. The data is the content ([data-is-content](../philosophy/data-is-content.md)), and on a real screen the chrome gets out of its way.

## Headline numbers

- **No icon circles, no sparklines** on KPIs: 0 of 23 screens use either. An info icon beside the label is fine.
- **Often no tile at all.** 11 of the 20 screens with headline numbers give a KPI no tile of its own: bare text, or one container split by 1 px dividers. 7 put each number inside the card that explains it, which is often better.
- **Size.** Choose metric size, labels and hierarchy for the actual reading distance, display and task. The cited corpus range 16–40px is descriptive, not a ceiling; a larger approved figure can be appropriate.
- **1–6 per row**, median 3–4, matching the grid's columns.

## Deltas

- Optional: 9 of the 20 show one. Example 10–15px; scale to the actual hierarchy, with the window in words ("vs prior 30 days").
- **Colour says good or bad, not up or down.** Latency, error rate, cost and churn are better when they fall. A rise in errors in the same green as a rise in visits hides the screen's only bad news.
- **Zero or undefined change is grey.** The commonest failure in the study is a change grown from zero shown as a signal: green "up 100 %" pills, ">999 %", a bold red "0.00 %". Write "+4 (new)" when the prior period was zero, and a grey dash when there is nothing to compare.

## Tables and figures

Numbers right-aligned in tabular figures, with `font-variant-numeric: tabular-nums` checked to actually change the digit widths. Precision and rounding per actual metric, currency, locale and domain (some currencies use zero or three minor-unit decimals; fractional quantities can be valid), a sign on every change, and the sign in the text rather than red on every negative. Use the approved hierarchy and accessible contrast; colour need not be limited to one primary figure. A missing value is a grey dash, a real zero is printed. Zebra rows and uppercase headers are valid when they improve scanning and remain readable. 17 of 23 put no shadow on resting cards ([depth-and-nesting](../surface/depth-and-nesting.md)).

## Type

The historical 23-screen corpus used a small typographic range. Treat its measurements as examples; the actual brand, scripts, display and hierarchy determine families and sizes.

## Gotcha

These numbers come from 23 screens the skill's owner chose, and the screenshots are private, so the medians cannot be checked and the sample has a taste. The two delta rules don't need the sample: they are logic, and they are the ones to enforce first.

## Sources

- Leonxlnx, taste-skill v2.1.1 (MIT, HEAD a9c73c3): `skills/taste-skill/references/app-screens.md` §5 (KPIs and deltas), §7.4–7.5 (figures, ink in rows), §9.1 (type); `references/research.md` §13 (the 23-screen study and its limits).
- Related: [data-is-content](../philosophy/data-is-content.md), [cards-design](cards-design.md), [empty-loading-states](empty-loading-states.md), [type-scale-and-rhythm](../typography/type-scale-and-rhythm.md).
