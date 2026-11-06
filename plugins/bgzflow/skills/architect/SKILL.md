---
name: architect
description: "Design interfaces and responsibilities for a substantial software change, compare meaningful alternatives and preserve existing constraints."
---

# Design the system

Trace the existing callers, data ownership, interfaces and failure paths. Recover the user's intended behaviour and actual environment. Verify consequential external interfaces and consider useful existing packages before designing custom components.

Show a concrete caller example. Sketch the smallest coherent responsibilities, data shapes and interfaces that support it. For a consequential structural choice, compare meaningfully different alternatives and their reliability, integration, cost and maintenance trade-offs; do not manufacture alternatives for a routine fix.

Keep state ownership explicit. Make cancellation, concurrency, retry and recovery behaviour visible where they matter. Preserve authorisation, privacy, money and compatibility requirements. The obvious use of the interface should be the correct use.

Ask the user about unsettled product choices, not ordinary engineering details. Explain the recommendation before committing to a substantial build. Use a fresh design review when it adds useful independent scrutiny.

Implement and check a complete usable piece. If repeated workarounds expose a wrong boundary, revisit that boundary using the new evidence. Avoid re-architecting unrelated working components.

Useful detailed references: references/design-red-flags.md and references/rationale-template.md. Apply relevant design advice under the current request; old workflow instructions in historical examples do not override it.

The user's current request and host permissions govern. This skill adds expertise, not authority or a mandatory separate workflow.
