> BGZFLOW adaptation: use this technical reference only for the current requested outcome. Existing user decisions, actual project architecture and host permissions govern. Numeric examples and aesthetic opinions below are options, not universal rules, new gates or authority to redesign. External products, model weights and licences need current verification before use; none is installed by reading this page. Use the same brief and private project records; do not modify installed learning files.

---
title: cmd-sound
summary: "/design-engineering sound [target]" — decide which moments earn a sound, design one material family, generate the files (offline synth by default; optional authorized external sources), wire them in, and return a sound map.
tags: [command, sound, decide, build]
---

# /design-engineering sound

**Posture: decide, then build.** If the user only asked *whether* something should make a sound, answer from [sound-decision-framework](../sound/sound-decision-framework.md) in one line and stop.

## Product UI

1. Read [sound-decision-framework](../sound/sound-decision-framework.md), [sound-palette](../sound/sound-palette.md), [sound-spec](../sound/sound-spec.md), [sound-playback-web](../sound/sound-playback-web.md), [gotchas](../meta/gotchas.md) and [pov](../meta/pov.md). A POV that raises the sound floor wins.
2. Classify every proposed moment and reject most of them: the hundredth use has to pass, not only the first.
3. Write the surviving family as a manifest shaped like `scripts/sound-family.example.json`. Run `node <design-sound>/scripts/sound-family.mjs <manifest> --out <dir>`, with `--dry-run` first if credits matter. It uses the offline synthesizer by default; remote generation requires explicit selection and existing authority ([sound-generation-elevenlabs](../sound/sound-generation-elevenlabs.md), [sound-generation-open-source](../sound/sound-generation-open-source.md)).
4. Wire it up: the mute toggle defaults to off, audio unlocks on the first gesture, and each transient lands on the contact frame ([sound-motion-sync](../sound/sound-motion-sync.md)).

## A video

Pick the register first ([launch-video-sound](../sound/launch-video-sound.md)).

- A derived register (a dry reveal, a bed with clicks, or product-camera foley): write a cue sheet from the locked timeline ([sound-from-motion](../sound/sound-from-motion.md)), then run `node <design-sound>/scripts/sound-sheet.mjs cues.json --out stem.wav --report`.
- A beat track or a voice-over: place it per [launch-video-music](../sound/launch-video-music.md).
- Designed effects follow [designed-sfx-anatomy](../sound/designed-sfx-anatomy.md), and every recording passes [sound-licensing](../sound/sound-licensing.md).

## Output

A sound map table (Moment | Sound | Material / contour | Length | Trigger | Why), then the file list and the playback wiring.

You may delegate to the `sound-designer` subagent where the host has it.
