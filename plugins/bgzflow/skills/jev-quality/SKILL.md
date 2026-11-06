---
name: jev-quality
description: "Use Jev to prioritise real tests, triage failures, assess evidence with explicit rubrics, or evaluate a Jev workflow's accuracy, latency and cost. Complements actual tests and outcome verification."
---

# Jev for testing and evaluation

Use the [shared Jev method](../bg-jev/references/methods.md) with the project's
existing tests and [outcome evaluation](../bg-outcome-evals/SKILL.md). Preserve the
original user objective. A model judgment cannot make missing real-world proof pass.

Choose from: first-test selection, bug/CI/review-comment triage, separate impact and
occurrence ratings, claim-to-evidence assessment, or selecting observed failures for
regression coverage. Supply actual available test targets and original outputs.
Jev suggests an investigation, not a proven cause. Run the relevant check, inspect
its real effects, and complete all required checks regardless of which came first.

For impact ratings, use the existing risk rubric; don't invent a competing severity
scale. Preserve high harm even when unlikely and distinguish known from suspected
effects. The shared guide explains how a Score maps to the user's one-to-ten scale.

For an evaluation, freeze the task cases and intended pass conditions. Keep expected
answers outside model state. Compare against the current workflow on matching inputs,
including a no-Jev baseline. Test missing evidence, conflicting instructions,
unsupported confident answers, option ordering, outages and no-action-needed cases.
Tune on development cases and assess unseen cases separately. A second model's
agreement is not independent ground truth. Known-good and deliberately bad cases
must check whether the evaluator catches the intended failure.

Retain distributions, returned model, actual usage, retries/failures and total task
latency in the existing private evaluation output. Report coverage, mistakes and
review rate together; a method can appear accurate simply by avoiding hard cases.
Don't replace real browser/device/service checks with Jev scores. Prefer deterministic
assertions where available and re-test only what changed. Adopt measured improvements
within existing authority, retaining rollback and private/public data separation.

Adaptation sources: [provenance](../bg-jev/references/sources.md).
