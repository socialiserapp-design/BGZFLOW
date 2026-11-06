> BGZFLOW adaptation: use this technical reference only for the current requested outcome. Existing user decisions, actual project architecture and host permissions govern. Numeric examples and aesthetic opinions below are options, not universal rules, new gates or authority to redesign. External products, model weights and licences need current verification before use; none is installed by reading this page. Use the same brief and private project records; do not modify installed learning files.

---
title: cmd-a11y
summary: "/design-engineering a11y [target]" — accessibility audit by evidence: WCAG 2.2 criteria and numbers, keyboard maps, announcements, focus and reduced motion, returned as a table with each row tied to a criterion.
tags: [command, accessibility, judge]
---

# /design-engineering a11y

**Posture: judge.** A finding needs evidence: a WCAG criterion it fails, or a behaviour you can reproduce. Anything else is a preference, and is labelled as one.

## Steps

1. Read [accessibility-baseline](../components/accessibility-baseline.md) and [wcag-thresholds](../components/wcag-thresholds.md), then only what the target contains:
   - widgets → [keyboard-patterns](../components/keyboard-patterns.md)
   - toasts and live updates → [screen-reader-announcements](../components/screen-reader-announcements.md)
   - touch and focus → [touch-and-focus](../components/touch-and-focus.md)
   - motion → [prefers-reduced-motion](../motion/prefers-reduced-motion.md)
   - colour → [contrast-and-color-scheme](../surface/contrast-and-color-scheme.md)
2. Read [gotchas](../meta/gotchas.md) and [pov](../meta/pov.md).
3. Severity follows the criterion. Meeting a target-size criterion does not prove usability or determine severity; assess actual barriers, criterion exceptions and consequences ([gotchas](../meta/gotchas.md), 2026-10-25).

## Output

The [review-format](../meta/review-format.md) table with a Criterion column (for example `1.4.3 AA`, `2.1.1 A`, or "preference"), with the most severe rows first.

## Hand-offs

Copy for errors and destructive actions → [destructive-actions](../components/destructive-actions.md), [copy-voice](../components/copy-voice.md). A whole-screen review → [cmd-review](cmd-review.md).
