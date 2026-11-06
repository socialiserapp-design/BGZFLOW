# Organisms

This is an adapted reference recipe, not a request to add every illustrated control, field, state, mode or feature. Preserve the current user decisions, approved tokens, existing components and platform conventions. Dimensions and layouts are starting points; choose applicable states and check the actual affected result. No new permission, workflow gate, forced schema or manual record follows from this reference.

Complex, multi-molecule components that form distinct sections of the interface. Each organism manages its own state and contains multiple interactive elements.

---

## 1. Header (App Bar)

The persistent top-level navigation bar.

**Composition:** `Logo` + `Navigation Items` + `Search Bar` + `Avatar/Actions`

**Example grid structure:**
```
┌─────────────────────────────────────────────────────────┐
│ [Logo]   [Nav Item] [Nav Item] [Nav Item]   [Avatar]│
│  ↑                   ↑                        ↑        │
│  Fixed width         Flex grow (center)        Auto     │
└─────────────────────────────────────────────────────────┘
```

**Dimensions:**
- Height: 64px (desktop), 56px (mobile)
- Horizontal padding: `spacing.page.inline-padding` / `page.inline-padding-lg`
- z-index: `z-index.sticky` (20) or `z-index.fixed` (30)

**Content Slots:**
| Slot | Content | Alignment |
|------|---------|-----------|
| Leading | Logo / hamburger menu (mobile) | Left |
| Center | Primary navigation / breadcrumbs | Center or left |
| Trailing | Search, notifications, avatar, CTA | Right |

**Variants:**
| Variant | Behavior |
|---------|----------|
| Static | Scrolls with page |
| Sticky | Sticks to top on scroll (`position: sticky`) |
| Transparent | Overlays hero; becomes opaque on scroll |
| Compact | Reduces height on scroll (64→48px) |

**Example responsive adaptations:**
- **Desktop (≥ lg):** Full horizontal nav
- **Tablet (md-lg):** Collapsed nav → hamburger menu or priority+ pattern
- **Mobile (< md):** Logo + hamburger + essential actions only

**Animation:**
- Scroll transition: opacity/height change over 200ms `ease-out`
- Mobile menu: slide from left, 250ms `ease-in-out`

**Accessibility:**
- `<header role="banner">`, once per page
- `<nav aria-label="Main navigation">` for primary nav
- Skip link: first focusable element is "Skip to main content"
- Mobile menu: `aria-expanded`, `aria-controls`, focus trap when open

---

## 2. Sidebar

A vertical navigation panel with hierarchical navigation and collapsibility.

**Example grid structure:**
```
┌──────────────────┐
│ [Logo / Collapse] │  ← Fixed header
├──────────────────┤
│ [Search]          │
├──────────────────┤
│ [Nav Group Label] │
│  [Nav Item]       │  ← Scrollable
│  [Nav Item]       │    navigation
│  [Nav Item ▸]     │    area
│   └ [Sub Item]    │
│   └ [Sub Item]    │
├──────────────────┤
│ [User / Settings] │  ← Fixed footer
└──────────────────┘
```

**Dimensions:**
- Width: `sidebar.default` (256px), collapsed: `sidebar.collapsed` (64px)
- z-index: `z-index.fixed` (30) on mobile overlay

**State Management:**
| State | Width | Content | Behavior |
|-------|-------|---------|----------|
| Expanded | 256px | Icons + labels | Default on desktop |
| Collapsed | 64px | Icons only + tooltips | User preference |
| Hidden | 0px | - | Mobile default |
| Overlay | 256px | Full, over content | Mobile when open |

**Collapse Animation:** Width transition 200ms `ease-in-out`. Text fades out at 150ms, icons remain.

**Example responsive adaptations:**
- **Desktop (≥ lg):** Persistent sidebar, push content
- **Tablet (md-lg):** Collapsed by default, expand on hover/click
- **Mobile (< md):** Hidden; hamburger triggers overlay with backdrop

**Accessibility:**
- `<aside aria-label="Sidebar navigation">`
- `<nav aria-label="Main navigation">` inside
- Collapse button: `aria-expanded="true/false"`, `aria-label="Collapse sidebar"`
- Collapsed: tooltips on hover/focus for icon-only items
- Overlay (mobile): focus trap, Escape to close, backdrop `aria-hidden="true"`

---

## 3. Form

A complete data entry container managing multiple Form Fields with validation.

