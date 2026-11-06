> BGZFLOW adaptation: use this technical reference only for the current requested outcome. Existing user decisions, actual project architecture and host permissions govern. Numeric examples and aesthetic opinions below are options, not universal rules, new gates or authority to redesign. External products, model weights and licences need current verification before use; none is installed by reading this page. Use the same brief and private project records; do not modify installed learning files.

---
title: using-design-md
summary: How the agent reads, respects, and (rarely) updates a project's DESIGN.md file. Tokens are normative; prose is context.
tags: [meta, design-md, tokens, workflow]
---

# Using design.md

When a user's project contains a `DESIGN.md` file (per [Google Labs Code's design.md spec](https://github.com/google-labs-code/design.md), mirrored at [`spec/design-md-spec.md`](https://github.com/AgentsORG/design-engineering/blob/dbbe43b5e17c7525409ad4905b3857852cd5174d/spec/design-md-spec.md)), the agent has access to a machine-readable description of the design system. Use it.

> **Check for a `.design` contract first.** If the project has one, it outranks DESIGN.md and this skill both — see [using-design-file](using-design-file.md). When both exist, `.design` is the contract and DESIGN.md becomes rationale.

## Detection

Before generating any UI, look for `DESIGN.md` in:

1. The repo root: `DESIGN.md`.
2. A `design/` subfolder: `design/DESIGN.md`.
3. A `.design/` hidden folder: `.design/DESIGN.md`.

If found, read it before writing any component, styling any element, or proposing any tokens.

## What to do with the frontmatter

The YAML frontmatter is **normative**. Treat the tokens as the source of truth:

- **`colors`** — when picking a color in generated UI, reference a token (`var(--color-primary)`, `{colors.primary}`, or `theme.colors.primary`) — *don't* hardcode a hex.
- **`typography`** — match `fontFamily`, `fontSize`, `fontWeight`, `lineHeight`, `letterSpacing` to a defined typography token. If the body uses `Public Sans 16/1.6`, don't generate `Inter 14/1.5`.
- **`rounded`** — use the scale (`sm`, `md`, `lg`, `full`). Mixing `borderRadius: 6` when the scale defines `4/8/16` is a tell.
- **`spacing`** — same. The scale is the contract.
- **`components`** — if a `button-primary` is defined, use it. Don't invent your own primary button.

## What to do with the markdown body

The body is **context**, not contract. Read it for:

- **Overview** — what the system is *trying to feel like*. Use this to disambiguate ambiguous token choices.
- **Do's and Don'ts** — explicit anti-patterns. Treat these as hard constraints.
- **Components section** — usage notes that token definitions can't capture (e.g., "primary buttons are reserved for the single most important action per screen").

## Reading order

For a typical UI generation task:

1. Read `DESIGN.md` (whole file — it's small).
2. Identify which tokens you'll need (colors, typography, spacing, the specific component variants).
3. Cross-reference with this skill — e.g., if `colors` defines a saturated accent, check [delight-impact-curve](../philosophy/delight-impact-curve.md) before applying it everywhere.
4. Generate the UI using token references, not hardcoded values.

## When to propose updating DESIGN.md

The agent **does not** autonomously rewrite a user's DESIGN.md. It's authored by humans (designers + design engineers), not generated.

Propose or implement updates within current task authority; ask only when an unsettled product choice or wider change requires it. Relevant cases include:

- **Missing token** — generating a component requires a token that doesn't exist. Propose adding it with rationale.
- **Contrast failure** — the contrast linter (`contrast-ratio` rule) flags a token pair. Propose adjustment.
- **Component variant gap** — `button-primary-hover` exists but `button-primary-active` doesn't, and you need it.

Surface the proposal as a code review or PR comment, not a silent edit.

## Validating

Use the `@google/design.md` CLI to validate any change:

```bash
npx -y @google/design.md lint DESIGN.md
```

Run before committing. The linter catches broken refs, contrast failures, missing sections, and section-order violations.

For programmatic use in CI:

```ts
import { lint } from '@google/design.md/linter';
const { findings } = await lint(contents);
if (findings.some(f => f.severity === 'error')) process.exit(1);
```

## Cross-references

| design.md token category | This skill's relevant nodes |
|---|---|
| `colors` | [color-monochromatic](../surface/color-monochromatic.md), [dark-mode](../surface/dark-mode.md), [contrast-and-color-scheme](../surface/contrast-and-color-scheme.md) |
| `typography` | [typography-humanity](../typography/typography-humanity.md), [line-length-tracking](../typography/line-length-tracking.md) |
| `rounded` | [border-radius](../surface/border-radius.md) |
| `spacing` | [viewport-custom-design](../layout/viewport-custom-design.md) |
| `components.button-*` | [responsive-feedback](../motion/responsive-feedback.md), [hover-states-subtle](../components/hover-states-subtle.md) |
| `components.modal`, sheet, tray | [tray-rules](../motion/tray-rules.md), [fly-not-teleport](../motion/fly-not-teleport.md) |
| Overall feel / "Do's and Don'ts" | [feeling-right](../philosophy/feeling-right.md), [unseen-details-compound](../philosophy/unseen-details-compound.md) |

## When to apply

Any task where the user has a project with a `DESIGN.md` file. Read it once at task start; reference tokens throughout.

## Gotcha

DESIGN.md is currently `version: alpha` — the spec is evolving. If the user's file uses fields you don't recognize, pass them through unchanged rather than flagging as errors. The format will expand.

Also: not every project has a DESIGN.md, and not every team wants to author one. If asked "should we add a DESIGN.md?", weigh it against [dependency-discipline](../philosophy/dependency-discipline.md) — the file pays its way on multi-developer projects, less so on solo work.

## Sources

- Google Labs Code — [github.com/google-labs-code/design.md](https://github.com/google-labs-code/design.md).
- [`spec/design-md-spec.md`](https://github.com/AgentsORG/design-engineering/blob/dbbe43b5e17c7525409ad4905b3857852cd5174d/spec/design-md-spec.md) in this repo (mirrored offline).
- Related: [agentation-workflow](agentation-workflow.md) (the design-review feedback loop), [review-format](review-format.md) (UI critique format).
