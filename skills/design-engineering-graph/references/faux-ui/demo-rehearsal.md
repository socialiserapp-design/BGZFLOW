> BGZFLOW adaptation: use this technical reference only for the current requested outcome. Existing user decisions, actual project architecture and host permissions govern. Numeric examples and aesthetic opinions below are options, not universal rules, new gates or authority to redesign. External products, model weights and licences need current verification before use; none is installed by reading this page. Use the same brief and private project records; do not modify installed learning files.

---
title: demo-rehearsal
summary: Check animated demos at their actual shown size and playback speed; inspect transitions, accessibility and loop recovery, with evidence proportionate to the affected work.
tags: [faux-ui, verification, filming, review, rehearsal, qa]
---

# Demo rehearsal

Agents check their work by reading the code back or taking one screenshot once it has settled. Neither shows the frames in between, which is where demo bugs live. A dress rehearsal runs the whole demo at real speed, films it, and reads every frame.

## Order

Check the requested journey and affected states, reusing unchanged evidence:

1. Inspect the opening, poster and payoff at the actual shipping sizes. Compare with the approved direction, not an unrelated brand's house style.
2. Play the sequence and, for loops, its reset into the next cycle. Check the themes and responsive states actually shipped; 390px is one example viewport, not an extra deliverable.
3. Inspect presses, morphs, hand-offs and seams finely enough to catch a brief pop. The source uses 40–80ms samples; frame stepping may be needed for faster defects.
4. Repair the largest demonstrated problem and repeat the affected checks. Avoid restarting the entire rehearsal after an unrelated edit.

Stageshow's `film.mjs`, `jumps.mjs` and `layout.mjs` are source examples of capture, snap detection and fitting checks. Use them only if available and compatible, or use existing browser tooling. A JSON report or `rehearsal passed` string is neither required paperwork nor proof of the viewer's result.

## Faults that are never intentional

The inherited heading names the source checklist; these are **possible findings**, not universal style prohibitions. Show the affected frame and explain the impact before changing an intentional composition.

| Finding to inspect | Evidence of a real problem |
|---|---|
| Crop or framing | Required content or controls become unreadable or unavailable; an intentional editorial crop alone is not a defect |
| Tight spacing | Text collides, controls become hard to use, or the chosen spacing system breaks; source examples use 8px insets and 4–6px title gaps, not universal thresholds |
| Empty pane or tall row | Hierarchy obscures the intended result; whitespace or comfortable targets can be intentional |
| Overlapping translucent fills | An unwanted compositing seam or loss of contrast |
| Unit wrapped | The value becomes ambiguous or hard to scan |
| Icon or mark mismatch | An inconsistent meaning, false identity or rights issue; approved custom icons and emoji are not categorically forbidden |
| Anchor or selection drift | Popovers or highlights visibly detach from their actual targets |
| Kit override | A demonstrated compatibility problem, not merely a departure from a kit's geometry |

Do not conceal a real failure by deleting the requested state, disabling a check or replacing the intended result with a placeholder.

## What the tools can't sign off

Watch actual playback and relevant interruption, pause, replay and offscreen recovery. Verify reduced-motion behavior preserves the information; a readable poster can be appropriate. Apply accessibility requirements for the actual surface, including pause/stop/hide where WCAG 2.2.2 applies. A virtual clock does not prove frame rate, and a narrow desktop viewport does not prove real touch behavior. State unavailable surfaces plainly rather than making the whole reply wait for an unrelated check.

## The fresh eye

Use independent scrutiny where risk or the existing release policy calls for it. Give the reviewer the original objective, approved direction and actual output, so they can check meaning as well as frames. Keep observed findings separate from the builder's explanation. Rank by user impact and evidence; platform conventions can still be wrong for the actual target or implementation.

## Hand over

Keep captures, findings, repairs and unverified states in the existing task evidence. No separate `REHEARSAL.md` is required. A useful compact record identifies the requested result, actual sizes/states checked, observed failure and repair, and anything not checked. Preserve failed evidence.

## When to apply

Review affected animated faux-UI behavior before claiming it works. Recheck the relevant transitions after a motion change; do not impose a whole-app pass for an isolated edit.

## Gotcha

Repeated green reports with the same visible defect mean the check is missing the problem. Improve the observation or seek a focused independent view rather than repeating identical runs.

## Sources

- Benji Taylor, Stageshow (MIT, HEAD `8020574`, read 2026-11-01): `references/rehearse.md`, `references/verify.md`, `references/review.md`, `scripts/film.mjs`, `jumps.mjs`, `layout.mjs`; benji.org/stageshow (why filming, not screenshots). Paraphrased.
- Related: [stress-scenarios](../meta/stress-scenarios.md), [review-format](../meta/review-format.md), [agentation-workflow](../meta/agentation-workflow.md).
