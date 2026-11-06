> BGZFLOW adaptation: use this technical reference only for the current requested outcome. Existing user decisions, actual project architecture and host permissions govern. Numeric examples and aesthetic opinions below are options, not universal rules, new gates or authority to redesign. External products, model weights and licences need current verification before use; none is installed by reading this page. Use the same brief and private project records; do not modify installed learning files.

---
title: MOC-components
summary: The atoms users actually touch — hover states, empty/loading states, icons.
tags: [moc, components]
---

# MOC — Components

Components are where craft lives because users *touch* them. Their states are where most UIs get lazy.

## Nodes

- [hover-states-subtle](hover-states-subtle.md) — Hover is not lift-and-shadow. 1px shifts, color shifts, layered disabled state.
- [empty-loading-states](empty-loading-states.md) — Every data view has four branches — loading, empty, error, full. Empty states direct action; errors offer a specific recovery. Delay any indicator ~150ms, show one by 400ms — a skeleton for content, a spinner only inside a control, progress bars past 3s. Persisted state is correct on first paint.
- [icon-systems](icon-systems.md) — Keep coherent visual weight; intentional mixed sets are possible. 10-32px range. Match stroke to font weight. Lucide is overused.
- [cards-design](cards-design.md) — Design card grouping, hierarchy, actions and feedback around the actual content and approved visual language.
- [forms-validation](forms-validation.md) — Validate at input, not on submit. Inline errors beat error summaries. Soft validation while typing, hard validation on blur.
- [avatar-systems](avatar-systems.md) — Use real photos when available; fallback to deterministic generated avatars. DiceBear provides 30+ styles for the fallback.
- [interaction-personality](interaction-personality.md) — Unique microinteractions, easter eggs, contextual feedback, sound. Personality lives in how the product responds, not how it looks.
- [accessibility-baseline](accessibility-baseline.md) — Keyboard-everywhere, :focus-visible, hit targets, ARIA names on icon buttons, polite aria-live for async. The a11y floor below taste.
- [optimistic-updates](optimistic-updates.md) — Update UI immediately on likely-success actions, reconcile or undo on failure. The fastest possible perceived latency.
- [copy-voice](copy-voice.md) — Active voice, Title Case for headings + buttons, "&" over "and", 2nd person, numerals for counts, error messages guide the exit.
- [component-confusables](component-confusables.md) — The component pairs people reach for interchangeably but shouldn't — tooltip vs popover, badge vs tag, sheet vs drawer vs dialog. Pick by behaviour, not by looks.
- [forms-behavior](forms-behavior.md) — The semantics the platform gives you, then the details — label wiring, right input type and keyboard hints, 16px, focus-visible, autocomplete where it helps, decorations over the input, autofocus only on desktop modals, a real form so Enter submits, buttons that disable while submitting and re-enable in finally, failed submits that keep every value, no dead zones, confirmed destruction, prefilled everything, drafts that survive a refresh.
- [touch-and-focus](touch-and-focus.md) — Preserve core keyboard, touch and assistive access; choose platform-appropriate targets, visible focus, overlay behaviour and timer recovery for the actual interaction.
- [ui-polish-pass](ui-polish-pass.md) — The invisible finish, as a pass — antialiasing, constant weight on interaction, tabular numbers, no layout shift, real characters, states that stay put, a z-index scale, hit areas, optical alignment, native page scrollbars, designed empty states, inert decoration, no flash on refresh.
- [component-api-design](component-api-design.md) — A component API is a contract. Composition over configuration, compound parts sharing context, customization layered variants → size → className → asChild with className restricted on styled components, platform prop names, controlled and uncontrolled both, refs forwarded and props spread, type="button" by default.
- [dashboard-tells](dashboard-tells.md) — Design dashboard hierarchy and metric formatting for the actual domain, audience and approved product style; cited screen measurements are examples, not limits.
- [screen-reader-announcements](screen-reader-announcements.md) — Pick the announcement by a four-step ladder — focus move, aria-describedby, role="status", role="alert" — and stop at the first match. Live regions exist empty before their text changes; aria-busy around loads; alt text by purpose, not looks; sr-only boxes are 1px; aria-hidden never sits on or above anything focusable.
- [keyboard-patterns](keyboard-patterns.md) — The key maps a custom widget owes (ARIA APG): tabindex only 0 or -1, roving tabindex for composite widgets, aria-activedescendant for a combobox, showModal() or inert for dialogs, Escape closes the last thing opened, destructive confirms focus the safe button, and a client-side route change moves focus and retitles the page.
- [wcag-thresholds](wcag-thresholds.md) — The WCAG 2.2 A/AA numbers that turn a preference into a finding — 4.5:1 and 3:1 contrast, 3:1 focus rings, 24×24 targets, a single-pointer path for every drag, focus never hidden under sticky chrome, 200% text and 320px reflow, pause/stop/hide where the actual criterion applies. A finding cites one of these or a task an assistive-tech user cannot finish; 44px targets and heading outlines are recommendations.
- [strings-and-locale](strings-and-locale.md) — Inventory the existing strings before writing one; one noun per object, one verb per action. Build sentences whole in ICU with real plural categories, format every number, date and list through Intl, start buttons with a verb, make links name their destination, label toggles for the ON state, and keep in-progress and done strings parallel.
- [destructive-actions](destructive-actions.md) — Undo beats confirmation for frequent, reversible actions; confirm only what cannot be reversed, affects other people or destroys many items. A confirmation names the action and object in its title, the loss in its body, verb-plus-object on its buttons, focuses the safe button, and uses the actual approved recovery and error-prevention policy for consequential actions.

- [sonner-usage](sonner-usage.md) — Using and fixing Sonner. One Toaster at the root, toast() from client code only, theme and richColors set on purpose, a styling ladder that ends in headless toast.custom, and the causes behind missing, doubled, unstyled or buried toasts.
- [presence-signals](presence-signals.md) — Showing that another person is here, half here, or gone in a real-time product — an arrival that fills a ring, partial attention as a dashed outline, a leaving beat, live typing that resizes its bubble, reactions pinned where they were tapped in relative coordinates, shared activities that pause when one person leaves, and one colour per person everywhere. From Benji Taylor's Honk.
- [drawing-toolbar](drawing-toolbar.md) — A drawing or markup tool inside a product — a toolbar that changes shape instead of swapping panels, pens in a tray rather than a row of icons, strokes whose width answers speed or direction, an eraser that removes area, export that matches the screen exactly, defaults that are the shipping version, and a bar that stands up on the side of a phone. From Benji Taylor's Drawesome.

## Cross-cluster

- For button *motion*, see [responsive-feedback](../motion/responsive-feedback.md) in [MOC-motion](../motion/MOC-motion.md).
- For icon *animation*, see [animations-dev-curriculum](../motion/animations-dev-curriculum.md) (Emil's course) and [transform-opacity-only](../motion/transform-opacity-only.md).
- For *tray* / sheet UI, see [tray-rules](../motion/tray-rules.md) (Benji's six rules).
- For *page-level* layout (grids, viewports), see [MOC-layout](../layout/MOC-layout.md).
