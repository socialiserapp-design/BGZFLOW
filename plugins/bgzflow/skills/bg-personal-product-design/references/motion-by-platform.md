# Motion by platform

Native and desktop equivalents of the [cinematic motion and 3D](cinematic-motion-and-3d.md) recipes. Each section gives a library, starter recipe and limits. Current user decisions, approved motion tokens and exclusions govern; values below are starting points, never universal values. Use the relevant [effect design questions](motion-and-effects.md#relevant-effect-design-questions) for requested effects, without adding a separate form. Versions as checked in October 2026; follow the project's installed versions and verify before any install.

## Shared rules on every native platform

1. **Use the cheapest tool that does the job:** platform component (native sheet, tab bar, context menu, large-title header, pull-to-refresh) → declarative transition → layout animation → animated value on the UI thread → vector animation (Lottie/Rive) → GPU drawing (Skia, Metal, AGSL) → real-time 3D. Rebuilt JS versions of platform components are a last resort.
2. **Frequency and purpose.** Repeated interactions should remain quick and unobtrusive; occasional moments can support more expression when the approved experience calls for it. Judge the actual duration and interruption behaviour, rather than imposing a frequency threshold. An effect can communicate feedback, continuity, state, explanation or delight.
3. **Press feedback.** Scale to the product's press token (often 0.96-0.98) in 100-150 ms on press-in; commit on release. List rows highlight instead of scaling.
4. **Curves and springs.** Interactive UI eases out (for example `cubic-bezier(0.23, 1, 0.32, 1)`); on-screen moves ease in-out; never ease-in on something the user waits for. Specify springs by duration and damping ratio (for example settle 400 ms / 1.0, snap-back 400 ms / 0.8 carrying gesture velocity, sheet 300 ms / 0.8). About 300 ms is a useful starting point for many UI transitions, not a ceiling. Prefer existing platform navigation unless the requested experience justifies a custom transition; a sliding tab transition is an option when readable and responsive.
5. **Entrances** may use a small scale change and opacity, a native transition or no animation. Choose what explains the change without distracting or obscuring content; 0.95 is a sample scale, not a rule.
6. **Gestures.** Interruptible: grabbing mid-animation continues from the current position. Commit on velocity *or* distance (project the rest position: `velocity / 1000 * 0.998 / (1 - 0.998)`). Boundaries rubber-band (`(1 - 1 / (x * 0.55 / d + 1)) * d`) instead of stopping dead. Declare the gesture axis so it doesn't fight scrolling.
7. **Haptics**, when part of the experience, reinforce the relevant event and respect device support and preferences. Selection feedback can accompany input; success feedback follows confirmed success. Keep visual or accessible feedback sufficient without haptics.
8. **Ambient motion** (aurora, shimmer, mesh) runs only where the approved look has it, pauses off-screen and in the background, and stops under reduced motion.
9. **Reduced motion** respects the system preference and the user's needs. Remove nonessential travel, scale, parallax, overshoot and loops; use instant changes or restrained fades where appropriate, including no animation when required. Preserve clear state information. **Reduced transparency** uses readable opaque alternatives to blur and glass.
10. **Proof** matches the claimed behaviour and intended platforms. Use a representative release build and available constrained hardware for performance claims, with relevant interruption and lifecycle checks. State untested devices plainly; no fixed pair of devices is required ([device evidence](motion-and-effects.md#device-evidence-and-qa)).

## React Native and Expo

| Need | Library | Notes |
|---|---|---|
| UI-thread values, gestures, layout animations | Reanimated 4 + react-native-worklets, Gesture Handler | Reanimated 4 needs the New Architecture; it also offers CSS-style transitions and keyframes for state changes |
| Keyboard-synced UI | react-native-keyboard-controller | Composer rides the real keyboard frame |
| Shaders, mesh gradients, blur, particles, path morphs | React Native Skia | Runtime shaders (SkSL) with uniforms from shared values |
| Vector animation | lottie-react-native or dotLottie RN; Rive RN runtime | Rive for state machines |
| Apple materials | `expo-glass-effect` | iOS 26+; opaque fallback elsewhere |
| Real-time 3D | React Three Fiber native with `expo-gl` | Check the expo-gl version per SDK and measure its cost; use when the requested task benefits from interactive 3D |
| Implementation how-to | `expo-animation`, `animating-react-native-expo`, `reanimated-skia-performance` skills where available | Route to them; do not copy them |

**Starter recipe: a polished list-to-detail flow**
1. Native stack with platform transitions; the detail sheet is a native `formSheet` with detents.
2. Row press: highlight on press-in; on release, push. A hero image is the carrier into the detail header (shared element where the navigator supports it; otherwise a matched fade-and-scale from the row's measured frame).
3. Collapsing header: translate and fade the large title from `scrollY` with clamped `interpolate` inside a fixed-height clipped container; never animate header height.
4. Segmented control: measure the pill once with `onLayout`; animate `x` and `width` (allowed because the pill is absolute and childless) with ease-in-out; selection haptic on press.
5. Deleting a row: `exiting` plus `LinearTransition` closes the gap; on virtualised lists use `itemLayoutAnimation`, never `entering` on recycled rows.
6. Success moment (rare): stillness 0.3-0.5 s, then a Lottie or Skia check with one success haptic after the server confirms.
7. Optional atmosphere on the hero: a Skia shader background whose `uTime` comes from `useClock`, uniforms passed as shared values (not `.value`), effect compiled once with `useMemo`, paused when the screen blurs.

**Limits.** Never `setState` per frame; cross back to JS only at the end or at a threshold (`useAnimatedReaction`, `scheduleOnRN`). Build animation builders at module scope. Prefer `.get()`/`.set()` on shared values. Do not animate `BlurView` intensity on Android; crossfade static layers. Expo Go, simulators and dev builds hide jank; check the release build. When the requested experience benefits from 120 Hz on supported ProMotion iPhones, verify the current platform configuration (including `CADisableMinimumFrameDurationOnPhone`) and measure the result; 120 Hz permits about 8.3 ms per frame. Do not change refresh-rate policy merely to follow a recipe. Read `AccessibilityInfo.isReduceMotionEnabled()` (or Reanimated's `useReducedMotion`) and `isReduceTransparencyEnabled()`.

## SwiftUI (iOS, iPadOS, macOS)

| Need | API | Availability |
|---|---|---|
| State transitions | `withAnimation(.spring(duration:bounce:))`, `.snappy`, `.smooth` | iOS 17+ for the duration/bounce form |
| Multi-step motion | `PhaseAnimator`, `KeyframeAnimator` | iOS 17+ |
| Shared elements | `matchedGeometryEffect`; `navigationTransition(.zoom(sourceID:in:))` with `matchedTransitionSource` | zoom: iOS 18+ |
| Scroll-linked effects | `scrollTransition`, `visualEffect`, `onScrollGeometryChange` | iOS 17+ / 18+ |
| Number and symbol motion | `contentTransition(.numericText())`, `symbolEffect` | iOS 17+ |
| Haptics | `sensoryFeedback(_:trigger:)` | iOS 17+ |
| Shaders | `colorEffect`, `layerEffect`, `distortionEffect` with Metal `[[stitchable]]` functions; Inferno (MIT) for ready effects | iOS 17+, macOS 14+ |
| Mesh backgrounds | `MeshGradient` driven by `TimelineView` | iOS 18+ |
| Liquid Glass | `glassEffect`, `GlassEffectContainer`, `.buttonStyle(.glass)` | iOS 26+ |
| 3D | RealityKit (`RealityView`, `Model3D`); SceneKit is in maintenance for new work | per API |

**Starter recipe: a hero card that opens into detail**
1. Grid card marked `matchedTransitionSource(id:in:)`; destination uses `navigationTransition(.zoom(sourceID:in:))` so the card itself carries into the detail (iOS 18+; fall back to the default push on iOS 17).
2. Detail header: `MeshGradient` in the product's approved hues, control points nudged slowly by `TimelineView(.animation)`; freeze the mesh under reduced motion.
3. Price or stat changes use `contentTransition(.numericText())`.
4. Primary action: press scale token via a custom `ButtonStyle`; success shows a `symbolEffect(.bounce)` check plus `sensoryFeedback(.success, trigger:)` only after confirmation.
5. Optional tap ripple with a `layerEffect` shader limited to the hero image.

**Limits.** Read `@Environment(\.accessibilityReduceMotion)` and `\.accessibilityReduceTransparency`; check `ProcessInfo.processInfo.isLowPowerModeEnabled` before ambient effects. Guard every newer API with `if #available` and a designed fallback. `layerEffect` with a large `maxSampleOffset` costs more; keep shaders on bounded views. Avoid `TimelineView` on screens that are mostly static. Keep glass only where the approved look allows it.

## Android (Jetpack Compose)

| Need | API or library | Notes |
|---|---|---|
| State transitions | `animate*AsState`, `updateTransition`, `AnimatedVisibility`, `AnimatedContent` | Use `spring(dampingRatio, stiffness)` or `tween` from tokens |
| Gesture-driven values | `Animatable` with `animateDecay` and velocity | Carries fling velocity |
| Shared elements | `SharedTransitionLayout` + `Modifier.sharedElement` / `sharedBounds` | Compose 1.7+; works with Navigation Compose |
| Back gesture | Predictive back (`PredictiveBackHandler`, `android:enableOnBackInvokedCallback`) | Preview the destination as the user swipes |
| Shaders | AGSL `RuntimeShader` via `ShaderBrush` or `graphicsLayer { renderEffect = ... }` | Android 13+ (API 33); static fallback below |
| Blur | `Modifier.blur` / `RenderEffect` | Android 12+ (API 31) |
| Vector animation | Lottie Compose, Rive Android | |
| 3D | Filament, or SceneView on top of it | Use for a requested spatial task with measured performance |
| Haptics | `LocalHapticFeedback`, `View.performHapticFeedback(HapticFeedbackConstants.CONFIRM)` | Device quality varies; visual stays sufficient |

**Starter recipe: list to detail with a shared hero**
1. Wrap the nav host in `SharedTransitionLayout`; the list image and detail header share a key with `sharedElement`; the title uses `sharedBounds`.
2. Enter the detail body with `AnimatedVisibility(fadeIn() + slideInVertically { it / 8 })`, exit at about 75% of the entry duration.
3. Support predictive back so the detail shrinks toward its card as the user swipes.
4. Hero atmosphere on API 33+: an AGSL gradient shader with `uTime` from `withFrameNanos`, colours from tokens; below API 33 a static gradient brush.
5. Success: `HapticFeedbackConstants.CONFIRM` (API 30+) with the visual check.

**Limits.** Respect the system animator duration scale and the accessibility "Remove animations" setting (`Settings.Global.ANIMATOR_DURATION_SCALE` 0 means no animation); Compose follows the scale automatically for most APIs, but custom frame loops must check it. Defer reads of animated state to the draw or layout phase (`graphicsLayer { }`, `offset { }`) to avoid recomposition every frame. Use representative constrained hardware for performance claims. An emulator can expose functional defects but does not establish physical-device frame behaviour. Touch targets stay at least 48 dp.

## Flutter (when the product is built in it)

Implicit animations (`AnimatedContainer`, `AnimatedSwitcher`), `AnimationController` with `SpringSimulation`, `Hero` for shared elements, `flutter_animate` (MIT) for chained effects, `FragmentProgram` for GLSL shaders, Rive and Lottie runtimes. Check `MediaQuery.disableAnimationsOf(context)` for reduced motion. Impeller is the default renderer on iOS and recent Android; test shader warm-up on the release build.

## Desktop

| Shell | Route | Limits |
|---|---|---|
| Electron | The full web stack from [cinematic motion and 3D](cinematic-motion-and-3d.md): GSAP or Motion, Three.js/R3F, View Transitions | Chromium GPU blocklists can disable WebGL/WebGPU, so keep the poster fallback; pause rendering when the window is hidden or minimised; keep `backgroundThrottling` on |
| Tauri | Web stack in the system webview | WebView2 on Windows, WebKit on macOS, WebKitGTK on Linux: WebGPU and CSS feature support differ, so test each and feature-detect |
| macOS native | SwiftUI as above; AppKit/Core Animation for custom layers | Respect `NSWorkspace` reduce-motion and reduce-transparency settings |
| Windows native (WinUI 3) | Composition implicit animations, `ConnectedAnimationService` for shared elements, Mica/Acrylic materials | Read `UISettings.AnimationsEnabled`; Acrylic falls back to solid on battery saver |

**Starter recipe: desktop app polish.** Window content enters with a 200-250 ms fade and small rise on launch only; navigation between panes uses one shared-element carrier (selected item into the detail header); hover states on pointer devices only; any 3D or shader layer renders at most at the display refresh rate, pauses when the window loses visibility and drops to its poster on battery saver or a blocklisted GPU. Keep keyboard focus and shortcuts working through every transition.

## Equivalence table

| Effect | Web | React Native / Expo | SwiftUI | Compose | Desktop |
|---|---|---|---|---|---|
| Shared-element carrier | View Transitions, GSAP Flip, Motion `layoutId` | Navigator shared element or measured fade-scale | `matchedGeometryEffect`, zoom transition | `SharedTransitionLayout` | Web route or `ConnectedAnimationService` |
| Spring feedback | Motion spring, GSAP eases | Reanimated `withSpring` (duration + dampingRatio) | `.spring(duration:bounce:)` | `spring(dampingRatio, stiffness)` | Platform spring |
| Scroll-linked reveal | ScrollTrigger, CSS `view()` | `useAnimatedScrollHandler` + `interpolate` | `scrollTransition` | `LazyListState` offsets in `graphicsLayer` | Web route |
| Shader background | OGL, Three.js TSL | Skia `RuntimeEffect` | Metal `colorEffect` / `MeshGradient` | AGSL `RuntimeShader` | Web route or Metal |
| Vector illustration | dotLottie, Rive | lottie-react-native, Rive | Lottie, Rive | Lottie Compose, Rive | Rive, Lottie |
| Real-time 3D | Three.js / R3F | R3F native + expo-gl | RealityKit | Filament / SceneView | Web route |
| Reduced motion signal | `prefers-reduced-motion` | `isReduceMotionEnabled` | `accessibilityReduceMotion` | Animator duration scale | OS setting per shell |
