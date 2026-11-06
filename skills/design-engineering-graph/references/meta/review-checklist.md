> BGZFLOW adaptation: use this technical reference only for the current requested outcome. Existing user decisions, actual project architecture and host permissions govern. Numeric examples and aesthetic opinions below are options, not universal rules, new gates or authority to redesign. External products, model weights and licences need current verification before use; none is installed by reading this page. Use the same brief and private project records; do not modify installed learning files.

---
title: review-checklist
summary: Audit table — thirty-nine common UI issues, each with a grep and a fix. Use relevant checks against the actual brief and environment.
tags: [meta, review, checklist]
---

# Review checklist

A pre-flight checklist for UI code review. Use relevant rows to investigate actual problems, not to enforce a house style. Report a finding only when its consequence is supported, using [review-format](review-format.md).

## The checklist

| # | Issue | Quick check | Fix | Node |
|---|---|---|---|---|
| 1 | Broad transitions | Inspect which properties actually change and whether unintended transitions occur | Name the intended properties; profile actual layout/paint/compositing costs | [transform-opacity-only](../motion/transform-opacity-only.md) |
| 2 | Zero-scale entrance | Check whether the intended reveal and focus/hit area remain usable | Keep intentional zero-scale effects; choose a smaller scale change or another transition when evidence supports it | [never-scale-from-zero](../motion/never-scale-from-zero.md) |
| 3 | Easing mismatched to interaction | Observe interruption, response and continuity | Use the approved curve or tune an appropriate built-in/custom curve | [easing-curves](../motion/easing-curves.md) |
| 4 | Timing harms the task | Measure actual response and perceived delay | Tune to the interaction; no universal 300ms ceiling | [duration-table](../motion/duration-table.md) |
| 5 | Unclear state transition | Check whether icon identity and state change are understandable | Choose movement, morph, crossfade or an instant change to fit the actual meaning | [fly-not-teleport](../motion/fly-not-teleport.md) |
| 6 | Motion preference ignored | Test the affected effect with actual supported preference settings | Provide an appropriate alternative or instant state without hiding content | [prefers-reduced-motion](../motion/prefers-reduced-motion.md) |
| 7 | Hover blocks other input | Test keyboard, touch and pointer access to the actual control | Keep core access available and gate hover-only embellishment where needed | [hover-states-subtle](../components/hover-states-subtle.md) |
| 8 | Shadow obscures hierarchy | Inspect the approved surface in its actual theme | Adjust the existing shadow only if a real visibility or hierarchy issue occurs | [shadows-whisper](../surface/shadows-whisper.md) |
| 9 | Dark surface contrast | Inspect text, controls, glare and the approved palette | Keep approved black or tinted surfaces; repair demonstrated contrast issues | [dark-mode](../surface/dark-mode.md) |
| 10 | Loading feedback misleads or flashes | Observe real short, long, failed and unknown waits | Tune appropriate feedback to actual latency; no universal 150/400ms requirement | [empty-loading-states](../components/empty-loading-states.md) |
| 11 | Typography mismatched to brief | Compare actual hierarchy, readability and the approved brand | Keep approved fonts, including Inter or SF Pro; change only for a substantiated need | [typography-humanity](../typography/typography-humanity.md) |
| 12 | Audio conflicts with user settings | Inspect existing audio settings and relevant browser/native policy | Respect the approved audio experience and accessible alternatives; do not add a new toggle or default without authority | [sound-playback-web](../sound/sound-playback-web.md) |
| 13 | Audio interferes with use | Listen on the intended surface and assess repetition and assistive-technology conflicts | Tune or remove only the interfering cue within scope; input and focus sounds can be intentional | [sound-decision-framework](../sound/sound-decision-framework.md) |
| 14 | Text effect harms readability | Inspect contrast, fallback and approved direction | Keep approved gradients when readable; repair the actual problem | [ai-default-tells](../anti-patterns/ai-default-tells.md) |
| 15 | Label adds noise or becomes illegible | Inspect purpose, hierarchy and reading conditions | Keep meaningful approved labels; adjust or remove only when justified | [line-length-tracking](../typography/line-length-tracking.md) |
| 16 | Palette conflicts with brand or meaning | Compare current project tokens and user decisions | Use the approved palette, including violet when chosen | [ai-default-tells](../anti-patterns/ai-default-tells.md) |
| 17 | Status colours fail their role | Check actual contrast, meaning and non-colour cues | Repair the semantic role; framework defaults are not intrinsically wrong | [color-scales-oklch](../surface/color-scales-oklch.md) |
| 18 | Symbol fails its intended audience | Check clarity, accessibility, localisation and approved voice | Use an appropriate icon, emoji or text; no blanket emoji ban | [icon-systems](../components/icon-systems.md) |
| 19 | Fixtures misrepresented as real | Compare shipped content and claims with actual sources | Keep deliberate labelled examples; replace accidental placeholders with authorised accurate content | [content-authenticity](../anti-patterns/content-authenticity.md) |
| 20 | Viewport unit causes clipping or unwanted gaps | Test resizing, browser chrome and keyboard on supported targets | Use content sizing, vh/svh/dvh or an observed viewport strategy as appropriate | [viewport-custom-design](../layout/viewport-custom-design.md) |
| 21 | Loop distracts or interferes | Check purpose, user controls and reduced-motion behaviour | Keep purposeful approved loops; adjust the actual interference | [animation-decision-framework](../motion/animation-decision-framework.md) |
| 22 | Copy style distracts from meaning | Read for the audience and existing editorial style | Edit for clarity; punctuation count is not a defect | [copy-tells](../anti-patterns/copy-tells.md) |
| 23 | Custom control lacks keyboard operation | Inspect semantics, native behaviour and the applicable widget pattern | Use an appropriate native element or implement the relevant keyboard contract | [keyboard-patterns](../components/keyboard-patterns.md) |
| 24 | Status not announced appropriately | Test the actual accessibility tree and announcement timing | Use an appropriate live region or focus change and avoid excessive interruptions | [screen-reader-announcements](../components/screen-reader-announcements.md) |
| 25 | Submission state prevents understanding or access | Check the approved form flow, explanations and recovery | Use appropriate enabled/disabled/pending behaviour; do not replace existing authority with a universal form rule | [forms-validation](../components/forms-validation.md) |
| 26 | Colour role becomes inconsistent | Compare the actual project token system | Use semantic tokens where that architecture exists; a primitive value is not automatically a defect | [color-token-tiers](../surface/color-token-tiers.md) |
| 27 | Input becomes hard to read or triggers harmful zoom | Test actual text sizes and supported mobile browser focus behaviour | Use legible sizing and preserve user zoom; 16px is a common Safari workaround, not a cross-platform rule | [line-behavior](../typography/line-behavior.md) |
| 28 | Layering hides content or interaction | Inspect stacking contexts and the existing scale | Use the project scale, isolation or a justified local value | [z-index-strategy](../surface/z-index-strategy.md) |
| 29 | Weight change shifts content | Observe actual font metrics and layout | Keep stable intended weight changes; use another signal if movement harms use | [type-scale-and-rhythm](../typography/type-scale-and-rhythm.md) |
| 30 | Icon-only control has no accessible name | Inspect the computed accessible name | Provide an accurate name using visible/hidden text, aria-labelledby or aria-label | [accessibility-baseline](../components/accessibility-baseline.md) |
| 31 | Core action reachable only by hover | Test focus, touch and assistive input | Provide an equivalent discoverable route | [touch-and-focus](../components/touch-and-focus.md) |
| 32 | Keyboard focus indicator missing | Inspect keyboard use, contrast and actual platform conventions | Provide a clearly visible appropriate focus indicator; its colour need not be neutral | [accessibility-baseline](../components/accessibility-baseline.md) |
| 33 | Font synthesis changes intended appearance | Check actual loaded fonts, fallback and supported scripts | Choose real faces or appropriate synthesis policy; absence of font-synthesis:none alone is not a defect | [type-scale-and-rhythm](../typography/type-scale-and-rhythm.md) |
| 34 | Animation causes avoidable rendering work | Profile the real animation on supported targets | Use transform/opacity when suitable, or retain necessary layout/paint animation that meets the task | [transform-opacity-only](../motion/transform-opacity-only.md) |
| 35 | List rendering becomes slow or inaccessible | Measure actual list growth, interaction and assistive-technology behaviour | Consider pagination, incremental rendering or virtualisation when needed; no 50-row trigger | [performance-discipline](../motion/performance-discipline.md) |
| 36 | Disabled styling obscures information | Check actual contrast and required state distinction | Use appropriate tokens or opacity; opacity itself is not a defect | [contrast-and-color-scheme](../surface/contrast-and-color-scheme.md) |
| 37 | Declared theme conflicts with actual support | Inspect native controls, canvas and configured theme behaviour | Declare supported schemes without adding an unrequested theme | [contrast-and-color-scheme](../surface/contrast-and-color-scheme.md) |
| 38 | SVG fails in a supported theme | Check actual asset intent and theme contrast | Use currentColor/tokens where appropriate; preserve intentional brand or artwork colours | [dark-mode](../surface/dark-mode.md) |
| 39 | Meaningful content clipped without access | Test full-value retrieval with relevant input methods | Keep a reliable route to the full content; a title attribute alone may not suffice | [line-behavior](../typography/line-behavior.md) |

