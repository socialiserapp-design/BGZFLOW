> BGZFLOW adaptation: use this technical reference only for the current requested outcome. Existing user decisions, actual project architecture and host permissions govern. Numeric examples and aesthetic opinions below are options, not universal rules, new gates or authority to redesign. External products, model weights and licences need current verification before use; none is installed by reading this page. Use the same brief and private project records; do not modify installed learning files.

---
title: disambiguation
summary: The intents that blur together — four motion questions, three dark-mode owners, two layout-shift owners — and which node owns each.
tags: [meta, routing, disambiguation]
---

# Disambiguation — the questions that blur together

Some questions sound identical but route to different nodes. Misrouting here is the most common navigation failure in this graph: the answer you get is *plausible* but from the wrong altitude. This node lists the known confusable pairs and the tiebreaker for each.

## The four motion questions

"Something about animation" is four different jobs:

| Question | Owner |
|---|---|
| How should *this one thing* animate? | [animation-decision-framework](../motion/animation-decision-framework.md) → [easing-curves](../motion/easing-curves.md), [duration-table](../motion/duration-table.md) |
| Is *this diff's* animation good? | [motion-auditor](https://github.com/AgentsORG/design-engineering/blob/dbbe43b5e17c7525409ad4905b3857852cd5174d/agents/motion-auditor.md) (motion-only, deeper) or motion rows in a [review-format](review-format.md) table |
| What's wrong with motion across the *whole app*? | [motion-auditor](https://github.com/AgentsORG/design-engineering/blob/dbbe43b5e17c7525409ad4905b3857852cd5174d/agents/motion-auditor.md) in audit mode — output is a prioritized plan, not a table |
| Where is motion *missing*? | [delight-impact-curve](../philosophy/delight-impact-curve.md) + [responsive-feedback](../motion/responsive-feedback.md) — propose few, reject most |

Tiebreaker: scope. One element → decide/build nodes. One diff → judge posture. Whole codebase → audit plan. Absence of motion → the delight nodes, and the burden of proof is on *adding*.

## Film seam vs UI transition

A **product state change** routes to [fly-not-teleport](../motion/fly-not-teleport.md) and [cross-blur-transitions](../motion/cross-blur-transitions.md); a **scene change in a rendered film** routes to [launch-video-seams](../launch-video/launch-video-seams.md) and [launch-video-cuts](../launch-video/launch-video-cuts.md).

Tiebreaker: is there a timeline the viewer cannot interrupt? If yes, it is a film, and UI durations (under 300 ms) do not transfer to it.

## Page demo vs film demo

A product shot that plays **on a page** — a hero loop, a feature card, a bento tile — routes to [MOC-faux-ui](../faux-ui/MOC-faux-ui.md): shown at 1:1, cursor at real or 1.5× size, typed strings recognised at ~28 c/s, a pause button and a poster. A product demo **inside a rendered film** routes to [launch-video-ui-demo](../launch-video/launch-video-ui-demo.md): cursor at ~7cqw, prompts read at ~15 c/s, no replay. Tiebreaker: can the viewer scroll past it, pause it or replay it? Then it is a page demo.

## Looks right vs. feels finished vs. should ship

- **Looks right** — hierarchy, spacing, restraint, while designing → [feeling-right](../philosophy/feeling-right.md), [unseen-details-compound](../philosophy/unseen-details-compound.md).
- **Feels finished** — press states, tabular numbers, no layout shift, after it works → [ui-polish-pass](../components/ui-polish-pass.md) as the finishing pass, [review-checklist](review-checklist.md) as the audit.
- **Should ship** — a verdict on a diff, at the gate → [review-format](review-format.md) table, checklist-scoped.

Two more that blur: **feels wrong vs. drops frames** — judged motion goes to [easing-curves](../motion/easing-curves.md) and [duration-table](../motion/duration-table.md); measured slowness goes to [performance-discipline](../motion/performance-discipline.md). **Broken for someone vs. merely unpolished** — a failure in [touch-and-focus](../components/touch-and-focus.md) is blocking; polish is not.

Same screen, three altitudes. Don't give a gate verdict when the user is still designing.

## Layout shift has two owners

- Shift because things are **slow to arrive** — skeletons that don't match loaded dimensions, unreserved space → [empty-loading-states](../components/empty-loading-states.md).
- Shift because things are **animated wrong** — layout-property transitions, `width`/`top` animation → [transform-opacity-only](../motion/transform-opacity-only.md).

Tiebreaker: does it happen once (loading) or on every interaction (animation)?

## Dark mode has three owners

- The **palette** — how colors derive, desaturation, preserved layering → [dark-mode](../surface/dark-mode.md).
- The **treatment** — shadows lose their job in dark; borders take over → [shadows-whisper](../surface/shadows-whisper.md).
- The **principle** — dark mode is a redesign, not an inversion → [color-monochromatic](../surface/color-monochromatic.md).

A dark-mode question that names a hex value routes to palette; one that says "looks flat in dark" routes to treatment.

## Hit areas: craft vs. floor

[hover-states-subtle](../components/hover-states-subtle.md) treats target sizing and feedback as craft. [accessibility-baseline](../components/accessibility-baseline.md) treats the same numbers as a floor you cannot trade away. An a11y audit routes to the floor; a polish pass routes to the craft node — but the floor still applies.

## Sound has three owners

- **Should it make a sound at all** — frequency and purpose, before any file exists → [sound-decision-framework](../sound/sound-decision-framework.md). The burden of proof is on adding.
- **It has sounds and something is off** — stock, late, too long, too loud, no toggle → [sound-palette](../sound/sound-palette.md) for character, [sound-motion-sync](../sound/sound-motion-sync.md) for timing, [sound-spec](../sound/sound-spec.md) for numbers, [sound-playback-web](../sound/sound-playback-web.md) for wiring.
- **It is a video, not a product** → [launch-video-sound](../sound/launch-video-sound.md). Opposite defaults: silence is placed, sound is the medium.

Tiebreaker: is there a user who can mute it? If yes, product rules. If no (video), the launch register.

## Component look-alikes

Tooltip vs. popover, badge vs. tag, sheet vs. drawer vs. dialog → [component-confusables](../components/component-confusables.md) owns these. Don't adjudicate them from memory.

## Gotcha

When two owners both seem right, answer from the *narrower* one and link the other — a specific node's values with a pointer beats a blended answer from both.

## Sources

- HKTITAN — confusable pairs collected from real misroutes; see [routing-table](routing-table.md) for the forward map.
