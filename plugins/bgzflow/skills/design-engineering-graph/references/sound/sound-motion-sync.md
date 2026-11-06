> BGZFLOW adaptation: use this technical reference only for the current requested outcome. Existing user decisions, actual project architecture and host permissions govern. Numeric examples and aesthetic opinions below are options, not universal rules, new gates or authority to redesign. External products, model weights and licences need current verification before use; none is installed by reading this page. Use the same brief and private project records; do not modify installed learning files.

---
title: sound-motion-sync
summary: "Sound and motion are one event: transients on contact frames, cuts on onsets; choose timing for the intended event and verify it on the actual playback path."
tags: [sound, motion, sync, audio, timing, launch-video]
---

# Sound–motion sync

For a sound representing physical contact, start by aligning its attack or perceptual peak to that contact. Anticipatory audio, musical edits and travel sounds may intentionally precede a visual event. Choose the relationship from the approved experience, then measure the rendered result and check perceived sync; a fixed frame offset cannot establish harmony.

## An upstream measured example

The source author reports a 10.7 s logo reveal by sound designer bruno (@tvnxty, superfx.co) was analyzed frame-by-frame against its audio. Thirty-two audio onsets; every one of them within two frames (≤ 67 ms at 30 fps) of a visual motion peak, most within one. Where a fan of small cards shuffled, there was a cluster of ticks, one per card movement. Where the wordmark cut in, one hit, exactly on the cut frame. Where nothing moved, the track sat at −56 dBFS — real silence, not a bed. That is what "synced precisely" means in practice: **sound density mirrors motion density**, and each transient is placed on a specific frame.

## Tolerances

ITU-R BT.1359 reports broadcasting-study thresholds below. These are context-specific evidence, not universal UI acceptance limits:

| | Audio leads video | Audio lags video |
|---|---|---|
| Detectable | +45 ms | −125 ms |
| Acceptable | +90 ms | −185 ms |

These results suggest that unwanted audio lead can be more noticeable than lag in the studied broadcasting context. UI event, sound envelope, device latency and creative intent still matter:

- **Avoid unintended lead for contact cues.** Measure end-to-end latency; schedule the intended perceptual onset against the actual contact. Do not apply this rule to an intentional whoosh, riser or musical anticipation.
- **Use near-contact timing as a starting point.** A 0–30 ms lag may suit a sharp cue, but verify on the target device and frame rate. Competing source offsets are alternatives to test, not a precedence rule.
- **Each kind of sound has its own sync point.** Clicks, keys, pops and impacts align their *attack* on the contact frame. A whoosh aligns its *peak* on the fastest frame of the move (the cut, for an exit that accelerates into one), with its onset 0.1–0.45 s ahead. A riser or zip can align its *end* on the hit, or up to 250 ms before it to leave a beat of air. A bed aligns its *start*. A decelerating entrance may use two sounds when useful: the travel early, and a landing on the settle. Per-category numbers are in [designed-sfx-anatomy](designed-sfx-anatomy.md).
- **Check slow attacks.** A sample aligned by its attack whose peak comes ~80 ms later lands late, so measure both points (earshot reports each event's attack and peak).

HyperFrames and other source workflows use anticipatory beats. Retain that option when it serves the approved film; neither this graph nor a companion skill overrides the chosen sound direction.

## In UI code

Trigger from the same event that starts the state change, and use the animation's own timing to place the transient on the settle when the sound is meant to confirm rather than accompany:

```ts
// Sound confirms the landing, so it fires at the end of the enter transition.
function onLanding(e: TransitionEvent) {
  if (e.target !== el || e.propertyName !== "transform") return;
  el.removeEventListener("transitionend", onLanding);
  play("land");
}
el.addEventListener("transitionend", onLanding);
// Also remove this listener on cancellation/unmount; do not play for a cancelled landing.

// A tick that accompanies a toggle fires with the state change itself.
toggle.addEventListener("change", () => play("tick"));
```

Measure leading silence and the perceptual onset. Trim accidental delay or schedule the known offset; preserve intentional pre-roll and slow attacks. Preload and decode relevant sounds before the interaction when feasible — see [sound-spec](sound-spec.md) and [sound-playback-web](sound-playback-web.md).

## In a video timeline

Place the file so its **transient**, not its first sample, lands on the contact frame, and measure where that transient is instead of trusting the waveform: the onset is the first sample above 5 % of peak (a placement measurement; [sound-spec](sound-spec.md)'s −60 dBFS trim removes digital silence but not a noisy lead-in, so trim to just before this onset). ffmpeg's `silencedetect`, with its 2 s default minimum, reports no leading silence on these files at all. HeyGen audited the SFX files reused across its launch projects this way and found a click that starts 158 ms late (~4 frames at 24 fps, ~5 at figma-launch's 30, where it fires on all seven cursor clicks) and typing files ~394 ms late (~9 frames at 24 fps).

For this upstream example, account for the measured lead-in and choose whether the intended click accompanies press start, contact or release. Place it using the actual renderer’s supported source offset and timeline controls; verify the encoded output, not only its cue sheet.

A hard cut can coincide with a musical onset, anticipate it, or deliberately fall between beats. The source author judged some Bud cuts late; that is a case-specific reading, not proof that every offset is defective. [launch-video-music](launch-video-music.md) compares these choices.

## When to apply

Every time a sound and an animation describe the same event. If they don't describe the same event, one of them should probably go — see [sound-decision-framework](sound-decision-framework.md).

## Gotcha

Underdamped springs can cross their rest position repeatedly; critically damped springs may not overshoot. Choose the meaningful contact or confirmation event for the actual spring. Do not assume a first crossing exists or that its mathematical end is the intended sound cue.

## Sources

- Apple, *Designing Audio-Haptic Experiences* (WWDC19) — the harmony principle, and the warning that added latency between a visual and its feedback breaks the effect.
- ITU-R BT.1359-1, *Relative timing of sound and vision for broadcasting* — detectability +45/−125 ms, acceptability +90/−185 ms.
- bruno (@tvnxty), logo reveal for Base, 2026-09-03 — onset-vs-motion analysis by HKTITAN; see [launch-video-sound](launch-video-sound.md) for the sound map.
- Leon Lin, earshot (MIT, HEAD 925ebe5): `docs/motion-sfx-study.md` (whoosh peaks within ±150 ms of the cut; risers, zips and glitches end on the cut, 0–20 ms; 58 events from 8 unnamed films, 39 of them from one sound-design film) and `skills/real-sound/references/sound-design.md` §5 (align attack, peak, end or start by kind; the slow-attack check). cinetic (MIT, HEAD ecfa660), `SKILL.md` §5: whoosh onset 100–450 ms ahead of its apex.
- HeyGen, *hyperframes-launches* (Apache-2.0) — the onset audit, root-absolute placement and render check in `claude-design-send-hyperframes-launch/HANDOFF.md` §18; the click cued at the press tween's start in its `compositions/s1-square.html` L373 and `index.html` L36; the 158 ms click on seven cues in `figma-launch/index.html` L76-82. heygen-com/hyperframes, `skills/motion-graphics/agents/director.md` — beats anticipated by ~0.1 s; `skills/hyperframes-core/references/data-attributes.md` — `data-media-start` as the offset into the source.
- Skale's Bud (listed as Buds; skale.solutions/portfolio) — cut-vs-onset timing measured by HKTITAN 2026-09-28; data in `docs/research/launch-films/` (metrics/09-buds.json, notes/synthesis-skale.md).
- Related: [spring-animations](../motion/spring-animations.md), [responsive-feedback](../motion/responsive-feedback.md), [launch-video-music](launch-video-music.md).