**Example grid structure:**
```
┌──────────────────────────────────────┐
│ Form Title                           │
│ Description text                     │
├──────────────────────────────────────┤
│ Section Label                        │
│ ┌────────────┐ ┌────────────┐       │
│ │ First Name │ │ Last Name  │       │  ← 2-column row
│ └────────────┘ └────────────┘       │
│ ┌───────────────────────────┐       │
│ │ Email                     │       │  ← Full-width row
│ └───────────────────────────┘       │
│ ┌───────────────────────────┐       │
│ │ Message (textarea)        │       │  ← Full-width row
│ └───────────────────────────┘       │
├──────────────────────────────────────┤
│              [Cancel]  [Submit]      │  ← Action bar
└──────────────────────────────────────┘
```

**Layout:**
- Field gap: `spacing.stack.lg` (16px)
- Section gap: `spacing.stack.2xl` (32px)
- Column gap: `spacing.stack.lg` (16px)
- Grid: 2 columns (desktop) → 1 column (mobile)
- Action bar: right-aligned, primary action last (rightmost)

**State Management:**
| Form State | Behavior |
|------------|----------|
| Empty | All fields default, submit disabled/enabled |
| Dirty | Preserve drafts and indicate unsaved work as the existing flow requires; do not add a navigation hold automatically |
| Validating | Inline validation on blur (not on keystroke) |
| Submitting | Truthful pending state; protect against duplicate effects while preserving unrelated editing and input |
| Success | Success alert, optional redirect |
| Error | Scroll to first error, focus first invalid field, error summary |

**Validation Strategy:**
1. **On blur:** Validate individual field when focus leaves
2. **On submit:** Validate all fields, show all errors
3. **On fix:** Revalidate changed field immediately (not on blur again)
4. Error appears near the field without hiding instructions needed to repair it

**Accessibility:**
- `<form>` with `aria-label` or `aria-labelledby` pointing to form title
- Group related fields in `<fieldset>` with `<legend>`
- Error summary: `role="alert"` at top listing all errors with links to fields
- Submit: `aria-disabled` while loading, announce "Submitting..." via live region
- Preserve unsaved input through the agreed draft/recovery behaviour. A new navigation confirmation requires actual product authority, not this recipe.

---

## 4. Data Table

A structured data display with sorting, filtering, pagination, and row actions.

**Example grid structure:**
```
┌──────────────────────────────────────────┐
│ [Title]  [Filter] [Search]  [+ Add]     │  ← Toolbar
├──┬──────────┬────────┬──────┬───────────┤
│[ ] │ Name ↕   │ Status │ Date │ Actions   │  ← Header row
├──┼──────────┼────────┼──────┼───────────┤
│[ ] │ Item A   │ (green) Active │ Jan 1│ ⋯      │  ← Data rows
│[ ] │ Item B   │ (red) Error  │ Jan 2│ ⋯      │
│[ ] │ Item C   │ (neutral) Draft  │ Jan 3│ ⋯      │
├──┴──────────┴────────┴──────┴───────────┤
│ Showing 1-10 of 50    [< 1 2 3 4 5 >]  │  ← Pagination
└──────────────────────────────────────────┘
```

**Content Slots:**
| Slot | Features |
|------|----------|
| Toolbar | Title, filters, search, bulk actions, add button |
| Header | Column labels, sort indicators, select-all checkbox |
| Body | Data rows, inline editing, expandable rows |
| Footer | Pagination, row count, items per page |

**Features:**
- **Sorting:** Click header to toggle asc/desc/none
- **Filtering:** Column-specific or global search
- **Selection:** Checkbox per row + select all
- **Bulk actions:** Toolbar actions when rows selected
- **Row actions:** Overflow menu (⋯) per row
- **Empty state:** Illustration + message + CTA
- **Loading state:** Skeleton rows (5 rows)

**Cell Padding:** `spacing.component.table-cell-padding-*`

**Example responsive adaptations:**
- **Desktop:** Full table
- **Tablet:** Horizontal scroll with sticky first column
- **Mobile:** Card-based layout (each row becomes a card) or collapsible rows

**Accessibility:**
- Use `<table>`, `<thead>`, `<tbody>`, `<th scope="col/row">`
- Sort buttons in `<th>`: `aria-sort="ascending/descending/none"`
- Select all: `aria-label="Select all rows"`
- Row checkbox: `aria-label="Select [item name]"`
- Pagination: `<nav aria-label="Table pagination">`
- Status badges: don't rely on color alone; include text
- Announce sort changes and filter results via `aria-live="polite"`

---

## 5. Modal (Dialog)

A focused overlay that interrupts workflow for critical information or action.

