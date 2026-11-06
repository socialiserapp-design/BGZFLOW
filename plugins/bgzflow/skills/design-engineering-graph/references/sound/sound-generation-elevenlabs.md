> BGZFLOW adaptation: use this technical reference only for the current requested outcome. Existing user decisions, actual project architecture and host permissions govern. Numeric examples and aesthetic opinions below are options, not universal rules, new gates or authority to redesign. External products, model weights and licences need current verification before use; none is installed by reading this page. Use the same brief and private project records; do not modify installed learning files.

---
title: sound-generation-elevenlabs
summary: Generate a whole sound family on demand with ElevenLabs — material-first prompts, high prompt_influence for functional sounds, short durations, consistent material prompts, selective generation and delivery-specific processing.
tags: [sound, generation, elevenlabs, audio, tooling]
---

# Sound generation with ElevenLabs

When remote sound generation is explicitly selected within existing permissions and spending authority, text-to-sound-effects turns a written [sound-palette](sound-palette.md) into files in one pass, and lets you iterate on *words* ("more felt, less glass") instead of on a synth patch. The model is good at materials and bad at abstractions; prompt accordingly.

## Upstream endpoint example — verify before calling

`POST https://api.elevenlabs.io/v1/sound-generation` with header `xi-api-key`.

| Field | Range / default | Use for UI sounds |
|---|---|---|
| `text` | required | The material-first prompt below |
| `duration_seconds` | 0.5–30, default auto | **0.5** for ticks and taps; 0.6–1.0 for tones; choose an explicit duration when event timing requires it |
| `prompt_influence` | 0–1, default 0.3 | 0.8+ is an upstream starting point; compare outputs for the selected model |
| `loop` | false | Only for ambiences and processing loops |
| `model_id` | `eleven_text_to_sound_v2` | — |
| `output_format` | `mp3_44100_128` default | `pcm_44100` if you will post-process; MP3 otherwise |

Check current official endpoint, SDK, model, parameter ranges, output formats, prices and the account’s actual allowance before a remote call. The table is a pinned upstream example, not a live API guarantee. A saved key alone grants no authority to spend; the shipped helper defaults to local synthesis.

## The prompt formula

**Material + action + envelope + mood + frequency hint + purpose.** The model responds to physical descriptions and audio vocabulary (transient, one-shot, dry, muted, no tail), not to UI nouns ("a success sound" produces a stock jingle).

```text
tick     → "single very short tick, fingernail on thin plastic, dry, no tail, bright, one-shot UI feedback"
tap      → "soft muted tap, felt mallet on a small wooden block, dry, clean transient, short body, no reverb"
send     → "two quick rising notes on a muted kalimba, warm, dry, short decay, confirmation"
receive  → "two soft descending notes on a glockenspiel, gentle, dry, short, incoming message"
error    → "short low dull thud with a slight downward pitch, rubber on wood, dry, no tail"
success  → "three ascending mellow marimba notes, major, warm, dry, short decay, completion"
```

Rules that came out of use:

- **Say the material and the *stick*.** "Felt mallet on wood" and "fingernail on plastic" are different sounds; "a click" is a lottery.
- **Describe the intended space and tail.** Dry/no-tail suits some short cues; retain reverb where the approved material calls for it.
- **Give the contour, not the emotion.** "Two rising notes" beats "happy." "Downward pitch" beats "sad."
- **Reuse a coherent material vocabulary.** Preserve suitable existing sounds and generate only the requested missing or changed cues; one sitting and one material are not required.
- **Ask for 0.5 s and cut.** The model pads short prompts with air; a 0.5 s request trimmed to 80 ms is cleaner than a 0.1 s request.

## After generation

Compare generated files with the actual delivery specification and [sound-spec](sound-spec.md). Trim accidental onset delay, choose channel layout, headroom and filtering for the intended sound, and verify the result. Do not automatically high-pass every cue or discard intentional tails. Inspect the shipped helper’s actual output and supported options rather than assuming a DAW or ffmpeg step ran.

## The shipped script

`node <design-sound>/scripts/sound-family.mjs family.json --out public/sfx` reads a manifest of `{ material, sounds: { name: { prompt, seconds, synth } } }`, uses local synthesis by default (explicit `--provider elevenlabs` requires existing authority; see the local path from [sound-generation-open-source](sound-generation-open-source.md)), writes normalized files and a `manifest.json`. Add `--dry-run` to print the prompts without spending credits.

## When to apply

Use this provider when sound generation serves the requested outcome and the remote call is authorised. Reuse a suitable package or existing asset first. A film’s chosen register guides cue density, but does not forbid intentional foley over a track or require every effect to be synthesized.

## Gotcha

Generated files can vary between requests. Preserve approved outputs and their relevant prompts/settings in existing asset records. Regenerate only the assets needed for the agreed change; do not repeat a paid operation with an unknown result or regenerate a whole family by default.

## Sources

- ElevenLabs API reference, *Create sound effect* — fields, ranges, defaults, output formats.
- ElevenLabs product guide, *Sound effects* — prompt vocabulary (impact, whoosh, one-shot, loop, drone, braam).
- ElevenLabs current pricing and account entitlement: verify before an authorised remote call; no fixed credit allowance is promised here.
- Envato, *UI sound design with AI* — the Action + Material + Mood + Frequency + Purpose formula; prompt-influence bands.
- Related: [sound-palette](sound-palette.md), [sound-spec](sound-spec.md), [sound-designer](https://github.com/AgentsORG/design-engineering/blob/dbbe43b5e17c7525409ad4905b3857852cd5174d/agents/sound-designer.md).
