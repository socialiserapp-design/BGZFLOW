> BGZFLOW adaptation: use this technical reference only for the current requested outcome. Existing user decisions, actual project architecture and host permissions govern. Numeric examples and aesthetic opinions below are options, not universal rules, new gates or authority to redesign. External products, model weights and licences need current verification before use; none is installed by reading this page. Use the same brief and private project records; do not modify installed learning files.

---
title: wcag-thresholds
summary: The WCAG 2.2 A/AA numbers that turn a preference into a finding — 4.5:1 and 3:1 contrast, 3:1 focus rings, 24×24 targets, a single-pointer path for every drag, focus never hidden under sticky chrome, 200% text and 320px reflow, pause/stop/hide where the actual criterion applies. A finding cites one of these or a task an assistive-tech user cannot finish; 44px targets and heading outlines are recommendations.
tags: [components, accessibility, wcag, contrast, targets, reflow]
---

# WCAG 2.2 thresholds

A review blocks on evidence, not taste. In accessibility the evidence is a WCAG 2.2 Level A or AA criterion by number, or a concrete task an assistive-technology user cannot complete. Everything else — AAA, APG conventions, one `<h1>` per page, no skipped heading levels, 44px touch targets — is not automatically a conformance failure. Severity follows demonstrated user impact and applicable requirements, not the recommendation label alone.

## The numbers

| Criterion | Rule |
|---|---|
| 1.4.3 Contrast | Text 4.5:1; large text (≥ 24px, or ≥ 18.67px bold) 3:1 |
| 1.4.11 Non-text contrast | Component boundaries, states and meaningful graphics 3:1 — includes input borders and custom focus rings against **every** adjacent colour |
| 1.4.1 Use of colour | Status never by colour alone: add an icon, text or underline |
| 2.5.8 Target size | 24×24 CSS px, or a smaller target spaced so a 24px circle centred on it touches no other target (links inside a sentence are exempt) |
| 2.5.7 Dragging | Every drag has a single-pointer alternative — buttons or a menu that reach the same result |
| 2.4.7 / 2.4.11 Focus | A visible indicator, and the focused element never **fully** hidden behind a sticky header, footer or banner |
| 1.4.4 Resize text | Everything survives 200% text |
| 1.4.10 Reflow | Works at 320px wide (400% zoom on 1280px) with vertical scroll only; tables, maps and code scroll in their own box |
| 2.2.2 Pause, stop, hide | Check the criterion’s conditions: automatically starting movement/blinking/scrolling lasting over 5s alongside other content needs an appropriate pause/stop/hide mechanism unless essential; auto-updating content has its own conditions and control alternatives |
| 1.4.2 Audio control | Automatically playing audio lasting more than 3s needs pause/stop or volume control independent of system volume; the criterion does not categorically prohibit autoplay |

Inactive controls and logos are exempt from contrast. Measuring a pair is a colour job ([contrast-and-color-scheme](../surface/contrast-and-color-scheme.md), [color-scales-oklch](../surface/color-scales-oklch.md)): measure the foreground against what it **actually renders on**, report the pair, the value and the threshold missed, and leave the colours alone unless asked.

## The fixes the numbers imply

- **Targets** — keep the visual small and grow the hit area with a pseudo-element; hit areas never overlap; decorative layers get `pointer-events: none` so a glow never swallows the click beneath it. Aim for 44px touch and 40px desktop where density allows ([touch-and-focus](touch-and-focus.md)), but keep an established, usable dense tool dense.
- **Focus under sticky chrome** — `scroll-padding-block-start` on the scroller equal to the header's height; `-block-end` for a sticky footer or cookie bar ([growth-and-overflow](../layout/growth-and-overflow.md)).
- **Zoom** — never `maximum-scale=1` or `user-scalable=no`; the iOS input-zoom fix is a 16px input, not a locked viewport ([forms-behavior](forms-behavior.md)). Text boxes take `min-height`, never `height`. Write media queries in `rem` so a larger browser font size reaches the narrow layout.
- **Forced colours** — Windows High Contrast drops every `box-shadow`. A shadow ring keeps `border: 1px solid transparent` under it so an edge still draws; never `forced-color-adjust: none` without checking the control stays visible.
- **Timed UI** — auto-dismiss only low-stakes confirmations. A toast carrying an action, an error or something the user may need stays until dismissed; one that must time out gets ≥ 5 s and pauses while hovered or focused. An undo link that vanishes on a timer is data loss on a schedule.

## Gotcha

This graph reaches for APCA when *designing* contrast ([contrast-and-color-scheme](../surface/contrast-and-color-scheme.md)). A *finding* still cites the WCAG 2 ratio, because that is the criterion a product is held to. Pass both; report the one with a number on it. The split is settled in [interfaces-reconciliation](../meta/interfaces-reconciliation.md).

## Sources

- Jakub Krehel, interfaces skills (MIT, github.com/jakubkrehel/skills, HEAD `592aedc`, read 2026-10-25): `skills/better-accessibility/SKILL.md` (**Criteria, not conventions**, **Minimum hit area**, **Pair color with a second cue**, **Survive zoom and text resize**), `hit-areas.md`, `motion-and-zoom.md`, `focus-and-keyboard.md`; `skills/better-ui/SKILL.md` (the forced-colors border).
- W3C, Web Content Accessibility Guidelines 2.2 — success criteria as numbered above.
- Related: [accessibility-baseline](accessibility-baseline.md), [keyboard-patterns](keyboard-patterns.md), [screen-reader-announcements](screen-reader-announcements.md), [prefers-reduced-motion](../motion/prefers-reduced-motion.md).
