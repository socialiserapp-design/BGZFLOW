> BGZFLOW adaptation: use this technical reference only for the current requested outcome. Existing user decisions, actual project architecture and host permissions govern. Numeric examples and aesthetic opinions below are options, not universal rules, new gates or authority to redesign. External products, model weights and licences need current verification before use; none is installed by reading this page. Use the same brief and private project records; do not modify installed learning files.

---
title: shadows-whisper
summary: A restrained shadow recipe; choose elevation strength and layers for the approved material and actual surfaces.
tags: [shadow, surface]
---

# Shadows whisper

The shadow `0 2px 8px rgba(0, 0, 0, 0.1)` is one familiar recipe. Keep it when it fits; familiarity does not establish poor quality or AI authorship.

## The principle

A good shadow is barely visible. Its purpose is to suggest elevation and depth, not to draw attention to the elevated element. If you can clearly *see* the shadow as a soft gray blur, it is too strong.

## The spec

For light mode, layered shadows that whisper:

```css
/* +1 elevation: cards, buttons */
--shadow-sm:
  0 1px 1px rgba(17, 17, 17, 0.04),
  0 2px 4px rgba(17, 17, 17, 0.04);

/* +2 elevation: dropdowns, popovers */
--shadow-md:
  0 1px 2px rgba(17, 17, 17, 0.05),
  0 4px 8px rgba(17, 17, 17, 0.05),
  0 8px 24px rgba(17, 17, 17, 0.04);

/* +3 elevation: modals */
--shadow-lg:
  0 2px 4px rgba(17, 17, 17, 0.06),
  0 8px 16px rgba(17, 17, 17, 0.06),
  0 16px 48px rgba(17, 17, 17, 0.06);
```

Key moves:
- **Layer multiple shadows** at different blur radii. A single shadow with 16px blur looks flat. Three shadows at 2px, 8px, 24px blur read as physical depth.
- **Use a dark base color** (`#111`, not pure black). Slightly warmer if your palette is warm.
- **Opacity depends on the background and intended depth.** Four to six percent is a restrained starting point; ten percent or stronger may be appropriate.
- **No `y-offset` larger than blur radius.** A 2px y-offset with 8px blur is fine; 8px y-offset with 8px blur is not.

## Dark mode shadows

In dark mode, shadows alone often disappear. Pair with the surface-tint elevation pattern from [dark-mode](dark-mode.md) — use a lighter surface color *and* a much subtler shadow:

```css
.dark {
  --shadow-md:
    0 4px 12px rgba(0, 0, 0, 0.4),
    0 0 0 1px rgba(255, 255, 255, 0.06); /* hairline border for definition */
}
```

The 1px hairline border at low white opacity does most of the elevation work in dark mode.

## Inner shadows for surfaces

```css
/* Subtle inner shadow on top edge for a card */
box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06);
```

Used by Apple, Stripe, Linear. Adds a hairline highlight to suggest the surface is reflecting light from above.

## When to apply

- Any time you write a `box-shadow`. Reach for the layered token, not a single-shadow blur.
- Reviewing a design system that has one "shadow" value — push for at least three layered tokens.

## Gotcha

Don't add `box-shadow` to text. Use `text-shadow` for that — and almost never. Text shadows can be an intentional brand or legibility treatment; inspect readability and the approved look rather than rejecting a style by age.

## Sources

- guidelines.sh — "Shadows whisper (2px blur, 1px Y, 5% opacity #111)."
- Tailwind v3 shadow scale + improvements from Linear and Vercel.
- Apple HIG — material/elevation tokens.
