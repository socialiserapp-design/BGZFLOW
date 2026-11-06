# Icon System

This is an adapted reference recipe, not a request to add every illustrated control, field, state, mode or feature. Preserve the current user decisions, approved tokens, existing components and platform conventions. Dimensions and layouts are starting points; choose applicable states and check the actual affected result. No new permission, workflow gate, forced schema or manual record follows from this reference.

Icons are a token-governed subsystem, not loose SVGs. Consistency in grid, stroke, and metaphor is what makes an icon set feel like one system. Sizing comes from the project’s sizing tokens (`icon.*`); color from `currentColor` so icons inherit text/state tokens.

---

## Foundations

- **Grid:** design on a single pixel grid (commonly 24×24) with a consistent live area + padding. Every icon shares the grid so optical weight matches.
- **Stroke:** use a coherent optical weight across the chosen set (e.g. 1.5-2px at 24px). Compare size-specific optical adjustments with constant strokes; preserve the approved family’s own scaling behaviour where that matches the approved icon treatment.
- **Style:** use the approved icon language; outline, solid and duotone may coexist deliberately, including platform symbols and brand assets. Keep meanings and optical weight consistent.
- **Optical alignment:** align to optical center, not geometric; balance visual mass.

## Sizing & color (tokens)

| Token | Size | Use |
|-------|------|-----|
| `sizing.icon.xs` | 12px | Dense inline / badge |
| `sizing.icon.sm` | 16px | Default inline icon (with body text) |
| `sizing.icon.md` | 20px | Buttons, inputs |
| `sizing.icon.lg` | 24px | Standalone / nav |
| `sizing.icon.xl` | 32px | Feature / empty-state accent |

- Color via `currentColor`, so the icon inherits `text.*` / state tokens automatically (incl. forced-colors mode, the current applicable contrast and non-colour guidance). Use theme-aware colour for interface symbols; preserve legitimate multicolour brand or content assets.
- Pair icon size with text size for optical balance; keep stroke legible at the smallest used size.

## Delivery

| Method | When |
|--------|------|
| **Inline `<svg>`** | Default: stylable (`currentColor`), no extra request, supports `aria-*`. Best for forced-colors and theming. |
| **SVG sprite** (`<use href="#id">`) | Large sets, cache one file, reference by id. |
| **Icon font** | Legacy only, avoid (a11y + rendering issues; can't do duotone/forced-colors well). |
| Component wrapper | An `<Icon name size>` component enforces size tokens + a11y props across frameworks ([platform and token mapping](../platform-mapping.md)). |

## Accessibility

- **Decorative icon** (next to a text label): `aria-hidden="true"` and no `title`, since the label carries meaning. Most UI icons are decorative.
- **Meaningful icon** (icon-only button/status): give an accessible name via `aria-label` on the button, or `role="img"` + `aria-label`/`<title>` on the SVG. Icon-only controls still need a ≥ 24×24px (44px recommended) hit target on the intended platform.
- **Never icon-alone for status**: pair with text/color-plus-shape (the current applicable contrast and non-colour guidance); an icon's meaning isn't universal.
- Use `currentColor` so icons meet contrast with their text context and adapt to high-contrast mode.

## States

Icons participate in component states via inherited color: default (`text.secondary`), hover/active (inherit control state), selected (`action.primary` or solid variant), disabled (`opacity.disabled`), loading (animated spinner icon + `aria-busy`).

## Verification
- Coherent optical sizing and stroke weight for the approved families and platforms?
- Do theme-aware icons inherit suitable tokens, while authorised multicolour brand marks retain their intended colours?
- Every icon-only control has an accessible name and a ≥ 24px target?
- No status conveyed by icon (or color) alone?
