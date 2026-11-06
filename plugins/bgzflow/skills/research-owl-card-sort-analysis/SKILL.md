---
name: research-owl-card-sort-analysis
description: "Analyse open or closed card sort results into a proposed grouping and label set. Use after running a sort study."
---
# Card Sort Analysis

Use this method only for the current research question. Reuse the existing brief, applicable user answers and private records; several selected methods contribute to one investigation, not repeated interviews. Inspect permitted actual evidence and preserve source links. Do not invent participants, quotations, emotions, findings, measurements or approvals; mark hypotheses and missing data explicitly. Planning a study does not authorise recruitment, messages, recording, tracking installation, spending, account changes or product changes. The current task and host permissions govern; shared automatic records are not proof that a study ran.

Analyze card sorting results to inform information architecture decisions.

## Context


## Instructions

1. **Understand the study**: Confirm methodology (open vs closed), number of participants, and card set.
2. **Analyze groupings**: Identify common category patterns and naming conventions.
3. **Create a similarity matrix**: Calculate same-group frequency with an explicit pairwise denominator from the supplied participant data. Preserve missing cards and ambiguous assignments; a similarity score is evidence for grouping, not proof of a navigation label or new feature.
4. **Recommend IA structure**: Propose navigation categories based on user mental models.
5. **Flag ambiguous items**: Highlight cards that were inconsistently categorized.
6. **Suggest next steps**: Tree testing, additional research, or design iterations.
7. Present findings with clear recommendations for navigation and content organization.


## Optional local calculation

The original BGZFLOW helper `scripts/co-grouping.mjs` calculates pairwise same-group counts from supplied pseudonymous observations. Node 22 or later is sufficient; no package, network or key is needed. Run `node <skill>/scripts/co-grouping.mjs <owned-input.json>` only for the requested analysis. Input is `{cards:["A","B"],participants:[{id:"P1",groups:[["A","B"]]}]}`. It prints results and writes nothing.

The denominator for each pair includes only participants who supplied both cards. Missing observations remain explicit; duplicate or unknown card assignments are rejected. It does not infer a label, cluster, population prevalence or approval to change navigation. Inspect the counts and ambiguous groupings with the actual study context before recommending an IA.

[Source and adaptation](SOURCES.md).
