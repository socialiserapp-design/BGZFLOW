# Sources

Where each part of the [looks library](looks-library.md), [craft toolbox](craft-toolbox.md), [cinematic motion and 3D](cinematic-motion-and-3d.md) and [motion by platform](motion-by-platform.md) came from, and what was kept, dropped and why. Sources are public community or vendor skills and design catalogues; nothing here is a runtime dependency, and naming a source grants no install or spending authority.

## Rules used when merging

- **Kept** concrete, repeatable recipes and actions that work across products: values, techniques, checks.
- **Kept both sides** of a conflict, with when-to-use guidance, instead of picking one taste ([when sources disagree](craft-toolbox.md#when-sources-disagree)).
- **Dropped** anything that set one look as the default for every product, banned a whole family outright, tied the skill to one vendor's paid service, or duplicated what the design skill already said.
- **Dropped** private product names, local paths and any claim that could not be checked.

## Web style skills

| Source | Kept | Dropped and why |
|---|---|---|
| impeccable (and its reference set: typeset, colorize, layout, animate, delight, onboard, adapt, visualize, polish, critique, audit, bolder, quieter, distill, overdrive, ios, android) | Role-based typography, OKLCH ramps, colour dosage, dark mode by tonal elevation, container queries, empty-state kinds, onboarding to value, delight thesis, peak-end polish, data-visual choices, platform craft pointers, critique and audit lenses | Its command-routing wrapper, its own install and context-file steps, and its single preferred stack (the design skill stays stack-neutral) |
| design-taste-frontend | Anti-generic checks, hero architecture variety, motion and layout recipes, fluid type, `100dvh`, dense bento fill, palette rotation, the list of common AI defaults (used as a warning list) | Its fixed numeric "dials" as defaults, blanket bans on Inter, serif display and centred heroes (kept as options with guidance), and long code templates |
| high-end-visual-design | Double-bezel shell, soft structuralism, editorial luxury, button-in-button and magnetic hover, grain overlay rule, haptic-style press scale | Treating one premium look as the answer for every brief |
| minimalist-ui | Warm utilitarian document look (Q1): palette, pastel tags, keycap `kbd`, faux window chrome, FAQ dividers, line-art illustration | Its ban list as global rules (kept inside the look) |
| industrial-brutalist-ui | Swiss industrial print (Q5) and tactical telemetry (T2): grids, hairline gap trick, ASCII framing, halftone and scanline treatment | Its claim that one mode suits all technical products |
| redesign-existing-projects | Audit-before-redesign order, generic-pattern checklist, upgrade techniques, content and copy fixes | Its framework-specific code |
| gpt-taste | Editorial and gapless bento ideas, hero variation, cliché-word list | Its single-taste pass as a default (stays optional, as already in [techniques](techniques.md#final-polish)) |
| stitch-design-taste | Design-system-document structure and atmosphere words, used for naming directions | Tool-specific export steps |
| frontend-design | Bold aesthetic commitment per direction, distinct fonts per product, avoid template sameness | Nothing material; it overlaps the existing skill |
| better-ui (animations, enter-exit, icon transitions, icons, performance, surfaces) | Press and hover micro-interactions, exits subtler than entries, icon swap cross-change, `will-change` hygiene, concentric radius, image outlines, structure-focus-elevation split | Its exact press value as a universal number (the product token wins) |
| web-design-guidelines | Checklist ideas folded into screenshot QA | Its remote fetch step |

## Catalogues and data indexes

| Source | Kept | Dropped and why |
|---|---|---|
| ui-ux-pro-max (style, colour, font, chart, icon, landing, motion, product and stack data files) | Style families used to round out the library (Swiss Modernism 2.0, Exaggerated Minimalism, Claymorphism, Neumorphism, Aurora, Memphis, Y2K, Retro-Futurism, Pixel Art, E-Ink, Vintage Film, Spatial, Kinetic Typography and others), product-type to look shortlists, chart choice by question, icon set matching | Its search script, its claim to cover everything, and palette and font picks that were generic or contradicted the product's own look |
| theme-factory | Named theme packaging idea (palette plus type pairing) used for the recipe shape | Its fixed preset themes as defaults |

## Mobile and native skills

| Source | Kept | Dropped and why |
|---|---|---|
| mobile-app-ui-design (and its theme paradigms) | Paradigm recipes adapted into Kinetic Brutalism, Scholarly Academia, Bold Typography Poster, Organic Biophilic, Nature Distilled, Tactile Deformable, AI-Native Conversational and others; variation by paradigm instead of one skin | Duplicate paradigms that matched an existing look |
| liquid-glass-design, expo-liquid-glass | Platform Liquid Glass (G3): version guard, designed fallback, reduced-transparency handling | API detail already covered in [motion by platform](motion-by-platform.md) |
| swiftui-design | iOS Native Premium (P1), Dynamic Type, SF Symbols rendering modes, sensory feedback | Code samples |
| expo-ui, expo-design-system, react-native-patterns | Cross-platform neutral look (P3), native tabs and sheets, one styling system, list virtualisation, haptics package | Package-version specifics that age quickly |

## UX, image and prototyping skills

| Source | Kept | Dropped and why |
|---|---|---|
| ux-designer, onboarding-ux | Onboarding actions, permissions in context, empty and loading choices, peak-end polish | Research-programme steps outside a design pass |
| imagegen-frontend-web, imagegen-frontend-mobile, image-to-code | Comp-first workflow, whole-section comps, three options then one approval, art-direction prompt parts, design bible, comp as spec | Tool-specific prompts and model names |
| prototype | Quick throwaway prototypes to test motion and flow | Nothing material |

## Design plugin and accessibility

| Source | Kept | Dropped and why |
|---|---|---|
| design-critique, design-system, ux-copy, accessibility-review, accessibility | Critique and audit lenses, token roles, button verbs and error copy, contrast and target checks, focus and reduced-motion checks | Report templates the design skill already has ([design contract](design-contract.md)) |

## Cinematic and platform motion

The cinematic recipes, 3D asset pipeline, library choices, guardrails and native motion equivalents are recorded in [cinematic motion and 3D](cinematic-motion-and-3d.md) and [motion by platform](motion-by-platform.md). The looks library links to them instead of repeating them.

## Gaps filled from general practice

Sound, haptics, font licensing, reference galleries, screenshot QA and data-visual palettes were thin in the sources. The toolbox adds plain, widely documented practice (platform haptics APIs, Web Audio, OFL and free-licence font sources, public screen galleries, colour-blind-safe data palettes) and marks anything paid as needing the founder's OK.
