> BGZFLOW adaptation: use this technical reference only for the current requested outcome. Existing user decisions, actual project architecture and host permissions govern. Numeric examples and aesthetic opinions below are options, not universal rules, new gates or authority to redesign. External products, model weights and licences need current verification before use; none is installed by reading this page. Use the same brief and private project records; do not modify installed learning files.

---
title: color-token-tiers
summary: A primitive/semantic token architecture that can improve theme and role consistency. Follow the existing project architecture and naming; do not impose a new tier or role inventory.
tags: [surface, color, tokens, naming, theming]
---

# Colour token tiers

Naming is what makes a palette usable by someone who didn't build it, and the tier split is what makes it themeable. A codebase that applies `--blue-600` in components has no seam: adding dark mode later means auditing every usage to learn which meant "the accent" and which just wanted blue. [color-scales-oklch](color-scales-oklch.md) makes the values; this node names them.

## Two tiers

**Primitives** name a value — the ramp, by hue and step: `--blue-600`, `--neutral-200`. A primitive says what the colour *is*, so it can represent a stable value. Whether components may reference primitives depends on the actual token architecture.

**Semantics** name a job and point at a primitive: `--color-text-secondary: var(--neutral-700)`. In this example architecture, components reference semantic roles. Dark mode, a white-label theme and an increased-contrast variant all repoint semantics and leave primitives and components untouched ([dark-mode](dark-mode.md)).

A third, component tier (`--color-button-danger-bg`) is for a component that deliberately diverges. One is a documented exception; twenty means the semantic tier is missing roles.

## Build against the role inventory

The system is complete when every role has a token. Build against this list, not as components ask, or the palette ends up shaped like whichever screen came first.

| Group | Roles |
|---|---|
| Surfaces | page, surface, raised (menus, popovers), sunken (inputs, wells), overlay scrim |
| Text | primary, secondary, disabled, inverse, on-accent |
| Borders | subtle, default, strong, focus ring, separator |
| Accent | subtle background, border, solid, solid hover, text |
| Status | per status the product shows: subtle background, border, solid, text |

**Separator and border are two roles** even when they share a value today: a separator divides content, a border encloses a control. They diverge the first time someone restyles inputs.

**Use a token only in its role.** A border token borrowed as caption text works until borders get lighter, and the caption goes with them. Add a token for a missing role only when the actual system and scope justify it.

## One grammar, one word per concept

Neutral roles lead with the property: `--color-{bg|text|border}-{variant}-{state}`. Accent and status lead with the role: `--color-{accent|danger}-{subtle|border|solid|text}-{state}`. Use consistent terminology from the existing system; fg/foreground/stroke/brand are also valid naming choices. A reader who has seen `--color-text-primary` must be able to guess `--color-text-disabled`.

**Reserve `primary` for one meaning.** `--color-primary` (the brand) beside `--color-text-primary` (body text) is the most common collision there is. Call the brand `accent`.

| Name | Problem | Instead |
|---|---|---|
| `--color-blue-button` | appearance at the semantic tier | `--color-accent-solid` |
| `--color-sidebar-gray` | named for its first use | `--color-bg-surface` |
| `--color-light-gray` | the dark one in dark mode | a primitive, `--neutral-200` |
| `--color-text-2` | numbers carry no meaning | `--color-text-secondary` |

## In Tailwind v4

Names in `@theme` become the API: declare both tiers there and you get `bg-accent-solid` beside `bg-blue-600`. The doubling in `text-text-secondary` is the price — accept it or follow the project's existing convention. Repoint semantics for dark in a `.dark` block outside `@theme`, without `inline`, so utilities read the variable at render time. A raw `bg-blue-600` in a component is the thing to flag.

## Gotcha

`bg-accent-solid/50` is fine for a wash and wrong under text: a colour with alpha renders differently on every background, so no single contrast measurement describes it. Anything carrying text sits on a solid token ([contrast-and-color-scheme](contrast-and-color-scheme.md)).

## Sources

- Jakub Krehel, interfaces skills (MIT, github.com/jakubkrehel/skills, HEAD `592aedc`, read 2026-10-25): `skills/better-colors/SKILL.md` (**Name primitives by hue, semantics by role**, **Use a token only in its role**), `token-naming.md`.
- Related: [palette-step-roles](palette-step-roles.md), [using-design-file](../meta/using-design-file.md), [design-system-docs](../meta/design-system-docs.md), [interfaces-reconciliation](../meta/interfaces-reconciliation.md).