> Reuse an appropriate existing, native or well-supported accessible dialog. A modal must manage focus and prevent interaction behind it while open, have an accessible name and modal semantics, support an appropriate close path, and return focus meaningfully. Native `<dialog>` can supply implicit semantics and focus behaviour. Do not build a new global primitive or add a modal merely to satisfy this reference.

**Example grid structure:**
```
┌──────────── Overlay ─────────────────┐
│                                       │
│   ┌────────────────────────────┐     │
│   │ [Icon] Title           [×] │     │  ← Header
│   ├────────────────────────────┤     │
│   │                            │     │
│   │ Content area               │     │  ← Body (scrollable)
│   │                            │     │
│   ├────────────────────────────┤     │
│   │       [Secondary] [Primary]│     │  ← Footer
│   └────────────────────────────┘     │
│                                       │
└───────────────────────────────────────┘
```

**Dimensions:**
| Size | Width | Use Case |
|------|-------|----------|
| sm | 400px | Confirmations, simple forms |
| md | 560px | Complex forms, details |
| lg | 720px | Multi-step, rich content |
| xl | 960px | Data-heavy, split views |
| full | 100% - 48px | Mobile |

**Tokens:**
- Background: `surface.card`, Overlay: `surface.overlay`
- Radius: `radius.modal` (12px)
- Shadow: `shadow.xl`
- z-index: `z-index.modal` (50)
- Padding: `spacing.component.modal-padding` (24px)

**Animation:**
- Open: overlay fade-in 150ms + modal scale(0.95→1) + fade-in 150ms
- Close: reverse at 100ms
- Respect `prefers-reduced-motion`: skip scale, use fade only

**Focus Trap:**
1. On open: focus the meaningful safe entry point; this may be a heading, input or non-destructive action rather than the first focusable element
2. Tab cycles only within modal
3. Escape closes modal
4. On close: return focus to trigger element

**Accessibility:**
- `role="dialog"`, `aria-modal="true"`
- `aria-labelledby` → title, `aria-describedby` → description
- Prevent focus and interaction behind a modal through native modal behaviour or appropriate `inert` handling. `aria-hidden` alone is not a focus trap
- See the matching native/ARIA widget pattern → Dialog

**Confirmation variant (destructive):**
- Use the approved destructive-action treatment with an unambiguous label. Its styling need not be identical to the trigger; preserve clarity, contrast and the existing design.
- The confirm label **restates the action** ("Delete account"), matching the title, not "Delete"/"OK"/"Yes" (the product’s established voice).
- For irreversible or consequential actions, follow the authorised product’s error-prevention and confirmation behaviour. Undo, review or another appropriate safeguard may fit; a new type-to-confirm field or customer gate is not authorised by this recipe. Check applicable accessibility requirements without claiming they universally require typed confirmation.
- Order: Cancel (secondary) then the destructive action; default focus goes to the safe path / the confirm field, never auto-focuses the destructive button.

---

## 6. Drawer

A panel that slides in from the edge for secondary content or navigation.

**Example grid structure:**
```
┌────────────────────────────────────────┐
│                            ┌──────────┐│
│         Main Content       │ [×]      ││  ← Drawer header
│         (dimmed)           ├──────────┤│
│                            │ Content  ││  ← Scrollable body
│                            │          ││
│                            ├──────────┤│
│                            │ [Actions]││  ← Optional footer
│                            └──────────┘│
└────────────────────────────────────────┘
```

**Variants:**
| Position | Width/Height | Use Case |
|----------|-------------|----------|
| Right | 320-480px | Detail panels, edit forms |
| Left | 256-320px | Navigation (mobile) |
| Bottom | 40-90vh | Mobile actions sheets |

**Tokens:**
- Same surface/shadow as Modal
- z-index: `z-index.overlay` (40) or `z-index.modal` (50) with backdrop

**Animation:**
- Slide from edge: `translateX(100%)` → `translateX(0)` over 250ms `ease-out`
- Backdrop: fade-in 150ms
- Respect `prefers-reduced-motion`

**Behavior:**
- With backdrop: blocks main content (like a modal)
- Without backdrop: inline, pushes content (persistent drawer)
- Swipe-to-close on touch devices (bottom/left/right drawers)

**Focus Management:**
- With backdrop: focus trap (same as Modal)
- Without backdrop: no focus trap, focus moves naturally

**Accessibility:**
- Same as Modal: `role="dialog"`, `aria-modal="true"` (if blocking), `aria-label`
- Escape to close
- Return focus to trigger on close
