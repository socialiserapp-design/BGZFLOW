> BGZFLOW adaptation: use this technical reference only for the current requested outcome. Existing user decisions, actual project architecture and host permissions govern. Numeric examples and aesthetic opinions below are options, not universal rules, new gates or authority to redesign. External products, model weights and licences need current verification before use; none is installed by reading this page. Use the same brief and private project records; do not modify installed learning files.

---
title: accessibility-baseline
summary: Keyboard-everywhere, :focus-visible, hit targets, ARIA names on icon buttons, polite aria-live for async. The a11y floor below taste.
tags: [components, accessibility, a11y, keyboard]
---

# Accessibility baseline

A11y is below taste. Below polish. Below brand. A product that fails the baseline is broken — no amount of motion or typography fixes that.

These are the rules every component should pass before any design judgment is applied.

## Keyboard

- **Everything interactive needs appropriate keyboard operation.** Native controls generally participate in Tab order; composite widgets may use one Tab stop and arrow-key navigation. Preserve meaningful focus and reading order.
- **Visible focus:** use :focus-visible or a suitable :focus treatment for the actual browser and interaction. The browser heuristic is not simply keyboard-only.
- **Keep a usable focus indicator.** Native and custom rings can both work; verify visibility, applicable contrast and forced-colour behaviour rather than requiring a brand-coloured style.
- **Modal focus:** constrain focus in actual modal dialogs, support the appropriate dismissal model and restore a sensible target. Non-modal dialogs and tooltips do not inherit a mandatory trap.
- **Skip links** at the top of every page for screen-reader and keyboard users. `<a href="#main">Skip to content</a>` — visually hidden until focused.
- **Preserve appropriate keyboard behaviour.** Enter may submit a single-line form; Enter in a textarea inserts a newline. Ctrl/Cmd+Enter submits only when the product deliberately supports that shortcut.
- **DOM order is visual order.** `order`, `row-reverse` or absolute positioning that reorders the screen makes Tab jump around it; reorder the markup, not the CSS. Avoid positive tabindex because it often creates a confusing order; review any existing exception against the actual task and supported assistive technology.
- **Tooltips hold no interactive content.** A tooltip can't take focus, so a link inside it is unreachable; that content belongs in a click-opened popover.

## Page structure

Screen-reader users navigate landmarks and headings. Provide a meaningful document outline, language and title, respecting the actual page structure. One h1 and unskipped levels are useful recommendations, not universal standalone conformance tests.

## Hit targets

| Surface | Minimum |
|---|---|
| Pointer (desktop) | 24×24px |
| Touch (mobile / tablet) | 44×44px (per Apple HIG) |

A 16px icon button needs *padding* to hit these — don't make the visible chrome the touch target.

## ARIA + semantics

- **HTML semantics first**, ARIA second. `<button>` beats `<div role="button" tabindex="0">` every time.
- **Icon-only buttons need an accessible name**, supplied by visible/hidden text, `aria-labelledby` or `aria-label` as appropriate. A `<button><Icon /></button>` is a button with no name.
- **`<label for="…">` on every form input.** A `placeholder` is not a label.
- **`aria-live="polite"`** for async status updates ("Saved", "Uploading", "Error"). Use assertive announcements only for genuinely urgent information; many errors should remain polite or use deliberate focus movement. Which mechanism, and how to make it actually speak: [screen-reader-announcements](screen-reader-announcements.md).
- **`alt=""` on decorative images** — empty alt, not missing alt. Screen readers skip them.

## Color and contrast

- **Don't rely on color alone.** Use a clear non-colour signal such as text or an icon as appropriate. Required-field semantics and understandable labels do not require a different background or a prescribed red treatment. Color-blind users (~8% of men) read no signal otherwise.
- **APCA over WCAG 2** for contrast math — see [contrast-and-color-scheme](../surface/contrast-and-color-scheme.md) for the threshold table.

## Motion

- **`prefers-reduced-motion`** is non-negotiable. See [prefers-reduced-motion](../motion/prefers-reduced-motion.md).
- **Media follows it too.** An animated GIF or AVIF sits in a `<picture>` whose animated `<source>` has `media="(prefers-reduced-motion: no-preference)"`, with a static `<img>` fallback. A looping CSS animation pauses on a representative frame (`animation-play-state: paused` plus a negative `animation-delay`), not on frame 0.

## When to apply

For relevant interaction changes, test the affected keyboard journey; do not require a separate whole-app ritual for unrelated changes:
1. Tab through the page. Can you reach everything?
2. Is the focus ring visible?
3. Can you Enter / Space to activate?
4. Can you Esc to dismiss?

## Gotcha

Don't ship custom `<select>` or `<combobox>` components unless you've truly implemented all of: keyboard nav, type-ahead, screen-reader announcements, mobile keyboard handling. Most "custom select" components fail half of these. Use Radix UI, React Aria, or the native `<select>` instead.

## Sources

- Vercel Web Interface Guidelines — Interactions and Content sections.
- bendc/frontend-guidelines — "Don't rely on color alone."
- Emil Kowalski's design-engineering practice, distilled by HKTITAN — DOM order, tooltips, page structure, reduced-motion media.
- WCAG 2.2 + Apple HIG hit-target guidance; the criterion numbers are in [wcag-thresholds](wcag-thresholds.md), custom-widget key maps in [keyboard-patterns](keyboard-patterns.md).
- Related: [hover-states-subtle](hover-states-subtle.md), [forms-validation](forms-validation.md), [prefers-reduced-motion](../motion/prefers-reduced-motion.md), [contrast-and-color-scheme](../surface/contrast-and-color-scheme.md).
