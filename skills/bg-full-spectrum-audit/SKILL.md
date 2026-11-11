---
name: bg-full-spectrum-audit
description: "Challenge and audit a whole software product, feature, codebase or change: discover unmet needs and missing capabilities, question the product concept, compare better ideas and approaches, and verify the experience and technical system end to end. Use for ultimate/comprehensive reviews, product critique, completeness and better-way questions, as well as code quality."
---

# Review the whole outcome

Investigate what would make the product valuable, coherent and effective, then test what it actually delivers. Independently discover unmet needs, missing outcomes and better concepts as well as defects. The owner does not need to know or supply examples of what is missing. A comprehensive review considers every relevant quality area; it does not apply every possible test to every project or promise an absence of defects.

## Establish the review

Recover the original request, latest decisions, approved designs and language, intended users, supported environments and constraints. Keep user decisions separate from agent assumptions. Investigate discoverable facts yourself. Ask only for a consequential unknown that prevents a useful investigation; missing research can remain an explicit uncertainty while the review proceeds. Approved requirements establish implementation obligations, not the limit of inquiry. You may challenge the premise or recommend revisiting a decision, while preserving the owner's authority to change it.

Choose the requested mode:
- **Product/codebase:** map the promised product, supported journeys, interfaces, services, data, operators and distributed work. Inspect relevant repositories, worktrees, pending changes and deployed versions within authorised access; account for approved work that is unfinished, unmerged, stranded or present only in another environment.
- **Feature:** trace the complete journey through all participants and dependencies, from entry and setup through the persisted or external result, failure, recovery and support.
- **Change/repair:** review the diff and its affected contracts, callers, shared state and user outcomes. Check the cause and related occurrences. Surface wider material problems without silently turning a small review into a rewrite.

An audit is read-only with respect to product code, customer data and live configuration unless repairs or mutations are authorised. Writing the requested report is fine. Do not automatically create a gate script, alter designs, fix every sibling or launch paid work.

## Challenge the product and discover what is missing

Read [product challenge](references/product-challenge.md). This is a central part of a product, codebase or feature audit, not an optional follow-up after technical checks. For a narrow change, apply it to the affected outcome and flag relevant wider concerns proportionately.

Reconstruct the user's underlying job and the whole path to a useful result, including work before and after the software. Ask whether a perfectly functioning implementation would actually solve that job. Look for the wrong problem, missing actors or handoffs, unsupported assumptions, needless effort, artificial constraints, poor incentives and opportunities the current feature list conceals. Investigate the domain, existing evidence, alternatives and analogous approaches without requiring the owner to suggest them.

Develop credible alternatives that change how the outcome is achieved: removal or simplification, a different workflow or concept, better defaults, integration or reuse, and an appropriate division of human and automated work. Select relevant directions rather than filling a quota. Compare the strongest alternatives fairly with the current product, using concrete scenarios and the cheapest meaningful evidence. Keep hypotheses distinguishable from observed needs. An idea earns a recommendation through its expected user benefit, supporting evidence, tradeoffs and a way to test it.

Carry these questions through the technical investigation; implementation evidence may reveal a deeper product problem. Return a product judgement and opportunity assessment even when every technical check passes. A justified decision to retain the current approach is a useful result.

## Build a coverage and evidence plan

Read [coverage](references/coverage.md), then select the relevant [project profiles](references/project-profiles.md) and [evidence methods](references/evidence.md). Assess the applicability of every coverage family. Record important exclusions and unverified areas; use risk, uncertainty, history and cost to choose depth. Never silently omit architecture alternatives or the boundary between deterministic code and AI.

Map each important promised outcome to its users/roles, entry points, states, platforms, dependencies, side effects and evidence. Also record newly discovered needs and alternative hypotheses; do not silently turn them into approved requirements. Include appropriate combinations of fresh/existing data, permission levels, offline/reconnect, concurrent use, interruption and old/new versions. Use representative cases and targeted interactions rather than an indiscriminate Cartesian product. Preserve the full intended outcome when time or access prevents some checks.

Identify the actual candidate and deployed instance. Prefer the current project's suitable tests, profilers, browser/device/service tools and specialist skills. Mobile Expo journeys can use [Expo testing](../bg-expo-testing/SKILL.md); it supplies evidence for selected claims, not certification of the product.

## Inspect, exercise and challenge

Check implementation and real behaviour. Follow a user's action to its saved, delivered, billed or otherwise useful result, including what the recipient or next actor must do. Compare the rendered product with the owner's approved design and words; separately assess its effectiveness and worthwhile alternatives. Measure relevant speed, resource use and cost under stated conditions; do not infer them from code or animation.

Test important failures and recovery in an authorised test environment. Reconcile an uncertain external operation through its original identity before retrying; a timeout does not prove it failed. Preserve original failures. Test the tests with known-good and deliberately wrong cases where practical; green tests, coverage percentages and screenshots can all miss the actual outcome.

Use the [source map](references/sources.md) to select authoritative domain guidance and current alternatives. For each substantial alternative compare the current approach, a focused improvement and a credible replacement on the same required outcomes, compatibility, reliability, total cost, maintenance and migration/reversal effort. Explain when keeping the current design is best supported. Research does not grant permission to redesign or add product policy.

Choose one reviewer or independent specialists according to scope and real capacity. Assign complete journeys or distinct questions with their dependencies, not isolated folders that hide boundary failures. Where independent review is required, give a fresh checker the original request, candidate and raw evidence using the [review brief](references/report.md). Avoid leading it toward the builder's diagnosis. Do not hardcode a provider, model, reviewer count or voting threshold.

## Report and act within authority

Use [the report contract](references/report.md). Separate confirmed defects, supported concerns, unverified claims, agreed omissions, worthwhile opportunities and owner decisions. Give a reproduction or concrete scenario, evidence, consequence and next action. Apply the existing [impact ratings](../interrogate/references/impact-ratings.md); unknown frequency stays unknown. Scores and reviewer agreement are not proof.

Return an intelligible picture of whether the product solves a worthwhile problem well, what works, what is missing, what should change and why, what remains untested, and the smallest questions that need the owner. Include strengths and justified decisions to retain. Distinguish technical correctness, usefulness, usability and viability: evidence for one does not establish the others. Every claim of completion must stay within observed scope.

Feed findings and evidence into [the existing release checker](../bg-check-it-before-release/SKILL.md) when release is in scope. Follow the project's release depth, authority and review limits. This method creates no additional release gate, mandatory second review, customer restriction or automatic repair campaign. Recheck changed behaviour after authorised repairs and retain the original evidence.
