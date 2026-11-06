> BGZFLOW adaptation: use this technical reference only for the current requested outcome. Existing user decisions, actual project architecture and host permissions govern. Numeric examples and aesthetic opinions below are options, not universal rules, new gates or authority to redesign. External products, model weights and licences need current verification before use; none is installed by reading this page. Use the same brief and private project records; do not modify installed learning files.

---
title: dark-mode
summary: Preserve the approved black or near-black palette and supported themes. Verify text, elevation, artwork and control contrast on actual grounds; no mandatory desaturation or ring recipe.
tags: [color, dark-mode, surface]
---

# Dark mode

Dark mode is its own designed theme, derived from the same scale as light mode by remapping which steps each role uses. The most common mistake is pure black (`#000000`) under pure white (`#ffffff`): the contrast is harsh, the surfaces feel cheap, and OLED screens smear scrolling text.

## Background

Use a near-black with a slight hue bias.

```css
--bg-base: #18181b;        /* Zinc 950 — most products */
--bg-elevated: #1f1f23;    /* +1: cards */
--bg-overlay: #2a2a2f;     /* +2: menus, modals */
--bg-floating: #35353a;    /* +3, rarely needed */
```

In light mode elevation is shadow; in dark mode it is a **lighter surface**, and the topmost layer is the lightest. Pure `#000` is for photo backdrops, video chrome, and OLED themes that opt in.

## Remap, don't invert

Keep one scale and point the roles at mirrored steps (50 ↔ 950, 200 ↔ 800), as [color-scales-oklch](color-scales-oklch.md) describes. That is not the same as inverting colors: re-check every pair, because warm yellows turn muddy and brand accents vibrate. **Desaturate accents 20–30%** on dark surfaces.

## Text

White at 90–93% reads softer than full white:

```css
--text-primary: rgba(255, 255, 255, 0.92);
--text-secondary: rgba(255, 255, 255, 0.62);
```

Opacity text needs verified contrast across its actual backgrounds; a single known surface makes that easier but is not the only valid case. Over an elevated card, an image or a tinted panel, the alpha mixes with whatever sits beneath and the contrast changes. Everywhere else, use specific solid tokens (`--text-secondary-on-elevated`) and check them against their real surface.

## Borders and rings

- **Dividers are solid** dark greys (around `#2a2a2a` on `#18181b`): table rules, list separators, input edges. An alpha white line glows.
- **White rings can indicate elevation where appropriate.** Shadows can lose distinction on some dark grounds; a raised card can instead use a ring, tonal separation or a measured shadow, `0 0 0 1px rgb(255 255 255 / .09)` ([depth-and-nesting](depth-and-nesting.md)). Images take a white 10% inset outline.

## Assets

A hardcoded SVG colour may fail on a supported ground, but can also be intentional brand/artwork content. Use currentColor or tokens where appropriate and verify the actual asset, rather than replacing every literal fill.

## When to apply

Any product with a theme toggle or `prefers-color-scheme` support. Pair with the browser-chrome rules in [contrast-and-color-scheme](contrast-and-color-scheme.md).

## Gotcha

A half-finished dark mode that users can reach is a blocker, not a nit: one white modal, a light native `<select>`, or a black-on-dark logo makes the whole product look broken. If the theme isn't done, don't expose the toggle and don't declare `color-scheme: dark`.

## Sources

- guidelines.sh — near-black surfaces, softened white text.
- Material Design 3 — dark theme elevation by surface tint.
- Emil Kowalski's design-engineering practice, distilled by HKTITAN — remapping, desaturation, solid dividers vs rings.
- Related: [color-monochromatic](color-monochromatic.md), [shadows-whisper](shadows-whisper.md), [depth-and-nesting](depth-and-nesting.md).
