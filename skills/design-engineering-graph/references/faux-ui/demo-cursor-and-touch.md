> BGZFLOW adaptation: use this technical reference only for the current requested outcome. Existing user decisions, actual project architecture and host permissions govern. Numeric examples and aesthetic opinions below are options, not universal rules, new gates or authority to redesign. External products, model weights and licences need current verification before use; none is installed by reading this page. Use the same brief and private project records; do not modify installed learning files.

---
title: demo-cursor-and-touch
summary: Represent the actual pointer, keyboard or touch interaction clearly; use the source distance-based timing and drag recipes as adjustable examples.
tags: [faux-ui, cursor, drag, touch, phone, camera, demo]
---

# Demo cursor and touch

A cursor in a demo is a character: it moves like a hand, presses visibly, and every move goes somewhere for a reason. No cursor is also a choice. Keyboard focus and spotlights can be appropriate when they accurately explain the input or narrative.

## The pointer

The following formulas and dwell values are Stageshow examples, not mandatory timings. Match the actual platform/input behavior and keep the result legible.

- **Travel is timed by distance on a shallow arc:** `clamp(260 + 0.9 × distance, 300, 650)` ms on an ease-in-out, bowing sideways by `min(0.08 × distance, 24)` px. Short hops are quick; long trips don't drag.
- **A press reads:** a 120ms dwell on arrival, the pointer dips to 0.9 over 80ms, holds 100ms, and releases over 260ms on `(0.22, 1, 0.36, 1)`. The pressed control shows its own product press ([responsive-feedback](../motion/responsive-feedback.md)), and the state changes after the click completes.
- **The kind comes from the element** (I-beam over text, hand on a link, open hand over something draggable, crosshair on a canvas, resize arrows on edges and corners), switching according to the actual platform behavior. Smooth morphing is an illustration option, not a required replacement for real pointer changes.
- **Keep the important label readable:** aim inside the target, off its text (about 85% across, 60% down). Resting on empty surface can reduce occlusion; the source fades after about 4s, but a stationary or differently timed pointer can be intentional.
- **It stays where the press happened** while the result changes size.
- **Use a coherent cursor language for the intended context,** so every demo on a page points the same way. On a dark stage the I-beam turns white with a dark edge.
- **Keyboard stories show the keys** as keycaps, placed clear of anything open.

## Drags and selection

- **A mouse drag is one motion:** the thing follows the pointer the whole way and leaves on release. Drag time `clamp(360 + 1.1 × distance, 450, 900)` ms.
- **Pickup belongs to the press**; a drag starts where the thing is, and the grab offset is where the hand took hold, kept through travel and release. A file from outside enters already held.
- **A carried card is held, not slid:** scale 1.03, a deeper shadow, a degree or two of tilt with its words tilting too, flat on drop, no selection outline in the air.
- **Keep the drop relationship intelligible:** the source moves a slot cell to cell rather than chasing the card; preserve actual product behavior when demonstrating it. Moving a card between lists closes the source slot on lift and opens the destination in flight.
- **A text selection reads left to right from a word boundary and stays under the I-beam on every frame**, driven from the pointer's position, not grown by time.

## Scroll and camera

- **Represent the actual scroll input.** A pointer, keyboard, touch or explicitly automatic demonstration can initiate scrolling. Start with whole rows; fade only the edges hiding content once scrolled. Scroll time `clamp(420 + 1.2 × distance, 500, 1400)` ms, and choose an honest loop reset; scrolling back before the seam is one option.
- **The camera needs a reason:** push in only when the payoff would be too small to read at shown size. Frame the wide shot as a good still first; use as many purposeful camera moves as the story needs, checking their interaction with the pointer.

## Phones

- **Use the actual phone input:** touch is commonly shown with a dot where the finger taps or drags; pointer or keyboard use is valid when the actual device supports it. It shows 140ms before a tap and lingers 240ms after the lift.
- **For an iOS-style example, the source uses:** `cubic-bezier(0.3, 0.75, 0.1, 1)` over 0.5 s; a card opens into its screen as one object.
- **A swipe is a flick:** a third of the screen in about a quarter second (`clamp(180 + 0.5 × distance, 240, 300)` ms), lifting while still moving; what it threw carries on at that speed, thrown over 0.5 s on `(0.25, 1, 0.5, 1)`. A swiped row's action is its own back, edge to edge, revealed as the row slides off it.
- **Demonstrate the supported interaction:** opening a notification, quick reply or another actual route can fit the task; do not invent or exclude a real capability.
- **If the target actually includes Dynamic Island, a source example is:** animate the black shape's box and radius together, content on its own layer; about 500ms growth, 380ms shrink after a 120ms delay, a 0.965 press squeeze.

## Typing

Stageshow types at 35ms a character (about 28 a second), which suits a short string the viewer only needs to recognise. A prompt that carries the argument types at read speed, about 15 a second ([launch-video-ui-demo](../launch-video/launch-video-ui-demo.md)).

## When to apply

Any faux UI with a pointer, a drag, a selection, a scroll, a camera move or a phone gesture.

## Gotcha

A cursor resting on the button it just pressed, or parked on the label it is about to change, hides the one thing the beat is about. Move it off as soon as the press lands.

## Sources

- Benji Taylor, Stageshow (MIT, HEAD `8020574`, read 2026-11-01): `references/motion.md` (the cursor, drags and selection, scrolling and the camera, phones in motion), `kit/act.ts` (move, click, drag and scroll timing; touch dwell), `kit/cursor.css` (press scale and release curve). Paraphrased; the numbers are from his code.
- Related: [demo-story-and-loops](demo-story-and-loops.md), [gesture-momentum](../motion/gesture-momentum.md), [stageshow-reconciliation](stageshow-reconciliation.md).
