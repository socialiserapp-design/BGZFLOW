> BGZFLOW adaptation: use this technical reference only for the current requested outcome. Existing user decisions, actual project architecture and host permissions govern. Numeric examples and aesthetic opinions below are options, not universal rules, new gates or authority to redesign. External products, model weights and licences need current verification before use; none is installed by reading this page. Use the same brief and private project records; do not modify installed learning files.

---
title: animated-hit-testing
summary: Keep animated hit targets predictable. Drawn-position testing is the safe starting point; destination hit-testing is a specialised repeated-action option that must not activate a different consequential target.
tags: [motion, interaction, hit-testing, drag, springs, touch, lists]
---

# Animated hit testing

An animated element has two positions: where it is **drawn** this frame, and where its spring is **heading**. Use the drawn position for ordinary targets. Destination hit-testing is an optional specialised behaviour for predictable repeated dismissals; do not use it where the user could activate a different unseen, destructive or paid target. A stack of toasts sliding up after one is dismissed is the test. With destinations, three presses 80 ms apart on the same spot near the top dismiss three toasts, the way rapid clicks on one spot close Safari's tabs one after another. Against drawn positions only the first lands: the second and third hit the gap a toast is still sliding up to fill.

```js
// Optional specialised repeat-dismissal behaviour; not a general activation rule
const hit = items.findIndex(item => contains(item.destRect, pointer))
// the start of a drag: test what the user sees under the finger
const grabbed = items.findIndex(item => contains(item.drawnRect, pointer))
```

The pointer and the rectangles must share one coordinate space. Inside a scroll view, convert the pointer first: `pointerYLocal = pointerY + scrollTop`.

## Drag and release

- **Pin the spring during the drag.** Set both position and destination to the pointer each move (`x.pos = x.dest = dragX`), so the element sits under the finger with no springy lag. On release, the layout sets a new destination and the spring takes it there, carrying the release velocity ([gesture-momentum](gesture-momentum.md)).
- **Three depth bands.** The dragged item sits on top, the just-released item stays above the rest while it animates back, and everything else keeps its stable order underneath. Dropping the released item back into normal order on `pointerup` makes it slide *under* its neighbours on the way home. Clear the "last dragged" mark once its position and scale have settled ([z-index-strategy](../surface/z-index-strategy.md)).
- `user-select: none` on the draggable, so a drag never starts a text selection.

## Select on release in a scroll list

In a list the user scrolls by touch, a press can't select a row: the press that starts a scroll ends in `pointercancel`, and a selection on press would fire on every scroll. Select the row under the **release**, and only when the press also started on the list. A release can follow scrolling; track movement and cancellation with the actual gesture system before treating it as a tap. Read `scrollTop` at the top of the frame so the row under the release matches what is drawn.

## When to apply

Toasts, tab strips, reorderable lists, stacked cards, anything a user can press twice before its animation ends ([sonner-principles](sonner-principles.md), [responsive-feedback](responsive-feedback.md)). A press that starts a drag still grabs the drawn position.

## Gotcha

Two destinations can overlap, for example while items swap places, and then a press can hit both. Pick one deliberately (the topmost destination, or the one whose drawn rectangle also contains the pointer), or the result depends on array order. A press during motion can otherwise act on an unseen different element. Avoid that mismatch for consequential actions; verify target identity, pointer capture/cancellation and keyboard/assistive alternatives.

## Sources

- Cheng Lou, chenguini (MIT, HEAD 84fb27d): `docs/ui.md` "Hit Testing", `docs/Input.md` "Pinning Springs During Drag", "Z-Index During Drag & Release", "CSS for Drag".
- Cheng Lou, handwired (MIT, HEAD 257856e): `docs/behavior-choices.md` "Hit-test destinations instead of drawn positions" (the three-press toast measurement) and "Scroll a list natively, and select a row at the release".
- Related: [spring-animations](spring-animations.md), [gesture-momentum](gesture-momentum.md), [touch-and-focus](../components/touch-and-focus.md), [frame-rate-independence](frame-rate-independence.md).
