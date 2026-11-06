---
name: design-system
description: "Create or maintain reusable design tokens and components, coherent themes and design-to-code handoffs. Use for repeated UI drift or shared component changes; preserve the project's existing system and platform semantics."
---

# Make approved design decisions reusable

Inspect the actual theme files, components, design assets and representative
screens before proposing a new system. Distinguish approved values, accidental
implementation drift and a proposed direction. Reuse the existing format and
component library unless a requested change justifies migration.

Separate raw values from semantic roles and component decisions. For example, a
colour value may supply the text-on-action role, which a button consumes; changing
one should not silently change unrelated chart categories. Trace consumers before
editing a shared token. Keep purposeful exceptions visible rather than forcing
everything into the same radius, spacing or typography pattern.

When interoperability is needed, evaluate the Design Tokens Community Group
format against the existing tools. Check types, aliases, circular or missing
references, units and supported theme contexts. Its 2025.10 report is a community
specification, not a claim of W3C Standard status. Do not migrate a functioning
project merely to adopt its file extension or create a mandatory DESIGN.md.

For affected components, specify purpose, content slots, state, emitted actions,
accessible name/role and supported input methods. Include only applicable states;
a decorative mark does not need loading or error behaviour. Map web and native
values deliberately: CSS pixels, platform points, scalable text and native colours
are not interchangeable strings. Preserve the approved brand across those mappings.

If the user supplies Figma, use the available Figma workflow to read the actual
component, variables and assets. Inspect generated code before adopting it; a
screenshot does not expose constraints, semantics or runtime interactions. A
missing design tool is not a reason to discard the project's working system.

Validate token references and affected component states using existing tools.
Render representative consumers in the supported themes and layouts, then check
their interactions. Compare with retained baselines; never rewrite the baseline
just to conceal an unintended change. Update the existing source of design truth
and its relevant decision record, not a parallel per-skill registry.

Use [direction](../design-direction/SKILL.md) only for unresolved visual choices
and [native/adaptive design](../design-native/SKILL.md) for platform translation.
Follow the [shared contract](../bg-personal-product-design/references/design-contract.md).
[Sources](../../docs/design-skill-sources.md).
