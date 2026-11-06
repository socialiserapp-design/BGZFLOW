# Architecture scorecard

A short, honest read of how sound each system is, so the lead picks the right amount of work: keep it, simplify it or rebuild it. Consider it when architecture quality is the requested question or repeated evidence suggests a structural cause (see rework in the [incident reference](../../bg-ship-and-recover/references/incidents-and-postmortems.md#record-every-incident-and-count-rework)). It is a planning aid for the lead, not a gate: it adds no review, hold or approval, and spending money still needs the authority the brief already names.

## How to run it

1. Identify the systems relevant to the requested decision (for example billing, publishing or the customer app). Do not audit unrelated systems by default.
2. Inspect relevant practices below using code, records, actual running state and test output. Optional scores can help compare observed evidence, but do not replace the explanation.
3. Record the supporting observation for relevant categories. Missing evidence is unknown, not an automatic zero or a demonstrated failure.
4. Give each system a verdict and one next action with an owner.

Optional scores: **0** demonstrated absent; **1** exists but ad hoc or known to fail; **2** partly works, with known gaps; **3** works and is checked; **4** works, is checked on the real platform, and has survived a real failure or rollback.

## The 12 practices

| # | Practice | Plain question |
|---|---|---|
| 1 | One authoritative state | For each fact (a balance, an order, a post), is there exactly one place that is true, and everything else reads it? |
| 2 | One charge, correct settlement | Is each paid step charged once, delivered, and settled or refunded to the right amount, even after retries? |
| 3 | Clear responsibilities | Does each system own one thing, with one lane and one owner answerable for it? |
| 4 | Shared, compatible contracts | Is every producer and consumer pair on one versioned schema, with old clients still working? |
| 5 | Rules defined once | Is each business rule (price, limit, eligibility) written in one place, not copied across app, server and database? |
| 6 | Recovery and honest status | Can a stuck or failed operation be found and recovered, and does the customer see its true state? |
| 7 | Durable work | Does multi-step work survive a crash with one operation identity, saved steps and checked unknown outcomes ([durable work](../../bg-build-with-me/references/durable-work.md))? |
| 8 | Customer-outcome monitoring | Would the authorised observation detect a failure soon enough for this service, from actual outcomes rather than job success alone ([outcome watch](../../bg-ship-and-recover/references/outcome-watch.md))? |
| 9 | Tests prove outcomes | Do tests assert what the customer got through real adapters in test mode, against the candidate, in a qualified environment ([testing ladder](../../../docs/testing-ladder.md))? |
| 10 | Known release and rollback | Do we know exactly what is live ([live manifest](../../../templates/LIVE-MANIFEST.md)) and can we put the last good version back? |
| 11 | Security and privacy | Are boundaries, secrets (by name) and personal data handled so that a mistake cannot expose or move them? |
| 12 | Only necessary complexity | Is every moving part earning its keep, with nothing built that nobody asked for or uses? |

## Verdict

- **Keep:** evidence supports the current structure and relevant gaps can be repaired safely in place. Explain the known limitation and repair.
- **Simplify:** demonstrated duplication or unnecessary parts cause the problem. Compare a smaller design with the existing one, preserving required behaviour and rollback.
- **Rebuild:** causal evidence shows that an in-place repair cannot reliably meet the need, or a reproduced structural cause keeps returning. Compare replacement cost, risk and recovery before choosing it. Where appropriate, [replace beside the existing path](../../bg-build-with-me/references/durable-work.md#replace-a-live-path-safely); retire live work only with the necessary ownership checks and authority.

These are discussion prompts, not thresholds that select a rebuild. Choose from actual causal evidence and the task scope. Use existing project records only when the decision warrants a durable record.
