> BGZFLOW adaptation: use this technical reference only for the current requested outcome. Existing user decisions, actual project architecture and host permissions govern. Numeric examples and aesthetic opinions below are options, not universal rules, new gates or authority to redesign. External products, model weights and licences need current verification before use; none is installed by reading this page. Use the same brief and private project records; do not modify installed learning files.

---
title: hyperframes-reconciliation
summary: Where this graph and HyperFrames give different values for a launch film (seam eases, zoom-through, springs, crossfades, idle motion, blur, cursor, captions, clip timing, sound) and which value to use inside a HyperFrames project.
tags: [launch-video, hyperframes, precedence, companions]
---

# HyperFrames reconciliation

This is a historical comparison of graph recipes and HyperFrames conventions. Use the actual installed renderer and project configuration for technical compatibility, and current user decisions for creative choices. An internal doctrine, stamp or table does not authorise a new style, installation, artifact or gate. Verify any tool-specific constraint against the pinned version before applying it.

## Precedence

Current user request, existing decisions and host permissions govern. Existing project configuration and actual renderer constraints determine compatibility. Reconcile conflicting recipe values by the intended result and measured output; this table supplies options, not an overriding precedence chain.

## Where the doctrine lives

- **Internal.** motion-doctrine, cut-the-curve, seam-craft, oversized-cursor, captions-overlay and changelog-video sit under `.agents/skills/` in heygen-com/hyperframes with `metadata.internal: true`. `npx skills add` skips them, even with `--all`. The historical source describes an `INSTALL_INTERNAL_SKILLS=1` installer option or repository checkout; verify current contents and inspect setup effects before any authorized installation. This reference does not request installation.
- **Distributed.** Installers get the core set, including hyperframes (the front door), hyperframes-core, hyperframes-animation, hyperframes-creative, hyperframes-audio and media-use; the historical front door could install product-launch-video (PLV), motion-graphics and general-video on first use; do not treat that behavior as permission for automatic setup. hyperframes-media no longer exists (media-use absorbed it), though changelog-video still cites its old path.
- **Missing.** motion-doctrine's route map names two overlays, `text-beat-economics` and `brand-faithful`, that are not in the repo; [launch-video-type](launch-video-type.md) covers the first. Check `.agents/skills/` before citing any doctrine rule.

## The table

The graph column is owned by [launch-video-motion](launch-video-motion.md) (eases, overshoot, idle motion, blur, exit ratios), [launch-video-seams](launch-video-seams.md) (zoom-through, ledger) and [launch-video-cuts](launch-video-cuts.md) (the crossfade dip).

The following stamp values are historical example settings, not required values: lateral exit power3.in at 0.34s and entry power4.out at 0.42s; Z exit/entry scales and blur depend on the chosen visual transition. Retain these only where the authorised project actually uses that stamp and version.

