> BGZFLOW adaptation: use this technical reference only for the current requested outcome. Existing user decisions, actual project architecture and host permissions govern. Numeric examples and aesthetic opinions below are options, not universal rules, new gates or authority to redesign. External products, model weights and licences need current verification before use; none is installed by reading this page. Use the same brief and private project records; do not modify installed learning files.

---
title: sound-palette
summary: A coherent material vocabulary for the actual requested cues. Size maps to pitch and length, direction maps to meaning, consonance to success and dissonance to error. Existing packs can fit when their sound and terms suit the task.
tags: [sound, palette, earcon, audio, design-system]
---

# Sound palette

A product's sounds are a type family, not a clip-art folder. A coherent family may use **one material** — a struck wooden bar, a soft plastic tap, a breath of filtered noise, a muted glockenspiel — and derive every sound from it, the way a palette derives every tint from one hue in [color-monochromatic](../surface/color-monochromatic.md). Five sounds that share a material feel like a product. Mixed sources can also be coherent when their roles, balance and direction are deliberate.

## The grammar

Earcons (Blattner, Sumikawa & Greenberg, 1989) are learned, not mimetic: meaning comes from *contour* and *interval*, and users learn it in a handful of exposures.

| Dimension | Rule | Why |
|---|---|---|
| **Size → pitch and length** | Small elements tick high and short (2–6 kHz centroid, 40–120 ms). Big elements land low and long (0.8–1.5 kHz, 300–800 ms). | Physics. A card is lighter than a wordmark; the ear knows. |
| **Direction → meaning** | Rising figure = success, open, join. Falling = dismiss, leave, error. | Discord's join/leave pair; a learned convention to check with the actual audience. |
| **Interval → valence** | Major third or perfect fifth for confirmation. Minor second or tritone for error. | Consonance reads as safe; dissonance as tense (IWC study on earcon dissonance and perceived hazard). |
| **Complexity → priority** | Simple, single-hit for frequent actions. Multi-note only for rare or urgent moments. | Frequent complex sounds fatigue in a day (Toptal). |
| **Repeat → variation** | A run that *counts* (pops, stacking blocks, dings) steps pitch up (`playbackRate` +5–10% per hit, about +1 st). A run that *repeats* (keys, steps) may cycle several recorded takes where variation helps, ±1–2 dB, at most ±3 % (½ st) of pitch. The click is the exception: one voice, one level, every time. | Identical repeats read as a machine; Josh Comeau's "glug" pattern. Random pitch on typing is its own tell: real keys vary in take, not pitch ([designed-sfx-anatomy](designed-sfx-anatomy.md)). |

## A minimal family

A small family may be enough; choose the actual sounds needed rather than a four-to-six count:

| Name | Role | Shape |
|---|---|---|
| `tick` | Toggle, select, snap | Single transient, ≤ 80 ms, high |
| `tap` | Primary press in tactile products only | Dull transient with a short body, ≤ 120 ms |
| `send` | Send / save / complete | One or two notes rising, ≤ 250 ms |
| `receive` | Incoming message / notification | Two notes, lower than `send`, ≤ 400 ms |
| `error` | Rejected submit, invalid drop | Low, falling, ≤ 200 ms — paired with [multi-segment-shake](../motion/multi-segment-shake.md) |
| `success` | Rare milestone | Three-note figure in the family's key, ≤ 800 ms |

When using the bundled renderer, express the selected family in its actual JSON input — `<design-sound>/scripts/sound-family.mjs` and produces the files via [sound-generation-elevenlabs](sound-generation-elevenlabs.md) or the built-in synth from [sound-generation-open-source](sound-generation-open-source.md).

## Material, not genre

Apple's sound team records real instruments — glockenspiel, kalimba, marimba — and even struck a hollow Apple Watch case with mallets to find its resonance. "Organic over futuristic" is the stated reason: familiar materials make new technology comfortable. The AI-default failure is the opposite — a glossy sci-fi "digital UI blip" that belongs to no product. Describe a *thing* (soft felt mallet on a wooden bar; a fingernail on glass; a breath through a paper cone), or the actual approved style where it communicates the intended sound; neither vocabulary is universally prohibited.

## When to apply

Before generating or downloading a single file. Decide the material, list the family, then produce. Reviewing a product with sounds: ask whether they share a material; a mixed material palette is not itself a defect when it has a coherent approved purpose.

## Gotcha

Do not tune the family in isolation with headphones at midnight. Small-speaker bass response varies, so a warm low thud disappears and a bright tick becomes a needle. Choose the intended channel layout, check relevant speakers and downmix behaviour, then set levels per [sound-spec](sound-spec.md).

## Sources

- Blattner, Sumikawa & Greenberg (1989), *Earcons and icons* — structured families of tones whose contour carries meaning.
- *Perceived Hazard of Earcons in IT Exception Messages* (Interacting with Computers, 2013) — consonance/dissonance and pitch drive perceived urgency.
- Twenty Thousand Hertz, *The Sound of Apple* (Hugo Verweij) — real instruments, organic over sci-fi, the Watch case experiment.
- Toptal, *A Quick Guide to Designing UX Sounds* — simple for frequent, complex for high-priority; mid-range frequencies.
- Josh Comeau, *use-sound* — rising `playbackRate` on repeats.
- Leon Lin, earshot (MIT): `skills/real-sound/references/sound-design.md` §6 — take pools cycled, ±1–2 dB, ±0.3–0.5 st at most, the one-voice click.
- Related: [color-monochromatic](../surface/color-monochromatic.md), [typography-humanity](../typography/typography-humanity.md), [ai-default-tells](../anti-patterns/ai-default-tells.md).
