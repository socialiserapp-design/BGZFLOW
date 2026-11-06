---
name: design-product-flows
description: "Improve task journeys, navigation, information hierarchy, dashboards, onboarding and form recovery. Use when people cannot find, understand or complete an action; distinguish observed usability problems from hypotheses."
---

# Design the path to the actual result

Start with who is trying to do what, the existing product and the user's current
decisions. Inspect the route people actually take, including where they arrive,
what they need to understand and the observable result. Ask about consequential
unknown behaviour; investigate discoverable implementation details yourself.
Keep genuine user research separate from a model's imagined persona or preference.

Trace the affected steps and state transitions using the existing brief, sketch
or prototype. Find the point where information, controls or feedback stops helping
the task. A dense dashboard may need clearer grouping, sorting or progressive
detail rather than more whitespace or a new visual identity. A landing page may
need evidence and a clear next action rather than an application's navigation.

Choose familiar controls where they express the task well. Check active location,
back navigation, deep links, focus and the distinction between viewing and acting.
Prefer reuse of a suitable component over rebuilding its keyboard and state logic.
Do not create a feature, permission request, confirmation dialog or customer-facing
block merely because a design checklist mentions one. Explain a consequential
new product behaviour to the user before depending on it.

Exercise the states relevant to this journey: initial, empty, loading, edited,
submitted, saved, failed, interrupted and uncertain. Keep input that should survive
a recoverable error. Distinguish accepted-for-processing from actually saved.
When a reply is missing, inspect the original operation before offering another
submission; a more convenient retry button does not resolve an unknown result.
For voice or AI experiences, show truthful observable activity and useful recovery,
preserve approved providers/controls, and never invent internal reasoning.

Use a short walkthrough or interactive prototype when it resolves a real choice.
Then follow the implemented route on the intended surface and inspect its effects.
Check a relevant interruption or recovery path as well as the successful path.
Record what was observed, who tested it and what remains a hypothesis in the
existing evidence. Passing a heuristic review is not proof that real users succeed.

Pair with [interface content](../design-content/SKILL.md) for wording,
[accessibility](../design-accessibility/SKILL.md) for access barriers, or the
existing outcome-evaluation skill for service effects. They share the
[design contract](../bg-personal-product-design/references/design-contract.md)
and one task record. [Sources](../../docs/design-skill-sources.md).
