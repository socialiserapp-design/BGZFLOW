> BGZFLOW adaptation: use this technical reference only for the current requested outcome. Existing user decisions, actual project architecture and host permissions govern. Numeric examples and aesthetic opinions below are options, not universal rules, new gates or authority to redesign. External products, model weights and licences need current verification before use; none is installed by reading this page. Use the same brief and private project records; do not modify installed learning files.

---
title: palette-step-roles
summary: Map the approved palette to actual roles and measured contrast. Step labels, ramp counts, hue separation and action styling are recipes, not universal requirements.
tags: [surface, color, palette, ramps, status, audit]
---

# Palette step roles

A ramp is not a gradient to pick from by eye. Each step exists because a role needs it — page background, hover, border, solid fill, body text — and a step no role consumes is maintenance for zero pixels. [color-scales-oklch](color-scales-oklch.md) computes the steps; [color-token-tiers](color-token-tiers.md) names them; this node decides which exist.

## What a system needs

| Ramp | How many | Carries |
|---|---|---|
| Neutral | 1 | 80–90% of the interface: backgrounds, borders, body text. Needs the most steps — as many steps as the actual roles need |
| Accent | 1 | The brand: interactive and selected states. Additional accents follow the approved brand and meaningful role needs |
| Status | 0–4 | `danger`, `warning`, `success`, `info` — only the ones the product shows. Most need four roles, not a full ramp |

## Every step has a job

| Role | Tailwind | Radix |
|---|---|---|
| Page / subtle background | 50 | 1–2 |
| Component background | 100 | 3 |
| Hover · active, selected | 200 | 4 · 5 |
| Subtle border, separator | 200 | 6 |
| Border, focus ring | 300 | 7 |
| Hovered border | 400 | 8 |
| Solid fill · its hover | 600 · 700 | 9 · 10 |
| Low · high-contrast text | 700 · 900 | 11 · 12 |

Radix defines steps **by role** — step 9 is the solid fill in every ramp and in dark, so component CSS never changes. Tailwind defines them **by lightness**, so the mapping inverts in dark and the swap belongs in the semantic tier. Match the project; for a new system prefer the role model. A suitable solid fill depends on the actual palette and foreground; step labels such as `500` or `600` do not establish a contrast ratio ([wcag-thresholds](../components/wcag-thresholds.md)).

## Rules that hold across hues

- **One colour, one meaning.** A 15-degree hue separation is not a reliable distinguishability threshold; lightness, chroma, context and vision also matter, so a link blue and a decorative heading blue are one meaning used twice. The rule runs both ways: if the accent means interactive, an interactive element rendered neutral misleads too.
- **Status sits ≥ 15° from the accent.** A red brand cannot also have a red danger; give destruction a distinct treatment ([destructive-actions](../components/destructive-actions.md)). Check gain/loss colours per locale — Chinese financial UIs show gains in red.
- **One filled action per view.** The fill goes on the background, not the label: a filled button reads as primary across the room, accent text on a neutral button reads as a link. Selected state may use the accent on glyph and label — that is state, not emphasis.
- **Neutrals: pure grey is a fine default.** Tinting toward the accent (OKLCH C 0.005–0.02 at the accent hue) is an option, not a correction ([color-monochromatic](color-monochromatic.md)). Warm or cool, hold it across the ramp: a warm grey border on a cool grey surface shows.
- **Increased contrast per appearance.** `prefers-contrast: more` gets a value per light and dark; one shared block darkens the dark theme's colour too and *lowers* contrast there. Widen the L gap by ≥ 0.15 and remeasure.

## Auditing an existing palette

1. Collect every literal — hex, `rgb(`, `hsl(`, `oklch(`, utility prefixes, SVG `fill`/`stroke`, chart configs, email templates.
2. Sort by lightness within each hue family; duplicates surface as neighbours.
3. Inspect apparent near-duplicates in their actual roles and themes. Consolidate only when authorised and their semantic differences are unnecessary; a colour-distance threshold alone does not justify changing tokens.
4. Give each survivor a role from the table. One that matches none is a missing token or a mistake — say which.
5. Count the ramps. More than the first table lists means the palette outgrew its structure.

Report the inventory before changing anything: consolidation changes screens nobody asked you to touch.

## Gotcha

Dark tokens that are the light ramp in reverse step order look right in a swatch and wrong on screen: dark needs lower accent chroma and a wider dark end. Remap, then remeasure every pair ([dark-mode](dark-mode.md)).

## Sources

- Jakub Krehel, interfaces skills (MIT, github.com/jakubkrehel/skills, HEAD `592aedc`, read 2026-10-25): `skills/better-colors/SKILL.md` (**A system is ramps, not colors**, **Every step has a job**, **One color, one meaning**, **Fill exactly one action per view**), `palette-structure.md`, `color-usage.md`.
- Radix Colors scale roles; Tailwind CSS default palette.
- Related: [gradient-interpolation](gradient-interpolation.md), [contrast-and-color-scheme](contrast-and-color-scheme.md), [interfaces-reconciliation](../meta/interfaces-reconciliation.md).
