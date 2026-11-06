> BGZFLOW adaptation: use this technical reference only for the current requested outcome. Existing user decisions, actual project architecture and host permissions govern. Numeric examples and aesthetic opinions below are options, not universal rules, new gates or authority to redesign. External products, model weights and licences need current verification before use; none is installed by reading this page. Use the same brief and private project records; do not modify installed learning files.

---
title: type-scale-and-rhythm
summary: Design size, leading, tracking, font formats and numeric features for the actual typographic roles and scripts. Preserve the existing scale and approved families; example metrics are not limits.
tags: [typography, scale, leading, tracking, fonts]
---

# Type scale and rhythm

Size, leading, and tracking carry more of typography's quality than any flourish; get the three right and most text problems never appear. This node is the mechanics beneath [typography-humanity](typography-humanity.md) (which face) and beside [line-length-tracking](line-length-tracking.md) (how lines run).

## Files and features

- **Choose a compatible font format.** WOFF2 is a common efficient web format. Native packaging, existing tools or another supported target may require TTF/OTF; their presence alone is not a defect. Load only the weights you use and subset to the characters you use.
- **`font-synthesis: none` at the root.** Ask for an unloaded bold or italic and the browser fakes one by thickening or slanting glyphs. Turn it off so a missing file fails visibly.
- **High-level property over raw tag.** `font-weight: 620`, not `font-variation-settings: "wght" 620`; `font-optical-sizing: auto`, not a hand-set `"opsz"`; `font-variant-numeric: tabular-nums`, not `"tnum" 1`. Properties still do something sensible on a fallback font; raw tags silently stop. Reserve `font-variation-settings` / `font-feature-settings` for custom axes and numbered stylistic sets, and comment what the numbered slot does in *this* font.
- **Tabular figures on anything that updates.** Timers, prices, counters nudge their neighbours on every tick without them. The full feature and axis inventory is [opentype-features-and-axes](opentype-features-and-axes.md).
- **Light weights are size-bound.** A 300 weight that looks elegant at 32px is illegible at 11px; keep light weights for display sizes. Size and baseline-shift footnote markers yourself, since the default `<sup>` is too big and pushes the line apart.

## Build a scale, then obey it

A short closed list of sizes; departures need justification. Ratio-derived (1.2 on a 16px root) or Tailwind's stock steps are both fine. On a team, name steps by **role** — `text-caption`, `text-card-title` — because a role polices its own usage in a way `text-lg` cannot. Sizes in `rem` so the reader's settings hold; `px` is for hairlines, not text.

## Leading follows role

Body 1.5–1.6; display and headings around 1.1 (large sizes carry their own optical spacing). Unitless line-height often scales well with text; fixed or calculated values can also be appropriate when the actual layout survives scaling and font changes. Paragraph spacing ≈ 1× line-height, not an arbitrary px.

## Tracking follows size

Display sizes slightly negative (≈ −0.015em); small uppercase labels slightly positive (≈ +0.06em) so capitals get daylight; body zero. Track in `em` so it scales with the text. Kerning is the font's own pair data and stays on; `font-kerning: none` is a deliberate, rare act.

## Crop the built-in space

Every font reserves headroom above the cap height and legroom below the baseline, which is why a label never sits dead-centre in its button. `text-box: trim-both cap alphabetic` crops it. Ship as progressive enhancement; the layout must survive where the trim never happens.

## Display on a marketing page

On 202 measured gallery sites the hero headline runs a median 72 px (5.0 vw; middle half 43–109 px; 40 px on a phone), at leading ~1.0, about 4.3× body (4.7× on top-scored sites). The largest type is 8.4 vw on top-scored sites against 5.0 vw on weak ones. Size alone separates them, and weight doesn't have to: 48 % of heroes are regular weight. Budget the words before the size. Characters per line ≈ line width ÷ (size × k), with k ≈ 0.40 condensed, 0.50 most faces, 0.58 wide or caps, so a two-line headline at 44 px on a 390 px phone holds about 32 characters (four to six words). Over that, cut words before shrinking type. Product and editorial typography both follow their actual task, brand and reading conditions; do not impose a universal product headline ceiling.

## Pairing and count

A small number of families can support coherence, but there is no three-family ceiling or ban on related sans faces. Use the approved brand and actual typographic roles. Two lookalike grotesques read as a version-control accident. Weights and sizes obey the same economy: each exists to mark hierarchy, and stacking too many erases the distinctions they were meant to draw. Two families at the same `font-size` rarely look the same size — x-height decides — so re-tune sizes when swapping faces and match the fallback stack's x-height to avoid a jolt on load.

## When to apply

Setting up a project's type; any "text feels cramped here, airy there" complaint (one-off sizes are the cause); any live number; any font-loading diff.

## Gotcha

A weight change can shift layout in some fonts; preserve stable geometry or use a measured alternative when that occurs. Weight changes are valid when the selected typeface and interaction remain stable. Use colour, indicators or a stable variable-axis change when they better fit the interaction; no universal prohibition on weight feedback.

## Sources

- Emil Kowalski's design-engineering practice on typography, distilled by HKTITAN.
- CSS Fonts Level 4 (`font-synthesis`, `font-optical-sizing`), CSS Inline Layout (`text-box`).
- Leonxlnx, taste-skill v2.1.1 (MIT, HEAD a9c73c3): `skills/taste-skill/references/type.md` (202 sites measured at 1440 × 900 and 390 × 844, 2026-10-05; top and weak are model-panel tiers) and `references/copy.md` §2 (the headline budget; k values are its rule of thumb).
- Related: [typography-humanity](typography-humanity.md), [line-length-tracking](line-length-tracking.md), [line-behavior](line-behavior.md), [opentype-features-and-axes](opentype-features-and-axes.md).
