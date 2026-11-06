> BGZFLOW adaptation: use this technical reference only for the current requested outcome. Existing user decisions, actual project architecture and host permissions govern. Numeric examples and aesthetic opinions below are options, not universal rules, new gates or authority to redesign. External products, model weights and licences need current verification before use; none is installed by reading this page. Use the same brief and private project records; do not modify installed learning files.

---
title: sound-generation-open-source
summary: No API key needed — open-weight text-to-audio that runs on a CPU, procedural synthesis in under a kilobyte, and CC0 libraries you can ship commercially. A decision table for which path.
tags: [sound, generation, open-source, synthesis, cc0, audio]
---

# Sound generation without a key

Three possible paths suit different needs. Compare available packages, existing assets, integration and hardware before writing custom code or downloading model weights. Model sizes, performance figures and licence summaries below are historical upstream claims; verify the selected model card and actual environment before use. Reading this reference installs nothing.

| You need… | Path | Cost |
|---|---|---|
| A bespoke material that matches the brand | **Open-weight model** — Stable Audio 3 Small-SFX | Hardware/model dependent; check before installing |
| Sounds now, zero assets, tweakable in code | **Procedural synth** — Web Audio or ZzFX | No audio download; runtime size depends on the implementation |
| Existing licensed source assets | **CC0 library** — Kenney, soundcn, Freesound | Inspect the actual item and integration |

## Open-weight models

- **Stable Audio 3 Small-SFX** (`stabilityai/stable-audio-3-small-sfx`, ~460 M parameters) — Stability's dedicated sound-effects model, sized for CPU inference, up to two minutes per clip. Stability AI Community License: free for research and commercial use under US $1 M annual revenue; above that, an enterprise license. A historical upstream option, not an installed model or current licence verification.
- **Stable Audio Open Small** (`stabilityai/stable-audio-open-small`, ~340 M) — the earlier 11-second model, Arm-optimized; generates ten seconds of audio in about seven seconds on a phone-class CPU. Check its exact model licence separately.
- **Meta AudioGen** (AudioCraft) — code is MIT, but the weights are CC BY-NC 4.0. Non-commercial restrictions can also matter for a commercial prototype; verify the intended use, not just whether it ships.

```python
from stable_audio_tools import get_pretrained_model
from stable_audio_tools.inference.generation import generate_diffusion_cond
model, cfg = get_pretrained_model("stabilityai/stable-audio-3-small-sfx")
audio = generate_diffusion_cond(model, steps=8, device="cpu",
    conditioning=[{"prompt": "single very short tick, fingernail on thin plastic, dry, no tail",
                   "seconds_total": 1}])
```

Prompt exactly as in [sound-generation-elevenlabs](sound-generation-elevenlabs.md) — material first, a dry short-tail prompt when that is the requested material, rather than always — then post-process per [sound-spec](sound-spec.md).

## Procedural synthesis

For ticks, taps, pops, and two-note tones, procedural synthesis is one useful option alongside existing packages and assets: the recipe is parameter-driven; noise-based recipes are not byte-deterministic, and its pitch and length are *parameters* you can tie to the UI (a taller card, a lower thud). `scripts/sound-family.mjs --provider synth` ships six archetypes — `tick`, `tap`, `chime`, `thud`, `pop`, `whoosh` — and writes WAVs from the same manifest the ElevenLabs path uses, so a team without a key gets a coherent family, not silence.

In the browser, the same idea in eight lines is often enough:

```ts
// A tick: 60 ms of high sine with an exponential decay. No file, no fetch.
function tick(ctx: AudioContext, freq = 2400, ms = 60) {
  const o = ctx.createOscillator(), g = ctx.createGain(), t = ctx.currentTime;
  o.frequency.value = freq;
  g.gain.setValueAtTime(0.5, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + ms / 1000);
  o.connect(g).connect(ctx.destination); o.start(t); o.stop(t + ms / 1000);
}
```

**ZzFX** (MIT, under 1 KB) is the mature version of that idea — twenty parameters covering waveform, envelope, pitch sweep, modulation, and filter — with a visual designer that exports one-liners. Its idiom is 8-bit; tame the square waves and shorten everything for product UI. **jsfxr** is the browser port of the classic sfxr and lives in the same register.

## CC0 libraries

- **Kenney** — *Interface Sounds* (100 files) and *UI Audio* (50 files), CC0, the most-used free UI sets in existence. Which is also the problem: they are recognizable. Use unchanged files when their sound and licence fit; alteration is optional, not a condition of quality.
- **soundcn** — 700+ short sounds packaged for the shadcn CLI: `npx shadcn add @soundcn/click-soft` is an upstream installation example that drops a base64-inlined TypeScript module and a `useSound` hook into your repo. Mostly Kenney-derived CC0; skip its World of Warcraft pack, which is non-commercial.
- **Freesound** — APIv2 with `filter=license:"Creative Commons 0"`; token auth for search, OAuth2 for download. The largest pool and the most uneven; budget time to audition.

Whatever the source, the [sound-palette](sound-palette.md) rule still applies: coherence with the requested audio identity. Multiple licensed materials can fit; a mixed set is not automatically defective in [ai-default-tells](../anti-patterns/ai-default-tells.md).

## When to apply

Any time an installer wants sound and has no ElevenLabs key — or has one and wants deterministic, parameter-driven sounds. `sound-family.mjs` chooses automatically: local synth by default; a remote provider must be explicitly selected within existing authority.

## Gotcha

“Open source”, model-weight availability and permission for commercial output are different claims. Check the exact asset, code and model terms for the intended use; retain source/credit details in the existing asset records. Do not infer current revenue thresholds or permission from this pinned summary.

## Sources

- Stability AI — Stable Audio 3 family (May 2026), Stable Audio Open Small model card, Community License terms.
- Arm, *Running Stable Audio Open Small with KleidiAI* — on-device timing.
- Meta, AudioCraft repository — MIT code, CC BY-NC 4.0 weights.
- KilledByAPixel, *ZzFX* — parameters, size, license; chr15m, *jsfxr*.
- Kenney — Interface Sounds and UI Audio packs (CC0); kapishdima, *soundcn*; Freesound APIv2 docs.
- Related: [sound-generation-elevenlabs](sound-generation-elevenlabs.md), [sound-playback-web](sound-playback-web.md), [dependency-discipline](../philosophy/dependency-discipline.md).
