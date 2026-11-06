> BGZFLOW adaptation: use this technical reference only for the current requested outcome. Existing user decisions, actual project architecture and host permissions govern. Numeric examples and aesthetic opinions below are options, not universal rules, new gates or authority to redesign. External products, model weights and licences need current verification before use; none is installed by reading this page. Use the same brief and private project records; do not modify installed learning files.

---
title: cmd-film
summary: "/design-engineering film [plan | review | formats] [target]" — plan a launch film from its register, or measure a render or reference at native frame rate and review it against that register.
tags: [command, launch-video, film]
---

# /design-engineering film

The second word picks the job. Without one, a video file or URL means `review`; anything else means `plan`.

## film plan

**Posture: decide, then build.** Follow [MOC-launch-video](../launch-video/MOC-launch-video.md)'s decision flow in order. Name the register first ([launch-video-registers](../launch-video/launch-video-registers.md)), then [launch-video-structure](../launch-video/launch-video-structure.md), [launch-video-type](../launch-video/launch-video-type.md), [launch-video-ui-demo](../launch-video/launch-video-ui-demo.md), [launch-video-motion](../launch-video/launch-video-motion.md), [launch-video-seams](../launch-video/launch-video-seams.md) / [launch-video-cuts](../launch-video/launch-video-cuts.md), and the sound ([launch-video-sound](../sound/launch-video-sound.md)). [skill-router](../meta/skill-router.md) §5 names the build engine: HyperFrames by default, cinetic for Remotion ([cinetic-reconciliation](../launch-video/cinetic-reconciliation.md)), and scenario-kinetic-film for a beat-cut type teaser ([scenario-kinetic-reconciliation](../launch-video/scenario-kinetic-reconciliation.md)). Any film rendered from code follows [film-as-function-of-time](../launch-video/film-as-function-of-time.md).

## film review

**Posture: judge.** Measure and report; never edit the composition.

1. A local file goes straight in. Use existing authority for the requested source. Ordinary authorised retrieval does not need repeated approval; resolve new spending, sensitive access, rights or material scope changes before the affected action. Keep frames and contact sheets in a scratch directory, and never commit or publish them.
2. Read [launch-video-review](../launch-video/launch-video-review.md), [launch-video-registers](../launch-video/launch-video-registers.md), [gotchas](../meta/gotchas.md) and [pov](../meta/pov.md).
3. Probe the native fps and never resample. Build contact sheets, read the loudness with ffmpeg's `ebur128`, and recount every cut by eye.
4. Return the rubric as [review-format](../meta/review-format.md) rows (the measurement, the register's target, the owner node), with relevant measurements in the existing output/evidence route; no separate per-film JSON or line cap is required.

You may delegate to the `launch-film-analyst` subagent where the host has it.

## film formats

A loop, a logo sting, or a 9:16, 1:1 or 4:5 cut → [launch-video-formats](../launch-video/launch-video-formats.md).
