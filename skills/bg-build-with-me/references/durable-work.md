# Durable multi-step paid work, and rebuilding beside the old

Use when a customer outcome takes several steps, providers or waits (quote, charge, make, deliver, settle) or when an existing path is being replaced. It extends [M10 money and risky changes](capability-coverage.md#m10-money-and-risky-changes); everything there still applies. None of this adds a customer-facing limit: the retries below are internal, and customers never see a cap, a hold or provider names.

## One operation, start to finish

- **One identity from quote to settlement.** The operation gets one durable ID derived from the customer's intent (not from the attempt) when it is quoted. The charge, the work, the delivery and the settlement or refund all carry that same ID. A retry, repair or recovery reuses it and never buys the same step twice.
- **Save the step and its message together (outbox).** When a step finishes, write its result and the message that triggers the next step in one save, so a crash cannot leave one without the other. A separate sender reads saved messages and sends them. An "outbox" is just that saved list of messages waiting to go out.
- **Idempotent consumers.** Whatever receives a message must give the same result if it receives it twice (a repeat is recognised by the operation ID and step, and does nothing new).
- **Unknown outcome: check, then decide.** When a provider call times out or returns something unclear, the outcome is unknown, not failed. Ask the provider about the original ID before any resubmission. Only a confirmed "not done" allows a new attempt, and it uses the same identity.
- **Bounded internal retries.** Retry transient failures a limited number of times with growing pauses, then stop and record the operation as needing attention for the owner. The bound is internal. A customer sees a clear honest status ("working on it", "needs a moment"), never a retry limit, an error string or a supplier's name.
- **Honest status.** Keep the plain state of each operation (quoted, charged, in progress, delivered, settled, refunded, needs attention) in one place, and show only that.

## One adapter per provider

Each provider's quirks live in one tested adapter that turns its replies into a plain outcome the rest of the system understands: done, not done, unknown, or needs attention. "Accepted" is not "published": the adapter reports "accepted" until the result is confirmed in the provider's own published state, and nothing downstream treats accepted as delivered. Tests for the adapter use the provider's documented or recorded responses in test mode (see the [testing ladder](../../../docs/testing-ladder.md#tests-prove-customer-outcomes)). Other code never reads raw provider fields.

## Rebuild beside the old (only for `TRIAGE: evolve` on live shared backend paths)

When `TRIAGE: rebuild` is chosen to replace a rejected UI or broken user flow, replace the broken components cleanly from the approved spec instead of keeping or wrapping the rejected path. Use the "strangler fig" pattern below **only** when `TRIAGE: evolve` replaces a live, revenue-bearing backend path that active customers still depend on:

1. **Build beside.** The new path lives next to the old one and starts doing nothing customers can see.
2. **Compare without side effects.** Run the new path on the same real inputs in a read-only way (no charge, no message, no write to live data) and compare its answers with the old path's. Differences are findings to explain.
3. **Switch one capability at a time** at the existing entry point (the route, screen or handler customers already reach), so a switch is small and can be switched back.
4. **Retire the old path only after usage evidence.** Remove it when logs or counts show nothing still uses it for a full normal cycle (including the oldest supported app version), then record the retirement as a decision. Until then it stays as the rollback.

New things go on by default as usual; this describes how a live backend replacement gets there safely, never an excuse to preserve a rejected UI shell.
