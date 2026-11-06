> BGZFLOW adaptation: use this technical reference only for the current requested outcome. Existing user decisions, actual project architecture and host permissions govern. Numeric examples and aesthetic opinions below are options, not universal rules, new gates or authority to redesign. External products, model weights and licences need current verification before use; none is installed by reading this page. Use the same brief and private project records; do not modify installed learning files.

---
title: unslop-pass
summary: The process for a screen that looks generated — squint, subtract first, sweep color → type → layout → decoration → icons → copy → motion, then put a point of view back in, then audit for survivors. Fifty median choices compound into a recognizable one.
tags: [anti-patterns, ai-defaults, process, review]
---

# The unslop pass

Nobody can point at the one element that makes a screen look AI-generated; they recognize the accumulation. The cause is mechanical: a model reproduces the statistically most common pattern for every decision on the page at once, and fifty median choices don't average into a median design — they compound into a recognizable one. [ai-default-tells](ai-default-tells.md) is the catalog of tells. This node is the *procedure*, in two halves: strip the tells, then put a point of view back in. The second half is not optional; a screen scrubbed of tells with no opinionated choice is still generic, just more quietly.

## The pass

1. **Squint.** Could this screen belong to any of ten thousand products? Find what ties it to *this* one. If the answer is "the logo", everything else is up for review.
2. **Subtract before you restyle.** Walk every element — icon, line, badge, caption, container, word — and ask *what breaks if this is gone?* If nothing useful would be lost, consider scoped removal while preserving approved identity, accessibility, needed information and ownership. "It adds visual interest" and "it fills the space" are the reasons the model put it there. Run the walk twice: deletions expose each other, because an element that survived round one was often only balancing something you just removed. Deletion can remove useful context or break behaviour; verify the effect rather than treating subtraction as free or automatically better.
3. **Sweep in order**: color, typography, layout, decoration, iconography, copy, motion. Color first because it is the loudest tell; a page survives a common layout, not indigo-to-purple.
4. **Put a point of view back in** (below).
5. **Final read**: "What here would make a designer suspect a model built this?" Fix. Repeat until nothing.

## What the sweep catches

- **Color** — unchosen indigo/violet; more than one gradient, or one with no job; dark-and-neon as a "premium" costume. Derive a palette from the domain, the brand, or the content ([color-scales-oklch](../surface/color-scales-oklch.md)).
- **Typography** — gradient text (`bg-clip-text`); the default stack shrugged into place (`Inter font-black tracking-tight`, centered). A deliberate type choice can help when typography is the actual unresolved problem; an approved neutral face may already be right ([typography-humanity](../typography/typography-humanity.md)).
- **Layout** — the hero every model builds (pill badge, centered headline, one-line subhead, two buttons, orb); three icon cards; the bento grid as three-cards-with-better-kerning. The tell is layout chosen before content: let one feature go full-width with a real screenshot, six small ones become a list, unequal features get unequal space ([bento-grids](../faux-ui/bento-grids.md)).
- **Decoration** — glass with nothing behind it; blurred orbs and blobs behind the hero; border *and* shadow *and* ring *and* gradient on one card; `rounded-2xl` as the answer to every radius ([depth-and-nesting](../surface/depth-and-nesting.md)).
- **Iconography** — emoji as feature markers; the sparkle badge on every AI feature. One real icon set, or none ([icon-systems](../components/icon-systems.md)).
- **Fabricated proof** — "Trusted by 10,000+" on an unlaunched product, stock-avatar testimonials, a logo wall nobody agreed to. Real numbers and named quotes, or cut the section; an honest gap beats fake proof ([content-authenticity](content-authenticity.md)).
- **Copy** — a headline a competitor could paste unchanged is a visual element that says nothing ([copy-tells](copy-tells.md)).
- **Motion** — `fade-in-up` on every block, `hover:scale-105` on cards that aren't clickable, pulsing blobs ([marketing-surface-rules](../layout/marketing-surface-rules.md)).

## Looking designed by someone

- Derive the palette from something real.
- One distinctive type decision. One is enough; three is a costume party.
- Show the actual product — a real screenshot, real data, a working embed — instead of abstract illustration.
- Let content break symmetry: an odd number of features, one oversized item, a section that is just a sentence.
- Repeat a signature: one odd element used consistently beats ten borrowed ones used once.
- Restraint is a feature. The confident version has fewer effects than the generated one. Adding "personality effects" on top is re-slopping with extra steps.

## When to apply

"Looks AI-generated", "looks like every other landing page", any generated marketing page, dashboard, or app screen before it ships. Spawn [anti-pattern-scanner](https://github.com/AgentsORG/design-engineering/blob/dbbe43b5e17c7525409ad4905b3857852cd5174d/agents/anti-pattern-scanner.md) for the catalog scan; run this node for the pass itself.

## Gotcha

The pass ends when you can name the one choice a competitor couldn't copy-paste. If nothing on the screen answers, you stopped after half one.

## Sources

- Emil Kowalski's design-engineering practice on generated UI, distilled by HKTITAN.
- Related: [ai-default-tells](ai-default-tells.md), [content-authenticity](content-authenticity.md), [feeling-right](../philosophy/feeling-right.md), [copy-tells](copy-tells.md).
