> BGZFLOW adaptation: use this technical reference only for the current requested outcome. Existing user decisions, actual project architecture and host permissions govern. Numeric examples and aesthetic opinions below are options, not universal rules, new gates or authority to redesign. External products, model weights and licences need current verification before use; none is installed by reading this page. Use the same brief and private project records; do not modify installed learning files.

---
title: empty-loading-states
summary: Every data view has four branches — loading, empty, error, full. Empty states direct action; errors offer a specific recovery. Delay any indicator ~150ms, show one by 400ms — a skeleton for content, a spinner only inside a control, progress bars past 3s. Persisted state is correct on first paint.
tags: [components, states, loading]
---

# Empty and loading states

Most UIs are designed for the "happy" state — data present, user knows what to do. The states that are actually painful to use are empty (no data yet) and loading (data not yet rendered).

## Empty states

A good empty state has three jobs:

1. **Explain what should be here.** "No projects yet."
2. **Direct the next action.** "Create your first project →"
3. **Optionally provide context or example.** Screenshot, demo data, learn-more link.

A bad empty state just says "Nothing here" and ends. The user is left wondering what to do next.

```tsx
<EmptyState
  icon={<FolderIcon />}
  title="No projects yet"
  description="Projects organize your work and let you invite collaborators."
  action={<Button>Create project</Button>}
/>
```

## Four branches per view

Every list, table, feed and dashboard has four states: loading, empty, error, full. The seeded dev account only ever shows the last. Find all four branches in the code; a missing applicable state can be a finding. Do not add fictional loading or error features to an inherently static surface. Size the empty state like the filled one so the first item doesn't shift the layout. An empty search says what was searched and offers to clear it. An error says what happened and offers a specific recovery (retry that refetches, a link somewhere that works); the framework's default error and 404 pages count as missing.

## Loading state choice tree

| Expected duration | UI |
|---|---|
| Short waits | Consider whether immediate feedback or a delayed indicator best preserves responsiveness without flashing; 150ms is an example. |
| Noticeable waits | Show appropriate progress or pending feedback for the actual task; skeletons, spinners, text and existing content each have valid uses. No universal 400ms deadline. |
| 3s–15s | Progress bar with percentage. |
| 15s+ | Progress bar + estimated time + cancel button. |

A centred spinner as the loading state of a list or page is a defect: it collapses the page, then everything jumps.

## Persisted state on first paint

A theme that flashes light, a sidebar that renders open then snaps shut: the stored value was read in an effect after the first paint. Theme: a blocking head script sets the class before paint. Server-rendered layout state (sidebar, density): a cookie read on the server. Client-only state: a lazy `useState` initializer, and nothing size-dependent renders until it is known. Banners that mount late (cookie, announcement, verify-email) overlay the page or are decided on the server.

## Skeletons

A skeleton placeholder hints at the **shape** of incoming content (rectangles where text will be, circles where avatars will be). It is *not* a decorative loading element.

```tsx
<div className="space-y-2">
  <div className="h-4 w-32 bg-zinc-200 rounded animate-pulse" />
  <div className="h-3 w-48 bg-zinc-200 rounded animate-pulse" />
</div>
```

Rules:
- **Match the real layout.** A skeleton list with 3 items should reveal to a list with ~3 items, same widths, same gaps. Otherwise the layout jumps when content arrives.
- **Size rows from the loaded row** (`height: 48px` because the real row is 48px, not a guess); lazy-loaded components get a sized fallback too.
- **A static skeleton, pulse or shimmer can fit.** Use the approved motion treatment, performance constraints and reduced-motion preference rather than requiring pulse.

## When to apply

- Every list, table, or content area: all four branches.
- Every async action: pick a loading pattern from the table.
- Every form submit: feedback under 100ms (a disabled button state), the pending label by 400ms.

## Gotcha

Don't auto-redirect from empty states ("nothing here, going to home..."). That feels like the app broke. Let the user see the empty state and choose the next step.

## Sources

- guidelines.sh — progress bars past 3s; skeletons hint at structure.
- Emil Kowalski's design-engineering practice, distilled by HKTITAN — the four branches, the 150ms delay and 400ms deadline, first-paint state.
- Emil Kowalski — Sonner skeleton patterns.
- Brad Frost — "loading state best practices."
