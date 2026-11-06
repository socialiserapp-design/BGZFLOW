> BGZFLOW adaptation: use this technical reference only for the current requested outcome. Existing user decisions, actual project architecture and host permissions govern. Numeric examples and aesthetic opinions below are options, not universal rules, new gates or authority to redesign. External products, model weights and licences need current verification before use; none is installed by reading this page. Use the same brief and private project records; do not modify installed learning files.

---
title: sound-spec
summary: The numbers for a shipped UI sound — duration by category, loudness in LUFS, peak headroom, channel/sample-rate compatibility, measured onset offsets, file format per target.
tags: [sound, spec, loudness, audio, format]
---

# Sound spec

A UI sound should fit its role, delivery requirements and approved experience. The figures below are upstream starting points, not universal acceptance limits; investigate timing, balance, meaning and user feedback before choosing a correction.

## Duration

| Category | Duration | Rule |
|---|---|---|
| Tick / toggle / snap | 40–80 ms | Finishes before the eye has registered the state change |
| Tap / press | 80–150 ms | Only in tactile products — see [sound-decision-framework](sound-decision-framework.md) |
| Hover | Context dependent | Follow the approved interaction; 120–200 ms is an example where hover sound is useful and permitted |
| Send / save / confirm | 150–250 ms | One or two notes |
| Notification / receive | 200–600 ms | Longer because attention is being *requested* |
| Error | 100–200 ms | Short and low; use another accessible confirmation where appropriate |
| Transition (video / marketing) | 300–1000 ms | Use only where the actual approved product or film calls for this kind of transition |
| Brand stinger | 1–3 s | Launch video, onboarding hero, once |

The Toptal rule ties duration to motion: **a sound should not last more than ~300 ms longer than the animation it accompanies.** A 120 ms press with an 800 ms tail is a bell, not feedback. Match the [duration-table](../motion/duration-table.md).

## Loudness

| Sound | Integrated loudness | Notes |
|---|---|---|
| Taps, ticks, toggles | −18 to −14 LUFS | Below speech, above silence |
| Notifications | ≈ −12 LUFS | The one class allowed to be louder |
| Launch-video master | −1 dBTP true peak; integrated loudness stated for the register (medians ≈ −18 LUFS; beat-cut sizzles median ≈ −13, 3 of 4 at −12 to −13; the three quietest films, Linear Agent, Cursor 2.0 and Claude Cowork, sit at −33 to −36) | Loudness-normalizing players (YouTube-style) turn loud masters down and do not raise quiet ones — [launch-video-sound](launch-video-sound.md) |

Choose peak headroom for the actual delivery path and mix; −3 dBFS source and −1 dBTP video targets are examples, not universal requirements. Set the *design* level in the file and the *user* level in the mixer — preserve appropriate source headroom while setting the intended mix level. Interface sounds stay subordinate to speech and media; convey urgency with timbre and rhythm, not volume.

Integrated LUFS is unstable on files under ~400 ms — for ticks and taps, match by ear against a reference tick at −16 LUFS and check the peak, rather than trusting the meter.

## Format

- **Check channel compatibility.** Mono can simplify small UI cues, while stereo or spatial audio can be appropriate. Devices do not universally sum to mono; test relevant downmix and phase behaviour.
- **Match the project’s source and delivery format.** 44.1 kHz, 16-bit WAV is one working source format; 48 kHz or another supported format may fit video or an existing pipeline. Ship **MP3 (128 kbps)** for universal playback or **Opus/OGG** for smaller web bundles; keep WAV for native and for video timelines.
- **Measure onset.** Remove accidental delay or compensate with the cue offset, while preserving intentional pre-roll and slow attacks. A −60 dBFS threshold is one analysis setting; five milliseconds is not universally visible — see [sound-motion-sync](sound-motion-sync.md).
- **Choose the tail.** Avoid discontinuities with suitable fades; preserve a longer decay when it serves the approved sound and does not mask other content.
- **Sprite when there are many.** One decoded buffer, offsets per sound; `use-sound` and Howler support `sprite` maps.

## Frequency shaping

- Consider high-pass filtering where useful; 150–200 Hz is an example, not a requirement. Small speakers may reproduce little low-frequency energy, but device response varies; high-pass only when it helps the intended sound and mix.
- Tame 3–6 kHz by a few dB if the sound is "needly" — that is where small speakers resonate.
- Keep the body in the mid-range (500 Hz–4 kHz), which many small devices reproduce better than deep bass and where the voice lives.

## When to apply

Post-processing every generated or downloaded file, and reviewing any PR that adds an audio asset. `scripts/sound-family.mjs` applies the trim and peak steps automatically; the LUFS check is yours.

## Gotcha

Loudness normalization tools (`loudnorm`, streaming platforms) measure *integrated* loudness across the whole file. A sound that is 60 ms of hit and 600 ms of quiet tail may be boosted enough to cause clipping unless true-peak limiting or other safeguards prevent it. Trim the tail first, normalize second.

## Sources

- Envato, *UI sound design with AI* — LUFS targets by class, duration bands, mono, the 0–5 ms trim.
- Toptal, *A Quick Guide to Designing UX Sounds* — the 300 ms-over-animation rule; mid-range guidance.
- uisfx.com, *UI Sound Design* — subordinate to speech, urgency by timbre not volume, one-shots vs loops.
- EBU R 128 (−23 LUFS, −1 dBTP max) and streaming practice (≈ −14 LUFS): platform reference levels, not what launch films ship at (medians −18.1 LUFS for 28 Skale client films and −18.4 for 18 acclaimed films, measured by HKTITAN 2026-09-28, `docs/research/launch-films/`).
- Related: [duration-table](../motion/duration-table.md), [sound-palette](sound-palette.md).
