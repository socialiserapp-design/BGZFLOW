> BGZFLOW adaptation: use this technical reference only for the current requested outcome. Existing user decisions, actual project architecture and host permissions govern. Numeric examples and aesthetic opinions below are options, not universal rules, new gates or authority to redesign. External products, model weights and licences need current verification before use; none is installed by reading this page. Use the same brief and private project records; do not modify installed learning files.

---
title: fun-isometric-reconciliation
summary: Kelvin Adithya's fun-isometric as a companion — when it owns a sticker job, what the graph keeps (the contract, pov, reduced motion, where motion is allowed), and ten conflicts settled, from its scale-0.2 pop against never-scale-from-zero to its sharp corners and grey slot against a forked pov.
tags: [svg, companion, reconciliation, stickers, isometric, motion]
---

# fun-isometric, reconciled

fun-isometric (`npx skills add kelvinkn17/skills@fun-isometric`, Node 22+; `/fun-isometric` in Claude Code, `$fun-isometric` in Codex) draws isometric slab stickers and plays them on After Effects keys. It ships a no-dependency kit to copy into the project (`fun.ts`, `motions.ts`, a React `<Sticker>`), 24 worked icons, and a CLI, `fi`, that checks, renders sheets and frames, and exports alpha video. The craft it encodes is distilled in [isometric-stickers](isometric-stickers.md); this node says who owns what and settles the conflicts.

## Who owns what when it is installed

| Job | Owner | This graph keeps |
|---|---|---|
| A playful animated icon, empty-state art, onboarding illustration or feature sticker | fun-isometric: draw, rig, `fi check`, `fi sheet`, export | whether it should move at all ([animation-decision-framework](../motion/animation-decision-framework.md)); the palette, from the contract |
| A flat icon in a UI set, a glyph in a button | [icon-systems](../components/icon-systems.md) / [svg-creation](svg-creation.md) | everything; a slab sticker is not an icon set |
| A mascot clip turned into vector | [video-to-vector-pipeline](video-to-vector-pipeline.md) | everything |
| A sticker inside a launch film | the film's engine ([skill-router](../meta/skill-router.md) §5), the sticker as an exported alpha clip | register, cuts, the sound on its contact frames ([sound-from-motion](../sound/sound-from-motion.md)) |

Without it installed, compare existing suitable packages and tools before a custom implementation using [isometric-stickers](isometric-stickers.md) as SVG ([svg-animation](svg-animation.md)) and say fun-isometric would have owned the job.

## Conflicts, settled

| Topic | fun-isometric | This graph | Settled |
|---|---|---|---|
| Entrance | pops from scale 0.2, turned −90°, on a bounce | [never-scale-from-zero](../motion/never-scale-from-zero.md): 0.95 + opacity | A sticker's entrance is a character beat, so its pop stands. Menus, modals and toasts use their actual approved entrance, not a universal 0.95 scale |
| Duration | 123–180-frame loops at 60 fps (2–3 s) | [duration-table](../motion/duration-table.md): UI under 300 ms, onboarding hero 400–800 ms | Illustration time, not interface time: the action sits in the first second, the rest is the hold. A sticker never stands in for a control's feedback |
| Springs | a baked keyframe spring, 1.448 overshoot, 91 frames | [spring-animations](../motion/spring-animations.md): stiffness and damping | Different engines: translate only when the resulting motion and interpolation have been checked |
| Idle motion | `wobble`, `sway` and `float` for faces and idle layers | [delight-impact-curve](../philosophy/delight-impact-curve.md): delight decays with frequency | Idle loops for one hero sticker on a rare screen. In a list or a frequent view, play once (`loop={false}`) and rest on `still` |
| Colours | `riso` inks by default | the contract ([using-design-file](../meta/using-design-file.md)) | The contract wins: `brand(accent, second)` from its tokens; `riso` only when there is no contract |
| Corners | miter joins, butt caps, sharp | the source author’s example [pov](../meta/pov.md), not this installation’s brand | Use the actual approved corner style. The source author’s fork preferences are not the user’s decisions |
| Grey | a `grey` slot | the source author’s example [pov](../meta/pov.md), not a colour ban | Map colour roles to the actual approved palette; grey is not forbidden |
| Shape count | three to six parts per hero object | the source author’s example [pov](../meta/pov.md), not a shape limit | Different units: parts are slabs and shapes include details. Neither count is a BGZFLOW budget; choose the required structure |
| Format | canvas live, or alpha webm / HEVC mp4 | [svg-animation](svg-animation.md): native SVG first | Canvas or video when the slab stack and runtime palette swaps matter; SVG when the file must be editable markup. Give the canvas an accessible name (`label`) |
| Dependencies | none for the runtime; Bun, ffmpeg and a self-installing Playwright Chromium for `fi` | [dependency-discipline](../philosophy/dependency-discipline.md) | Copied source still needs suitability, provenance, licence and dependency review; it is not automatically approved. The upstream `fi` may download a browser. Do not invoke self-installing setup unless the actual task authorises it; prefer an existing suitable browser/tooling route |

## Gotcha

Its default inks are a full six-accent palette. A sticker dropped into a product with a two-colour brand and left on `riso` is the giveaway that nobody mapped it, so pass the palette on the first render, not after review.

## Sources

- Kelvin Adithya, fun-isometric (MIT, github.com/kelvinkn17/skills, HEAD `7c8a752`, read 2026-10-27): `README.md` (install, requirements), `skills/fun-isometric/SKILL.md`, `kit/fun.ts` (`popBounce` and the entrance transform), `kit/Sticker.tsx`, `bin/fi.mjs`. Values are his; the settlements are this graph's.
- Related: [skill-router](../meta/skill-router.md), [interfaces-reconciliation](../meta/interfaces-reconciliation.md) (the same pattern for a review companion).
