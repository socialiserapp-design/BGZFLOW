> BGZFLOW adaptation: use this technical reference only for the current requested outcome. Existing user decisions, actual project architecture and host permissions govern. Numeric examples and aesthetic opinions below are options, not universal rules, new gates or authority to redesign. External products, model weights and licences need current verification before use; none is installed by reading this page. Use the same brief and private project records; do not modify installed learning files.

---
title: design-system-docs
summary: Document actual component choices, tokens, variants and examples where useful. Preserve existing conventions and uncertainty; no required per-component flowchart, closed variant set or wording ban.
tags: [meta, design-system, documentation, agents, design-md]
---

# Design system docs agents can follow

Tokens and components define what exists; docs define when to use what. Every decision the docs leave out gets replaced by a guess, and a guess looks exactly like a decision. This node is how to write a DESIGN.md or docs folder that stops an agent hardcoding colors, inventing variants, and picking the wrong component. [using-design-md](using-design-md.md) and [using-design-file](using-design-file.md) cover *consuming* such files; this is *authoring* them.

## 1. Inventory the code first

Never write from memory — that is how agents learn variants that don't exist.

- **Tokens**: the token files (globals.css, theme, Tailwind config). Every semantic token and the primitive behind it. Raw values with no token need a rule, not a mention.
- **Components**: every shared component, its variant and size unions, and the props that change appearance. The union type is the truth.
- **Usage**: two or three real call sites per component for the de facto default and the patterns to bless or ban.

Every name in the docs traces to a file and a line. If there is nothing to document — no tokens, ad-hoc styles — say so and offer to set up semantic tokens and base components first.

## 2. Size the structure

One token file and ≤ 5 components → a single root file. Bigger → a folder: a root file with the system's character in two or three sentences plus an index, and one file per topic (colors, typography, buttons, forms). Use navigable sections or selective reference files where useful; no root/topic line cap is imposed. Small files mean an agent loads only what the task needs. If the project uses a `.design` contract, the machine-readable half lives there and these docs become its `rationale`.

## 3. The component template

Useful elements, ordered for the actual documentation task:

1. **When to use it, and when to use the alternative.** "Use for actions. Navigation styled as a button is a Link; actions in tight spaces use IconButton." Without the alternative the agent has a description; with it, a choice.
2. **Which variant applies where, and which is the default.** Close the set: "Variants: `primary`, `secondary`, `danger`. Nothing else exists — an unlisted variant is a bug." Most drift is an agent promoting everything to primary.
3. **One correct and one incorrect example**, real code from the codebase. Models follow examples better than prose, and the incorrect one inoculates against the exact mistake.
4. **A flowchart when a choice has three or more options.** A tree gets walked the same way every run; a paragraph gets interpreted.

For tokens, explain the architecture actually implemented, including semantic/primitive use and justified raw values. Provide a decision aid where it resolves a real recurring choice, not a required flowchart for every role.

## 4. Language rules

Write precise supported guidance with its conditions, rationale and uncertainty. Numeric examples such as body 16px are useful starting points, not universal floors; one primary action per view is a hierarchy recipe, not a mandatory cap.

## 5. Verify by prompting

Docs are a hypothesis until an agent runs against them. Ask for a real screen in one sentence, then read the drift:

| Drift | Hole | Fix |
|---|---|---|
| Hardcoded a color | Layer rule not findable or not strict | Move it into the root file |
| Invented a variant | Set not closed | Add "nothing else exists" (and tighten the union type) |
| Wrong component | No when-vs-alternative line | Add the comparison for that pair |

Fix a stale shared instruction only within actual ownership/authority, and repair the output when requested; do not silently modify authority-controlled instructions — a corrected screen fixes one screen; a patched doc fixes every screen after it. Use proportionate authorised held-out checks, preserving failures and limits rather than claiming universal zero drift.

## When to apply

Creating or updating design docs; an agent keeps hardcoding colors, inventing variants, or picking the wrong component; a project adopting a contract for the first time.

## Gotcha

A documented variant that doesn't exist is worse than an undocumented one that does. The inventory step is the whole difference.

## Sources

- Emil Kowalski's design-engineering practice on documenting systems for agents, distilled by HKTITAN.
- Google Labs DESIGN.md spec; AgentsORG `.design` (`rationale`, `components.when` / `when_not`).
- Related: [using-design-md](using-design-md.md), [using-design-file](using-design-file.md), [skill-writing-rules](skill-writing-rules.md), [component-api-design](../components/component-api-design.md).
