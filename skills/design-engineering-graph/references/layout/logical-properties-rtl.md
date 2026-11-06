> BGZFLOW adaptation: use this technical reference only for the current requested outcome. Existing user decisions, actual project architecture and host permissions govern. Numeric examples and aesthetic opinions below are options, not universal rules, new gates or authority to redesign. External products, model weights and licences need current verification before use; none is installed by reading this page. Use the same brief and private project records; do not modify installed learning files.

---
title: logical-properties-rtl
summary: Write anything that mirrors as leading and trailing — margin-inline-start, inset-inline-end, text-align start, float inline-start. Physical left and right are for physical geometry (safe-area insets) with a [dir="rtl"] override; translateX and background-position have no logical form. Visual order matches DOM order, only direction-bearing icons mirror, and mixed-direction values go in <bdi>.
tags: [layout, rtl, i18n, logical-properties, bidi]
---

# Logical properties and RTL

A layout written in `left` and `right` has to be rewritten for Arabic and Hebrew; one written in *start* and *end* mirrors itself when `dir="rtl"` lands. Write direction-dependent layout as leading and trailing from the first line, because retrofitting is an audit of every rule.

## The mapping

| Physical | Logical |
|---|---|
| `margin-left` / `padding-right` | `margin-inline-start` / `padding-inline-end` |
| `left` / `right` (positioned) | `inset-inline-start` / `inset-inline-end` |
| `top` / `bottom` margins and padding | `*-block-start` / `*-block-end` |
| `text-align: left` | `text-align: start` |
| `float: left` | `float: inline-start` |
| `border-top-left-radius` | `border-start-start-radius` |
| Tailwind `ml-4` / `pl-4` / `left-0` | `ms-4` / `ps-4` / `start-0` |

## Where physical stays

- **Safe-area insets are physical.** `env(safe-area-inset-left)` is the left edge of the glass in any language, so a floating button pairs each physical side with its own inset and overrides in RTL: `right: calc(16px + env(safe-area-inset-right))`, then `[dir="rtl"] .fab { right: auto; left: calc(16px + env(safe-area-inset-left)) }`. Mixing `inset-inline-*` with `safe-area-inset-left` is the bug.
- **No logical form exists** for `translateX` or `background-position: left`. Both need a `[dir="rtl"]` override — and so does a slide-in drawer's transform ([transform-mastery](../motion/transform-mastery.md)).

## Order and mirroring

- **Visual order is DOM order.** Never move content out of source sequence with `order`, `row-reverse` or grid placement: keyboard and screen-reader order follow the DOM, so the reading order and the focus order diverge.
- **Within a row**, identifying content leads and metadata and actions trail — which in RTL means the right edge leads. Logical properties do that for free.
- **Mirror only icons whose meaning follows reading direction**: back and forward arrows, a reply arrow, a progress chevron, a list-indent glyph. Never a play triangle, a clock, a checkmark, a logo, or a slash ([icon-systems](../components/icon-systems.md)).

## Text inside the layout

Set `lang` so quotes, hyphenation and pronunciation are right, and `dir` on the document and wherever direction changes. A value that may run the other way — a username, a product name, a URL, a number in an RTL sentence — goes in `<bdi>`, so punctuation stays on the right side; never reorder digits by hand. Wrapping, casing and truncation are [line-behavior](../typography/line-behavior.md)'s.

## Gotcha

Testing RTL by flipping `dir` in devtools catches layout and misses content: run it with real RTL strings, mixed-direction values and an LTR brand name inside an RTL sentence ([stress-scenarios](../meta/stress-scenarios.md)). A screen that mirrors perfectly with English copy can still put the full stop on the wrong side of every Hebrew sentence.

## Sources

- Jakub Krehel, interfaces skills (MIT, github.com/jakubkrehel/skills, HEAD `592aedc`, read 2026-10-25): `skills/better-layout/SKILL.md` (**Logical properties for anything that mirrors**, **Order by importance**, Before-you-finish rows), `grouping-and-alignment.md`, `spacing-and-adaptivity.md` (the FAB recipe); `better-ui/icons.md` (icons in RTL); `better-typography/SKILL.md` (**Language and bidi behavior**).
- CSS Logical Properties and Values Level 1.
- Related: [growth-and-overflow](growth-and-overflow.md), [grouping-by-space](grouping-by-space.md), [interfaces-reconciliation](../meta/interfaces-reconciliation.md).
