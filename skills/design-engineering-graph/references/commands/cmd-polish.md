> BGZFLOW adaptation: use this technical reference only for the current requested outcome. Existing user decisions, actual project architecture and host permissions govern. Numeric examples and aesthetic opinions below are options, not universal rules, new gates or authority to redesign. External products, model weights and licences need current verification before use; none is installed by reading this page. Use the same brief and private project records; do not modify installed learning files.

---
title: cmd-polish
summary: "/design-engineering polish [target]" — the screen works but feels unfinished: check the phase, then run the polish pass (optical corrections, states, hairlines, cursors, focus) and apply the fixes.
tags: [command, polish, build]
---

# /design-engineering polish

**Posture: build.** Edit the code, then show what changed.

## Steps

1. **Check the phase first.** If the layout or hierarchy is still wrong, polishing it is wasted work. Say so and run [feeling-right](../philosophy/feeling-right.md) first ([skill-router](../meta/skill-router.md) §2).
2. Read [ui-polish-pass](../components/ui-polish-pass.md), [states-are-the-work](../philosophy/states-are-the-work.md), [gotchas](../meta/gotchas.md) and [pov](../meta/pov.md), plus the project's contract if one exists ([using-design-file](../meta/using-design-file.md)).
3. Walk the pass in order. Fix states before decoration: hover, focus, active, disabled, empty, loading and error ([empty-loading-states](../components/empty-loading-states.md), [touch-and-focus](../components/touch-and-focus.md)). Then the optical details: [border-radius](../surface/border-radius.md) nesting, [shadows-whisper](../surface/shadows-whisper.md), [line-behavior](../typography/line-behavior.md), [visual-imperfection](../surface/visual-imperfection.md).
4. Make the edits with the contract's tokens, using existing tokens or a justified task-scoped value; do not invent a token migration.

## Output

The edits, followed by a short [review-format](../meta/review-format.md) table of the changes that matter most (concise, with every material change and remaining gap preserved).

## Hand-offs

Motion feels off → [cmd-motion](cmd-motion.md). Mobile feels like a website → [cmd-mobile](cmd-mobile.md). Accessibility gaps → [cmd-a11y](cmd-a11y.md). Launch week, the whole app → [cmd-ship](cmd-ship.md). Worst-case data breaks the layout → [cmd-break](cmd-break.md).
