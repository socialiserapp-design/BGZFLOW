---
name: add-voice
description: >-
  Add Grok realtime voice when that provider is requested or selected through an
  authorised comparison. Wire speech-to-speech, safe authentication and the app
  microphone while preserving the product's approved interface and capabilities.
---

# Add Voice

Add Grok Speech to Speech when the user explicitly requests Grok or an authorised provider comparison selects it. A generic “Voice Mode” request identifies a feature, not a provider choice: recover the existing product decision or clarify that choice before a dependent integration. `/add-voice` selects this method but does not itself authorise replacing another working provider.

## Goal

Working duplex path: user-app mic in, audio out, `wss://api.x.ai/v1/realtime?model=grok-voice-latest`, safe auth. Cursor has no native mic; wire the **app** (or a sample client), not the IDE.

## Protocol first

Language-agnostic event loop. **TypeScript samples default.** Short Python twins only where the client API differs (e.g. `ws` vs `websockets`).

## Docs

- https://docs.x.ai/developers/model-capabilities/audio/speech-to-speech
- https://docs.x.ai/developers/model-capabilities/audio/ephemeral-tokens
- Pricing and limits: https://docs.x.ai/developers/pricing - verify applicable current rates and limits; no price is pinned by this skill.

## Steps

1. **Map the app**
   - Stack: none, OpenAI Realtime, STT→LLM→TTS cascade, TTS/STT only.
   - Client: web / Node / iOS / Android / server.
   - If another voice path exists, inspect why it is used. Replace it only within the requested migration scope; otherwise integrate the requested option without removing working features. Compare supported SDKs and reusable audio components before custom transport or playback code.

2. **Auth**
   - Server: Bearer `XAI_API_KEY`.
   - Browser/mobile: backend `POST https://api.x.ai/v1/realtime/client_secrets`, client uses ephemeral token (Bearer or browser `sec-websocket-protocol`: `xai-client-secret.<token>`).
   - Never put a long-lived key in client bundles. Do not paste keys in chat.

3. **Connect + session**
   - URL: `wss://api.x.ai/v1/realtime?model=grok-voice-latest`
   - On open: `session.update` with `voice` (default `eve`), `instructions`, `turn_detection: { type: "server_vad" }` (or `null` for push-to-talk), PCM 24 kHz unless the app already standardizes elsewhere.
   - Set `audio.input.transcription.model: "grok-transcribe"` or no user transcript arrives (`conversation.item.input_audio_transcription.updated` is cumulative, not a delta).
   - Tools if needed: `web_search`, `x_search`, `file_search`, `mcp`, custom `function`.

4. **Audio I/O (app-side)**
   - One `AudioContext` per session for capture and playback, created inside the user gesture (autoplay policy). Ask for 24 kHz; if the browser gives another rate, resample before sending.
   - Mic → AudioWorklet in ~100 ms chunks → `input_audio_buffer.append` (or binary transport). Start WS and mic in parallel; buffer early audio, flush on open.
   - Play `response.output_audio.delta` immediately; schedule with a ~150 ms lead so chunks butt together. On `input_audio_buffer.speech_started`, stop everything queued (barge-in).
   - Transcript rows: create the user row on `input_audio_buffer.committed` (`item_id`), fill it on `…transcription.updated`; assistant text from `response.output_audio_transcript.delta` / `.done`, close the turn on `response.done`.
   - On function tools: `function_call_output`, finish playback, then `response.create`.

5. **Application interface**
   - Preserve approved controls, icons and layout. Make voice start/stop, connecting, listening, speaking and failure states accessible and understandable.
   - Distinguish dictation from a live conversation with clear labels; no particular waveform, icon, animation or composer arrangement is mandatory.
   - Respect reduced motion, keyboard access, screen-reader announcements and microphone permissions. Ask about an unresolved product choice before changing it.

6. **TS skeleton (default)**

```ts
const url = "wss://api.x.ai/v1/realtime?model=grok-voice-latest";
// Node: pass Authorization header. Browser: use xai-client-secret.<token> protocol.
const ws = new WebSocket(url /* , { headers: { Authorization: `Bearer ${token}` } } */);

ws.addEventListener("open", () => {
  ws.send(JSON.stringify({
    type: "session.update",
    session: {
      voice: "eve",
      instructions: "You are a helpful voice agent.",
      turn_detection: { type: "server_vad" },
    },
  }));
});

ws.addEventListener("message", (ev) => {
  const event = JSON.parse(String(ev.data));
  if (event.type === "response.output_audio.delta") {
    // decode base64 PCM and play
  }
});
```

7. **Python twin (only if the app is Python)**

```python
import json, os, websockets

url = "wss://api.x.ai/v1/realtime?model=grok-voice-latest"
headers = {"Authorization": f"Bearer {os.environ['XAI_API_KEY']}"}

async with websockets.connect(url, additional_headers=headers) as ws:
    await ws.send(json.dumps({
        "type": "session.update",
        "session": {
            "voice": "eve",
            "instructions": "You are a helpful voice agent.",
            "turn_detection": {"type": "server_vad"},
        },
    }))
    async for raw in ws:
        event = json.loads(raw)
        if event.get("type") == "response.output_audio.delta":
            pass  # decode and play
```

8. **Observe the real voice path**
   - Reuse existing private diagnostics. Record necessary lifecycle, latency and error facts; redact tokens and avoid recording speech/transcripts without authority.
   - No `/debug-voice`, `/add-dictation` or `/add-read-aloud` command is bundled here. Discover available tools before invoking another skill.

9. **Verify**
   - Test real microphone input, streamed output, interruption, reconnect and session end in the intended browser/device. A text-only turn proves transport, not working voice.
   - Inspect the built client for leaked long-lived credentials; searching an environment-variable name alone is insufficient.
   - Check token minting and permitted actions. Voice-triggered tools keep the user's scope and host permissions.
   - Test speaker echo handling and headphones when relevant. Do not dismiss feedback as user error or claim success from a mock audio stream.

## Out of scope

- Speech-to-text only (`/add-dictation`), speaking text (`/add-read-aloud`)
- Image generation and text-only inference
- Invented endpoints, events, or CLI flags
