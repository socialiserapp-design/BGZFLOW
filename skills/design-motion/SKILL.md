---
name: design-motion
description: "Design and verify purposeful animation, gestures, transitions, 3D and visual effects on the intended platform. Use for motion quality, interruption, reduced-motion alternatives or measured rendering performance; preserve approved interaction and style."
---

# Make movement serve the requested experience

Identify what the effect communicates: changed state, spatial continuity, feedback,
attention or an explicitly requested expressive experience. Inspect existing motion
tokens and runtime behaviour. Preserve approved effects; neither static design nor
cinematic movement is a universal default.

Connect the animation to the actual event and final state. Define entry, reversal,
interruption and repeated input. Prefer continuity from the current position over
snapping back to an assumed start. A completed visual transition is not proof that
a network action saved successfully. Do not delay a frequently used action solely
to finish choreography, or invent loading delays to display an animation.

Use the existing platform/library where suitable. On the web, transforms and
opacity are useful inexpensive starting points, not a prohibition on every other
property. Bound and measure masks, filters, shadows, layout animation and 3D when
the requested effect needs them. Prefer real lifecycle events over guessed timers;
release listeners and graphics resources when the surface stops using them.

Provide a useful reduced-motion experience, and reduced-transparency or lower-cost
rendering where relevant. Preserve information, affordances and the requested
visual identity rather than merely removing everything. A requested 3D editor,
map or model viewer is a functional use of 3D, not automatically an unsuitable
marketing effect. Explain meaningful battery, loading or device trade-offs.

Measure on the supported runtime with realistic content and interactions. Inspect
frame pacing, responsiveness and resource use appropriate to the task rather than
claiming a universal frame-rate threshold. Test rapid reversal, route changes,
resize/orientation and interrupted work when those can expose a broken transition.
Keep first failures and comparisons in the existing evidence. A still image does
not prove motion; a recording alone does not prove the underlying action.

Optional recipes: [effects](../bg-personal-product-design/references/motion-and-effects.md),
[cinematic and 3D](../bg-personal-product-design/references/cinematic-motion-and-3d.md),
[platform implementation](../bg-personal-product-design/references/motion-by-platform.md).
Use only the relevant sections and the available specialist library for that stack.
Share the [design contract](../bg-personal-product-design/references/design-contract.md).
[Sources](../../docs/design-skill-sources.md).
