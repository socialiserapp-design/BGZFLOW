> BGZFLOW adaptation: use this technical reference only for the current requested outcome. Existing user decisions, actual project architecture and host permissions govern. Numeric examples and aesthetic opinions below are options, not universal rules, new gates or authority to redesign. External products, model weights and licences need current verification before use; none is installed by reading this page. Use the same brief and private project records; do not modify installed learning files.

---
title: sound-playback-web
summary: Unlock the AudioContext on the first gesture, decode once, one source node per play, the existing approved audio preference and control, and never information carried by sound alone.
tags: [sound, web-audio, playback, accessibility, audio]
---

# Sound playback on the web

Browser autoplay behaviour depends on the API, user activation, settings and environment; handle suspended or rejected playback rather than assuming permission. Build playback around that fact instead of fighting it: create the context lazily, resume it inside the first real gesture, preload and decode every sound before it is needed, and play each one from a fresh source node to reduce avoidable decoding/start-up cost; actual latency still needs measurement. Compare the existing playback implementation, suitable packages and this example before adding custom code.

## The pattern

```ts
// sounds.ts — one context, decoded buffers, reduced startup work; measure actual latency.
const files = { tick: "/sfx/tick.mp3", send: "/sfx/send.mp3", error: "/sfx/error.mp3" };
type Name = keyof typeof files;

let ctx: AudioContext | null = null;
const buffers = new Map<Name, AudioBuffer>();
let enabled: boolean | null = null; // initialise through setSound from the existing approved setting, not a new default

async function unlock() {
  ctx ??= new AudioContext();
  if (ctx.state === "suspended") await ctx.resume();     // must run inside a user gesture
  await Promise.all(Object.entries(files).map(async ([name, url]) => {
    if (buffers.has(name as Name)) return;
    const data = await fetch(url).then((r) => r.arrayBuffer());
    buffers.set(name as Name, await ctx!.decodeAudioData(data));
  }));
}
// Unlock on the first pointer or key event, once, before any sound is wanted.
addEventListener("pointerdown", unlock, { once: true });
addEventListener("keydown", unlock, { once: true });

export function play(name: Name, { rate = 1, gain = 1 } = {}) {
  if (!enabled || !ctx || ctx.state !== "running") return;
  const buf = buffers.get(name); if (!buf) return;
  const src = ctx.createBufferSource(); src.buffer = buf; src.playbackRate.value = rate;
  const g = ctx.createGain(); g.gain.value = gain;
  src.connect(g).connect(ctx.destination); src.start();  // new node per play — they are cheap
}

export function setSound(on: boolean) {
  enabled = on; // use the project’s existing authorised preference persistence if needed
  // Optional confirmation only when it is part of the approved audio interaction.
}
```

A decoded `AudioBufferSourceNode` can reduce start-up work, but no web primitive guarantees zero latency. Media-element playback may also fit; measure the actual timing rather than declaring either API an automatic failure in [sound-motion-sync](sound-motion-sync.md). If you prefer a hook, `use-sound` (≈1 KB over Howler) exposes `volume`, `playbackRate`, `interrupt`, `soundEnabled`, and `sprite` — the same shape as above.

## The five rules

1. **Use the existing approved preference.** Initialise from the actual product setting and supported controls. Do not invent a mute toggle or change its default merely to copy this pattern.
2. **No sound-only information.** Every sound has a visual twin — the state change, the toast, the shake. Provide equivalent information through the supported accessible interface; do not assume audience proportions.
3. **Respect playback and notification boundaries.** Handle browser activation requirements and the task’s authority. Audio playback and notification APIs have different permission rules; do not add a browser notification permission prompt merely to play authorised UI audio.
4. **Respect actual platform audio policy.** Choose the native audio session/category for the app’s real role and existing settings; calls, alarms, music and subtle UI feedback differ. Background audio may be legitimate when requested; do not bypass OS focus or silence behaviour.
5. **Do not infer an audio choice from another preference.** Reduced motion is not evidence that the user selected mute. Honour actual sound settings and accessibility needs without introducing a new consent prompt.

## Screen readers

Sounds fired on focus or on every list item collide with the reader's own speech. Avoid collisions with assistive speech. Focus-linked audio can be valid in an explicitly chosen assistive or musical interaction; test the actual supported combination rather than banning it. Confirmation sounds on explicit actions (send, delete) are fine, and should be shorter than the reader's announcement of the same event.

## When to apply

Any PR that adds an audio file or an `AudioContext`. Check playback activation, the approved preference, accessible equivalent information and appropriate interaction handlers — [review-checklist](../meta/review-checklist.md) rows 12 and 13.

## Gotcha

Calling `new AudioContext()` at module load "works" in Chrome — it just starts suspended and every `play()` silently drops until something resumes it. The symptom is "sound works on the second click." Create and resume inside the gesture, or resume in the handler before playing.

## Sources

- Chrome for Developers, *Autoplay policy* and *Web Audio, autoplay policy and games* — suspended contexts, `resume()` after user activation.
- MDN, Web Audio API — `decodeAudioData`, `AudioBufferSourceNode` semantics.
- Josh Comeau, *use-sound* — mute toggle, persistence, never sound-only, the hook API.
- Apple Human Interface Guidelines, *Playing audio* — silent switch, audio session categories; *Feedback* — provide feedback through color, text, sound, and haptics so people can receive it in the way that works for them.
- Related: [accessibility-baseline](../components/accessibility-baseline.md), [prefers-reduced-motion](../motion/prefers-reduced-motion.md).
