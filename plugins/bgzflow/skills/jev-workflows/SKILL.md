---
name: jev-workflows
description: "Compose several Jev capabilities with reasoning, retrieval and observed tool feedback for an authorised goal. Use for dynamic questions, hierarchical choices, composite scoring or decision loops that one judgment cannot resolve."
---

# Compose Jev with the working agent

Read the relevant [composition](../bg-jev/references/methods.md#compositions), not
every recipe. Identify the result and observable success. Reuse the task's authority,
time/usage priorities and current records. Complexity is useful only when it improves
the outcome; keep a direct main-agent or deterministic path available.

The main agent derives a small set of real candidates and answerable questions from
current evidence. Jev supplies typed judgments. Code calculates agreed trade-offs and
validates candidate identities. The agent explains the choice and performs the
authorised action. Observe its actual effect before constructing the next request.

Batch independent questions sharing evidence. Separate dependent questions into
later calls after new evidence exists. For a large taxonomy, retain relevant
alternatives during pruning and measure missed matches. For composite scores, keep
each dimension visible and use the user's priorities; don't average away a serious
failure. Speculative questions are useful only when their marginal cost and clarity
justify them, not merely because another question is possible.

Judge progress from actual changed state. Repeating an ineffective action is a
signal to inspect evidence or change approach. An uncertain external effect must
be reconciled before retrying. Use existing task limits and recovery rules rather
than creating an endless autonomous loop or adding new arbitrary customer gates.

One agent can perform this workflow. Multiple agents/providers are optional only
for independent work supported by the host and the user's scope. Model selection
does not create capacity or permission. Jev never generates arbitrary commands;
candidate commands still require normal validation and authority before execution.

Retain relevant observed calls/results through native records. Test the whole
sequence, including failure and recovery, against a simpler baseline. A succession
of plausible local choices does not establish a successful overall outcome.

Adaptation sources: [provenance](../bg-jev/references/sources.md).
