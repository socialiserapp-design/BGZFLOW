> BGZFLOW adaptation: use this technical reference only for the current requested outcome. Existing user decisions, actual project architecture and host permissions govern. Numeric examples and aesthetic opinions below are options, not universal rules, new gates or authority to redesign. External products, model weights and licences need current verification before use; none is installed by reading this page. Use the same brief and private project records; do not modify installed learning files.

---
title: MOC-sound
summary: When an interface should make a sound, how to design a family of sounds that belong together, how to sync them to motion, and how to generate them — ElevenLabs on demand, or open-weight and CC0 without a key — plus the five measured launch-film sound registers and how a track or a voice is placed on the picture.
tags: [moc, sound, audio, launch-video]
---

# MOC — Sound

Sound is the sense the web forgot. That makes it the highest-leverage polish move left — and the easiest one to get wrong, because a bad sound is worse than no sound and users remember it. Read [sound-decision-framework](sound-decision-framework.md) first; it recovers the approved purpose and repetition context. The rest of the cluster is for the moments that earn a sound.

Two surfaces share this cluster and have different contexts. **Product UI** follows the approved audio purpose, controls and defaults. A **launch video** is the reverse: sound is the emotional layer, and silence is a material you place deliberately. [launch-video-sound](launch-video-sound.md) owns the second; everything else defaults to the first.

## Decision-first nodes (read before making a sound)

- [sound-decision-framework](sound-decision-framework.md) — Should this make a sound at all? Frequency, purpose, and the 1st-vs-100th-use test. Extends [delight-impact-curve](../philosophy/delight-impact-curve.md) and [animation-decision-framework](../motion/animation-decision-framework.md).
- [sound-motion-sync](sound-motion-sync.md) — Sound and motion are one event. Choose event-specific contact or anticipatory timing and verify actual playback; broadcasting tolerances are context.

## Design nodes (read while designing the family)

- [sound-palette](sound-palette.md) — Choose a coherent palette for the requested cues. Size → pitch, direction → meaning, consonance → success, dissonance → error.
- [sound-spec](sound-spec.md) — The numbers: duration by category, loudness in LUFS, compatible channels/sample rate and measured onset offsets, peak headroom.

## Implementation nodes

- [sound-playback-web](sound-playback-web.md) — Unlock the AudioContext on the first gesture, decode once, one source node per play, existing approved audio preference, never sound-only information.

## Generation nodes

- [sound-generation-elevenlabs](sound-generation-elevenlabs.md) — On-demand generation for installers with an `ELEVENLABS_API_KEY`: the prompt formula, high `prompt_influence` for functional sounds, selective generation within existing authority, post-processing.
- [sound-generation-open-source](sound-generation-open-source.md) — No key: open-weight models (Stable Audio 3 Small-SFX runs on CPU), procedural synthesis (ZzFX, Web Audio), and CC0 libraries (Kenney, soundcn, Freesound). A decision table for which.

## Launch-video register

- [launch-video-sound](launch-video-sound.md) — Five measured registers (dry reveal, OpenAI one-key bed with clicks, beat track, voice-led, product-camera pad with consequence foley), subtraction before the reveal, loudness/headroom chosen for the actual delivery specification.
- [launch-video-music](launch-video-music.md) — Placing a track or a voice on the picture: drop on the reveal, breakdowns under reading, cuts on onsets, moves landing on spoken onsets.
- [sound-from-motion](sound-from-motion.md) — Derive the sound from the motion: size → pitch and decay, x → pan, y → brightness, direction → contour, tween → length, contact frame → transient; or structurally, where the picture places a track's drop and dropouts. The cue sheet and `scripts/sound-sheet.mjs`, which renders a stereo stem from it.
- [designed-sfx-anatomy](designed-sfx-anatomy.md) — What a designed effect is made of, measured: one gesture, its own band, a hard end, a sync point per kind. Targets for whoosh, riser, impact, sub drop, sting, ding, pop-in, click, typing and zip, tuned to the track's key.
- [earshot-reconciliation](earshot-reconciliation.md) — earshot, the agent's ears: describe, match, trim, realness, a listening timeline and scorecard, a code-rendered effects bank. Optional source-described measurements and their limits, not an installed tool or overriding authority.
- [sound-licensing](sound-licensing.md) — What may go into a commercial, edited, published film: check exact item terms, commercial use, adaptations, ShareAlike and attribution; Content ID; credits.

## Shipped tooling

`scripts/sound-family.mjs` (bundled under design-sound) turns one family manifest into a normalized set of files — dependency-free local synthesis by default; remote generation requires explicit provider selection and existing authority. `scripts/sound-sheet.mjs` renders a launch video's whole stem from a motion cue sheet, and writes the same six product one-shots from the same voices. Consult the optional upstream [sound-designer](https://github.com/AgentsORG/design-engineering/blob/dbbe43b5e17c7525409ad4905b3857852cd5174d/agents/sound-designer.md) when the job is the whole workflow rather than one question.

## Cross-cluster

- [interaction-personality](../components/interaction-personality.md) names sound as a personality lever; this cluster is where it goes deeper.
- [prefers-reduced-motion](../motion/prefers-reduced-motion.md) has no audio twin in CSS — [sound-playback-web](sound-playback-web.md) explains why a motion preference does not imply a mute choice.
- [ai-default-tells](../anti-patterns/ai-default-tells.md) carries the sound rows: stock library sounds, a beep on every click, a whoosh on every transition.
- [review-checklist](../meta/review-checklist.md) rows 12–13 offer relevant sound checks without adding a release gate.
- The whole launch-film decision flow: [MOC-launch-video](../launch-video/MOC-launch-video.md).
