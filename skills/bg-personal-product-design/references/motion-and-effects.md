# Motion and effects

Every lead, worker and independent checker uses this same contract, whatever the model or host. Apply it when designing or changing motion, atmosphere or materials. Keep the product's approved identity and exclusions ([identity authority](design-contract.md#identity-authority)). These rules never authorise new project work, installs or releases.

## Route by medium

Named skills are optional suggestions. Check each third-party skill's and library's licence before use.

| Medium or job | Route |
|---|---|
| Mobile app UI, gestures and transitions | The platform's native animation layer, with native performance checks; for Expo apps, e.g. `expo-animation` from the official Expo skills |
| Custom drawing, shaders and bounded particles | A GPU drawing library such as React Native Skia, integrated with the mobile animation route |
| Web motion | GSAP, e.g. with the `gsap-core` and `gsap-performance` skills |
| Rendered video and promos | A video composition route, e.g. HyperFrames, `motion-doctrine` or `motion-graphics`; these are not mobile UI engines |
| Apple materials | e.g. `expo-liquid-glass` for Expo wrappers or `liquid-glass-design` for SwiftUI/UIKit; preserve platform availability and product exclusions |
| Critique across media | A design-critique method (e.g. `impeccable`) alongside the implementation route |

Use available reviewed guidance. A named route never installs a skill or grants spending authority. Host-only tools are optional, where the host has them; the shared rules and the worker handoff stay usable on every host.

## Required effect contract

For every effect, put one row or record in the existing screen or component specification before implementation:

| Field | Required decision |
|---|---|
| Purpose | What it communicates, or how its atmosphere supports the approved look |
| Trigger | The user action, confirmed state change or lifecycle event that starts and stops it |
| Timing | Duration, delay, easing or spring parameters; repetition and settling limits |
| Interruption | Cancel, reverse or retarget behaviour; rapid input, navigation and cleanup |
| Thread | Execution owner: UI/worklet, JS, GPU or render timeline; keep frame work out of React state |
| Layers | Composition order, a bounded layer and particle count, overdraw, and input and accessibility ownership |
| Platform fallback | Supported platforms, the tier decision and the equivalent static or native composition |
| Reduce Motion | Remove nonessential travel, parallax and looping; keep clear state changes without motion |
| Reduce Transparency | Replace translucent or blurred materials with readable opaque equivalents, independently of motion |

Example: a save confirmation pairs a brief visual state change and one haptic after confirmed persistence. Cancel pending decoration on navigation; a failed or unknown save shows its real status and retry path. Record the exact timing, thread, layers and static and opaque variants in that product's contract instead of inventing universal values.

## Tier the effects, not the product

Keep full approved effects on capable devices and a composed static treatment on weak devices. Preserve content, navigation, layout and identity across tiers. Reduce only the affected effect, never the whole product. Pause effects off-screen and in the background; cancel frame work and release sensors and resources on exit. Cap particles, cache shaders and keep per-frame work out of React state. Lower opacity alone does not remove GPU work. Keep core and time-critical actions (for example starting a call or sending a message) immediate; no effect delays them.

A reusable visual-tier recipe: one small module selects the visual ambition (for example full, reduced or static) from device capability, measured performance and user preferences, without changing content or navigation. Each effect reads the tier and owns its fallback. An animated backdrop such as an aurora can use a static gradient on a platform where its drawing surface's lifecycle proved unreliable, with any motion gated separately; that one-platform fallback is no reason to flatten every platform. A simulator that always reports the top tier cannot prove the weak-device tier. Adapt the pattern; never copy another product's code or palette.

Inherit this product's approved colours, fonts and shapes. Never import another product's palette or a random palette. Keep approved material exclusions, for example a product whose approved look forbids live blur and native glass. Keep web hover assumptions and perpetual motion out of native UI.

Pair one haptic with a visual at a meaningful moment, such as a deliberate action or a detent, never every frame. Signal success only after the action has actually succeeded. Handle synchronous and asynchronous haptic failures; visual feedback stays sufficient without haptics. Keep labels readable, large text unclipped, Android targets at least 48 dp and decoration outside the accessibility tree.

## Device evidence and QA

Before accepting an app effect, require the exact candidate's release build on the slowest supported Android device plus an iPhone. Record build identity, device and OS, the selected tier, observed frame behaviour and evidence. Provide a forced-tier switch for QA and exercise every tier, including the static fallback; the switch never overrides accessibility preferences. Check rapid interruption, tab and off-screen and background/resume lifecycle, video coexistence, and Reduce Motion and Reduce Transparency independently and together. Visibly test, repair and retest failures. Label emulator, prototype and source evidence as such; missing hardware evidence stays an open gap, never a performance pass.

## References and optional specialists

A screen-reference library (for example Mobbin through a host connector, where the host has one) is for screen and flow references, not motion. The lead exports the selected references with their source links into a file so workers on any host can use them. Design files (for example Figma) may supply authored timing; skills supply instructions; libraries render effects. None of them proves the final product's performance or accessibility.

Load these optional specialist skills where they are available and relevant. Check each licence before use; naming one grants no installation or release authority.

| Optional skill | Use and boundary |
|---|---|
| `figma-shaders` | From Figma's official MCP server guide; authored graphics and prototypes |
| `lottie` | Community skill; web guidance, not a React Native recipe |

Product-specific holds stay with their existing owners.
