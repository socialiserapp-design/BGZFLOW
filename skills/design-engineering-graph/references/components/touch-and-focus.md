> BGZFLOW adaptation: use this technical reference only for the current requested outcome. Existing user decisions, actual project architecture and host permissions govern. Numeric examples and aesthetic opinions below are options, not universal rules, new gates or authority to redesign. External products, model weights and licences need current verification before use; none is installed by reading this page. Use the same brief and private project records; do not modify installed learning files.

---
title: touch-and-focus
summary: Preserve core keyboard, touch and assistive access; choose platform-appropriate targets, visible focus, overlay behaviour and timer recovery for the actual interaction.
tags: [components, touch, accessibility, focus, ios, keyboard]
---

# Touch and focus

A large share of users experience the interface through a thumb, a keyboard, or a screen reader — never a mouse. UI that only works with a fine pointer and perfect vision is broken UI however polished it looks. [accessibility-baseline](accessibility-baseline.md) states the floor; this node is the implementation.

## The rules

1. **Gate hover behind capability**: `@media (hover: hover) and (pointer: fine)`. Touch fires `:hover` on tap and leaves it stuck. Nothing core is reachable only by hover.
2. **Use appropriate accessible target sizes.** 44px is a common web usability target, not the sole conformance threshold; native points/dp and WCAG target-size criteria have distinct definitions and exceptions. Expand hit areas only without collisions.
3. **`touch-action: manipulation`** on buttons, links, inputs (kills the double-tap-zoom delay); **`touch-action: none`** on surfaces that implement their own pan or drag so native gestures don't fight yours.
4. **Autoplaying video needs `muted` and `playsinline`**, or iOS refuses or goes fullscreen. Under `prefers-reduced-motion`, swap autoplay for a poster and a play button.
5. **Every icon-only button needs an accessible name** through visible/hidden text, aria-labelledby or aria-label, as appropriate. Decorative illustrations can be hidden from assistive technology; informative illustrations need an equivalent description.
6. **Hidden content leaves the tab order**: `visibility: hidden`, `display: none`, or `inert` — never `opacity: 0` or an off-screen transform. To keep an exit animation, delay the flip: `transition: visibility 0s 200ms` on close. Focus must never land off-screen; scroll focused elements into view (`scrollIntoView({ block: "nearest" })`).
7. **Focus follows the interaction.** Modal dialogs generally move focus in, constrain it appropriately and restore a sensible destination. Tooltips and non-modal overlays need not take focus. Never strand focus on a removed node; choose the next logical target for the actual workflow.
8. **Protect time to read and act.** Pause or extend transient messages/undo affordances where appropriate, including relevant hover/focus or background states. Do not pause an actual alarm, operation deadline or server state because the tab is hidden. Observe the real operation and applicable accessibility requirements.
9. **Shortcuts show the user's OS**: Cmd on macOS, Ctrl elsewhere, bound to match.
10. **Feedback is on the page.** Errors, confirmations, and status never live only behind hover or inside a modal the user has to find.
11. **Distinguish taps from scrolling.** Track cancellation and movement thresholds with the actual gesture system; commit selection only for a valid tap/release. A release alone is not proof that no scroll occurred ([animated-hit-testing](../motion/animated-hit-testing.md)).

## Tooltips and menus

A tooltip waits ~200ms so it doesn't fire on incidental travel; once one is open, siblings open **instantly** with no delay and no entrance (the warm state), clearing ~300ms after the last closes — see [responsive-feedback](../motion/responsive-feedback.md). Submenus get a triangular **safe area** (`clip-path` on a pseudo-element) so a diagonal cursor path toward the submenu doesn't close it mid-flight.

## Mobile-native fixes

| Problem | Fix |
|---|---|
| Hover state stuck after tap | `@media (hover: hover) and (pointer: fine)` |
| Gray or blue flash on tap | `-webkit-tap-highlight-color: transparent` |
| Layout has the wrong height | Choose content sizing, vh/svh/dvh or a measured viewport strategy for actual browser chrome and keyboard behaviour |
| Page zooms into an input | Input font-size ≥ 16px |
| Tap feels laggy | Feedback on pointer-down + `touch-action: manipulation` |
| Pull-to-refresh hijacks scroll | `overscroll-behavior: none` on `html, body` |
| Content stops at the notch | `viewport-fit=cover` + `env(safe-area-inset-*)` |
| Long-press selects button text | `user-select: none` and `-webkit-touch-callout: none` on controls, never on `body` |
| Keyboard covers the composer (Android) | `interactive-widget=resizes-content` in the viewport tag ([production-baseline](../meta/production-baseline.md)) |
| Whole page pans sideways | Fix the element that overflows (`overflow-wrap`, a scroll wrapper on tables and `pre`, no `100vw`); `overflow-x: hidden` on `body` hides it and breaks sticky |
| Carousel scrolls vertically | `touch-action: pan-y` on the gesture surface |
| Status bar color doesn't match | `theme-color` meta per color scheme |
| Right in Chrome, wrong on the phone | Real hardware: dev server on `0.0.0.0`, open by LAN IP, Safari Web Inspector or `chrome://inspect`, a phone a few years old |

## When to apply

Any interactive UI — buttons, modals, tooltips, menus, video, timers — and every mobile bug report. Run it even when the screen already looks finished: a failure here ships broken for someone.

## Gotcha

Tabbing into a closed drawer is the classic miss. It was hidden with `opacity: 0` or `translateX(100%)`, which keeps every control focusable; the keyboard user lands inside a thing they cannot see.

## Sources

- Emil Kowalski's design-engineering practice on touch and accessibility, distilled by HKTITAN.
- Related: [accessibility-baseline](accessibility-baseline.md), [hover-states-subtle](hover-states-subtle.md), [prefers-reduced-motion](../motion/prefers-reduced-motion.md), [forms-behavior](forms-behavior.md).
