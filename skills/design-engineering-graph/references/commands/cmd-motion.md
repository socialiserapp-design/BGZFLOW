> BGZFLOW adaptation: use this technical reference only for the current requested outcome. Existing user decisions, actual project architecture and host permissions govern. Numeric examples and aesthetic opinions below are options, not universal rules, new gates or authority to redesign. External products, model weights and licences need current verification before use; none is installed by reading this page. Use the same brief and private project records; do not modify installed learning files.

---
title: cmd-motion
summary: "/design-engineering motion [remove | opportunities | audit] [target]" — decide whether motion should exist, then judge or build timing, easing, springs, transitions, gestures and stagger with concrete values; subtract over-animation, find the few places that should move, or audit a codebase into executable plans.
tags: [command, motion, judge, decide, build, audit]
---

# /design-engineering motion

**Posture: decide first, then judge (code in hand) or build (greenfield).** The modes below change the posture; bare `motion` is judge or build.

## Steps

1. Read [animation-decision-framework](../motion/animation-decision-framework.md). Assess the requested/approved motion and actual problem. Recommend a material experience change when needed, without removing an approved effect solely because it fails a generic taste test or stopping already authorised independent work.
2. Classify the pattern and open only its nodes:
   - enter or exit → [easing-curves](../motion/easing-curves.md), [duration-table](../motion/duration-table.md), [never-scale-from-zero](../motion/never-scale-from-zero.md), [compose-subtract-asymmetry](../motion/compose-subtract-asymmetry.md)
   - hover or press → [hover-states-subtle](../components/hover-states-subtle.md), [responsive-feedback](../motion/responsive-feedback.md)
   - drag, swipe or momentum → [gesture-momentum](../motion/gesture-momentum.md), [spring-animations](../motion/spring-animations.md)
   - lists → [stagger-choreography](../motion/stagger-choreography.md)
   - a state change in place → [fly-not-teleport](../motion/fly-not-teleport.md), [cross-blur-transitions](../motion/cross-blur-transitions.md)
   - jank → the jank branch below
   - React Native or Expo → [react-native-motion](../motion/react-native-motion.md)
   - a canonical CSS transition → the transitions.dev catalog, values checked against [duration-table](../motion/duration-table.md)
3. Apply [prefers-reduced-motion](../motion/prefers-reduced-motion.md), [gotchas](../meta/gotchas.md) and [pov](../meta/pov.md).

## Build sequence (greenfield)

Run in order; steps 1–2 can end the job with zero code, which is a valid result.

1. **Repetition and input** — keep frequent and keyboard interactions immediate, readable and accessible; neither frequency nor keyboard input automatically disqualifies motion.
2. **Purpose** — explain the intended user value in context; no compulsory label or stop condition follows from this framework.
3. **Tool** — the cheapest that works (CSS transition → `@starting-style` → CSS animation → WAAPI → Motion).
4. **Properties** — compare measured rendering cost and correct geometry; choose an origin that explains the interaction ([transform-opacity-only](../motion/transform-opacity-only.md)).
5. **Curve and duration, or a spring** — from [easing-curves](../motion/easing-curves.md), [duration-table](../motion/duration-table.md), [spring-animations](../motion/spring-animations.md); use existing tokens or a justified measured value; do not claim an untested number is validated.
6. **Interruption and exit** — transitions for anything fired twice a second; exit along the entry path, quieter.
7. **Reduced motion and hover gating** — ship with the animation, not after.

Output the code, then three lines: gate result, ingredients, and what to feel-check (2–5× slow motion, real device) ([debugging-animations](../motion/debugging-animations.md)).

## Jank branch

Name the cause before changing code. Walk the diagnosis order in [performance-discipline](../motion/performance-discipline.md): property tier → busy main thread → per-frame React state → content-growth (inherited CSS variable) → animated CSS variable → blur over 20px → only then `will-change`. Report each finding as `file:line` · Cause · Before · After · Verified (from code / needs a device recording), ordered layout before paint, busy before idle.

## `motion remove`

For a request specifically to reduce motion, preserve its scope; otherwise adjust the requested effect rather than assuming subtraction is the only permitted repair. Inspect affected animations for task interference, readability, actual cost and motion preferences. Do not impose a frequency gate or record a branch for every animation. Check [animation-removal-hazards](../motion/animation-removal-hazards.md) before each delete or reduce, edit, clean up orphans, grep removed names. Report: Removed and reduced (location · was · verdict · branch), **Kept** with the purpose that saved each, badly built survivors handed to `audit`, then a one-paragraph verdict. Propose, never perform, a dependency removal.

## `motion opportunities`

Read-only. Hunt feedback gaps, teleporting state, missing spatial story, all-at-once groups, physics-less gestures and flat rare moments. Every candidate passes four questions — frequency, purpose, speed (fits the budget), function (data being read doesn't move). Return concise concrete findings without a fixed row count (location · today · purpose · frequency · exact motion values), a required **Rejected** list naming the question that killed each, and the single highest-leverage pick. "Nothing survives" is a good result.

## `motion audit`

For a planning-only request, preserve source and use the existing brief or plan; no new `plans/` directory is required. Existing authorised implementation work may continue.

1. **Recon** — stack and motion libraries, existing easing and duration tokens, product personality, a frequency map.
2. **Audit** eight categories: purpose and frequency, easing and duration, origin and physicality, interruptibility, performance, accessibility, cohesion and tokens, missed opportunities. Use independent workers only when useful, supported and authorised; no fixed council is required.
3. **Vet** every finding at its `file:line`; drop by-design and exempt cases. One table by leverage, severity HIGH (feel-breaking) / MEDIUM / LOW. Ask about a consequential unresolved product choice; continue engineering work already covered by the task.
4. **Plan** the relevant action and ownership in the existing plan, linked to the actual candidate where needed: problem with current code quoted, exact target values, repo conventions with an exemplar, ordered steps, boundaries (stop if the code drifted), mechanical checks and a feel-check. Update `plans/README.md` with order and status.

## Output

- Code in hand: the [review-format](../meta/review-format.md) table. Every After names its numbers: the duration in ms, the easing token or curve, the properties animated.
- Greenfield: the build-sequence output above, each value citing a `node (upstream companion; not bundled)`.

## Hand-offs

A launch film's motion → [cmd-film](cmd-film.md); launch-film values do not transfer to UI ([launch-video-motion](../launch-video/launch-video-motion.md)). An SVG that moves → [cmd-svg](cmd-svg.md) `animate`. Sonner setup or bugs → [sonner-usage](../components/sonner-usage.md). You may delegate to the `motion-auditor` subagent where the host has it.
