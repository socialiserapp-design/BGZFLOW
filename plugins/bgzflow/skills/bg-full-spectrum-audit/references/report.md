# Review brief and report

## A neutral independent brief

Supply the original objective and latest relevant decisions; requested mode and scope; exact source/candidate and running environments; approved design references; available evidence; permitted tests/effects; known access limits; and the requested output. State assumptions as assumptions. Include surrounding contracts and actual user journeys, not only the changed files. Do not tell the checker which conclusion to reach. Choose an available capable reviewer; confirm the job really started and completed. Keep raw output and reconcile any interrupted review before another dispatch.

## The report

Lead with the useful result in plain language. Scale detail to the scope. A full audit should make the following easy to find without requiring a new tracking system:

1. **Product judgement:** the underlying job, evidence that it matters, whether the current concept solves it, and its strongest weakness or unanswered assumption. Distinguish usefulness, usability, feasibility and business viability. A technically green product still needs this judgement.
2. **Purpose and observed status:** who can do what, on which candidate/environment, and the overall evidence limit. Distinguish the completed investigation from a complete product.
3. **What works and should stay:** important demonstrated outcomes and design decisions whose tradeoffs remain justified.
4. **Findings:** prioritised defects, concerns, agreed omissions and opportunities, each with its evidence and consequence. Deduplicate repeated symptoms while preserving distinct affected paths.
5. **What the brief missed and better approaches:** important unmet needs or hidden work discovered independently; concrete alternative concepts/workflows as well as technical approaches; expected benefit, supporting evidence, tradeoffs, effort and a test that could reject each recommendation. Distinguish proposals from requirements. Explain when no material opportunity is supported rather than inventing suggestions.
6. **Coverage:** inspected journeys and quality families, methods used, important excluded or unverified areas, and evidence dates/conditions. Note sampled rather than exhaustive work.
7. **Questions and next actions:** only material unresolved product/design/business or authority choices, each with context, recommendation and consequences. Technical investigation belongs to the agent. Preserve unanswered choices without blocking independent work.

For each material finding record:
- A stable label and plain symptom; classification as **confirmed defect**, **supported concern**, **unverified claim**, **agreed omission** or **opportunity**.
- Expected behaviour or desired improvement and its source: explicit decision/requirement, external contract, measured baseline, observed need or professional recommendation. Never disguise a preference or proposed opportunity as an approved requirement.
- Trigger or reproduction, actual observed behaviour, candidate/platform, and precise supporting evidence. A code-only inference must say so.
- Affected users/data/money, exposure scope and period, recovery, separate harm/frequency estimates or unknown, and urgency using the existing impact guidance.
- Cause where established, alternative explanations where unresolved, proposed action and how to verify it. For an opportunity, name the assumption and evidence that would weaken or reject it; do not fabricate a defect reproduction for an unbuilt idea.
- Whether it falls within an existing release rule. Do not introduce a new blocker category or numerical release threshold.

Detailed evidence can live in the existing project record or linked appendix; the owner's summary need not show logs, identifiers or implementation paths. Do not include secrets, raw private payloads or unnecessary customer information.

## Use findings

Read-only scope ends with findings and useful choices. When repairs are authorised, use the existing build workflow, preserve original evidence and add the meaningful regression or evaluation that fits the failure. A source regex is inappropriate when it cannot observe the claimed behaviour. Retest affected contracts and outcomes. The established release checker owns release verification; do not create a second review loop.
