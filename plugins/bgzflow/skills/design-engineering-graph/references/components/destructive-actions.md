> BGZFLOW adaptation: use this technical reference only for the current requested outcome. Existing user decisions, actual project architecture and host permissions govern. Numeric examples and aesthetic opinions below are options, not universal rules, new gates or authority to redesign. External products, model weights and licences need current verification before use; none is installed by reading this page. Use the same brief and private project records; do not modify installed learning files.

---
title: destructive-actions
summary: Undo beats confirmation for frequent, reversible actions; confirm only what cannot be reversed, affects other people or destroys many items. A confirmation names the action and object in its title, the loss in its body, verb-plus-object on its buttons, focuses the safe button, and uses the actual approved recovery and error-prevention policy for consequential actions.
tags: [components, destructive, confirmation, undo, copy]
---

# Destructive actions

A confirmation dialog on every delete trains people to click through it, so the one that matters gets clicked through too. Decide **undo or confirm** first; then make whichever you chose impossible to misread.

## Undo or confirm

| The action | Pattern |
|---|---|
| Reversible and frequent — archive, move, delete into a trash | Act at once; offer undo in the result: "Project archived. Undo" |
| Irreversible, one item | Confirm |
| Irreversible, many items | Confirm, with the count |
| Affects other people | Confirm, and name who: "The 8 members of Design lose access." |
| An account, a workspace or a repository | Follow the approved consequential-action policy; do not add typed confirmation, a disabled-button gate or another hold merely because of this reference |

Undo is cheaper for the user and more honest about what happened. It is also the optimistic pattern — the server call can run behind it ([optimistic-updates](optimistic-updates.md)).

## A confirmation answerable without the body

- **Title** names the action and the object: "Delete 'Q3 report'?" — never "Are you sure?".
- **Body** says what is lost and what cannot come back, with counts: "This permanently deletes the report and its 4 comments."
- **Buttons** are verb plus object: `Delete report` and `Cancel` — never `Yes` and `No`.
- **Focus** lands on the least destructive action, so a reflexive Enter cancels ([keyboard-patterns](keyboard-patterns.md)).
- **The destructive button looks destructive** and nothing else does: the danger hue only on destruction, and a treatment clearly distinguishable from the ordinary action. Hue angle alone does not establish distinguishability. A red brand gives destruction a distinct treatment instead — outlined, with an icon — or it reads as the primary action ([palette-step-roles](../surface/palette-step-roles.md)).

## The undo toast is not a normal toast

It carries an action, so it stays until dismissed or gets at least 5 s and pauses while hovered or focused ([wcag-thresholds](wcag-thresholds.md)). It is announced with `role="status"`, and focus never jumps to it ([screen-reader-announcements](screen-reader-announcements.md)). A toast whose only undo link vanishes on a timer turns a reversible action into an irreversible one.

## Gotcha

"Delete" in a menu next to "Duplicate" and "Rename" with no separation is the most common destructive path that has neither undo nor confirmation. If undo is impossible and a dialog is too heavy, the third option is a distinct treatment — a separated group, the danger colour, a two-step press. Assess the actual loss, recoverability, user understanding and established policy. Propose a missing safeguard where warranted; the graph does not authorise a new customer-facing gate or assign severity from a generic pattern alone.

## Sources

- Jakub Krehel, interfaces skills (MIT, github.com/jakubkrehel/skills, HEAD `592aedc`, read 2026-10-25): `skills/better-writing/SKILL.md` (**Undo beats confirmation**), `patterns.md` (destructive flows), `better-accessibility/focus-and-keyboard.md` (focus the least destructive action), `better-colors/palette-structure.md` (the 15° status rule), `better-interface/SKILL.md` (the escalation trigger).
- Related: [forms-behavior](forms-behavior.md) (confirmed destruction), [strings-and-locale](strings-and-locale.md), [interfaces-reconciliation](../meta/interfaces-reconciliation.md).
