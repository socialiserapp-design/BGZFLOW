> BGZFLOW adaptation: use this technical reference only for the current requested outcome. Existing user decisions, actual project architecture and host permissions govern. Numeric examples and aesthetic opinions below are options, not universal rules, new gates or authority to redesign. External products, model weights and licences need current verification before use; none is installed by reading this page. Use the same brief and private project records; do not modify installed learning files.

---
title: launch-video-review
summary: Review a film at native fps against its register — recount cuts by eye, check seams and onsets on frames, then taste. Measurement traps, the 11-row film rubric, and HeyGen's numeric render checks.
tags: [launch-video, review, measurement, verification]
---

# Launch-video review

Check the actual requested film for communication, accuracy, legibility, accessibility and playback, using measurements to investigate relevant defects. Corpus medians and house rules do not define correctness. Keep findings and original failed evidence in the existing task record; [review-format](../meta/review-format.md) offers a reporting example, not required rows or receipts. Quote an actual frame/time and explain the user impact before prescribing a fix.

## Measure honestly

- **Native frame rate only.** Resampling a 24 or 25 fps film to 30 inserts duplicate frames that fake 2-4-frame moves. The 2.4.0 figure of a 4-frame median move (p75 11 frames) for Skale's 2025 reel was partly this. At the reel's native 60 fps the median is 0.19 s (p75 0.60 s, p90 1.39 s). State seconds and frame rate so measurements are comparable; frame counts remain useful for precise boundaries.
- **Exact duplicates are held frames, not stillness.** Some films run a layer on twos on purpose: held share inside moves is 0.47 in Claude Opus 4.6 and 0.16 in Notion Mail. Pulldown adds ~3 points to the reel's 0.329 still share, and Bud runs at ~18 unique frames a second.
- **Recount cuts by eye** from contact sheets stepped every 2 frames around each seam. The histogram detector agreed with a frame reading in only 9 of 29 Skale films and 5 of 18 acclaimed films. It misses dark planes, white-on-white, cream-to-white and scale cuts, and it fires on fills, poster frames, dissolves and rotating planes.
- **Compare still share only within a register.** A frame counts as still when under 0.05 % of its area changes by more than 12 grey levels in 1/30 s, so a cursor, a caret or a breathing speaker counts as motion. The OpenAI stillness figures (*Refreshed.* 0.70, GPT-5 0.64) came from a different metric: mean absolute grey difference under 0.3 on 160×90 frames. Set them beside calm share (acclaimed 0.65, Skale 0.51), not beside still share.
- **Move runs are not tweens.** A run chains overlapping changes. Hand-time the hero moves instead (0.2-0.55 s in Skale's films) and take the time constant from the per-frame decay ratio r: tau = −1 / (fps · ln r). Replit Parallel Agents' drift decays by ×0.78 per frame at 29.97 fps, which gives tau = 0.134 s.
- **Proxies lie.** A blur ratio above 1 only means the still frames are flat. The speech proxy fires on music with no voice: Bud, Wonder (first film) and Contra Indy, and on beat gating in Granola 2.0 and Spline Hana. Band share above 2 kHz cannot see foley at 1.45-2.5 kHz, which is where Linear Agent and Raycast put their clicks. Cut-to-beat sync says little with 4 or fewer detected cuts, or under a voice.
- **Test a lock against chance.** Shift the onsets at random and see where the real count falls. The published K3 promo's bed puts 32.8 % of its 61 strong spectral-flux onsets within 67 ms of the composition's 62 stamped events. Randomly shifted onsets average 28.9 % (p95 34.5 %), so the bed is not locked to the picture. Views are no test either ([launch-video-registers](launch-video-registers.md)).

## The rubric

Use these questions proportionately, without a fixed numeric score or compulsory pass against a reference style:

| Area | What to establish |
|---|---|
| Message and identity | The actual audience can understand the intended claim; the name, proof and ending suit the approved brief. Unsupported performance, endorsement or product claims remain findings. |
| Type | Copy is readable at shown size and speed; block entry, word builds, holds and captions are chosen intentionally. |
| Demonstration | Capture/reconstruction is accurate; inputs and results are visible; time compression is not presented as unedited real performance. |
| Motion | Transitions, decorative motion and camera behavior serve the story without unwanted flashes, discomfort or lost information. No fixed stillness/transition budget. |
| Audio | Sync and level match intended contact, editorial timing and destination requirements. An intentional music lead or post-produced mix is not automatically a fault. |
| Delivery | The actual saved file has the intended duration, content, sound and requested format, and plays on relevant available targets. State unavailable checks. |

Source numeric examples remain in [launch-video-registers](launch-video-registers.md), [launch-video-type](launch-video-type.md), [launch-video-ui-demo](launch-video-ui-demo.md), [launch-video-seams](launch-video-seams.md) and the linked sound nodes. Use them to compare or diagnose, not as new release gates.

## Verify your own render

HeyGen checks renders with numbers rather than eyes: on its Send-to-HyperFrames film, most review rounds surfaced a defect nobody had seen by looking.

- **Seams.** Sample the carrier's position on every frame on both sides of the cut and compare exit and entry velocity; their seams matched at 99.6 % or better. A "double reveal" complaint is a direction reversal, or an element that is visible before its tween starts. Count reversals.
- **Frames.** Decode every rendered frame, not a sample (all 1,183 of a 49 s render), and look for flat, frozen or black frames. Exit code 0 proves nothing.
- **Holds.** Locate repeated/frozen runs, then distinguish a deliberate reading hold from missing or stalled content. The source found 2.58s and 1.42s holds; neither duration establishes a defect by itself. Inspect actual pacing and the requested message rather than a maximum stillness budget.
- **Match cuts.** Measure on a band centred on the carried element (theirs: rows 430-560, cols 120-960 of a 1080×1080 frame), not on the full frame, where edge tiles fake a match.
- **Tools.** Read the transform GSAP writes, not rects read through the preview's scale, which invent sub-pixel reversals. Pass snapshot times in ascending order, because a backward seek re-renders a tween's start state and looks like a glitch.
- **Sound on the render.** Check a continuous bed's actual energy window rather than treating an onset detector alone as proof: a detector called theirs 1.8 frames early. Click placement is in [sound-motion-sync](../sound/sound-motion-sync.md).
- **Against a reference.** Diff scene boundaries only once both files are frame-comparable. HeyGen's Stripe study confirmed both files ran 38.7 s at 30 fps (1,161 frames) before timing each scene against the After Effects master.

## Build gates belong to HyperFrames

Use the existing project's compatible lint, render and playback checks. The historical HyperFrames workflow samples storyboard midpoints and cut boundaries; internal seam tooling can inspect continuity when intentionally used. These are implementation options, not new prerequisites or reasons to install a foreign tool. A successful command alone does not prove the intended result. [hyperframes-reconciliation](hyperframes-reconciliation.md) compares versions.

The upstream [launch-film-analyst](https://github.com/AgentsORG/design-engineering/blob/dbbe43b5e17c7525409ad4905b3857852cd5174d/agents/launch-film-analyst.md) is a source procedure, not an instruction to spawn a worker or grant it tools. Use an independent reviewer only under the actual task/risk policy.

## When to apply

Use it before shipping any launch film, sting or README film, and before copying a reference film's numbers into a brief.

## Gotcha

There are two classic misses. The first is calling a product-camera film too still against Skale's UI-film median: 0.49 against 0.09 is a difference of register ([launch-video-registers](launch-video-registers.md)), not a flaw. The second is signing off a render that sounds right while its source is silent. Three of HeyGen's launches were committed without the sound their published renders carried (sfx-music-launch and inspector-launch silent, hyperframes-launch with voice-over only), and their mixes were recovered from renders that ran 64 ms late, one frame late or 100 ms early; k3-promo's composition still never plays its committed audio ([sound-from-motion](../sound/sound-from-motion.md)).

## Sources

- HKTITAN, 2026-09-28, in `docs/research/launch-films/`: measure.py (the native-fps measurer and its still, calm and held definitions), metrics/*.json, notes/synthesis-skale.md §2, §5-6, notes/synthesis-acclaimed.md §4-6, and heygen_k3_sync.py (the lock-vs-chance test). The OpenAI stillness metric of 2026-09-05 is in `docs/research/launch-register/02-tempo-bed-cuts.py` and its two summaries.
- HeyGen, hyperframes-launches (Apache-2.0): `claude-design-send-hyperframes-launch/HANDOFF.md` §4, §10, §14.1, §17, §18; `HF-heygen-stripe/STUDY-V12-vs-TAKE6.md`; commits 2a439ec and dd128ad (sound recovered from published renders). Digest in `docs/research/launch-films/digests/`.
- Films: Skale (skale.solutions/portfolio) and the 18 acclaimed films as listed in [launch-video-registers](launch-video-registers.md), measured by HKTITAN 2026-09-28.
- heygen-com/hyperframes (Apache-2.0): `skills/product-launch-video/SKILL.md` Step 6; `skills/hyperframes-cli/SKILL.md` and `references/preview-render.md` (`--strict`); `.agents/skills/motion-doctrine/SKILL.md` (the comma, the seam budget) and `scripts/seam-gate.mjs`, `.agents/skills/oversized-cursor/SKILL.md` (internal).
