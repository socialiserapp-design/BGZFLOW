> BGZFLOW adaptation: use this technical reference only for the current requested outcome. Existing user decisions, actual project architecture and host permissions govern. Numeric examples and aesthetic opinions below are options, not universal rules, new gates or authority to redesign. External products, model weights and licences need current verification before use; none is installed by reading this page. Use the same brief and private project records; do not modify installed learning files.

---
title: stacking-chains
summary: Ordered node chains for multi-step jobs — a new screen, a feel-better pass, a design system, a marketing site — so sequencing decisions aren't re-derived per session.
tags: [meta, routing, workflow]
---

# Stacking chains — ordered routes for multi-step jobs

Single questions route to single nodes ([routing-table](routing-table.md)). Real jobs — "build this screen", "make the app feel better" — chain several clusters, and the *order* matters: deciding motion before layout wastes work; polishing before the states exist polishes the wrong thing. These chains encode the orderings that survived use.

## The chains

### Screen loop (the order for one screen)

decide, if you can't describe it yet (`options`, [prototype-picker](prototype-picker.md)) → foundations: hierarchy, spacing and alignment, deleting what adds nothing ([feeling-right](../philosophy/feeling-right.md)) → **one** material pass for what the screen is made of: forms ([forms-behavior](../components/forms-behavior.md)), surfaces ([depth-and-nesting](../surface/depth-and-nesting.md)), type ([type-scale-and-rhythm](../typography/type-scale-and-rhythm.md)), a reusable component's API ([component-api-design](../components/component-api-design.md)) or a landing page ([marketing-surface-rules](../layout/marketing-surface-rules.md)) → refine: `polish`, then `motion`, `mobile` or `a11y` only if that is the problem → `review` → when release is authorized, use the existing release method within its scope ([ship-check](ship-check.md)).

Look at the screen between passes ([directing-agents](directing-agents.md)). Product UI aims at correctness over novelty, so a screen that looks conventional after foundations is working as intended.

### New feature screen, start to ship

[feeling-right](../philosophy/feeling-right.md) → [typography-humanity](../typography/typography-humanity.md) + [color-monochromatic](../surface/color-monochromatic.md) + [shadows-whisper](../surface/shadows-whisper.md) → [forms-validation](../components/forms-validation.md) (if inputs) → [animation-decision-framework](../motion/animation-decision-framework.md) → [accessibility-baseline](../components/accessibility-baseline.md) → [review-checklist](review-checklist.md) → [review-format](review-format.md)

This is an example dependency order. For the actual task, investigate the decisive uncertainty first and integrate relevant structure, behaviour and motion without a universal gate.

### "Make this app feel better"

