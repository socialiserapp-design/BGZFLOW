> BGZFLOW adaptation: use this technical reference only for the current requested outcome. Existing user decisions, actual project architecture and host permissions govern. Numeric examples and aesthetic opinions below are options, not universal rules, new gates or authority to redesign. External products, model weights and licences need current verification before use; none is installed by reading this page. Use the same brief and private project records; do not modify installed learning files.

---
title: react-native-motion
summary: Choose React Native motion mechanisms compatible with the actual application, gesture workload and supported devices. Profile release behaviour and preserve platform navigation and user preferences.
tags: [motion, react-native, expo, reanimated, gestures, haptics]
---

# React Native motion

React Native may target touch, keyboard, pointer and assistive input. Reanimated can move animation work to its UI runtime; core Animated also supports native-driven paths for supported properties. Choose from the actual installed architecture and measured workload. Web performance advice in [animation-decision-framework](animation-decision-framework.md) and [transform-opacity-only](transform-opacity-only.md) is not a native platform guarantee.

## Threads

- **Use the existing compatible animation and gesture stack.** Reanimated and Gesture Handler are useful for demanding continuous gestures; core Animated and PanResponder remain valid for suitable interactions. Do not migrate or install a new stack solely because this recipe names one.
- **Keep high-frequency rendering work bounded.** Shared values and animated styles can avoid unnecessary React renders; state updates remain appropriate for meaningful application state. Profile the actual gesture/scroll workload.
- **Check the installed Reanimated/worklets API.** Cross-runtime calls such as scheduleOnRN/runOnJS have version-specific availability. Avoid unnecessary calls on every update, while preserving required application semantics.
- **Shared-value API:** use the installed Reanimated version’s supported API and React-compiler compatibility guidance. Keep reads/writes out of render when they introduce side effects; worklet and cross-runtime requirements are version-specific.

## Tools and properties

- A Reanimated CSS transition is one option for a two-state effect when supported by the installed version. Shared values and other existing animation mechanisms can also be appropriate.
- Prefer the existing navigation and keyboard integration when it meets the need. Native stack, formSheet, NativeTabs and keyboard-controller are options, not mandatory dependencies. Keep the approved tab-transition behaviour.
- Layout properties re-run layout for the node and its siblings. The exception is an absolutely positioned element with no children (a tab pill, a progress fill), where `width` keeps the corner radius that `scaleX` would smear.
- Profile Android elevation and BlurView intensity on supported versions/devices. A crossfade of static layers is an alternative when the actual rendering cost is unacceptable.
- Check entering effects on virtualized rows: recycling can replay them. Use stable identity, application state or a suitable layout-animation mechanism when replay is unwanted.

## Springs

For a continuous drag, a spring that preserves release velocity is one useful model ([gesture-momentum](gesture-momentum.md)). Native inertia, a timed transition or an instant change may fit other interactions. The table gives example starting configurations.

| Interaction | Config |
|---|---|
| Settle, no overshoot | `{ duration: 400, dampingRatio: 1 }` |
| Snap back after a drag | `{ duration: 400, dampingRatio: 0.8, velocity }` |
| Sheet or drawer | `{ duration: 300, dampingRatio: 0.8, velocity }` |
| Dismiss past a hard edge | add `overshootClamping: true` |

For example, a press may use scale 0.97 over 100–150ms; keep the approved feedback and activation semantics. Use platform-appropriate accessible target sizes (often 44pt iOS / 48dp Android), without overlapping hit regions. Tune gesture-axis thresholds to actual scrolling and clamp interpolation only where extrapolation is unwanted.

## Haptics

`selectionAsync` for a detent tick, `impactAsync(Light)` when something snaps home, `notificationAsync` for success or error. Fire on the causal frame, once per user action, never per frame or on an entrance the user didn't cause, and never as the only feedback.

## Gotcha

Expo Go and simulators are useful checks but do not establish production feel. Verify relevant behaviour on a suitable real device/release build when that evidence is needed and available. Refresh-rate eligibility depends on OS, hardware, configuration and workload; inspect current platform requirements before changing Info.plist. A requested 120Hz mode does not guarantee an 8ms frame on every device.

## Sources

- Emil Kowalski, skills (MIT, github.com/emilkowalski/skills, a81dbca): skills/animate-expo/SKILL.md, skills/animate-expo/RECIPES.md.
- Related: [spring-animations](spring-animations.md), [gesture-momentum](gesture-momentum.md), [momentum-projection](momentum-projection.md), [prefers-reduced-motion](prefers-reduced-motion.md), [touch-and-focus](../components/touch-and-focus.md).
