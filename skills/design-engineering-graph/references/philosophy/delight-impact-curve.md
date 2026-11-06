> BGZFLOW adaptation: use this technical reference only for the current requested outcome. Existing user decisions, actual project architecture and host permissions govern. Numeric examples and aesthetic opinions below are options, not universal rules, new gates or authority to redesign. External products, model weights and licences need current verification before use; none is installed by reading this page. Use the same brief and private project records; do not modify installed learning files.

---
title: delight-impact-curve
summary: Potential for delight rises as feature frequency falls. Daily-use features need minimal delight; rare moments earn big ones.
tags: [philosophy, delight, animation]
---

# The delight-impact curve

The more often a user encounters a feature, the *less* delight it can carry without becoming annoying. The less often a user encounters it, the *more* delight it can carry, because each encounter is fresh.

This is Benji Taylor's framing and it is the single most useful heuristic for deciding "should this animate / make a sound / have a flourish?"

## The curve, concretely

| Frequency of use | Delight allowance |
|---|---|
| Every keystroke (typing, scroll) | Preserve immediate response and comfortable repeated use; purposeful feedback can still be appropriate. |
| Every action (clicking primary buttons, hovering rows) | Subtle. ~100–160ms. No flourish. |
| Daily-use moments (commit, send, save) | Small. A tick. A momentary highlight. |
| Weekly moments (new doc, share, complete a flow) | Medium. Stagger or scale-in. |
| Rare milestones (sign up complete, first export, year-in-review) | **Big.** Confetti is fine here. |

## What this means in practice

- Keyboard-driven interactions may animate when useful and responsive; never make motion a prerequisite for receiving input.
- Primary controls need clear immediate feedback; the approved product voice determines whether that feedback is playful.
- Repetition is one factor in tuning motion, alongside meaning, accessibility, user preference and measured cost.
- Check repeated use on the actual task rather than assigning a mandatory frequency tier.

## When to apply

Anytime someone proposes "let's make this more fun." Ask: how often does the user see this? Then look at the curve. If it's high-frequency, the right answer is usually "make it more invisible," not "make it more visible."

## Gotcha

The curve breaks for first-run experiences. Onboarding is rare-per-user but high-leverage; it can carry weekly-tier delight even on per-action moments. Once onboarding is done, the budget collapses back to the per-frequency norm.

## Sources

- Benji Taylor, "Family Values" — the explicit delight-impact framing.
- Emil Kowalski, [animation-decision-framework](../motion/animation-decision-framework.md) — frequency-based decision tree variant.
