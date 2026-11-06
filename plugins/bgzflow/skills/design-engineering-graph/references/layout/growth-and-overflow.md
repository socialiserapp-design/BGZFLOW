> BGZFLOW adaptation: use this technical reference only for the current requested outcome. Existing user decisions, actual project architecture and host permissions govern. Numeric examples and aesthetic opinions below are options, not universal rules, new gates or authority to redesign. External products, model weights and licences need current verification before use; none is installed by reading this page. Use the same brief and private project records; do not modify installed learning files.

---
title: growth-and-overflow
summary: Layouts break when content grows — a German label, 200% text, a long URL. Size text boxes with max-width and min-height, let rows wrap, test with pseudo-localization. minmax(0, 1fr) and min-width 0 stop min-content blowout; 100% not 100vw; 100dvh panes; container queries for components (and the container-type collapse); breakpoints where the layout stops fitting; peeks and scroll-padding for what scrolls.
tags: [layout, responsive, overflow, i18n, container-queries]
---

# Growth and overflow

A layout that fits the copy in the mockup has been tested once. Translation lengthens strings — short ones most, so a one-word button is the riskiest thing on screen — and zoom, user names and API data do the same. Design for the worst content, then hold structure until it actually stops fitting.

## Grow, don't clip

- **Let real text fit.** max-width/min-height and wrapping are useful options. Fixed dimensions can be legitimate in an actual layout when text still remains readable and has a reliable overflow/full-content route; test localisation and zoom.
- **Where a box must cap its height**, pair `max-height` with `overflow-y: auto`; `min-height` keeps text alive at 200% ([wcag-thresholds](../components/wcag-thresholds.md)).
- **Test with pseudo-localization** (`[Ŝéţţîñĝš ~~~~]`, +30–40%) and one long-string locale such as German.
- **Never park a critical action where clipping can reach it** — the bottom of a resizable pane, a modal taller than the viewport, anything the on-screen keyboard covers. Keep it in flow or in stable chrome: a sticky footer with safe-area padding, or the top of the view.

## The overflow traps

| Detection | Fix |
|---|---|
| A `1fr` track or a flex child with long text or a wide table, overflowing | `minmax(0, 1fr)` on the track, `min-width: 0` on the child — tracks refuse to shrink below min-content |
| `width: 100vw` | `width: 100%`; `100vw` includes the scrollbar and scrolls sideways on desktop |
| `height: 100vh` on a full-height mobile pane | `100dvh` — the toolbar and keyboard stop covering the bottom ([viewport-custom-design](viewport-custom-design.md)) |
| A modal taller than the viewport | `max-height: 100dvh`, a scrolling body, the action row outside the scroll area |
| `env(safe-area-inset-*)` with no `viewport-fit=cover` | Add it, or every inset resolves to 0 |

## Breakpoints come from the content

Break where the layout stops fitting — the sidebar squeezes content below its measure, a grid column drops below a usable width — not at `768px` because a preset says so. Test the smallest and largest supported sizes first. Write queries in `rem` so a larger browser font size reaches the narrow layout.

**Choose container or viewport response by the actual responsibility:** `container-type: inline-size` on the parent, `@container (width < 400px)` on the child. A viewport query breaks the card the moment it sits in a narrow sidebar. Two traps: a query styles only descendants, never the container itself; and size containment means the container no longer takes its width from its content, so a shrink-to-fit container — a flex item with no width, an inline-block, an absolute box — collapses to zero. Give it a definite width.

## Hint at what scrolls

Off-screen and collapsed content needs a visible cue. A row of cards that ends exactly at the edge looks complete and nobody scrolls it: let the next item **peek 16–32px** (item `flex: 0 0 calc(100% + gap - peek)`, with `scroll-padding-inline` matching the padding). A disclosure names what it hides — "Show 12 more results", not "More". A truncated value has a way back: an expand control, a detail view, or a tooltip that also opens on keyboard focus; a hover-only `title` never counts ([line-behavior](../typography/line-behavior.md)).

**Content scrolls under sticky chrome, never focus.** `scroll-padding-block-start: var(--header-height)` on the scroller keeps anchor targets and focused elements clear of the header ([sticky-and-scroll-tells](sticky-and-scroll-tells.md)).

## Gotcha

`overflow: hidden` on a parent "fixes" a horizontal scrollbar by clipping whatever caused it — usually a `1fr` track or a `100vw`. Find the child that refused to shrink; the clip hides the bug and the content with it.

## Sources

- Jakub Krehel, interfaces skills (MIT, github.com/jakubkrehel/skills, HEAD `592aedc`, read 2026-10-25): `skills/better-layout/SKILL.md` (**Hint at hidden content**, **Content bleeds, controls float**, **Hold structure until it breaks**, **Plan for growth and clipping**, Before-you-finish table), `spacing-and-adaptivity.md`; `better-accessibility/motion-and-zoom.md` (`rem` queries).
- Related: [logical-properties-rtl](logical-properties-rtl.md), [grouping-by-space](grouping-by-space.md), [page-frame](page-frame.md), [stress-scenarios](../meta/stress-scenarios.md).
