---
name: design-taste-assets
description: "Find and adapt real bundled Taste visual assets: shader effects, interactive components, SVG icons, diagrams, UI fragments, scenes, 3D/photo objects, photographs and layout examples. Use for actual asset/effect implementation or reuse, not ordinary copy changes, backend work or every design task."
---

# Reuse the actual visual library

This toolkit contains the complete pinned Taste asset library and its runtime
support, not a collection of descriptions. Use it within the current approved
design and requested outcome. Share the master design brief; do not restart an
interview, invent a new identity, create a parallel tracker or install a new stack.

## Find only what is useful

Run the inspected, offline metadata helper from this skill directory:

```text
node scripts/library.mjs list --family components --query button
node scripts/library.mjs list --family effects --limit 10 --offset 0
node scripts/library.mjs list --family photos --local
node scripts/library.mjs show components/fx-button
node scripts/library.mjs verify
```

Families include components, effects, moments, scenes, objects, ui, layout,
diagrams, backgrounds, motion, icons, photos, palettes and type. List output is
paginated and includes the total and next offset. Request more when necessary;
do not read or inject the whole source manifest or library into the conversation.
Read the chosen files and dependencies before adapting them. Some photo entries
are metadata only; `available:false` means no bundled file, not a failed download.

For an authorised asset integration, the helper can copy the complete runtime
closure and credits to a **new** directory:

```text
node scripts/library.mjs export --out <new-project-asset-directory>
```

It performs no install, network request, browser launch, cleanup or overwrite.
The complete export preserves dynamic effect/scene/object modules and shared
helpers; copying one component folder alone often omits required dependencies.
Then integrate only the needed modules/styles into the existing project. Export
does not execute a demo or establish a working product. Do not load the starter
or global system script automatically: their example navigation, FAQ, loading
and animation behaviour may not match the real product.

## Adapt examples, preserve authority

Palettes, fonts, asset counts, sample clients, figures, contacts and styles are
proposals or illustrative data. Keep approved colours, typography, content and
native behaviour. No violet ban, mandatory random deal/history, fixed section or
photo count, forced radius, technology-business classification, compulsory effect
or blanket platform prohibition applies. A cafe can use an appropriate requested
effect; a software tool need not use one. Never present stock imagery, sample
screens, invented metrics, fictional contacts or demo integrations as client facts.
Use supplied truth, clearly labelled placeholders or a consequential question.

The original policy documents and developer tools are retained as `.source.txt`
references for inspection, not operational instructions. They contain browser
launches, network fetches, history writes, file publication/cleanup and original
style rules. Do not reconstruct/run them as a startup side effect. The adapted
helper above is the supported offline entry point; actual browser/device work
uses the host's authorised tools when available and permitted.

## Verify the actual integration

Preserve meaningful keyboard focus, reduced-motion alternatives, readable text,
interruption/reversal and cleanup. Inspect actual loading, interaction and final
state on the target runtime. Measure graphics cost instead of treating an upstream
performance comment or a source screenshot as fresh evidence. Browser rendering,
GPU behaviour and assistive technology are not established by the offline tests.
Use design-motion/accessibility for relevant concerns, not compulsory extra reviews.

Read [rights and attribution](THIRD_PARTY_NOTICES.md) before shipping an asset.
The repository MIT licence does not relicense photographs, icon drawings, marks
or font binaries. Export retains the per-file credits; preserve applicable
attribution, modification notes and share-alike terms. Real brands require an
appropriate truthful use and do not imply endorsement. Fonts are references,
not bundled font files. [Source and adaptation](SOURCE.md).
