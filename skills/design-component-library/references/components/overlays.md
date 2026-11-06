# Overlay & Utility Components

Adapted component specification: use only the component and states required by the current task. Dimensions, variants and token names below are examples, not product defaults or mandatory new features. Recover approved tokens and prefer existing accessible components; web ARIA examples do not replace native platform semantics. A listed loading, error or selected state is a case to consider when applicable, not a required eight-state schema. No new workflow gate or manual record is introduced.

Floating surfaces and structural utilities. Overlays require focus management and dismissal patterns (use the platform’s current accessible widget pattern). Render via the [platform and token mapping](../platform-mapping.md).

---

## 1. Popover

Non-modal floating panel anchored to a trigger; can hold interactive content.

**Anatomy:** `[trigger] → [popover: arrow? + content + actions?]`

**Variants:** click vs. hover trigger, with/without arrow, rich content (forms, menus), confirmation popover.

**Positioning:** auto-flip/shift to stay in viewport; offset from trigger via the project’s spacing tokens; elevation `shadow.elevation.lg`.

**Candidate states:** closed, opening (`transition.enter` scale-in+fade), open, hover/focus within, interacting, closing (`transition.exit`), disabled trigger, error (async content).

**Accessibility:**
- Trigger `aria-expanded`, `aria-controls`; popover labelled by its heading.
- Non-modal: focus moves in on open but page stays interactive (unlike dialog). `Esc` closes + returns focus to trigger; click-outside closes.
- Distinguish from Tooltip (tooltip = brief, non-interactive, describes) and Menu (action list).

---

## 2. Command Palette

Keyboard-driven fuzzy search over commands/navigation (⌘K).

**Anatomy:** `[modal: search input → grouped results [item: icon • label • shortcut]]`

**Variants:** commands only, with navigation, with recent/suggested, nested pages, async results.

**Candidate states:** closed, open (focus in input), typing (filtering), result hover/active, selected (execute), empty (no matches → helpful empty state), loading (async), error.

**Accessibility:**
- Modal dialog containing a Combobox (`role="combobox"` + `role="listbox"` results); `aria-activedescendant` for the highlighted item.
- `↑/↓` navigate, `Enter` run, `Esc` close, typeahead; trap focus while open, restore on close.
- Announce result count; each item has an accessible name; shortcut hints are supplementary.

---

## 3. Divider / Separator

Visually and semantically separate content groups.

**Anatomy:** horizontal/vertical line, optionally with centered text or icon.

**Variants:** horizontal, vertical (inline, needs explicit height), with label ("OR"), inset, `border.style` solid/dashed (the project’s border tokens).

**States:** static (decorative or semantic).

**Accessibility:**
- Decorative: `role="presentation"` / `aria-hidden`. Semantic grouping: `role="separator"` (with `aria-orientation` for vertical).
- Color from `semantic.border.default`/`subtle`; never rely on a divider alone to convey grouping for screen readers. Use headings/landmarks too.
