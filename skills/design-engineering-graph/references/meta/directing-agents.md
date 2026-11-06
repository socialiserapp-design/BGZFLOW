> BGZFLOW adaptation: use this technical reference only for the current requested outcome. Existing user decisions, actual project architecture and host permissions govern. Numeric examples and aesthetic opinions below are options, not universal rules, new gates or authority to redesign. External products, model weights and licences need current verification before use; none is installed by reading this page. Use the same brief and private project records; do not modify installed learning files.

---
title: directing-agents
summary: How a person steers an agent toward good UI — friction where judgment matters, a named concept instead of an adjective, one or two passes with a look between them, fixing the system rather than the screen, and a papercut pipeline that hands the agent evidence.
tags: [meta, workflow, agents, prompting, review]
---

# Directing agents

An agent reliably produces the average of what it has seen, so where the output lands depends on how it is steered. Spend judgment where your opinion changes the result: what to build, which direction to keep, and when to stop. Hand the agent work where your opinion adds nothing, such as research, summarising feedback or a known pattern with a lot of code.

## Friction where your opinion matters

- **Resolve consequential unknowns during the work.** Recover applicable answers first. Ask the smallest useful question when a new fact or choice changes dependent work, with fair options where appropriate; a simple clear request needs no interview and research can also reveal a question.
- **Delegate known patterns; hand-tune the fabric.** A command menu, a chart or a data grid is a pattern the agent knows: delegate it. Page layout, the type scale and spacing tweaks are often faster by hand, or with one precise prompt each.

## Name it; don't describe the feeling

- "Make it smoother" leaves the agent guessing. "Origin from the trigger, 200ms, the strong ease-out, transform and opacity only" does not. Precise names are in [design-vocabulary](design-vocabulary.md), and why they matter is in [articulate-precisely](../philosophy/articulate-precisely.md).
- You don't need every number, only the concept: *tabular figures*, not "the numbers jump"; *inner radius = outer − padding*, not "the corners look off".
- A screenshot with arrows, or a link to an interface that does it right, often beats any word.

## One or two passes, then look

Combine only useful perspectives for this task, inspect the actual result and avoid duplicate interviews or review chains. There is no required pass count or fixed sequence that blocks an otherwise authorised action. The order for a screen is in [stacking-chains](stacking-chains.md) ("Screen loop"). Release checking follows the actual product risk and authorised release depth; this graph does not impose a whole-app cluster traversal.

## Fix the system, not the screen

Probe the system with a one-sentence request for a real screen ("a dialog that publishes pending changes, using our components"). Every mistake in the result points at a hole:

| Mistake | Hole to patch |
|---|---|
| a raw hex or a one-off spacing value | a semantic token is missing or poorly named ([color-token-tiers](../surface/color-token-tiers.md)) |
| an invented `ghost` or `destructive` variant | the variant union isn't closed or documented ([component-api-design](../components/component-api-design.md)) |
| a hand-rolled select instead of `Select` | the component has no "when to use" doc ([design-system-docs](design-system-docs.md)) |
| `className` overrides fixing spacing | an escape hatch is open ([component-api-design](../components/component-api-design.md)) |

If you correct only the output, you fix one screen. Patch the hole and the next screen comes out right.

## The papercut pipeline

Spot → document → delegate. Write the issue with the evidence: a screenshot with arrows, or for motion a recording scrubbed to the wrong frame together with the state at that frame. Name the cause if you know it, for example "the select renders in a portal, so the modal treats a click on it as outside". Then let the agent fix it while you keep working. It takes about two minutes to write up and saves a context switch.

## Gotcha

When the agent keeps missing after two rounds, rephrasing a third time is the casino. Build a tool instead, either a generator or an inspector ([build-a-tool](build-a-tool.md)). The opposite failure is real too: tooling up for a problem you hit once is procrastination with extra steps.

## Sources

- Emil Kowalski's design-engineering practice, distilled by HKTITAN.
- Related: [skill-router](skill-router.md), [prototype-picker](prototype-picker.md), [vibe-to-generator](vibe-to-generator.md), [review-format](review-format.md).
