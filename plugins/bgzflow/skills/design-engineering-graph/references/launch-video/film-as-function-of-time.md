> BGZFLOW adaptation: use this technical reference only for the current requested outcome. Existing user decisions, actual project architecture and host permissions govern. Numeric examples and aesthetic opinions below are options, not universal rules, new gates or authority to redesign. External products, model weights and licences need current verification before use; none is installed by reading this page. Use the same brief and private project records; do not modify installed learning files.

---
title: film-as-function-of-time
summary: Deterministic seeking, adjustable sub-frame shutter recipes, measured beat alignment and delivery checks selected for the actual renderer and destination.
tags: [launch-video, render, motion-blur, beat-grid, encode, delivery]
---

# A film as a function of time

For reproducible random-access rendering, evaluate each frame from `t` and stable inputs: avoid unseeded `Math.random`, wall-clock `Date` and unrecoverable prior-frame state. A renderer can then seek to any time, out of order, and average several sub-frame samples into motion blur that is real rather than painted. One stray `Math.random` makes the samples of a frame disagree with each other, and the blur turns to noise. Seeded randomness is fine; the rule is the same one [vibe-to-generator](../meta/vibe-to-generator.md) sets for generators.

## The shutter

For a renderer that samples arbitrary times, evaluate motion deterministically. Source examples use a 180° forward shutter with four samples; a fast whip can use about 600° and up to 24 samples. Choose sampling for the intended look, render cost and actual output rather than applying these as defaults.

Apply seeded grain/bloom at a consistent stage. CSS or page effects can also fit; inspect whether repeated samples and transforms produce the intended result. Unless cross-cut smearing is deliberate, keep the sampling window within the shot so unrelated scenes do not blend. Counters can read output-frame time rather than sample time when sampling would make digits unreadable.

## The grid comes from the track, not from the brief

For a beat-driven film, placing events at `B(k) = k × 60 / bpm` lets a tempo change retime related events. Other narratives need not follow a beat grid. A generated track's tempo is a hope until it is measured:

- Give the beat tracker the intended tempo, or it can lock to half or two thirds of it.
- Fit only the stretch the film uses. Generated music drifts, and only that stretch has to be exact.
- Drop alignment: `music.offset = drop_seconds − planned_drop_beat × 60 / bpm`. Check the result against the listed downbeats.
- If generation is already authorized and useful, a model with a tempo parameter can help; no paid generation is required by this reference. In the Kaiju Postal build, both takes asked for 172 BPM measured 172.0.

Over a 50 s film, a 0.15 % tempo error puts the last hits about 70 ms late. Check actual contact alignment and intended editorial anticipation ([sound-motion-sync](../sound/sound-motion-sync.md)); a small grid error can accumulate noticeably by the end.

## Delivery gates

Check the formats and destination actually requested. Preserve an existing release policy; this reference adds neither a universal hold nor extra deliverables.

| Check | Failure it can expose |
|---|---|
| Frame count and duration | `-shortest` can drop final video frames if audio ends earlier |
| Codec/profile/level | A software decoder may accept an encode the target hardware cannot play; source examples use H.264 level 5.2 at 4K and 4.2 at 1080p, not universal destination limits |
| Size/bitrate | Grain and encoder settings can sharply increase size; compare the actual destination budget and visible quality rather than imposing a 1GB cap |
| Target playback | Verify the relevant real hardware/player when available; software decode alone does not establish compatibility |
| Audio | State measured level and check the intended sync, clipping and destination requirements; consult [launch-video-sound](../sound/launch-video-sound.md) |

A smaller preview can make iteration cheaper. Render the requested master and derived versions when needed, then verify their actual saved files and playback. Do not automatically create 4K, 1080p or vertical versions. For an agreed vertical adaptation see [launch-video-formats](launch-video-formats.md). State unavailable target checks honestly.

## Gotcha

Headless Chrome has capture traps of its own, separate from the render traps in [gotchas](../meta/gotchas.md). The source encountered a 1920×1080 viewport painting only about 990px; reproduce the issue on the actual runtime before applying its taller-viewport/clip workaround. `captureScreenshot` returns CSS pixels unless `clip.scale` equals the device scale factor, so a "4K" render comes back at 1080p. Large 3D layers are captured half-drawn without `--run-all-compositor-stages-before-draw`. The source reports about 11GB per 4K worker and a six-worker stall on a 36GB machine; measure current memory before choosing parallelism.

## Sources

- Scenario, `scenario-kinetic-film` skill (zip received 2026-10-30, no licence file, so it is cited here and none of its code is copied): `SKILL.md` (rules table, common mistakes), `references/render.md` (pipeline, traps, encode settings, gates), `references/sound.md` §1 (beat grid, offset), `references/method.md` §4.
- Related: [launch-video-review](launch-video-review.md), [launch-video-music](../sound/launch-video-music.md), [cinetic-reconciliation](cinetic-reconciliation.md), [hyperframes-reconciliation](hyperframes-reconciliation.md).
