> BGZFLOW adaptation: use this technical reference only for the current requested outcome. Existing user decisions, actual project architecture and host permissions govern. Numeric examples and aesthetic opinions below are options, not universal rules, new gates or authority to redesign. External products, model weights and licences need current verification before use; none is installed by reading this page. Use the same brief and private project records; do not modify installed learning files.

---
title: routing-table
summary: Intent → entry-node router. Name the job first, then open the relevant entry node and necessary supporting guidance — most questions have one canonical entry point into the graph.
tags: [meta, routing, navigation]
---

# Routing table — intent → entry node

Most wasted context comes from opening the wrong cluster. Before reading anything, classify the user's intent into one of four postures, then jump straight to the entry node for that job. One good entry beats scanning three MOCs.

## The four postures

| Posture | The user wants… | Output shape |
|---|---|---|
| **Build** | UI produced or changed | Code, using the cluster's values |
| **Judge** | Existing work assessed | A table or list — never unsolicited edits |
| **Decide** | A call made *before* building | A yes/no or a pick, with the trade named |
| **Name** | The precise word for a thing | The term, one line, stop |

Judge-posture outputs are read-only: return the [review-format](review-format.md) table or a deletion list, don't rewrite the code unless asked. Use a decision method when a consequential choice is unresolved; do not add another decision pass for settled or routine work.

## The router

