---
name: design-accessibility
description: "Find and repair accessibility barriers in the affected web or native journey: semantics, keyboard and focus, screen readers, contrast, zoom, target size and non-pointer alternatives. Use criterion-specific evidence rather than a blanket compliance claim."
---

# Check whether people can actually use the interface

Recover the affected journey, supported platforms and any applicable accessibility
target. Use the current relevant standard or platform guidance. Do not infer a
legal obligation or claim whole-product compliance from one screen or automated scan.

Prefer native semantic controls and proven accessible components. Inspect the
actual accessible names, roles, states and reading order. Extra ARIA can make a
working native control worse; for a custom widget, consult the matching WAI-ARIA
pattern and verify its keyboard behaviour rather than copying attributes alone.

Check the affected route with keyboard navigation: visible focus, sensible order,
entry/exit from overlays, focus restoration and no trap. Check that sticky layers
do not obscure the focused control. Provide an appropriate alternative where a
drag gesture is the only way to perform a required action. Keep accessible labels
consistent with the visible action and distinguish validation errors from service
failures. Preserve password managers and paste where authentication supports them.

Measure text and controls against the actual composite background, including
transparent layers and state changes. Check zoom, large/scalable text, long content
and reflow. WCAG 2.2 AA target-size minimum is 24 by 24 CSS pixels with specified
exceptions; do not label 44 by 44 as that requirement or translate CSS pixels
directly into native units. Larger targets may be appropriate for the actual users.

Reuse the project's accessibility tooling for deterministic findings, then test
the relevant interactions manually or through the supported device/browser tools.
For a screen-reader claim, use the actual supported assistive technology; markup
inspection and a clean automated report cannot establish that experience. Report
an unavailable device or test precisely, while continuing checks that are possible.

For each material finding, retain the reproduction, user impact, applicable
criterion and observed result in the existing issue/test record. Repair within
the authorised design; ask about an unresolved material identity or behaviour
change. Do not turn every advisory finding into a new customer-facing gate.
Retest the affected interaction and a relevant neighbouring state after repair.

Coordinate with [content](../design-content/SKILL.md), [motion](../design-motion/SKILL.md)
or [native design](../design-native/SKILL.md) only where needed. One shared
[design contract](../bg-personal-product-design/references/design-contract.md)
and evidence record govern. [Primary sources](../../docs/design-skill-sources.md).
