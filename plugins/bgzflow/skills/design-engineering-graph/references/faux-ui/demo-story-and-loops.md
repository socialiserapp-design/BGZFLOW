> BGZFLOW adaptation: use this technical reference only for the current requested outcome. Existing user decisions, actual project architecture and host permissions govern. Numeric examples and aesthetic opinions below are options, not universal rules, new gates or authority to redesign. External products, model weights and licences need current verification before use; none is installed by reading this page. Use the same brief and private project records; do not modify installed learning files.

---
title: demo-story-and-loops
summary: Choose a useful demo story, readable poster and honest loop reset; source beat counts, curves and timings are examples rather than compulsory motion budgets.
tags: [faux-ui, motion, story, loop, poster, choreography, timing]
---

# Demo story and loops

An animated product demo is a short film the viewer did not ask for, so every move needs a reason and the loop has to survive being watched twice.

## Pick the shape from what the product is valued for

- **How it feels to use:** the gesture is the story. A cursor does one satisfying thing and the result appears under its hand.
- **A flow in an app:** a few screens told as one continuous object, payoff on the last; no bolted-on second device.
- **What the system does:** the consequence lands somewhere else, and the link is drawn (a value on a connector, a card flying into a list). Usually no cursor.

Choose the story and composition that best explains the requested outcome. Visual calm is useful when it improves comprehension, not an overriding aesthetic rule.

## Beats

- **Choose length and beats for comprehension.** The source suggests 10–16s and 3–5 beats; one gesture and response or a longer explanation may fit better. A repeated beat can help emphasis or instruction; check whether it contributes to the intended story.
- **Open on a finished screen that works as a still**; the first real content is there before the first beat.
- **The payoff is visible at shown size** (a panel, a window coming forward, a clear state change) and **shows the intended state**; distinguish accidental missing content from a deliberate reveal or loading state.
- **A satellite arrives at the beat it pays off**, carrying its payload, or is present from frame one in a reserved column.
- **The poster is the frame most people see** (a thumbnail, reduced motion, a screenshot). Set it to the beat that tells the story on its own, with the result left on screen. Never a frame caught mid-change: a digit mid-roll held still reads as a glitch.
- **Motion without hierarchy is cut.** Cover each moving element in turn; if the story is clearer without it, it goes.

## Loops

- **Let the payoff remain readable.** A 2s hold is a source example; deliberate stillness has no maximum budget. Do not add motion just to keep the screen moving.
- **Every reset has a cause or is invisible**, in that order: a seen cause (undo with its keycaps, Clear, close), an exit around an anchor, a snap while hidden.
- **Make resets honest.** Hidden resets, fresh illustrative data or visible undo can work. An intentional editorial reverse must not be passed off as actual product behavior.
- **Distinguish editorial loops from demonstrations.** Show actual navigation when claiming a real workflow; a stylized reverse can fit an explicitly illustrative sequence.
- **Exit around an anchor:** what the story added leaves in one reverse stagger, 40–80ms apart, all moving within half a second, while product content stays. A growing story runs as a conveyor: exit the batch, bring fresh rows in from the crop.

## Pace

- **Source curve examples for unhurried storytelling:** travel `cubic-bezier(0.45, 0, 0.1, 1)`; arrival from nowhere `cubic-bezier(0.25, 0.8, 0.25, 1)` over 0.8–1 s.
- **UI feedback stays as quick as the real product** ([duration-table](../motion/duration-table.md)); only the story slows. Feedback starts on the input.
- **Related responses overlap:** a changed setting leads its label, then its dependents; the result still follows its cause. Stagger in reading order 40–80ms within a scene, 80–120ms between tiles of a grid ([stagger-choreography](../motion/stagger-choreography.md)).
- **Colour changes between distant hues take about 200ms**; they pass through mud however they are done.

## Things that change, arrive and leave

- **Change only what changed:** roll the changed span and carry what follows by its measured width. Button states share one slot sized to the largest. Numbers roll digit by digit, last digit first, unchanged digits still.
- **Inspect unintended pops and blank frames.** Overlapping outgoing and incoming states is one way to maintain continuity; a deliberate cut can also fit. A new row carries the rows below it. A resizing surface moves size, position and content as one transition, never stretching its text.
- **Choose the arrival language intentionally.** Opaque travel can convey physical continuity; fades, masks and hard cuts can also fit. Check unwanted blank frames and misleading layering rather than banning an effect.
- **One object, one trip** ([fly-not-teleport](../motion/fly-not-teleport.md)): open the room, measure the landing element itself (not its padded wrapper), fly; the flyer takes its resting look in the last third; choose settling and overshoot for the actual direction and accessibility needs.
- **An open popover holds the edge it opened from**; reserve the height of its longest list.

## Measured kit values

Source-reported Stageshow timing examples; verify the installed version and tune to the actual size, story and renderer:

| Motion | Value |
|---|---|
| Flight (`Fly`) | 750ms; x on `(0.35, 0, 0.2, 1)`, y on `(0.3, 0.6, 0.15, 1)` — separate axes make the arc; a 1.12 lift at 30% gone by 85% |
| Row opening (`Collapse`) | height 0.42 s `(0.4, 0, 0.2, 1)` after 50ms, content fading in over it; closing 0.46 s, content gone first |
| Rolling text (`Roll`) | incoming 0.55 s `(0.22, 1, 0.36, 1)`; outgoing 0.28 s, the new text starting 110ms later; width 0.5 s |
| Popover | scale 0.24 s `(0.22, 1, 0.36, 1)` from the side nearest its trigger, contents fading |
| Connector | draws over 1 s `(0.65, 0, 0.35, 1)` after both ends are placed, ends on a dot |
| Rolling digits (`Count`) | `(0.3, 0.75, 0.1, 1)` |

## When to apply

Scripting any animated faux UI: a hero loop, a hover-played feature card, a play-once docs demo.

## Gotcha

Matching endpoint screenshots prove nothing about the frames between. The bugs live in transit — a pill that hops 4px on its way in, one frame where everything has faded out — so the loop is filmed, not screenshotted ([demo-rehearsal](demo-rehearsal.md)).

## Sources

- Benji Taylor, Stageshow (MIT, HEAD `8020574`, read 2026-11-01): `references/motion.md` (story, loops, pace, changing text, arrivals), `references/choreography.md`, `kit/motion/Fly.tsx`, `Fly.css`, `Collapse.css`, `Roll.css`, `Popover.css`, `Connector.css`, `Count.css` (the timing table). Paraphrased; the values are his.
- Related: [demo-cursor-and-touch](demo-cursor-and-touch.md), [stageshow-reconciliation](stageshow-reconciliation.md) (where these curves differ from the product-UI defaults).
