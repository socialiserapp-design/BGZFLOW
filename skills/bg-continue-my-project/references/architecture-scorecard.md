# Architecture scorecard

A short, honest read of how sound each system is, so the lead picks the right amount of work: keep it, simplify it or rebuild it. The lead runs it at project start and again when the same incident cause recurs (see rework in the [incident reference](../../bg-ship-and-recover/references/incidents-and-postmortems.md#record-every-incident-and-count-rework)). It is a planning aid for the lead, not a gate: it adds no review, hold or approval, and spending money still needs the authority the brief already names.

## How to run it

1. List the bounded systems (for example billing, publishing, the customer app, the scheduler). Score each one separately.
2. For each practice below, score 0 to 4 from evidence you inspected (code, records, the live manifest, test output), not from memory or from what people say.
3. Write one line of evidence per score. If you could not inspect something, score it 0 and say it was not inspected.
4. Give each system a verdict and one next action with an owner.

Scores: **0** absent or unknown; **1** exists but ad hoc or known to fail; **2** partly works, with known gaps; **3** works and is checked; **4** works, is checked on the real platform, and has survived a real failure or rollback.

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
| 8 | Customer-outcome monitoring | Would we know within the hour that customers stopped being served, from outcomes and a canary, not job success ([outcome watch](../../bg-ship-and-recover/references/outcome-watch.md))? |
| 9 | Tests prove outcomes | Do tests assert what the customer got through real adapters in test mode, against the candidate, in a qualified environment ([testing ladder](../../../docs/testing-ladder.md))? |
| 10 | Known release and rollback | Do we know exactly what is live ([live manifest](../../../templates/LIVE-MANIFEST.md)) and can we put the last good version back? |
| 11 | Security and privacy | Are boundaries, secrets (by name) and personal data handled so that a mistake cannot expose or move them? |
| 12 | Only necessary complexity | Is every moving part earning its keep, with nothing built that nobody asked for or uses? |

## Verdict

- **Keep:** no practice below 2, and the money, state and security rows (1, 2, 11) at 3 or more. Fix the gaps in place.
- **Simplify:** the system works but practice 12 is low or several rows are 2 because of tangled or duplicated parts. Remove or merge parts, behind the existing entry point.
- **Rebuild:** a money, state or security row (1, 2, 11) scores 0 or 1 and cannot be fixed in place, or the same cause keeps returning. Build [beside the old](../../bg-build-with-me/references/durable-work.md#rebuild-beside-the-old), switch one capability at a time, and retire the old path only after usage evidence.

These are defaults for the lead's judgment. Record the scorecard, the evidence and the verdict in the project's handoff, and an engineering decision to rebuild as an ADR.
