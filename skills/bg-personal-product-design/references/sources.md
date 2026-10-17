# Design Harmonization & Craft Provenance

How each part of the [looks library](looks-library.md), [craft toolbox](craft-toolbox.md), [cinematic motion and 3D](cinematic-motion-and-3d.md) and [motion by platform](motion-by-platform.md) is harmonized inside BGZFLOW, and what is kept, dropped and why. Created and curated by **Simeon Kontogeorges**. Nothing here is a runtime dependency, and naming a technique grants no install or spending authority.

## Rules used when harmonizing design craft

- **Kept** concrete, repeatable recipes and actions that work across products: values, techniques, optical formulas and verification checks.
- **Kept both sides** of an aesthetic trade-off, with when-to-use guidance, instead of picking one universal house taste ([when sources disagree](craft-toolbox.md#when-sources-disagree)).
- **Dropped** anything that sets one look as the default for every product, bans a whole typography or layout family outright, ties the workflow to a foreign command router, or duplicates the core BGZFLOW stage contract.
- **Dropped** private product names, local paths and any claim that cannot be verified on a real device or browser surface.

## Web and interface craft layers

| Craft domain | Kept in BGZFLOW | Dropped and why |
|---|---|---|
| Typography, colour and layout systems | Role-based typography, OKLCH ramps, colour dosage, dark mode by tonal elevation, container queries, empty-state kinds, onboarding to value, delight thesis, peak-end polish, data-visual choices, platform craft pointers, critique and audit lenses | Foreign command-routing wrappers, separate context-file installers, and single-stack mandates (the design skill stays stack-neutral) |
| Anti-generic variation and hero anatomy | Anti-generic silhouette checks, hero architecture variety, motion and layout recipes, fluid type, `100dvh`, dense bento fill, palette rotation, and the warning list of overused AI defaults | Fixed numeric "dials" as global defaults, blanket bans on Inter, serif display and centred heroes (kept as options with guidance), and long framework templates |
| High-craft tactile surfaces | Double-bezel shell, soft structuralism, editorial luxury, button-in-button and magnetic hover, grain overlay rule, haptic-style press scale | Treating one luxury or dark look as the answer for every brief |
| Warm utilitarian & document surfaces | Warm utilitarian document look (Q1): palette, pastel tags, keycap `kbd`, faux window chrome, FAQ dividers, line-art illustration | Turning document-look constraints into global rules (kept scoped inside look Q1) |
| Swiss industrial & technical telemetry | Swiss industrial print (Q5) and tactical telemetry (T2): grids, hairline gap trick, ASCII framing, halftone and scanline treatment | Any claim that one mode suits all technical products |
| Existing-project evolution & polish | Audit-before-redesign order, `LOCKED_IDENTITY` protection for established products, generic-pattern checklist, upgrade techniques, content and copy fixes | Unrequested full reskins on projects with a locked identity |
| Editorial rhythm & final screen pass | Editorial and gapless bento options, hero variation, cliché-word warning list, and per-screen final polish checks | Making one editorial preset mandatory across all directions (stays one optional family in [techniques](techniques.md#final-polish)) |
| Micro-interactions & optical geometry | Press and hover micro-interactions, exits subtler than entries, icon swap cross-change, `will-change` hygiene, concentric radius (`inner = max(0, outer - inset)`), image outlines, structure-focus-elevation split | Hardcoding one press scale across every product (the product token wins) |

## Style taxonomy and data visualisations

| Catalogue domain | Kept in BGZFLOW | Dropped and why |
|---|---|---|
| Visual direction families | Style families across the looks library (Swiss Modernism 2.0, Exaggerated Minimalism, Claymorphism, Neumorphism, Aurora, Memphis, Y2K, Retro-Futurism, Pixel Art, E-Ink, Vintage Film, Spatial, Kinetic Typography and others), product-type to look shortlists, chart choice by question, icon set matching | Separate search scripts, claims of exhaustive coverage, and generic palette/font picks that contradict a product's locked look |
| Theme packaging | Named theme packaging (palette plus type pairing and surface rules) used for the recipe shape | Fixed preset themes as defaults |

## Mobile and native platform craft

| Platform domain | Kept in BGZFLOW | Dropped and why |
|---|---|---|
| Native paradigm diversity | Paradigm recipes for Kinetic Brutalism, Scholarly Academia, Bold Typography Poster, Organic Biophilic, Nature Distilled, Tactile Deformable, AI-Native Conversational and others; variation by paradigm instead of one skin | Duplicate paradigms that matched an existing look |
| Platform Liquid Glass (G3) | Version guard, designed opaque fallback, reduced-transparency handling | Duplicate API detail already covered in [motion by platform](motion-by-platform.md) |
| iOS & Android native ergonomics | iOS Native Premium (P1), Dynamic Type, SF Symbols rendering modes, sensory feedback, cross-platform neutral look (P3), native tabs and sheets, one styling system, list virtualisation, haptics | Package-version specifics that age quickly |

## UX, prototyping and accessibility verification

| Verification domain | Kept in BGZFLOW | Dropped and why |
|---|---|---|
| Onboarding & state completeness | Onboarding actions to first value, permissions in context, empty and loading choices, peak-end polish | Standalone research programmes outside a design pass |
| Comp-first & prototype-first flow | Whole-section comps, rendered direction rounds then one locked approval, art-direction tokens, comp as spec, quick interactive prototypes to test motion and flow | Tool-specific prompts and hardcoded model names |
| Critique, copy & accessibility | Critique and audit lenses, token roles, button verbs and error copy, contrast and touch-target checks, focus and reduced-motion checks | Duplicate report templates already covered by [design contract](design-contract.md) |

## Cinematic motion and deep-source skill forging

The cinematic recipes, 3D asset pipeline, library choices, guardrails and native motion equivalents are recorded in [cinematic motion and 3D](cinematic-motion-and-3d.md) and [motion by platform](motion-by-platform.md). New design, engineering and domain techniques distilled from books, videos, papers, live teardowns and clean-room reverse engineering (`bgz skill-forge`) pass through the same harmonization filter before entering the skill overlay.
