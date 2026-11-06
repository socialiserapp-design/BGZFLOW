# Feedback & Status Components

This is an adapted reference recipe, not a request to add every illustrated control, field, state, mode or feature. Preserve the current user decisions, approved tokens, existing components and platform conventions. Dimensions and layouts are starting points; choose applicable states and check the actual affected result. No new permission, workflow gate, forced schema or manual record follows from this reference.

Communicate system status, progress, and outcomes. Status changes must reach assistive tech via live regions (the matching native/ARIA widget pattern). Render via the [platform and token mapping](../platform-mapping.md).

---

## 1. Toast / Notification

Transient, non-blocking message about a completed action or event.

**Anatomy:** `[icon] [title + message] [action?] [dismiss (x) ]`

**Variants:**
| Variant | Icon + Color | Token |
|---------|--------------|-------|
| Success | check / green | `semantic.feedback.success` |
| Error | alert / red | `semantic.feedback.error` |
| Warning | triangle / amber | `semantic.feedback.warning` |
| Info | i / blue | `semantic.feedback.info` |

**Behavior:** a short-lived nonessential notice may dismiss after roughly 4-6s when that fits the product. Preserve important messages and actions, pause timers on hover/focus and avoid hiding errors behind a fixed visible-count cap.

**Candidate states:** enter (`transition.enter` slide-up+fade), default, hover (pause timer), focus (within), dismissing (`transition.exit`), action-pressed, loading (in-toast progress), error.

**Accessibility:**
- Container `role="region" aria-label="Notifications"`; messages in a live region: `aria-live="polite"` (info/success), `role="alert"`/`aria-live="assertive"` (errors).
- Dismiss is a real button with `aria-label`. Never auto-dismiss content the user must act on.
- Elevation `shadow.elevation.2xl`.

---

## 2. Banner / Inline Alert

Persistent, contextual message tied to a region or page (not transient).

**Anatomy:** `[icon] [message + optional link] [action?] [dismiss?]`

**Variants:** info/success/warning/error; page-level (full-width, square edges) vs. inline (within a card, radius). Dismissible or sticky.

**States:** default, hover/focus on interactive parts, dismissing, disabled action.

**Accessibility:**
- Informational: `role="status"`. Critical/error: `role="alert"`.
- Color + icon + text (never color alone). Dismiss = labeled button.

---

## 3. Skeleton (Loading Placeholder)

Structural placeholder that mirrors final content while loading.

**Anatomy:** shapes (lines, blocks, circles) matching the real layout's geometry.

**Variants:** text lines, avatar/circle, card, table row, media block.

**Behavior:** a static placeholder can reserve final dimensions and prevent layout shift. Pulse or shimmer is optional, follows approved motion and stops under reduced motion; loading does not require an infinite loop.

**States:** loading (animated) → resolved (swap to content) / error (replace with error state).

**Accessibility:**
- Wrap loading region with `aria-busy="true"`; mark skeletons `aria-hidden="true"`.
- Reduced motion: disable shimmer, show static placeholder.

---

## 4. Progress

Communicate determinate or indeterminate progress.

**Anatomy:** bar track + fill, or circular ring; optional label/percentage.

**Variants:** linear bar, circular, indeterminate (unknown duration), segmented/stepped.

**Sizes:** sm/md/lg thickness; icon-ring sizes from the project’s sizing tokens.

**States:** in-progress (value 0-100), indeterminate (animated), success (complete), error (failed fill `feedback.error`).

**Accessibility:**
- `role="progressbar"` with `aria-valuenow/min/max` (omit `valuenow` when indeterminate).
- Label via `aria-label`/`aria-labelledby`; announce milestones politely, not every tick.

---

## 5. Empty State

Guide the user when there is no content yet.

**Anatomy:** `[illustration/icon] [headline] [supporting text] [primary action] [secondary?]`

**Variants:** first-use (guide to first action), no-results (search/filter: offer to clear), cleared (reassure), error/permission (explain + recover).

**Layout:** centered, generous whitespace, illustration sized via `sizing.aspectRatio` constraints; one clear primary action.

**Copy:** value → action (the product’s established voice). Never bare "No data".

**Accessibility:**
- Headline is a real heading in the page hierarchy.
- Illustration decorative (`aria-hidden`) unless it conveys meaning.
- Primary action is the natural next focus target.