| Topic | This graph | HyperFrames distributed | HyperFrames doctrine | Use inside a project |
|---|---|---|---|---|
| Arrival and seam eases | exponential settle, tau sized to each move | `power3.out` house default | seams `power4.in` / `power4.out`, Z seams `power3.in` / `expo.out`; `seam-stamp.mjs` writes `power3.in` on lateral exits, though the SKILL text says `power4.in` | Use the approved motion language and compatible renderer settings; stamp values apply only when that project intentionally uses the stamp. |
| Zoom-through | out 1 → 1.2, in 0.75 → 1 (2.4.0's 1.18 / 0.92 is retired: that entry could not match the exit's speed) | PLV registry: out to 2.5, in from 0.5, 0.4 s | cut-the-curve 1.2 / 0.75; the stamp 1.18 / 0.78 | Choose the intended shot relationship and verify continuity at actual frame boundaries; none of these scale pairs is universal. |
| Overshoot | a register; zeta 1/3 only for the bouncy sting | `springEase` damping 1.0 by default, 0.80-0.85 for an iOS feel, 0.60-0.70 only when playful; motion-graphics' vocabulary still lists `bounce_in` and `back.out(2.2)` | bounce and elastic forbidden; `back.out(1.4-1.7)` allowed on an entry | Use intentional overshoot only when it fits the approved direction and remains comfortable; camera springs are not categorically forbidden. |
| Crossfade | two opaque scenes crossfaded show whatever lies beneath at the midpoint (the dip law); seamless only over an opaque ground both scenes share ([launch-video-cuts](launch-video-cuts.md)) | `transition_in` defaults to `crossfade`, `blur-crossfade` when backgrounds clash | never: a crossfade has no carrier | Crossfade, cut or morph can fit. Inspect actual compositing and grounds to avoid an unwanted luminance dip. |
| Idle motion | nothing decorative on a UI object; camera creep that continues the entry is fine | jitter allowed (scale 0.008-0.015, y 2-3 px, period 1.5-3 s); no pan or push in a scene's back half | idle sine loops banned; fill the time with story | Keep purposeful approved idle motion; remove or tune only demonstrated distraction or performance cost within scope. |
| Blur | derived; peaks of 10 px on text, 18-20 px on surfaces | `techniques.md` and `beat-direction.md` use 30 px with a 1.0 s `power2.out` entry | matched fixed peaks (10 / 18-20 px) on the motion's own eases, opacity on its own linear tween | Choose legible, performant blur for the actual frame and renderer. No required blur peak or ledger field. |
| Cursor size | 7cqw, per [launch-video-ui-demo](launch-video-ui-demo.md) | `physics-press-reaction`: 48-96 px at 1080p | `oversized-cursor`: 7cqw (~134 px at 1920) full-frame | Scale the cursor to legibility, platform and narrative; 7cqw is an example. |
| Captions | routed, not owned | frame-worker core keeps content out of the bottom ~17 % | `captions-overlay`: an overlay, composition centred on the true centre, caption line in the bottom ~5-8 % | Use actual caption and platform safe areas while preserving readable composition; no compulsory fixed band. |
| Ledger | typed rows; a morph names its carrier | none | `ledger.json` rows typed cut, match-cut or morph; `seam-gate.mjs verify` must exit 0 | Use existing timeline metadata and checks if the project needs them. Do not create a ledger or install a seam gate solely for this reference. |
| Exit vs entry | 36-82 % of the entry, by seam type | entry ~0.4 s, exit ~0.25 s (hyperframes-creative) | exit ~75 % of the entry; the stamp 0.34 / 0.42 s lateral, 0.21 / 0.5 s on Z | Choose timings that support continuity and the actual cut; stamp ratios are examples. |
| Hidden initial state | 2.4.0's CSS-hidden start, and its reason, retired | entrances are `fromTo` with explicit from-states, never a CSS-hidden start | a stamped zero-duration `tl.set` renders at build, so a later entry without `immediateRender: false` tweens 0 → 0 (changelog build-spec) | Inspect the actual GSAP/render state. Explicit from-states and `immediateRender: false` can prevent a later tween from applying early; choose CSS/wrapper structure for the real runtime rather than a blanket ban. |
| Clip boundaries and length | 2.4.0: boundaries just below the frame time (1.166, 01-ui-sting's README) and a pad on every short sub-composition timeline (hyperframes-launch HANDOFF) | hyperframes-core: the host clip's `data-duration` is the visible window; a shorter timeline holds its last frame | `data-start` = the cut time, never earlier, with the stamped `tl.set` there | Keep the actual clip boundary and rendered visibility consistent. The 1.166 rounding/padding workaround is source-version-specific; verify the pinned runtime before applying it. No required ledger. |
| Sound | a derived stem; its structure placed on the picture | PLV retrieves a stock bed by mood at volume 0.12 under a voice (0.9 without) and fetches named SFX per beat | the voice-over's real word timings set scene times | Choose whether voice, track or picture drives timing for this film. Use actual word/onset observations when relevant; see [launch-video-music](../sound/launch-video-music.md) and [sound-motion-sync](../sound/sound-motion-sync.md). No compulsory voice-first workflow or paid retrieval. |
| Audio lead | audio never leads the picture ([sound-motion-sync](../sound/sound-motion-sync.md)) | motion-graphics' director anticipates beats by ~0.1 s | none | Synchronous causal cues need believable alignment; anticipation, music and editorial audio leads can be intentional. |

## When to apply

Use when an actual HyperFrames compatibility or recipe conflict affects the requested work; no need to load this for unrelated projects.

## Gotcha

HyperFrames' two layers also disagree with each other: crossfade by default against never, jitter against no idle motion, a caption keep-out band against an overlay. Check which layer is installed before quoting either, and choose deliberately; interpolation can be appropriate if its actual output meets the intended result. The doctrine was read at HEAD on 2026-09-28 and is internal, so it changes without a release; re-read the named file before relying on a row.

## Sources

- heygen-com/hyperframes (HEAD 2026-09-28, Apache-2.0), internal: `.agents/skills/README.md`; `motion-doctrine/SKILL.md`, `references/seam-gate.md`, `scripts/seam-stamp.mjs`, `scripts/seam-gate.mjs`; `cut-the-curve/SKILL.md`; `seam-craft`, `oversized-cursor`, `captions-overlay`; `changelog-video/references/build-spec.md`.
- heygen-com/hyperframes, distributed: `skills/product-launch-video/references/motion-language.md`, `story-design.md`, `cut-catalog.md`, `scripts/lib/transitions.json`, `scripts/lib/bgm-volume.mjs`; `skills/hyperframes-animation/adapters/gsap-easing-and-stagger.md`, `rules/spring-pop-entrance.md`, `rules/sine-wave-loop.md`, `rules/physics-press-reaction.md`, `rules/3d-camera-flight.md` and `rules/multi-phase-camera.md` (no spring on a camera), `techniques.md`, `transitions/TRANSITION-REGISTRY.md`; `skills/hyperframes-creative/references/motion-principles.md`, `beat-direction.md`; `skills/hyperframes-core/references/sub-compositions.md`; `skills/hyperframes/references/frame-worker-core.md`, `skill-lifecycle.md` (core set eager, workflows on first use); `skills/motion-graphics/references/motion-vocabulary.md`, `agents/director.md`.
- HeyGen, hyperframes-launches (Apache-2.0): `heygen-apple-motion/01-ui-sting/README.md` (the 1.166 boundary rule), `hyperframes-launch/HANDOFF.md` (runtime once stripped sub-composition `data-duration`), `figma-launch/HANDOFF.md` (a `fromTo` applies its from-state at build unless `immediateRender: false`), and `*/package.json` (CLI pins 0.6.75 to 0.8.26).
- The full digest and conflict list: `docs/research/launch-films/digests/hyperframes-doctrine.json`.
