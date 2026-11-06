> BGZFLOW adaptation: use this technical reference only for the current requested outcome. Existing user decisions, actual project architecture and host permissions govern. Numeric examples and aesthetic opinions below are options, not universal rules, new gates or authority to redesign. External products, model weights and licences need current verification before use; none is installed by reading this page. Use the same brief and private project records; do not modify installed learning files.

---
title: MOC-layout
summary: Page-level layout, grids, viewports, sticky and scroll tells.
tags: [moc, layout]
---

# MOC — Layout

The page-level container, not the component level. When designing a screen — especially marketing screens — start here.

## Nodes

- [viewport-custom-design](viewport-custom-design.md) — Each viewport gets its own design, not just a scaled version of desktop. Narrow columns are valid. Break the grid for delight.
- [sticky-and-scroll-tells](sticky-and-scroll-tells.md) — Background-blur on sticky sections is an AI tell. Scroll hijacking confuses users. Native scroll usually wins.
- [url-as-state](url-as-state.md) — Filters, tabs, pagination, panels — all live in the URL. Back/forward restores everything including scroll.
- [marketing-surface-rules](marketing-surface-rules.md) — Marketing pages earn a bigger motion budget and still overspend it. Motion maps to input, intros play once per session, everything pre-renders, fonts and hero images preload, nav content stays in the DOM, CTAs know who is looking, docs are for copying, blogs and changelogs are feeds.
- [page-frame](page-frame.md) — Inspect marketing-page framing, reading order, margins, whitespace and headings against the approved direction; measurements are diagnostic leads, not a compulsory composition.
- [scroll-anchoring](scroll-anchoring.md) — When content above the view changes height, keep the row the reader is looking at where it is on screen. Pick an anchor when the user scrolls, keep its screen offset until they scroll again, compare scroll positions by value (never by "a scroll event fired"), and store the scrollTop the browser read back.
- [grouping-by-space](grouping-by-space.md) — Group with space first, a background shape second, a separator line last; the gap between groups is at least twice the gap inside one. Controls look like controls, everything sits on a few shared edges, borderless controls get 24px between glyphs (bordered ones 12px), buttons inset 16px from the screen edge, content bleeds while controls float, one primary action per view.
- [growth-and-overflow](growth-and-overflow.md) — Layouts break when content grows — a German label, 200% text, a long URL. Size text boxes with max-width and min-height, let rows wrap, test with pseudo-localization. minmax(0, 1fr) and min-width 0 stop min-content blowout; 100% not 100vw; 100dvh panes; container queries for components (and the container-type collapse); breakpoints where the layout stops fitting; peeks and scroll-padding for what scrolls.
- [logical-properties-rtl](logical-properties-rtl.md) — Write anything that mirrors as leading and trailing — margin-inline-start, inset-inline-end, text-align start, float inline-start. Physical left and right are for physical geometry (safe-area insets) with a [dir="rtl"] override; translateX and background-position have no logical form. Visual order matches DOM order, only direction-bearing icons mirror, and mixed-direction values go in <bdi>.

- [information-architecture](information-architecture.md) — Structure follows the actual user task and mental model. Group related views, keep actions reachable, preserve context and explain recovery; no universal menu-depth or sticky-action rule.
- [mobile-platform-layer](mobile-platform-layer.md) — The viewport, keyboard, scroll and browser-chrome fixes that make a web app feel installed — the baseline meta tag, dvh vs svh, safe areas in all four directions, the Android keyboard, scroll lock through a dialog primitive, overscroll none vs contain, per-scheme theme-color, text-size-adjust — each with its reason, verified on a real phone.
- [share-and-crawl-metadata](share-and-crawl-metadata.md) — A public page is read by people in tabs, by link previews in chat apps, and by crawlers — each needs a real title, description, image and crawl rule. Wire the template; take the words from the page; and walk the one paying flow end to end before launch.

## Cross-cluster

- For *component-level* layout (cards, modals), see [MOC-components](../components/MOC-components.md).
- For the marketing-vs-product distinction that determines layout discipline, see [marketing-vs-product-ui](../philosophy/marketing-vs-product-ui.md).
- For when to break the grid, see [visual-imperfection](../surface/visual-imperfection.md).
