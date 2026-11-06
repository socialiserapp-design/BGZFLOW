> BGZFLOW adaptation: use this technical reference only for the current requested outcome. Existing user decisions, actual project architecture and host permissions govern. Numeric examples and aesthetic opinions below are options, not universal rules, new gates or authority to redesign. External products, model weights and licences need current verification before use; none is installed by reading this page. Use the same brief and private project records; do not modify installed learning files.

---
title: keyboard-patterns
summary: The key maps a custom widget owes (ARIA APG): tabindex only 0 or -1, roving tabindex for composite widgets, aria-activedescendant for a combobox, showModal() or inert for dialogs, Escape closes the last thing opened, destructive confirms focus the safe button, and a client-side route change moves focus and retitles the page.
tags: [components, accessibility, keyboard, focus, aria, apg]
---

# Keyboard patterns

Native elements ship their keyboard behaviour; a custom widget has to rebuild it, and the rebuild is where it fails. Before writing one, check that a native element or a headless library (Radix, React Aria) can't do it ([accessibility-baseline](accessibility-baseline.md)). If you do write one, it owes these key maps — the ARIA Authoring Practices patterns — exactly.

## tabindex has two legal values

- `tabindex="0"` joins the natural tab order. Only for a custom control that is not natively focusable.
- `tabindex="-1"` is focusable from script only: a heading you move focus to, a dialog container, a roving-tabindex member.
- A positive `tabindex` hijacks the order of the whole page. Fix the DOM order instead.

## One tab stop per composite widget

Typical ARIA composite patterns use one Tab stop; follow the actual widget pattern and platform conventions rather than forcing every group into the same model. With **roving tabindex** the active item is `0`, every other `-1`, and the arrow keys move both focus and the `0`. A combobox keeps DOM focus in its input instead: `aria-activedescendant` on the input points at the highlighted option's `id` and moves with the arrows.

| Widget | Keys |
|---|---|
| Dialog | Tab / Shift+Tab cycle inside and wrap; Escape closes |
| Tabs | Arrows move (wrapping); Home / End jump; Tab leaves to the panel. Automatic activation when panels render instantly, manual (Enter / Space) when switching is expensive |
| Menu button | Enter, Space or ↓ opens on the first item; ↑ opens on the last; Escape closes and refocuses the button |
| Disclosure, accordion | The header is a `<button aria-expanded>`; Enter and Space toggle |
| Combobox | ↓ opens or moves in; Enter accepts; Escape closes back to the input; typing filters |
| Listbox, radio group | Arrows move the selection; one Tab stop for the group |

Escape dismisses whatever opened **last** — tooltip, then menu, then dialog. Enter in a single-line input submits natively; in a `<textarea>` it is a newline, and ⌘ / Ctrl+Enter submits only because you wired it ([forms-behavior](forms-behavior.md)).

## Dialogs: trap, then give back

Prefer `<dialog>` opened with `showModal()`: the background goes inert and Escape closes, for free. A custom overlay needs `role="dialog"`, `aria-modal="true"`, a name through `aria-labelledby`, and `inert` on everything behind it — one property that removes the background from both the tab order and the accessibility tree.

On open, focus the first focusable element; **in a destructive confirmation, focus the least destructive action** so a reflexive Enter cancels ([destructive-actions](destructive-actions.md)). On close, return focus to the trigger, or the nearest logical container if the trigger is gone ([touch-and-focus](touch-and-focus.md) rule 7).

## Client-side navigation announces nothing

A router swap resets neither focus nor the title. On a meaningful client-side navigation, update the title and move focus to an appropriate destination if the router/platform does not already do so. Preserve context for in-place filters, tabs and restored history; focusing h1 on every URL change can disrupt the task.

## Focus that stays visible

Use :focus-visible where appropriate; :focus is also valid when the interaction requires an indicator for pointer or programmatic focus. Prefer the browser's own ring — adding only `outline-offset: 2px` keeps it, and it already adapts to platform and forced colours. A custom ring is allowed when it is a verified token that clears 3:1 against **every** colour it crosses, and the focused element is never fully hidden under sticky chrome (`scroll-padding-block-start`, [growth-and-overflow](../layout/growth-and-overflow.md)). The numbers are in [wcag-thresholds](wcag-thresholds.md).

## Gotcha

`role="tab"` with no `onKeyDown` is a tab the mouse can use and the keyboard cannot: it looks finished in every screenshot. Grep for `role="button"`, `role="tab"`, `role="menuitem"` and check each has the key map above, or swap it for the native element.

## Sources

- Jakub Krehel, interfaces skills (MIT, github.com/jakubkrehel/skills, HEAD `592aedc`, read 2026-10-25): `skills/better-accessibility/SKILL.md` (**Full keyboard support**, **Trap and restore focus**), `focus-and-keyboard.md`.
- W3C ARIA Authoring Practices Guide — dialog, tabs, menu button, disclosure, combobox, listbox patterns.
- Related: [screen-reader-announcements](screen-reader-announcements.md), [component-confusables](component-confusables.md), [interfaces-reconciliation](../meta/interfaces-reconciliation.md).