| You want to… | Open first |
|---|---|
| Understand why a screen feels flat or assembled | [feeling-right](../philosophy/feeling-right.md) |
| Decide whether something should animate at all | [animation-decision-framework](../motion/animation-decision-framework.md) |
| Pick easing / duration for one animation | [easing-curves](../motion/easing-curves.md), then [duration-table](../motion/duration-table.md) |
| Build drag / swipe / momentum interactions | [gesture-momentum](../motion/gesture-momentum.md), [spring-animations](../motion/spring-animations.md) |
| Rapid presses miss moving items; a dragged card slides under its neighbours on release | [animated-hit-testing](../motion/animated-hit-testing.md) |
| An animation lands differently at 30, 60 and 120 fps, or jumps after a stalled tab | [frame-rate-independence](../motion/frame-rate-independence.md) |
| The reading position jumps when content above it loads or reflows | [scroll-anchoring](../layout/scroll-anchoring.md) |
| A dropdown hides under the header; `z-index: 9999` | [z-index-strategy](../surface/z-index-strategy.md) |
| Fix jank, stutter, or layout thrash | [transform-opacity-only](../motion/transform-opacity-only.md), then [debugging-animations](../motion/debugging-animations.md) |
| Pick or fix a typeface, wrapping, tracking | [typography-humanity](../typography/typography-humanity.md), [line-length-tracking](../typography/line-length-tracking.md) |
| Build a palette, fix contrast, derive dark mode | [color-monochromatic](../surface/color-monochromatic.md), [contrast-and-color-scheme](../surface/contrast-and-color-scheme.md), [dark-mode](../surface/dark-mode.md) |
| Add depth — shadows, borders, radii | [shadows-whisper](../surface/shadows-whisper.md), [border-radius](../surface/border-radius.md) |
| Build a form that behaves | [forms-validation](../components/forms-validation.md) |
| Write empty / loading / error states | [empty-loading-states](../components/empty-loading-states.md), [states-are-the-work](../philosophy/states-are-the-work.md) |
| Write UI copy or error messages | [copy-voice](../components/copy-voice.md) |
| Review a UI diff before shipping | [review-format](review-format.md) + [review-checklist](review-checklist.md) (or spawn [ui-reviewer](https://github.com/AgentsORG/design-engineering/blob/dbbe43b5e17c7525409ad4905b3857852cd5174d/agents/ui-reviewer.md)) |
| Review a diff that is *specifically* motion | [motion-auditor](https://github.com/AgentsORG/design-engineering/blob/dbbe43b5e17c7525409ad4905b3857852cd5174d/agents/motion-auditor.md) |
| Review a PR, branch or uncommitted change for what it broke | [change-scoped-review](change-scoped-review.md); with Jakub Krehel's skills → `/interface-review` ([interfaces-reconciliation](interfaces-reconciliation.md)) |
| Make a custom widget keyboard-operable — tabs, menu, combobox, dialog | [keyboard-patterns](../components/keyboard-patterns.md) |
| Toasts, "Saved", result counts or errors a screen reader never hears | [screen-reader-announcements](../components/screen-reader-announcements.md) |
| Is this an accessibility finding or a preference? Contrast, target size, zoom, reflow numbers | [wcag-thresholds](../components/wcag-thresholds.md) |
| Name colour tokens, split primitives from semantics, theme without touching components | [color-token-tiers](../surface/color-token-tiers.md) |
| Decide which palette steps and ramps exist; audit a palette with too many colours | [palette-step-roles](../surface/palette-step-roles.md) |
| A gradient goes grey in the middle, bands, or carries text | [gradient-interpolation](../surface/gradient-interpolation.md) |
| Things don't read as groups; separators everywhere; controls look like text | [grouping-by-space](../layout/grouping-by-space.md) |
| German breaks the button; a grid overflows; container queries; breakpoints | [growth-and-overflow](../layout/growth-and-overflow.md) |
| Mirror a layout for Arabic or Hebrew; mixed-direction text | [logical-properties-rtl](../layout/logical-properties-rtl.md) |
| Plurals, string concatenation, dates and currency per locale; button and link labels | [strings-and-locale](../components/strings-and-locale.md) |
| Delete, archive, revoke — undo or confirm, and the dialog's words | [destructive-actions](../components/destructive-actions.md) |
| Render a component under worst-case content and widths, or every state it has | [stress-scenarios](stress-scenarios.md) |
| "How did they build that?" — explain another site, effect or screenshot | [reading-others-interfaces](reading-others-interfaces.md) |
| Audit "does this look AI-generated?" | [ai-default-tells](../anti-patterns/ai-default-tells.md) (or spawn [anti-pattern-scanner](https://github.com/AgentsORG/design-engineering/blob/dbbe43b5e17c7525409ad4905b3857852cd5174d/agents/anti-pattern-scanner.md)) |
| Build a marketing / landing surface | [marketing-vs-product-ui](../philosophy/marketing-vs-product-ui.md) |
| Build a faux product UI — a hero demo, feature card, docs plate or cursor walkthrough | [product-shot-framing](../faux-ui/product-shot-framing.md), then [faux-ui-restraint](../faux-ui/faux-ui-restraint.md) (or `/design-engineering stage`); with Stageshow → [stageshow-reconciliation](../faux-ui/stageshow-reconciliation.md) |
| Script a looping product demo: beats, poster, reset, cursor | [demo-story-and-loops](../faux-ui/demo-story-and-loops.md), then [demo-cursor-and-touch](../faux-ui/demo-cursor-and-touch.md) |
| Plan or fix a bento grid of feature tiles | [bento-grids](../faux-ui/bento-grids.md) |
| Check an animated demo frame by frame before handing it over | [demo-rehearsal](../faux-ui/demo-rehearsal.md) |
| Show who is here, half here or gone in a real-time product | [presence-signals](../components/presence-signals.md) |
| Add drawing or markup to a product | [drawing-toolbar](../components/drawing-toolbar.md) |
| Consume a project's DESIGN.md tokens | [using-design-md](using-design-md.md) (or spawn [design-md-consumer](https://github.com/AgentsORG/design-engineering/blob/dbbe43b5e17c7525409ad4905b3857852cd5174d/agents/design-md-consumer.md)) |
| Put the right word to a design idea | [design-vocabulary](design-vocabulary.md) |
| Decide whether an interaction should make a sound | [sound-decision-framework](../sound/sound-decision-framework.md) |
| Design or generate a set of UI sounds | [sound-palette](../sound/sound-palette.md), then [sound-generation-elevenlabs](../sound/sound-generation-elevenlabs.md) or [sound-generation-open-source](../sound/sound-generation-open-source.md) (or spawn [sound-designer](https://github.com/AgentsORG/design-engineering/blob/dbbe43b5e17c7525409ad4905b3857852cd5174d/agents/sound-designer.md)) |
| Sync a sound to an animation, or fix one that feels late | [sound-motion-sync](../sound/sound-motion-sync.md) |
| Plan a launch film — register, beats, when the name lands, endcard | [launch-video-registers](../launch-video/launch-video-registers.md), then [launch-video-structure](../launch-video/launch-video-structure.md) |
| Time words, typed prompts, a cursor or an agent's wait in a launch film | [launch-video-type](../launch-video/launch-video-type.md); prompts, cursor and agent output → [launch-video-ui-demo](../launch-video/launch-video-ui-demo.md) |
| Make launch-film motion feel alive — settles, springs, blur, holds, rhythm | [launch-video-motion](../launch-video/launch-video-motion.md) |
| Cut a multi-scene video — seams, hard cuts, the ledger | [launch-video-seams](../launch-video/launch-video-seams.md); hard cuts → [launch-video-cuts](../launch-video/launch-video-cuts.md) |
| Score a launch video or logo reveal | [launch-video-sound](../sound/launch-video-sound.md) (pick the register); a music track or a voice → [launch-video-music](../sound/launch-video-music.md); derive the stem → [sound-from-motion](../sound/sound-from-motion.md) |
| Review a launch film, or measure a reference film | [launch-video-review](../launch-video/launch-video-review.md) (or spawn [launch-film-analyst](https://github.com/AgentsORG/design-engineering/blob/dbbe43b5e17c7525409ad4905b3857852cd5174d/agents/launch-film-analyst.md)); inside HyperFrames → [hyperframes-reconciliation](../launch-video/hyperframes-reconciliation.md); in Remotion with cinetic → [cinetic-reconciliation](../launch-video/cinetic-reconciliation.md); with scenario-kinetic-film → [scenario-kinetic-reconciliation](../launch-video/scenario-kinetic-reconciliation.md) |
| Render a film from code: motion blur, a beat grid from generated music, a 4K master that plays everywhere | [film-as-function-of-time](../launch-video/film-as-function-of-time.md) |
| Make a loop, a logo sting, or a 9:16 / 1:1 cut of a film | [launch-video-formats](../launch-video/launch-video-formats.md) |
| Design a whoosh, riser, impact, sting, ding or pop that sounds designed, not stock | [designed-sfx-anatomy](../sound/designed-sfx-anatomy.md) |
| Listen to a sound or a film's soundtrack with a tool; pick or trim a recording | [earshot-reconciliation](../sound/earshot-reconciliation.md) |
| Check whether a recording or track may go in a launch film; write its credit | [sound-licensing](../sound/sound-licensing.md) |
| Decide which skill or companion should own a job | [skill-router](skill-router.md) |
| Build an OKLCH palette or ramp, repair contrast by lightness | [color-scales-oklch](../surface/color-scales-oklch.md) |
| Fix pinched corners, harsh borders, dark-mode cards vanishing | [depth-and-nesting](../surface/depth-and-nesting.md) |
| Set up a type scale, leading, tracking, font loading | [type-scale-and-rhythm](../typography/type-scale-and-rhythm.md) |
| Fix wrapping, truncation, underlines, casing, RTL | [line-behavior](../typography/line-behavior.md) |
| Make a form behave (labels, Enter, loading, autofocus) | [forms-behavior](../components/forms-behavior.md) |
| Make it work on touch, keyboard, screen readers, iOS | [touch-and-focus](../components/touch-and-focus.md) |
| "Feels unfinished" with nothing obviously wrong | [ui-polish-pass](../components/ui-polish-pass.md) |
| Design a component's props API | [component-api-design](../components/component-api-design.md) |
| Build a landing page, docs site, blog, changelog | [marketing-surface-rules](../layout/marketing-surface-rules.md) |
| "It's pushed to one side", "random empty space", "no clear title" — fix a page's frame | [page-frame](../layout/page-frame.md) |
| Critique a rendered page from screenshots, round by round | [screenshot-critique](../anti-patterns/screenshot-critique.md) |
| Build or review a dashboard: KPIs, deltas, tables of numbers | [dashboard-tells](../components/dashboard-tells.md) |
| Fix jank, layout shift, slow lists (measured slowness) | [performance-discipline](../motion/performance-discipline.md) |
| "Looks AI-generated" — run the pass | [unslop-pass](../anti-patterns/unslop-pass.md); copy → [copy-tells](../anti-patterns/copy-tells.md); code → [code-tells](../anti-patterns/code-tells.md) |
| Create or clean up an SVG | [svg-creation](../svg/svg-creation.md) (or spawn [svg-creator](https://github.com/AgentsORG/design-engineering/blob/dbbe43b5e17c7525409ad4905b3857852cd5174d/agents/svg-creator.md)) |
| Animate an SVG, morph a path, vectorize a clip | [svg-animation](../svg/svg-animation.md), [svg-path-morphing](../svg/svg-path-morphing.md), [video-to-vector-pipeline](../svg/video-to-vector-pipeline.md) (or spawn [svg-animator](https://github.com/AgentsORG/design-engineering/blob/dbbe43b5e17c7525409ad4905b3857852cd5174d/agents/svg-animator.md)) |
| Draw or animate a playful isometric sticker for an empty state, onboarding or a feature card | [isometric-stickers](../svg/isometric-stickers.md); with fun-isometric installed → [fun-isometric-reconciliation](../svg/fun-isometric-reconciliation.md) |
| Decide whether something should be a diagram, and where it lives (a figure, a canvas, a Mermaid block) | [diagram-decision](../diagram/diagram-decision.md) |
| Draw or review an architecture, flow, sequence or chart figure | [diagram-craft](../diagram/diagram-craft.md); with diagram-design and a `.design` → [diagram-design-reconciliation](../diagram/diagram-design-reconciliation.md) |
| Edit a whiteboard, a planning board, or a `.tldraw` / `.tldr` file | [tldraw-canvas](../diagram/tldraw-canvas.md) |
| Explore several directions before deciding | [prototype-picker](prototype-picker.md) |
| Stop re-prompting; build the tool that makes the artifact | [build-a-tool](build-a-tool.md); no target yet → [vibe-to-generator](vibe-to-generator.md) |
| Write design docs an agent can follow | [design-system-docs](design-system-docs.md) |
| Write or fix a skill file, or [pov](pov.md) | [skill-writing-rules](skill-writing-rules.md) |
| Measure whether a change made output better | [design-benchmarks](design-benchmarks.md) |
| Get the app ready to launch: every lane, fixed and verified | [ship-check](ship-check.md), then [production-baseline](production-baseline.md); leftovers and secrets → [leftovers-and-leaks](../anti-patterns/leftovers-and-leaks.md); link previews, SEO, the conversion path → [share-and-crawl-metadata](../layout/share-and-crawl-metadata.md) |
| Remove or tone down animations without breaking anything | [animation-removal-hazards](../motion/animation-removal-hazards.md) |
| A flick should land where it would naturally coast; rubber-band past an edge | [momentum-projection](../motion/momentum-projection.md), [gesture-momentum](../motion/gesture-momentum.md) |
| Glass, translucent sidebars, dimming behind sheets | [translucent-materials](../surface/translucent-materials.md) |
| The keyboard covers the composer; 100vh, safe areas or landscape break on a phone | [mobile-platform-layer](../layout/mobile-platform-layer.md), then [touch-and-focus](../components/touch-and-focus.md) |
| Navigation, settings structure, tabs vs sections, search as a symptom | [information-architecture](../layout/information-architecture.md) |
| Small caps, slashed zero, stylistic sets, variable axes, stroked text | [opentype-features-and-axes](../typography/opentype-features-and-axes.md) |
| Colours out of sRGB, P3, migrating hex/HSL to OKLCH | [oklch-gamut-and-migration](../surface/oklch-gamut-and-migration.md) |
| React Native or Expo motion | [react-native-motion](../motion/react-native-motion.md) |
| Set up or fix Sonner toasts | [sonner-usage](../components/sonner-usage.md) (principles → [sonner-principles](../motion/sonner-principles.md)) |
| Steer an agent: prompts, how many passes, fixing the system not the screen, papercuts | [directing-agents](directing-agents.md) |

## Rules

1. **Route before reading.** Classify posture, pick the entry node, open it. Only widen to the MOC when the entry node's outbound links don't cover the question.
2. **One entry node per question.** If you find yourself opening four nodes up front, you skipped classification.
3. **Judge posture never writes.** A review request gets a table; a fix request gets code. Don't convert one into the other silently.
4. **Preserve current authority.** Use applicable current decisions and relevant gotchas/pov context when needed. No universal extra file reads are required and installer taste never overrides the user.

## Gotcha

The router is for *entry*, not *coverage*. Landing on [easing-curves](../motion/easing-curves.md) doesn't exempt you from [prefers-reduced-motion](../motion/prefers-reduced-motion.md) — follow the entry node's own outbound links for the mandatory companions.

## Sources

- HKTITAN — routing patterns distilled from operating this graph across real sessions.
- Related: [disambiguation](disambiguation.md) for the intents that blur together, [stacking-chains](stacking-chains.md) for multi-step jobs.