## Workflow

1. Read the code top to bottom once for context.
2. Select relevant checks for the changed surface and inspect their actual consequences.
3. Open [ai-default-tells](../anti-patterns/ai-default-tells.md) for any visible defaults beyond this checklist.
4. Write the review using [review-format](review-format.md) (Before / After / Why table), one row per applicable issue.
5. If nothing applies — say so. "Looks good, nothing to change" is a valid review.

## When to use

For a relevant UI review, proportionate to the change; do not run a separate mandatory taste pass. A launch film is not UI code: review it with [launch-video-review](../launch-video/launch-video-review.md).

## Gotcha

A source pattern is a lead to investigate, not proof of a defect. Preserve current user decisions and approved style. Accessibility, privacy and data findings still need concrete evidence and an appropriate repair.

## Sources

- Emil Kowalski — Review Checklist section of [emilkowalski/skill](https://github.com/emilkowalski/skill).
- Jakub Krehel, interfaces skills (MIT, HEAD `592aedc`): the Before-you-finish tables in `better-accessibility`, `better-colors` and `better-ui` — rows 23–26 and the row-5 fix.
- Leonxlnx, taste-skill v2.1.1 (MIT, HEAD a9c73c3): `skills/taste-skill/scripts/lint.mjs` — the patterns behind rows 14–22. Its mono, numbering, hairline, shadow and terracotta rules are its owner's taste and are not adopted (`references/research.md` §6).
- Related: [review-format](review-format.md) for the output format, [ai-default-tells](../anti-patterns/ai-default-tells.md) for broader visual audit.
