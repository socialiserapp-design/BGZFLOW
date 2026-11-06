---
name: design-sound
description: Design and generate requested interface sound families or motion-synchronised audio stems with local WAV synthesis, cue-sheet timing and Web Audio playback guidance. Use for UI sound, ticks/taps/chimes, Foley, sound palettes or audio matched to animation; preserve approved sound policy and real state.
---

# Sound craft and local generation

Share the current brief, approved motion/sound identity and private project records. A request for advice means advise; it does not authorize adding audio, settings, dependencies or a new sound policy. Existing media-use and HyperFrames methods own broader asset acquisition and video composition; design-motion owns visual choreography. This method adds actual local synthesis and audio/motion timing.

Read the relevant [sound map](../design-engineering-graph/references/sound/MOC-sound.md), then the specific [decision method](../design-engineering-graph/references/sound/sound-decision-framework.md), [palette](../design-engineering-graph/references/sound/sound-palette.md), [specification](../design-engineering-graph/references/sound/sound-spec.md) or [motion synchronisation](../design-engineering-graph/references/sound/sound-motion-sync.md). Treat fixed values and upstream taste as starting points, not requirements to mute or change an approved experience. Sound must not carry essential state alone or announce a successful effect before it is observed.

## Local tools

Node is sufficient; no account, API, packages, browser, GPU or ffmpeg is needed for these local paths. Run only in an owned output destination and choose new paths; helpers refuse existing outputs and linked output ancestry, preserving prior results.

- `node <skill-directory>/scripts/sound-family.mjs <manifest.json> --out <fresh-directory> --provider synth` generates mono 44.1 kHz PCM WAVs from tick, tap, chime, thud, pop or whoosh recipes. The real [upstream example](scripts/sound-family.example.json) shows input shape; its number of sounds and values are examples. Default and compatibility `auto` mean local synth even if a remote key exists. `--dry-run` previews without creating output. A manifest describes generated assets, not a verification receipt. Noise-based recipes are not byte-deterministic.
- `node <skill-directory>/scripts/sound-sheet.mjs <cues.json> --out <fresh.wav> --report --json` generates a stereo stem from geometry/timing cues, with deterministic seeded voices. Read [sound from motion](../design-engineering-graph/references/sound/sound-from-motion.md) for cue construction. Optional `--family <fresh-directory>` creates companion one-shots from its voices. This is authored sonification, not automatic recognition of visual events.

The scripts retain finite renderer/input safety limits; these are tool-format/resource constraints, not project-design quotas. Generated audio is an artifact; peak normalisation alone does not prove loudness, hearing comfort or synchronisation. Inspect file format, non-silent finite samples, measured duration/peak and cue timing, then audition using an authorized playback surface. Do not claim it sounds right if nobody listened.

For implementation read [web playback](../design-engineering-graph/references/sound/sound-playback-web.md): lazy AudioContext activation within real user gesture, decoded buffers, current user mute/volume choices, teardown and explicit semantic state. Browser policy, latency and mobile silence differ. The example's localStorage and mute default are not a compulsory customer control or permission to override existing policy. Verify the actual device/browser, rapid repeated actions and the underlying saved operation.

## Optional external sources

The preserved sound-family CLI has an explicitly selected ElevenLabs path; it is not used by default or by reading this skill. It requires the user's configured credential, existing spending/transfer authority and applicable provider terms. ffmpeg is optional for that path's postprocessing. Do not invoke remote generation merely because a key exists, install missing dependencies, expose a key, or rerun remote generation to repair a local output. An uncertain remote outcome requires reconciliation before another request. The CLI does not provide cross-run paid-operation recovery; prefer a host/provider integration that does when consequential retries are possible.

Other [open-source options](../design-engineering-graph/references/sound/sound-generation-open-source.md) and [licensing guidance](../design-engineering-graph/references/sound/sound-licensing.md) are references, not included models/assets or current legal guarantees. Model-weight and recording licences differ from code licences; verify commercial rights before importing assets. No remote generation or installation has been verified by this import. [Pinned source and changes](SOURCE.md).
