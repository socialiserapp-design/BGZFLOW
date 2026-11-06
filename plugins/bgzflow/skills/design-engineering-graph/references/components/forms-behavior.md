> BGZFLOW adaptation: use this technical reference only for the current requested outcome. Existing user decisions, actual project architecture and host permissions govern. Numeric examples and aesthetic opinions below are options, not universal rules, new gates or authority to redesign. External products, model weights and licences need current verification before use; none is installed by reading this page. Use the same brief and private project records; do not modify installed learning files.

---
title: forms-behavior
summary: The semantics the platform gives you, then the details — label wiring, right input type and keyboard hints, 16px, focus-visible, autocomplete where it helps, decorations over the input, autofocus only on desktop modals, a real form so Enter submits, buttons that disable while submitting and re-enable in finally, failed submits that keep every value, no dead zones, confirmed destruction, prefilled everything, drafts that survive a refresh.
tags: [components, forms, inputs, buttons, keyboard]
---

# Forms — behavior

Forms are where users do real work, and they notice every rough edge: the label that doesn't focus the input, the page that zooms on iOS, the button that fires twice, the Enter key that does nothing. None of it is hard; it is easy to forget. [forms-validation](forms-validation.md) owns *when* to validate and how errors look; this node owns everything else a form has to do.

## Wire the platform first

- **Every input gets an associated label** — `for`/`id` or wrapping — so clicking the label focuses the field.
- **Right `type`** (`email`, `tel`, `url`, `number`, `search`, `password`): the correct mobile keyboard, native validation, and autofill come free.
- **Inputs, textareas, and selects at ≥ 16px** on touch viewports (see [line-behavior](../typography/line-behavior.md) for why not `maximum-scale`).
- **`:focus-visible`, never bare `outline: none`.** Keyboard users get the ring; mouse users don't see it on every click. Use a visible focus treatment that fits the approved identity and remains discernible on the actual backgrounds.
- **Real `<button>` elements.** A `<div onClick>` is invisible to keyboards and screen readers. Default `type="button"`.

## Browser behaviors, curated

Keep `autocomplete` **on** for identity, address, and payment fields — there it helps. Turn `spellcheck` and `autocomplete` **off** for usernames, search, codes, and slugs, and suppress password-manager overlays (`data-1p-ignore`, `data-lpignore`) where they don't belong. Ask for the keyboard you need: `inputmode="numeric"` for codes, `"decimal"` for amounts, `autocomplete="one-time-code"` on verification fields, and `enterkeyhint` (`search`, `send`, `done`) so the return key says what it does. Login passwords take `current-password`, signup and change-password take `new-password`.

## Decorations, focus, submission

- **Input adornments:** an overlay or sibling layout can work if the visual boundary, padding, naming and hit behaviour are correct. A decorative icon need not be clickable; actual clear/search controls need their own accessible operation.
- **Choose initial focus for the actual modal and input context** — unexpected keyboard opening can obscure content, but deliberate text-entry flows may benefit from it. Respect the requested interaction, actual input capability and meaningful safe focus target.
- **Wrap inputs in a `<form>`** so Enter submits. Textareas submit on Cmd/Ctrl+Enter.
- **Disable the submit control while the request is in flight** and change its label to say what's happening; that is the double-submit fix. Keep its width fixed so "Saving…" doesn't shove neighbours, and re-enable it in `finally`, or one failed request locks the form for good.
- **A failed submit says so and keeps every value.** `fetch` does not throw on a 500, so check `ok`; a `catch` that only logs is a silent failure; calling `reset()` before the response is checked wipes the user's work. Put the message beside the form and the field-level server errors beside their fields ([forms-validation](forms-validation.md)).
- **Press feedback** `scale(0.97)` on `:active` through a ~150ms transition — see [responsive-feedback](../motion/responsive-feedback.md).
- **Surface the shortcut** in the button's tooltip ("Save (⌘S)"), bound to Cmd on macOS and Ctrl elsewhere.

## Rows, danger, prefill

- **No dead zones.** The control, the label, and the gap between them are all clickable — wrap the row in one `<label>` or make the label `flex: 1`.
- **Consequential actions follow the approved confirmation/recovery policy** and spatially separated from the primary action, through the project's dialog primitive with a button that names the outcome ("Delete project"), a native confirmation can be appropriate in some environments. Use an unambiguous action label where the interface supports it. Prefer easy undo everywhere the action is reversible ([destructive-actions](destructive-actions.md)).
- **Prefill everything you can** from the logged-in user and the link context: a "change username" link lands on a form already carrying the current value, and a signup reached from an invite reads the `?email=` it carries.
- **Long forms survive an accident.** An editor, a multi-step flow or a settings page preserves the draft through an appropriate authorised storage/recovery strategy; a new navigation warning is a product choice, not an automatic requirement, so a stray back-swipe or refresh costs nothing.
- **Build on accessible primitives** (Base UI, Radix, React Aria) rather than hand-rolling focus management. The bar — focus, ARIA, keyboard — is non-negotiable whichever library you pick.

## When to apply

Any form, input, search field, login/signup, settings page, checkout, or submit handler — building or reviewing.

## Gotcha

Auto-advancing verification-code inputs feel clever until someone needs to correct a digit. Waiting for Tab is safer; if you auto-advance, Backspace must move back and select.

## Sources

- Emil Kowalski's design-engineering practice on forms, distilled by HKTITAN.
- Related: [forms-validation](forms-validation.md), [accessibility-baseline](accessibility-baseline.md), [touch-and-focus](touch-and-focus.md), [responsive-feedback](../motion/responsive-feedback.md).
