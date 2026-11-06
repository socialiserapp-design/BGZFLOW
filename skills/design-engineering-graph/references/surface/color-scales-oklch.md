> BGZFLOW adaptation: use this technical reference only for the current requested outcome. Existing user decisions, actual project architecture and host permissions govern. Numeric examples and aesthetic opinions below are options, not universal rules, new gates or authority to redesign. External products, model weights and licences need current verification before use; none is installed by reading this page. Use the same brief and private project records; do not modify installed learning files.

---
title: color-scales-oklch
summary: An optional OKLCH ramp recipe with per-step gamut checks. Preserve existing palettes and choose role, contrast and colour-space changes from the approved result.
tags: [surface, color, oklch, palette, contrast, dark-mode]
---

# Color scales in OKLCH

An `oklch()` value is a measurement, not a recipe: L is how bright the color actually looks, C how vivid, H where it sits. Because the numbers track perception, palette math, contrast repair, and dark mode become arithmetic. OKLCH is one useful authoring space; preserve an existing colour system and compatibility requirements rather than imposing a migration. This node builds the ramps that [color-monochromatic](color-monochromatic.md) asks for and feeds the checks in [contrast-and-color-scheme](contrast-and-color-scheme.md).

## Reading a value

`oklch(0.586 0.222 17.6)` — L 0–1, C from 0 (gray) to ~0.4 at the extreme, H 0–360 (≈20 red, 90 yellow, 145 green, 195 cyan, 260 blue, 330 pink). Alpha goes after a slash, never as a fourth comma argument. Three decimals is plenty.

## Building a ramp

1. **Example anchors and spacing.** Step 50 ≈ L 0.97, step 950 ≈ L 0.22, linear between. Even L spacing is a starting point, not a guarantee of equal perceived steps in every context. Pure black or white can be intentional endpoints; test roles and contrast rather than banning them.
2. **Shape chroma as a curve.** Express each step's C as a fraction of that step's sRGB ceiling: ~30% at the extremes rising to ~85% around 400–500. Tints stay airy, shades stay rich, nothing leaves the gamut.
3. **Clamp per step.** The ceiling `maxC(L, H)` moves with lightness, so a saturated base necessarily loses absolute chroma toward both ends. That is the gamut's geometry, not a defect.
4. **Hue is fixed for all eleven steps.** Converting an inherited scale and finding more than ~10° of hue spread end to end means it drifts visibly; rebuild it on the mid-tone hue.

```css
--berry-50:  oklch(0.97 0.007 330);
--berry-400: oklch(0.67 0.251 330);   /* chroma peaks where this hue's gamut is widest */
--berry-950: oklch(0.22 0.03 330);
```

## Families of hues

For related ramps, comparing lightness and gamut-relative chroma can help coherence. Equal lightness or relative chroma is a recipe, not a universal perceptual match; inspect the actual role and contrast.

## Dark mode is a remap

Keep one scale and swap which steps the roles point at: `--surface` 50 ↔ 950, `--ink` 950 ↔ 50, 200 ↔ 800, 300 ↔ 700. Perceptually linear L keeps the pairs as distinct after the flip as before. An independently designed dark palette can be appropriate; semantic remapping is one approach, not a prohibition. Desaturate brand accents 20–30% if they vibrate on dark, and keep the top canvas the lightest dark surface — see [dark-mode](dark-mode.md).

## Contrast lives in the L gap

Chroma and hue barely move contrast. To repair a failing pair, push the foreground's L away from the background's L and leave C and H alone; raising saturation "to make it pop" does nothing. Fast triage: a surface with L > 0.6 wants dark text; near-white grounds (L ≥ 0.85) want foreground L ≤ 0.45; near-black grounds (L ≤ 0.25) want L ≥ 0.75. Then run the real check: APCA |Lc| ≥ 75 for body (90 preferred), ≥ 60 other content text, ≥ 45 large, ≥ 30 non-text and disabled; WCAG 2 4.5:1 body, 3:1 large, when compliance language names it. The thresholds live in [contrast-and-color-scheme](contrast-and-color-scheme.md).

## Gamut and P3

Syntactically valid values can exceed what sRGB shows. Clamp C holding L and H, and layer wide-gamut chroma behind `@media (color-gamut: p3)` on top of the sRGB-safe base; ceilings, fallbacks and migration steps are in [oklch-gamut-and-migration](oklch-gamut-and-migration.md). Tailwind v4 is authored in OKLCH; custom `@theme` scales should be too, and `/50` opacity suffixes compose out of the box.

## When to apply

Any new palette, any hex → OKLCH migration (swap values only; keep keywords, gradient shape, and hex-expecting config), any "is this readable" question, any dark theme.

## Gotcha

HSL's lightness is decorative — `hsl(55 100% 50%)` is nearly white-bright and `hsl(255 100% 50%)` is dark. A ramp spaced on HSL's L inherits that lie and its tints slide toward violet. HSL can remain appropriate to existing tooling or a deliberate recipe; inspect perceptual spacing and contrast instead of treating a colour-space choice as a defect.

## Sources

- Emil Kowalski's design-engineering practice on color, distilled by HKTITAN.
- APCA (Myndex) and WCAG 2 contrast thresholds; CSS Color Level 4 `oklch()`.
- Related: [color-monochromatic](color-monochromatic.md), [contrast-and-color-scheme](contrast-and-color-scheme.md), [dark-mode](dark-mode.md).
