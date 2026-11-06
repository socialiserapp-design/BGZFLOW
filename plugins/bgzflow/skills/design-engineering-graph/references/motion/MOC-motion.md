> BGZFLOW adaptation: use this technical reference only for the current requested outcome. Existing user decisions, actual project architecture and host permissions govern. Numeric examples and aesthetic opinions below are options, not universal rules, new gates or authority to redesign. External products, model weights and licences need current verification before use; none is installed by reading this page. Use the same brief and private project records; do not modify installed learning files.

---
title: MOC-motion
summary: When to animate, how to animate, and the discipline of restraint.
tags: [moc, motion, animation]
---

# MOC — Motion

The largest cluster. Read [animation-decision-framework](animation-decision-framework.md) first — it tells you whether to even animate. The rest of the nodes are tactical.

## Decision-first nodes (read before deciding)

- [animation-decision-framework](animation-decision-framework.md) — Compare motion’s purpose, frequency, accessibility and actual cost while preserving the approved experience.
- [fly-not-teleport](fly-not-teleport.md) — When a component persists between two states, animate the change. Don't crossfade what should travel.

## Tactical nodes (read while implementing)

- [easing-curves](easing-curves.md) — Choose easing for the intended response; compare built-in, custom and native curves without a universal ease-in ban.
- [duration-table](duration-table.md) — Example timing ranges by interaction; use approved tokens and measured response rather than a universal duration cap.
- [spring-animations](spring-animations.md) — When springs beat curves — interactive/draggable elements. Apple's critically damped default (bounce 0, ~0.35s), the 380/30 drawer spring, bounce only after momentum. Interruptibility.
- [frame-rate-independence](frame-rate-independence.md) — Animation state should depend on time and events, never on which frames happened to run. Step springs on a fixed clock or sample a closed form, cap the catch-up after a stall, apply events at their timestamps, store what the user placed and derive what fits, and never let last frame's value make a decision.
- [animated-hit-testing](animated-hit-testing.md) — Keep animated hit targets predictable. Drawn-position testing is the safe starting point; destination hit-testing is a specialised repeated-action option that must not activate a different consequential target.
- [transform-opacity-only](transform-opacity-only.md) — Transform and opacity often avoid layout and paint; select other properties when the effect needs them and verify actual rendering cost.
- [performance-discipline](performance-discipline.md) — Reduce unnecessary work using actual rendering traces. Choose appropriate animation properties, list rendering, loading and theme behaviour for the current app; no fixed row-count or property-only rule.
- [transform-mastery](transform-mastery.md) — translateY with percentages, scale() scales children, 3D transforms, transform-origin fundamentals.
- [clip-path-tricks](clip-path-tricks.md) — Use compatible clip-path interpolation for reveal and comparison effects; profile actual rendering cost and preserve an accessible alternative.
- [never-scale-from-zero](never-scale-from-zero.md) — Choose an entrance scale that fits the approved effect; 0.95 plus opacity is one restrained recipe, while scale(0) can suit deliberate reveals.
- [gesture-momentum](gesture-momentum.md) — Velocity-based dismissal, damping at boundaries, pointer capture. The mobile-feel rules.
- [stagger-choreography](stagger-choreography.md) — Cascading reveals (30–80ms delays). When stagger helps comprehension and when it just reads as noise.
- [responsive-feedback](responsive-feedback.md) — Button press, tooltip skip-delay, popover origin awareness — the small responsiveness wins.

## Library-design nodes

- [sonner-principles](sonner-principles.md) — Ten principles for building loved components, distilled from Emil Kowalski's Sonner library.

## Workflow nodes

- [debugging-animations](debugging-animations.md) — Slow-motion playback, frame-by-frame inspection, real-device testing. The three tools.
- [css-conventions](css-conventions.md) — 1turn over 360deg, seconds over ms (or both with a reason), unitless line-heights, rem over px, native methods over libraries.

## Benji's catalog (benji.org)