[motion-auditor](https://github.com/AgentsORG/design-engineering/blob/dbbe43b5e17c7525409ad4905b3857852cd5174d/agents/motion-auditor.md) (audit what exists) → [delight-impact-curve](../philosophy/delight-impact-curve.md) (where motion is missing — propose few) → [review-checklist](review-checklist.md) (the finishing pass)

Fix what's wrong before adding what's absent.

### Design system from scratch

[color-monochromatic](../surface/color-monochromatic.md) → [typography-humanity](../typography/typography-humanity.md) → [shadows-whisper](../surface/shadows-whisper.md) + [border-radius](../surface/border-radius.md) → [using-design-md](using-design-md.md) (capture the tokens so agents consume, not reinvent)

### Marketing surface

[marketing-vs-product-ui](../philosophy/marketing-vs-product-ui.md) → [typography-humanity](../typography/typography-humanity.md) → product shots ([product-shot-framing](../faux-ui/product-shot-framing.md) → [faux-ui-restraint](../faux-ui/faux-ui-restraint.md) → [demo-story-and-loops](../faux-ui/demo-story-and-loops.md) → [demo-rehearsal](../faux-ui/demo-rehearsal.md); a feature grid via [bento-grids](../faux-ui/bento-grids.md)) → [ai-default-tells](../anti-patterns/ai-default-tells.md) (delete pass) → [review-format](review-format.md)

Marketing tolerates more expression and *less* default — inspect suspected generic choices without deleting an approved identity.

### Accessibility pass

[accessibility-baseline](../components/accessibility-baseline.md) → [contrast-and-color-scheme](../surface/contrast-and-color-scheme.md) → [prefers-reduced-motion](../motion/prefers-reduced-motion.md)

### Slow or janky app

[transform-opacity-only](../motion/transform-opacity-only.md) → [debugging-animations](../motion/debugging-animations.md) → [duration-table](../motion/duration-table.md)

Property discipline first — most jank is animating the wrong property, not animating too much.

### Add sound to a product

[sound-decision-framework](../sound/sound-decision-framework.md) (reject most) → [sound-palette](../sound/sound-palette.md) (one material, write the manifest) → [sound-generation-elevenlabs](../sound/sound-generation-elevenlabs.md) or [sound-generation-open-source](../sound/sound-generation-open-source.md) → [sound-spec](../sound/sound-spec.md) → [sound-playback-web](../sound/sound-playback-web.md) → [sound-motion-sync](../sound/sound-motion-sync.md) → [review-checklist](review-checklist.md)

Decide before designing, design before generating, spec before wiring. Or spawn [sound-designer](https://github.com/AgentsORG/design-engineering/blob/dbbe43b5e17c7525409ad4905b3857852cd5174d/agents/sound-designer.md) for the whole chain.

### Launch video or logo reveal

[launch-video-registers](../launch-video/launch-video-registers.md) (name the register) → [launch-video-structure](../launch-video/launch-video-structure.md) (beats) → [launch-video-type](../launch-video/launch-video-type.md) + [launch-video-ui-demo](../launch-video/launch-video-ui-demo.md) + [launch-video-motion](../launch-video/launch-video-motion.md) (words, product, in-shot motion) → [launch-video-seams](../launch-video/launch-video-seams.md) + [launch-video-cuts](../launch-video/launch-video-cuts.md) (lock picture) → [launch-video-sound](../sound/launch-video-sound.md) (pick the sound register) → [sound-from-motion](../sound/sound-from-motion.md) or [launch-video-music](../sound/launch-video-music.md) → [sound-motion-sync](../sound/sound-motion-sync.md) (transients and cuts on onsets) → [launch-video-review](../launch-video/launch-video-review.md) (≤ −1 dBTP, loudness stated)

Picture locks first; sound is placed on frames and cannot be placed on frames that move. Under a voice-over the voice locks before picture: re-time scenes to its word onsets, then lock picture ([launch-video-music](../sound/launch-video-music.md)).

### Don't know what it should look like yet

[prototype-picker](prototype-picker.md) — a proportionate set of relevant alternatives, using a live picker only when it helps resolve the choice, each diverging on a *named axis* (layout, density, personality, motion, interaction model), numbers on controls, the actual choice retained in existing records, with any harness preserved or retired under actual ownership and cleanup authority. Converge on one, then enter the "new feature screen" chain at the surfaces step. Only a vibe and no target → [vibe-to-generator](vibe-to-generator.md); a target the prompt keeps missing → [build-a-tool](build-a-tool.md). See [taste-is-trained](../philosophy/taste-is-trained.md): comparison is how taste gets exercised.

### Mascot or vector asset, from clip to product

[icon-systems](../components/icon-systems.md) (the brief: flat, few colors, one stroke language) → [svg-creation](../svg/svg-creation.md) → [video-to-vector-pipeline](../svg/video-to-vector-pipeline.md) (if the source is a clip) → [svg-animation](../svg/svg-animation.md) → [sound-motion-sync](../sound/sound-motion-sync.md) (if it has a reveal) → [review-checklist](review-checklist.md)

### "Looks AI-generated"

[unslop-pass](../anti-patterns/unslop-pass.md) (subtract, then sweep) → [copy-tells](../anti-patterns/copy-tells.md) → [color-scales-oklch](../surface/color-scales-oklch.md) + [typography-humanity](../typography/typography-humanity.md) (put a point of view back) → [review-format](review-format.md)

### Documenting the system for agents

[design-system-docs](design-system-docs.md) (inventory, template, verify by prompting) → [using-design-file](using-design-file.md) or [using-design-md](using-design-md.md) (where the machine-readable half lives) → [skill-writing-rules](skill-writing-rules.md) (the language)

## Rules

1. **Chains are examples, not checklists.** Skip irrelevant links and order remaining work by actual dependencies and the requested result.
2. **Each link is a read, not a rewrite.** Enter a link, apply its values to the work in hand, move on.
3. **Every shipping chain ends at [review-format](review-format.md).** If the chain ends and no review happened, it isn't done.
4. **[gotchas](gotchas.md) and [pov](pov.md) apply at every link**, not as a final step — an installer override can prune a whole link.

## Gotcha

Don't run a full chain on a one-line change. Chains are for jobs that touch three or more clusters; a hover tweak routes through [routing-table](routing-table.md) to one node and stops.

## Sources

- HKTITAN — orderings distilled from repeated multi-cluster sessions; companions: [routing-table](routing-table.md), [disambiguation](disambiguation.md).
