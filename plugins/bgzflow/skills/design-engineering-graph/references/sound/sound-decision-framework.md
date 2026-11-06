> BGZFLOW adaptation: use this technical reference only for the current requested outcome. Existing user decisions, actual project architecture and host permissions govern. Numeric examples and aesthetic opinions below are options, not universal rules, new gates or authority to redesign. External products, model weights and licences need current verification before use; none is installed by reading this page. Use the same brief and private project records; do not modify installed learning files.

---
title: sound-decision-framework
summary: Should this make a sound at all? Frequency first, then purpose, then the 100th-use test. Recover the approved purpose and controls before choosing cues.
tags: [sound, decision, delight, audio]
---

# Sound decision framework

Recover the approved audio experience first. Silence can be appropriate when sound is unnecessary, but this graph does not change a requested audio feature or its default. A sound has to earn its place harder than an animation does, because a user can look away from motion but cannot un-hear a chime — and the web offers no system setting that turns your sounds off the way `prefers-reduced-motion` turns motion down. Read this before generating, downloading, or synthesizing anything.

## The decision tree

1. **How often will the user hear it?** Assess purpose, repetition, context and actual user control. Keyboard, hover or frequent actions are not categorical bans: a musical keyboard, accessibility feature or approved tactile interface may legitimately depend on sound.
2. **What is it for?** Apple's audio-haptic principle is *utility*: add feedback only where it communicates something the eye may miss. Valid purposes:
   - **Confirmation when attention is elsewhere** — a message sent while the user has already started typing the next one; a recording that started.
   - **State change that has no visual** — a background upload finishing on another tab; a timer ending.
   - **Physicality** the product is built around — a card snapping into a slot, a crown click.
   - **Brand moments** on marketing surfaces and launch videos, where sound *is* the medium. See [launch-video-sound](launch-video-sound.md).

   Decoration and brand expression can be legitimate when requested; avoid adding cues merely because another product uses them.
3. **Does it survive the 100th use?** Apple's test from *Designing Audio-Haptic Experiences*: imagine the sound on first use, then on the hundredth. If it would make you reach for the mute, cut it or make it smaller. Hugo Verweij's notification "Rebound" was tuned to be *tolerable at frequency* — that is the bar.
4. **Is there a visual equivalent?** Sound reinforces; it never carries information alone. If the sound is the only signal, the design is broken for the muted majority. See [sound-playback-web](sound-playback-web.md).
5. **What audio behaviour and control has the product chosen?** Honour existing preferences, platform requirements and the requested experience. Propose a missing material user control where needed; do not silently add a toggle, opt-in step or off-by-default policy.

## What passes, concretely

| Moment | Sound? | Why |
|---|---|---|
| Typing, scrolling, hover | Task-dependent | Assess the actual task: instrument, assistive, tactile and ordinary UI contexts differ. |
| Button press | Task-dependent | A sound can be legitimate where the approved experience benefits; preserve non-audio access. |
| Toggle in a tactile product | Small tick, ≤ 80 ms | Physicality is the product's premise. |
| Message sent, file saved | One suitable approved cue | Confirmation when attention has moved on. |
| Error on submit | A clear approved cue | Preserve readable error information and recovery; a shake is optional. See [multi-segment-shake](../motion/multi-segment-shake.md). |
| Payment complete, onboarding done | A designed two- or three-note figure | Rare. Earned. |
| Notification while the tab is hidden | Yes, once, respect OS focus modes | The whole point of a notification. |

## When to apply

Any time someone says "let's add a sound", "it needs a satisfying click", or "the OpenAI video has that nice tick". Ask how often, for what, and whether it survives the 100th time. Then, if it passes, go to [sound-palette](sound-palette.md) to design it and [sound-motion-sync](sound-motion-sync.md) to place it.

## Gotcha

The 100th-use test is asymmetric. A sound that is *slightly* too loud or too long is annoying on the tenth use; a sound that is too quiet or short may also fail to communicate. Check repeated use and audibility on the target device; shortening or lowering the cue is one experiment — the same instinct as "if unsure, halve it" in [duration-table](../motion/duration-table.md).

## Sources

- Apple, *Designing Audio-Haptic Experiences* (WWDC19, Hugo Verweij & Camille Moussette) — the utility principle and the first-vs-hundredth-use test.
- Benji Taylor — [delight-impact-curve](../philosophy/delight-impact-curve.md); Family plays "a satisfying sound effect" on completing a trash action, not on every tap.
- Josh Comeau, *use-sound* announcement — sound is rare on the web and therefore impactful; ship a mute toggle.
- Material Design, *Applying sound to UI* — "silence is an important part of the experience."
- Related: [animation-decision-framework](../motion/animation-decision-framework.md), [interaction-personality](../components/interaction-personality.md).
