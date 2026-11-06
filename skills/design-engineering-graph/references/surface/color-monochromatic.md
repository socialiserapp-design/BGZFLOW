> BGZFLOW adaptation: use this technical reference only for the current requested outcome. Existing user decisions, actual project architecture and host permissions govern. Numeric examples and aesthetic opinions below are options, not universal rules, new gates or authority to redesign. External products, model weights and licences need current verification before use; none is installed by reading this page. Use the same brief and private project records; do not modify installed learning files.

---
title: color-monochromatic
summary: A restrained palette option and its hierarchy trade-offs; preserve approved brand colour.
tags: [color, surface]
---

# Monochromatic palettes

A monochromatic palette — one hue across a wide range of lightness values, plus one or two true accent colors — can create a coherent hierarchy. Multi-colour palettes can be equally appropriate to the approved brand and content.

## An optional restrained-palette recipe

1. Pick **one neutral hue** as your base. Pure gray is fine. A warm or cool tint is another option when it fits the approved identity; it is not inherently better.
2. Generate **8–12 steps** of that hue from near-white to near-black. Tailwind's `slate`, `zinc`, `stone`, `gray`, and `neutral` are good starting points. Linear, Vercel, Notion all use this approach.
3. Pick **one true accent** for primary actions. Saturated, intentional. Don't dilute it across the UI — earn its use.
4. Optionally pick **one second accent** for warnings or success states. These should be subdued, not loud. If the brand accent is green, success takes a different hue, or users can't tell "primary action" from "it worked".

For this restrained recipe, compare neutral temperature and perceptual tints with the actual approved palette. Warm/cool contrast and neutral grey can be intentional. Disabled styling may use explicit tokens or compositing where actual visibility and semantics remain correct ([color-token-tiers](color-token-tiers.md)).

That's it. The whole palette is ~14 tokens. Token count alone does not establish unnecessary complexity.

## Context-sensitive inspection leads

- **Bright purple gradients** (any of the `purple → indigo → fuchsia` variants). Valid when approved and legible; do not classify authorship from colour.
- **Five-color brand palettes** with no hierarchy. Every color competes for attention; the eye finds nothing to land on.
- **Adjacent hues without intent.** Red + orange + yellow with no narrative reason is muddy.
- **High saturation everywhere.** Monochrome at 5–10% saturation reads as restrained and confident.

## When to apply

- Designing a new product UI from scratch.
- Evaluating an existing palette when the requested work identifies confusing or redundant roles; colour count alone is not a defect.
- Reviewing a landing page or PR where the team has added a new accent for "emphasis."

## Why this works

Too many competing colour roles can make hierarchy unclear; no fixed colour count is a perception limit. A monochrome palette gives the user a single tonal language to read; the one accent stands out by *being* the deviation. A multi-colour palette can also provide clear hierarchy when roles, contrast and content justify it.

## Gotcha

"Monochromatic" doesn't mean "boring." A monochrome palette with rich texture, considered typography (see [typography-humanity](../typography/typography-humanity.md)), and tight motion (see [duration-table](../motion/duration-table.md)) feels luxurious. A multi-color palette with bad type and bad motion feels cluttered.

See also [dark-mode](dark-mode.md) for the dark-mode variant of these tokens, [ai-default-tells](../anti-patterns/ai-default-tells.md) for what to remove.

## Sources

- guidelines.sh — "Monochromatic with subtle accents; avoid bright/purple gradients."
- Linear, Vercel, Notion — examples of monochrome-with-one-accent in production.
- Emil Kowalski's design-engineering practice, distilled by HKTITAN — status hue, neutral temperature, tints and disabled tokens.