Distinctive techniques from Benji Taylor's body of work — Family, Honk, Liveline, Agentation, Drawesome, Stageshow. His faux-UI practice (Stageshow) is its own cluster, [MOC-faux-ui](../faux-ui/MOC-faux-ui.md); Honk's presence patterns are [presence-signals](../components/presence-signals.md); Drawesome's toolbar is [drawing-toolbar](../components/drawing-toolbar.md).

- [lerp-breathing](lerp-breathing.md) — Update multiple visual elements with the same lerp rate so they breathe as one organism, not as desynced parts.
- [morphing-icons](morphing-icons.md) — Constraint-driven icon system — every icon = N SVG lines, unused lines collapse to invisible center points, same-shape icons rotate.
- [shared-letter-morph](shared-letter-morph.md) — Text-state morphs that share letters animate the difference. "Continue" → "Confirm" via the shared "Con".
- [tray-rules](tray-rules.md) — Six rules for tray-style modal stacks — user-initiated, varied heights, single focus, title + dismiss, context preservation, transient actions.

## Touch + imperative API

- [hover-default-imperative](hover-default-imperative.md) — Icon-animation components animate on :hover by default. Expose an imperative trigger() for touch and programmatic use.

## Launch video

Launch films have their own cluster, [MOC-launch-video](../launch-video/MOC-launch-video.md): register, structure, type, UI demo, film motion, seams and cuts, review. UI timing in this MOC does not transfer to a film.

## Transition techniques (transitions.dev)

Catalog of canonical transitions for common UI archetypes. Implementation layer under the principle layer above.

- [cross-blur-transitions](cross-blur-transitions.md) — Pair opacity 0↔1 with `filter: blur(2px) ↔ 0` over the same timing. Masks imperfect crossfades.
- [compose-subtract-asymmetry](compose-subtract-asymmetry.md) — Enter with 5 properties, exit with 3. Disappearance feels soft, not a reversed entrance.
- [distance-falloff-propagation](distance-falloff-propagation.md) — Per-element lift via `lift * pow(falloff, distance)` for grouped hover. Avatar groups, list rows.
- [multi-segment-shake](multi-segment-shake.md) — Form-error shake at 0%, 28.57%, 57.14%, 78.57%, 100% over 280ms with 4px overshoot.

## Removing, projecting, native

- [animation-removal-hazards](animation-removal-hazards.md) — Deleting an animation is not find-and-replace. Remove its start state, the code that waits for it, and the orphans it leaves; reduce before you delete, and keep motion that bridges a jarring change.
- [momentum-projection](momentum-projection.md) — On release, project where the flick would come to rest (current + (v/1000)·d/(1−d), d ≈ 0.998), snap to the target nearest that point, hand the release velocity to the spring, decide by velocity sign, run X and Y on separate springs, and always start from the on-screen value.
- [react-native-motion](react-native-motion.md) — Choose React Native motion mechanisms compatible with the actual application, gesture workload and supported devices. Profile release behaviour and preserve platform navigation and user preferences.

## Supporting nodes when relevant

- [prefers-reduced-motion](prefers-reduced-motion.md) — Provide an appropriate reduced-motion experience for the actual effect and audience, retaining visible content, state meaning and correct completion behaviour.

## Cross-cluster

- See [ai-default-tells](../anti-patterns/ai-default-tells.md) in [MOC-anti-patterns](../anti-patterns/MOC-anti-patterns.md) for animation tells (crossfading icons, gradient flourishes).
- See [animations-dev-curriculum](animations-dev-curriculum.md) for the external course pointer; don't duplicate course material here.
- When relevant, compare motion and audio timing using [sound-motion-sync](../sound/sound-motion-sync.md) in [MOC-sound](../sound/MOC-sound.md); causal cues and intentional editorial anticipation have different needs.
- When the thing that moves is vector, [svg-animation](../svg/svg-animation.md) in [MOC-svg](../svg/MOC-svg.md) owns the engine choice and the SVG-specific mechanics (transform-origin, stroke drawing, morphing).
