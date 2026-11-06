> BGZFLOW adaptation: use this technical reference only for the current requested outcome. Existing user decisions, actual project architecture and host permissions govern. Numeric examples and aesthetic opinions below are options, not universal rules, new gates or authority to redesign. External products, model weights and licences need current verification before use; none is installed by reading this page. Use the same brief and private project records; do not modify installed learning files.

---
title: page-frame
summary: Inspect marketing-page framing, reading order, margins, whitespace and headings against the approved direction; measurements are diagnostic leads, not a compulsory composition.
tags: [layout, marketing, margins, whitespace, hierarchy, review, measured]
---

# Page frame

Before a reader sees a typeface or a shadow they judge the frame: "no good margin", "everything is shifted to one side", "big random blank spaces", "no clear title". Each of those complaints is measurable on a rendered page. taste-skill's study of 97 Awwwards Sites of the Day (October 2026) measured them, and the strong pages agree on five things.

## The rules

| Inspection | Useful observation | Finding requires |
|---|---|---|
| Margins and alignment | Compare actual edges across supported sizes | An unintended misalignment that harms hierarchy, readability or the approved composition; unequal margins can be intentional |
| Edge clearance | Inspect text and controls near actual safe areas | Clipping, poor legibility or unreachable interaction; 16/12px are example insets, not universal minima |
| Width and whitespace | Observe grouping, image balance and deliberate rest | Evidence that a reader loses meaning or the layout contradicts the brief; half-empty areas can be intentional |
| First-screen meaning | Check the intended audience can identify the purpose when needed | A material comprehension problem in the actual journey, not simply absence of a literal h1 |
| Section headings | Check navigation and the semantic outline | A missing structural cue for the actual content; not every 30-word section requires a heading |
| Repeated alignment | Compare actual text edges and grouping | An unintended pattern that makes reading harder; a percentage of aligned edges is not a quality gate |

Spacing that keeps the frame: sections 120–240 px apart on desktop and 72–112 px on a phone (the study's median gap is ~230–250 px), the gap between sections clearly larger than any gap inside one, and at least twice the space above a heading as below it ([type-scale-and-rhythm](../typography/type-scale-and-rhythm.md)).

## A rest is not a hole

Empty space is placed when something closes it: the picture with type docked at its edge, a headline big enough to span it, or the wordmark and one fact in the corners like a mount around a print. If nothing closes it, it is a hole. Holes come, in order, from section gaps stretched to 250–760 px, text in one half with nothing in the other, content waiting on a reveal, a footer padded to `100vh`, and a pinned scene holding nothing for several screens. Multiple deliberate rests can fit an editorial narrative; blank-screen count alone is not a defect. When a section looks unintentionally empty, compare sizing, spacing, content and appropriate imagery against the actual brief before changing it.

## When to apply

Review the affected page at representative supported widths and conditions, including boundaries relevant to the change. Preserve approved asymmetric margins and composition when they remain readable and usable; 1440/768/390 are example checks, not a required matrix.

## Gotcha

Reveals cause holes. A section that fades in on scroll is bare ground until it fires, and in the motion study about a third of award sites still showed a loader or nothing readable 4.5 s after load. Content is in place on first paint; an entrance moves what is already there ([marketing-surface-rules](marketing-surface-rules.md), [prefers-reduced-motion](../motion/prefers-reduced-motion.md)).

## Sources

- Leonxlnx, taste-skill v2.1.1 (MIT, HEAD a9c73c3): `skills/taste-skill/references/layout.md` §4–5 (the 97-site October 2026 study: margins, the one-in-a-hundred half-empty section, holes and closers, 15 of 97 unsaid first screens, 82 % headed sections) and `scripts/lib/rules.mjs` (`off-centre`, `edge-text`, `lopsided`, `blank-gap`, `hero-void`, `untitled-section`, `ragged-edges`). Usability and design marks there are model-panel judgements of screenshots, not human jurors.
- Related: [marketing-surface-rules](marketing-surface-rules.md), [viewport-custom-design](viewport-custom-design.md), [type-scale-and-rhythm](../typography/type-scale-and-rhythm.md), [screenshot-critique](../anti-patterns/screenshot-critique.md).
