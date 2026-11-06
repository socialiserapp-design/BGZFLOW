> BGZFLOW adaptation: use this technical reference only for the current requested outcome. Existing user decisions, actual project architecture and host permissions govern. Numeric examples and aesthetic opinions below are options, not universal rules, new gates or authority to redesign. External products, model weights and licences need current verification before use; none is installed by reading this page. Use the same brief and private project records; do not modify installed learning files.

---
title: dependency-discipline
summary: Compare existing packages, platform APIs and custom code by capability, correctness, maintenance and measured cost; do not reimplement merely because a snippet is short.
tags: [philosophy, dependencies, performance, restraint]
---

# Dependency discipline

A 5MB JS bundle is a design choice. So is a 50KB one. So is choosing `moment.js` over `Intl.DateTimeFormat`. So is reaching for `axios` when `fetch` exists.

The principle: **every dependency you add is a tax** — bundle size, security surface, version drift, license review, time-to-interactive. The bar for adding one should be higher than "it's convenient."

This is a philosophy node, not a tactical one. It applies before any CSS or motion decision.

## Compare the actual supported behaviour

Inspect existing utilities and maintained packages before writing a replacement. These short examples illustrate limited cases; they are not equivalent to a mature library’s full semantics:

```ts
// 'lodash/uniq'
const uniq = <T,>(arr: T[]): T[] => [...new Set(arr)];

// 'lodash/groupBy'
const groupBy = <T, K extends string>(arr: T[], key: (x: T) => K) =>
  arr.reduce((acc, x) => ({ ...acc, [key(x)]: [...(acc[key(x)] ?? []), x] }), {} as Record<K, T[]>);

// 'classnames' — useful, but trivial to write
const cx = (...classes: (string | false | null | undefined)[]) => classes.filter(Boolean).join(' ');
```

If only a few functions are needed, compare the actual bundled import, existing utilities and edge cases. Reuse a suitable package when it reduces correctness or maintenance risk; a line count does not justify custom code.

## Draw simple shapes in CSS, not images

Before adding an SVG file or PNG for a shape:

```css
/* Triangle */
.triangle {
  width: 0; height: 0;
  border-left: 10px solid transparent;
  border-right: 10px solid transparent;
  border-bottom: 16px solid var(--accent);
}

/* Circle */
.circle { width: 16px; height: 16px; border-radius: 50%; background: var(--accent); }

/* Donut */
.donut { width: 32px; height: 32px; border: 4px solid var(--accent); border-radius: 50%; }

/* Chevron via border + rotate */
.chevron {
  width: 8px; height: 8px;
  border-right: 2px solid currentColor;
  border-bottom: 2px solid currentColor;
  transform: rotate(45deg);
}
```

No HTTP request, no decoded image bytes, no `alt` text to maintain. The shape is in the stylesheet.

## Prefer native browser APIs

The web platform has shipped a lot in the last decade. A platform API can replace some uses, but compatibility, semantics and project requirements determine whether a library is still useful.

| Library | Native replacement |
|---|---|
| `moment.js` (300KB) | `Intl.DateTimeFormat`, `Intl.RelativeTimeFormat` |
| `axios` | `fetch()` (with a thin wrapper for JSON parsing) |
| `lodash` (most uses) | `Array.from`, `.flat`, `.includes`, `.at`, `Object.fromEntries` |
| `classnames` | `clsx` (~240 B, same API) — or the one-line `filter(Boolean).join(' ')` helper when every input is a plain string. Variant-shaped styling (size × intent × state) earns `cva` on top |
| `uuid` | `crypto.randomUUID()` |
| `query-string` | `URLSearchParams` |
| jQuery | DOM API + `closest()`, `matches()`, `querySelector()` |
| `intersection-observer-polyfill` | Native IntersectionObserver (universal since 2019) |

Inspect relevant dependencies during authorised maintenance; no annual recurring task is created. Many production apps have 5+ MB of dependencies because someone added `moment.js` in 2017 and no one removed it.

## When to add a dependency anyway

- **The library is large and complex** to write correctly: cryptography (`@noble/hashes`), framework runtimes (React, Vue), date parsing edge cases (`date-fns` over reinventing).
- **The library has a security team** maintaining it (`@stripe/stripe-js`, OAuth clients).
- **The library is small and focused** with a clear single purpose (`nanoid`, `clsx`).
- **The team's velocity matters more than the bundle** (early-stage product, internal tool).

These are real reasons. "It's convenient" is not.

## When to apply

- Before adding a dependency, compare relevant maintained packages and existing capabilities against the actual need. Avoid both unnecessary packages and unnecessary custom implementations.
- During review, assess new dependencies and custom replacements by concrete behaviour, compatibility, licensing, security and maintenance.
- Use available bundle analysis during authorised performance work. Inspect the actual delivered cost; neither a quarterly schedule nor a 100 KB acceptance cap is introduced.

## Gotcha

This rule applies in proportion to the project's expected lifetime and audience. A throwaway prototype can `import _ from 'lodash'` and ship in an afternoon. A production app shipping to mobile users across slow networks pays for that dependency every page load forever. Calibrate.

## Sources

- Ben DC — [frontend-guidelines](https://github.com/bendc/frontend-guidelines) — "Favor native methods."
- Vercel — bundle-size as a design dimension.
- web.dev — "Tame third parties," bundle audits.
- Emil Kowalski, skills (MIT, github.com/emilkowalski/skills, a81dbca): skills/pick-ui-library/SKILL.md (clsx for conditional classes, cva for real variants).
- Related: [transform-opacity-only](../motion/transform-opacity-only.md) and [debugging-animations](../motion/debugging-animations.md) (the performance-is-design framing lives in those motion nodes), [unseen-details-compound](unseen-details-compound.md).
