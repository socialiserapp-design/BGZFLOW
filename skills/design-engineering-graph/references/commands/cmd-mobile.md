> BGZFLOW adaptation: use this technical reference only for the current requested outcome. Existing user decisions, actual project architecture and host permissions govern. Numeric examples and aesthetic opinions below are options, not universal rules, new gates or authority to redesign. External products, model weights and licences need current verification before use; none is installed by reading this page. Use the same brief and private project records; do not modify installed learning files.

---
title: cmd-mobile
summary: "/design-engineering mobile [file | screen | symptom]" — match what feels wrong on a phone to its platform cause, apply the one-line fix with its reason, and say plainly which fixes still need a real phone.
tags: [command, mobile, touch, fix]
---

# /design-engineering mobile

Alias: `native-feel`. **Posture: fixer.** Apply the fixes, keep each to the declaration that does the job, and never claim a fix is verified when only a device could verify it.

## Target

A symptom ("hover sticks", "the keyboard covers the button"), a screen, or the app's root layout. With nothing named, audit the root layout and global CSS against the baseline.

## Steps

1. Read [mobile-platform-layer](../layout/mobile-platform-layer.md) (viewport, keyboard, scroll, safe areas, status bar) and [touch-and-focus](../components/touch-and-focus.md) (hover, taps, hit areas, `touch-action`, video, focus).
2. **Match the symptom** to its row in the [touch-and-focus](../components/touch-and-focus.md) fixes table. With no symptom given, check the [mobile-platform-layer](../layout/mobile-platform-layer.md) baseline first: viewport meta, tap highlight, 16px inputs, gated hover, `dvh` shells.
3. **Apply the narrowest fix** in the project's own styling system, scoped to where its reason holds: `user-select: none` on controls, never on `body`; `touch-action: none` only on surfaces that own every axis; `overscroll-behavior: none` only in an app, not a document.
4. **Prefer CSS and meta tags over script.** No user-agent sniffing, no `useIsTouchDevice()` to hide hover, no `touchmove` + `preventDefault()`, no `maximum-scale=1`.
5. **Sort what you did** into verified from code and needs a phone. Sticky hover, the tap flash, URL-bar height, input zoom, tap delay, rubber banding, safe areas and the keyboard all need hardware.

## Output

A few lines, not a report:

- **What was wrong** — the symptom matched, with its one-line cause.
- **What changed** — one line per file and declaration.
- **What needs a phone** — each unverified fix with what to look for ("open the sheet on an iPhone; the bottom padding clears the home indicator").

## Hand-offs

- Gesture feel — drag, flick, snap, dismiss → [gesture-momentum](../motion/gesture-momentum.md), [momentum-projection](../motion/momentum-projection.md), or [cmd-motion](cmd-motion.md).
- Keyboard and screen-reader access → [cmd-a11y](cmd-a11y.md).
- Form behaviour beyond the keyboard (labels, Enter, autofill) → [forms-behavior](../components/forms-behavior.md).
- Content overflowing on a narrow screen → [cmd-break](cmd-break.md).
