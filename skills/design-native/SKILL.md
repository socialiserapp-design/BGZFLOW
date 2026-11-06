---
name: design-native
description: "Adapt an approved experience to its actual iOS, Android, desktop or resizable-window platform. Use for native navigation, input, safe areas, scalable text and adaptive layouts; select the installed stack-specific skill rather than forcing a migration."
---

# Fit the experience to the platform people use

Recover the actual supported platform, framework, versions, input methods and
approved identity. Read the relevant installed SwiftUI, React Native, Compose or
desktop specialist when it helps; use current primary documentation for uncertain
APIs. A web fix does not automatically require an iOS or Android implementation.
Preserve the chosen stack and working provider integrations unless the request
authorises a change.

Adapt by available window space, content and user task, not only a device name.
Consider a list/detail split, navigation rail, sidebar or single-pane route where
appropriate. Preserve selection, draft and navigation state across resizing,
rotation and pane changes. Respect safe areas, keyboard insets and relevant fold
or display boundaries. Check pointer, touch and keyboard behaviour actually supported.

Use platform conventions when they improve predictability, without silently
replacing an approved brand. Map fonts to scalable text styles, check enlarged
text and content expansion, and use semantic colours where suitable. Handle
right-to-left order and locale-sensitive content deliberately. Avoid copying web
pixel values into platform points or a screenshot's geometry into every window.

Check native presentation and lifecycle: sheets, back/dismiss, focus, interruptions,
background/foreground and permission results relevant to the requested feature.
Ask for a permission in context only when that feature is in scope. Haptics, sound,
glass materials and platform-specific ornament are choices, not required features.
For version-dependent APIs, inspect actual deployment targets and implement the
appropriate supported fallback rather than assuming the newest OS everywhere.

Verify affected journeys on the intended real platform. Use simulators and emulators
for relevant coverage, and distinguish them from physical-device proof. Test a
representative constrained environment when the change could affect responsiveness.
Do not demand every platform, a flagship or a new emulator for an unrelated edit.
Where hardware is unavailable, preserve that limitation and continue useful checks.

Use [design systems](../design-system/SKILL.md) for shared tokens,
[accessibility](../design-accessibility/SKILL.md) for actual access barriers and
[motion](../design-motion/SKILL.md) for affected effects. They use the same
[design contract](../bg-personal-product-design/references/design-contract.md)
and project evidence. [Sources](../../docs/design-skill-sources.md).
