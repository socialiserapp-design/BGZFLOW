> BGZFLOW adaptation: use this technical reference only for the current requested outcome. Existing user decisions, actual project architecture and host permissions govern. Numeric examples and aesthetic opinions below are options, not universal rules, new gates or authority to redesign. External products, model weights and licences need current verification before use; none is installed by reading this page. Use the same brief and private project records; do not modify installed learning files.

---
title: production-baseline
summary: Inspect relevant viewport, root styling, user-preference, theme and development-tool integration in the existing web app. Apply only missing behaviour the task actually needs.
tags: [meta, production, baseline, mobile, css, head]
---

# Production baseline

Inspect the existing application root before changing global behaviour. A demonstrated root cause can justify a shared repair; do not land this list as a new universal baseline. Merge authorised changes into the existing styling system and avoid duplicate viewport tags or globals. Recover language, theme, product and geometry values from the actual project; do not invent them.

## Head

- **Viewport:** width=device-width and initial-scale=1 are common responsive-web settings. viewport-fit=cover and interactive-widget=resizes-content depend on the actual layout and supported browser. Verify safe areas and keyboard behaviour; neither the metadata nor dvh guarantees the result on every browser. Preserve user zoom.
- `<html lang>` set to the content's real language.
- **Colour scheme**: declare only the schemes that were designed. Two themes get one `theme-color` per `prefers-color-scheme`, matching the header background, not the brand colour. A single-theme app declares that one scheme only.
- **Fonts**: preload the used `woff2` files with `crossorigin` (without it the preload is fetched and discarded). Skip this when the framework's font loader already preloads.

## Root CSS

- `html`: inspect text-size adjustment, font synthesis, tap feedback and overscroll in the actual product. Preserve useful native defaults unless an authorised replacement is needed; removing the native tap highlight requires adequate replacement feedback.
- Ensure a visible focus indicator appropriate to the approved theme and platform; a 2px outline with offset is one example, not a required neutral style.
- Check actual input text legibility, focus zoom and gesture behaviour on supported devices. A 16px web input can avoid common Safari focus zoom; do not apply touch-action changes indiscriminately.
- Preserve useful text selection. Disable it only where it interferes with a specific control or gesture.
- `h1–h3 { text-wrap: balance }`, `p { text-wrap: pretty }` ([line-behavior](../typography/line-behavior.md)).
- `[id] { scroll-margin-top }` equal to the sticky header's measured height.
- `scroll-behavior: smooth` only inside `prefers-reduced-motion: no-preference`.

## The two gates

**Hover:** preserve keyboard and touch access, and gate hover-only effects by actual capabilities where necessary. Verify the installed Tailwind variant rather than assuming every version behaves alike. **Reduced motion:** provide an appropriate alternative or instant state for the affected effect; an opacity fade is not universally suitable. Configure the actual library version and verify the result ([prefers-reduced-motion](../motion/prefers-reduced-motion.md)).

## Theme and dev mounts

With `next-themes`, `disableTransitionOnChange` stops every surface tweening at its own speed on toggle, and its blocking script stops the flash on refresh. Without it, add a `no-transitions` class for two frames around the switch. Dev-only inspectors, control panels and devtools render only under the development build check and load through a dynamic import, so the package stays out of the production bundle ([leftovers-and-leaks](../anti-patterns/leftovers-and-leaks.md)).

## Gotcha

Pasting `color-scheme: light dark` into a light-only app creates a bug: phones in dark mode render dark native controls and canvas under a UI that was only ever designed light. And once the tap highlight is gone, a control with no `:active` gives touch users no feedback at all, so removing the highlight raises the priority of press states ([responsive-feedback](../motion/responsive-feedback.md)).

## Sources

- Emil Kowalski's design-engineering practice, distilled by HKTITAN.
- Related: [contrast-and-color-scheme](../surface/contrast-and-color-scheme.md), [forms-behavior](../components/forms-behavior.md), [performance-discipline](../motion/performance-discipline.md).
