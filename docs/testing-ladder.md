# Automated testing ladder

Use the cheapest runner that can reveal the fault. The lead defines golden journeys once; agents maintain the scripts and inspect only failed steps and retained artifacts.

1. **Fast checks:** unit, type and lint checks while building. Run browser journeys in Playwright against the integrated web build.
2. **Every mobile candidate:** run the same golden journeys as Maestro flows in an EAS Workflow (`type: maestro`) against the frozen build. EAS owns emulator/simulator interaction; do not spend model time live-tapping.
3. **Occasional compatibility sample:** run the unchanged flows on selected BrowserStack real devices when OS/device risk changes, before a major release, or after a platform regression. This is sampling, not a duplicate gate on every candidate.
4. **Real platform rehearsal:** golden journeys are the finish-line rehearsal. Use the candidate's real runtime, bindings, database version and providers, plus one rollback.
5. **Founder device:** after functional proof, the founder checks customer-visible work only against the approved design. It is not a bug-hunting or functional-test step.

A failure report contains the candidate SHA/build ID, flow and step, runner/device, artifact links and one reproduction. A pass is summarized by counts. Store credentials in runner secret stores; flows contain aliases, never values. If EAS is unavailable, record the missing platform proof rather than replacing it with slow AI tapping.

Build scheduling must use the account's observed plan concurrency. Expo Starter defaults to one shared build slot; `bg-governor build-slots --plan starter` reports that constraint. Spending to upgrade remains a founder decision.
