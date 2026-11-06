# Map the specification to the existing product

For the requested component, recover its current semantics, approved tokens, supported input devices and state. Prefer a suitable existing component or open-source package; use these anatomy, variant and keyboard descriptions to check it rather than automatically writing a replacement.

The token names and sizes in the component references come from the upstream example system. Map by purpose into the project's actual colour, typography, spacing, geometry and motion tokens; do not copy a new palette or impose a token migration. Dark mode, density switching, hover behaviour, multiple sizes and optional variants apply only where the product supports or requests them.

Web widgets need the matching native HTML or ARIA behaviour; native apps use their own accessibility semantics and platform controls. Check current applicable primary guidance when implementing. The model of a component does not prove its actual accessible name, reading order, focus, saved effect or recovery. Exercise the affected component on its intended running surface, distinguishing fixtures from the real app and keeping missing evidence explicit.

Use the optional browser probes only for the authorised web test target described in [probe usage](probe-usage.md). No new permission, customer control, receipt or release gate follows from selecting this reference.
