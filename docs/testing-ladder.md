# Automated testing ladder

Use the cheapest runner that can reveal the fault. The lead defines golden journeys once; agents maintain the scripts and inspect only failed steps and retained artifacts.

1. **Fast checks:** unit, type and lint checks while building. Run browser journeys in Playwright against the integrated web build.
2. **Every mobile candidate:** run the same golden journeys as Maestro flows in an EAS Workflow (`type: maestro`) against the frozen build. EAS owns emulator/simulator interaction; do not spend model time live-tapping.
3. **Occasional compatibility sample:** run the unchanged flows on selected BrowserStack real devices when OS/device risk changes, before a major release, or after a platform regression. This is sampling, not a duplicate gate on every candidate.
4. **Real platform rehearsal:** golden journeys are the finish-line rehearsal. Use the candidate's real runtime, bindings, database version and providers, plus one rollback.
5. **Founder device:** after functional proof, the founder checks customer-visible work only against the approved design. It is not a bug-hunting or functional-test step.

## Contracts first, old clients included

- Every producer and consumer pair (app and server, server and provider, worker and queue) shares one written, versioned schema. Write it before either side is built, and keep it in one place both import.
- Contract tests are written from the consumer's side: they state what the consumer needs to receive and send, and the producer must pass them. Typecheck every consumer against the schema.
- Before deploy, run the new server against the live app and the oldest app version still installed (read it from the [live manifest](../templates/LIVE-MANIFEST.md)). New fields are optional so an old app keeps working; remove or rename a field only after usage evidence shows no one sends or reads it.

## Tests prove customer outcomes

- Assert what the customer got, not that code ran: charged once, delivered, posted, refunded. Go through the real adapters in the provider's test mode.
- Fixtures come from the provider's documented or recorded responses. Never invent fields.
- Do not write tests that read source text for a string. Confirm each test imports the candidate build, not a stale copy or an installed older version.

## Prequalify the test environment

Before trusting a pass or a failure, run one known-good check that proves the runner, PATH, fixtures and imported module are this candidate's. A failure from an environment that has not passed this check is a tool failure, not a product bug: fix the environment, rerun, and do not open a product repair. Keep the actual failed output, never a summary of it.

A failure report contains the candidate SHA/build ID, flow and step, runner/device, artifact links and one reproduction. A pass is summarized by counts. Store credentials in runner secret stores; flows contain aliases, never values. If EAS is unavailable, record the missing platform proof rather than replacing it with slow AI tapping.

Build scheduling must use the account's observed plan concurrency. Expo Starter defaults to one shared build slot; `bg-governor build-slots --plan starter` reports that constraint. Spending to upgrade remains a founder decision.
