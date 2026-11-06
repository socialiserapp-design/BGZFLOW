---
name: design-component-library
description: Use detailed component anatomy, variant, state and accessibility specifications for advanced forms, navigation, overlays, calendars, trees, carousels and charts, with optional real-browser focus and RTL probes.
---
# Detailed component design and checking

Use the matching specification for the requested interface, alongside the design master or relevant specialist. This is a substantive adapted component reference library, not a second discovery workflow. Recover existing behaviour, user decisions and suitable packages before creating custom controls. Preserve the approved visual identity and current task authority.

Choose the reference that adds needed detail; the complete upstream component-spec set is available, with no requirement to read it all:

- [Atoms](references/components/atoms.md): buttons, inputs, labels, icons, badges, avatars, checkboxes, radios, switches and tooltips.
- [Molecules](references/components/molecules.md): form fields, search, cards, navigation items, alerts and dropdowns.
- [Organisms](references/components/organisms.md): headers, sidebars, forms, tables, modals and drawers.
- [Page templates](references/components/templates.md): dashboard, authentication, settings and list/detail examples.
- [Feedback](references/components/feedback.md): notifications, banners, skeletons, progress and empty states.
- [Icon system](references/components/icon-system.md): optical consistency, delivery and accessible names.

- [Advanced forms](references/components/forms-advanced.md): combobox, select, range, date/time picker, upload.
- [Navigation](references/components/navigation.md): tabs, breadcrumb, pagination, stepper, menu.
- [Overlays](references/components/overlays.md): popover, command palette, divider.
- [Data display](references/components/data-display.md): calendar, carousel, tree.
- [Charts](references/components/data-viz.md): bars, lines/areas, pie/donut, sparklines, scatter/bubble.

Read only relevant bodies. Use the listed anatomy and applicable states to compare the actual implementation; do not add optional components, variants, modes or a fixed eight-state schema. [Map](references/platform-mapping.md) example tokens and web semantics into the existing project and intended platform. Native HTML controls are valid; native apps use platform accessibility semantics.

For authorised web checking, [optional probes](references/probe-usage.md) perform actual keyboard focus and RTL-overflow observations. They require existing Playwright and a browser, never auto-install or change hooks, and do not use a signed-in personal profile. They can interact with the target page, so use only the authorised test instance or owned fixture. A missing dependency or failed navigation is unavailable evidence, never a pass. Source scripts grant no access or permission to open other targets.

Check the actual requested journey and resulting state as well as the widget. A focus or overflow result alone does not certify accessibility, a saved effect, safe billing or a release. Keep current decisions, failures and unavailable surfaces in the existing supported records; no additional interview, receipt or gate is required. [Source and adaptation](SOURCES.md).
