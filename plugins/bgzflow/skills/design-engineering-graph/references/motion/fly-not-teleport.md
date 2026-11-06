> BGZFLOW adaptation: use this technical reference only for the current requested outcome. Existing user decisions, actual project architecture and host permissions govern. Numeric examples and aesthetic opinions below are options, not universal rules, new gates or authority to redesign. External products, model weights and licences need current verification before use; none is installed by reading this page. Use the same brief and private project records; do not modify installed learning files.

---
title: fly-not-teleport
summary: When a component persists between two states, animate the change. Don't crossfade what should travel.
tags: [motion, continuity, philosophy]
---

# Fly, don't teleport

Benji Taylor: *"Avoid static transitions… we fly instead of teleport."*

When identity across a state change matters, movement or shared geometry can help explain continuity. A crossfade or instant update can also fit the approved motion and reduced-motion needs. Choose the actual meaning rather than treating movement as the only correct answer.

## The principle

> If a component occupies a space and will persist in the next phase, it should remain consistent.

Three corollaries:

1. **Persistent elements travel, they don't restart.** No re-animation of an element that was already on screen.
2. **Identity is communicated by motion.** A label that morphs from "Continue" to "Confirm" (sharing the letters "Con") tells the user it's still the same button. A button that crossfades is two buttons.
3. **Direction carries meaning.** A modal opening from the bottom should close to the bottom. A tab content that slid in from the right should slide out to the left only if the user navigated *back* — otherwise it should match the entrance direction.

## In practice

- **Tabs:** the underline (or background) of the active tab should *slide* between tabs, not disappear and reappear. React Aria's `LayoutGroup` pattern handles this.
- **List reorder:** Use `view-transition` or `FLIP` to animate items to new positions instead of jumping.
- **Modal hierarchy:** When stacking modals, the underlying modal recedes slightly (scale 0.96, blur 4px) — it doesn't disappear, because it will return.
- **Tray heights:** Successive trays in a multi-step flow should *vary in height* to make each transition unmistakable. Same-height trays look broken.

## The FLIP technique (vanilla)

```ts
// First — measure the starting position
const first = el.getBoundingClientRect();

// Last — measure the ending position (after layout change)
const last = el.getBoundingClientRect();

// Invert — calculate delta and apply transform
const dx = first.left - last.left;
const dy = first.top - last.top;
el.style.transform = `translate(${dx}px, ${dy}px)`;

// Play — transition to no-transform
requestAnimationFrame(() => {
  el.style.transition = "transform 250ms var(--ease-out-quart)";
  el.style.transform = "";
});
```

## When to apply

Any time a component changes position, size, or hierarchy between two states *and* exists in both. Especially: tabs, navigation, list reorder, modal stack, drawer-to-fullscreen, carousel.

## When NOT to apply

When the elements are conceptually different things. Two unrelated cards changing content should crossfade or just swap. Forcing motion between unrelated content is just decoration.

## Gotcha

The View Transitions API makes this easy on the modern web but has spotty support and is hard to debug. For production, hand-rolled FLIP or Framer Motion's `layoutId` is more reliable.

## Sources

- Benji Taylor — Family Values, "we fly instead of teleport."
- Emil Kowalski — Sonner, popover hierarchy.
