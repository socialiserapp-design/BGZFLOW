> BGZFLOW adaptation: use this technical reference only for the current requested outcome. Existing user decisions, actual project architecture and host permissions govern. Numeric examples and aesthetic opinions below are options, not universal rules, new gates or authority to redesign. External products, model weights and licences need current verification before use; none is installed by reading this page. Use the same brief and private project records; do not modify installed learning files.

---
title: optimistic-updates
summary: Update UI immediately on likely-success actions, reconcile or undo on failure. The fastest possible perceived latency.
tags: [components, ux, latency, mutations]
---

# Optimistic updates

When the user takes an action with high success probability — toggling a like, marking complete, renaming — update the UI *immediately*. Don't wait for the server. Reconcile when the server responds; undo if it failed.

This is the single largest perceived-latency improvement available without changing any infrastructure.

## The pattern

```ts
// Pessimistic — felt latency is the full server round-trip (~200–500ms)
const onToggleLike = async () => {
  await api.toggleLike(post.id);          // wait
  setLiked(!liked);                       // then update
};

// Optimistic — felt latency is zero
const onToggleLike = async () => {
  const previous = liked;
  setLiked(!liked);                       // update immediately
  try {
    await api.toggleLike(post.id);        // fire-and-confirm
  } catch (err) {
    setLiked(previous);                   // rollback on failure
    toast.error("Couldn't update. Try again.");
  }
};
```

The user perceives the action as instant. The server confirms (or denies) silently.

## When to use optimistic updates

- **Toggles** with high success rate: like, bookmark, follow, mute.
- **Marking complete** in a to-do list.
- **Rename** with reasonable validation already client-side.
- **Reorder** in a list.
- **Delete** when paired with Undo (see below).

## When NOT to use

- **Multi-step transactions** (payments, bookings) — confirmation is the design.
- **Destructive actions without Undo** — see below.
- **Actions where the server's response *changes* the UI in a non-trivial way** (e.g., posting a comment that triggers a complex moderation flow).
- **First-time actions in a flow** where failure is informative (sign-up, login).

## Pair destructive actions with Undo

For deletes, archives, and irreversible-feeling actions, the optimistic pattern is paired with an Undo toast:

```tsx
const onDelete = async (item) => {
  const previous = items;
  setItems(items.filter(i => i.id !== item.id));   // remove immediately
  const { undo } = toast.success("Deleted", {
    action: { label: "Undo", onClick: () => setItems(previous) },
    duration: 5000,
  });
  try {
    await api.delete(item.id);                     // happens during toast
  } catch {
    setItems(previous);
    toast.error("Couldn't delete. Restored.");
  }
};
```

The user gets instant feedback. The "real" delete happens during the 5-second toast window. Undo cancels the in-flight delete.

Gmail's "Send" with an undo window is the canonical example.

## Reconciliation strategy

When the server response includes a server-generated value (e.g., a new `id`, a `created_at`), your optimistic value needs to be replaced. Two approaches:

1. **Temporary client ID, then replace.** Generate a `temp_<uuid>` on the client; on server response, swap to the real id.
2. **Server-side ID generation pre-fetched.** Some APIs let you fetch an ID up front; use it for the optimistic value so reconciliation is a no-op.

## Gotcha

Optimistic presentation is a trade-off for reversible actions with a reliable recovery path; a client cannot know a remote operation will succeed. Keep pending/confirmed/failed/unknown states distinct and reconcile the original operation before retrying. Do not show authoritative completion of money, publishing or other consequential effects merely because local UI changed.

Also: optimistic updates that are not visually reversible (e.g., scrolling a list to a new item that was deleted on rollback) feel disorienting. Test the rollback path explicitly.

## Sources

- Vercel Web Interface Guidelines — "Optimistic updates," "No dead ends," "Provide Undo for destructive actions."
- Sebastian Markbåge — "Optimistic UI" patterns in React.
- Gmail's Undo Send (the canonical Undo-as-design example).
- Related: [empty-loading-states](empty-loading-states.md) (the alternative — when not to optimistically update), [responsive-feedback](../motion/responsive-feedback.md) (other perceived-latency wins), [forms-validation](forms-validation.md).
