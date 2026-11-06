# Feature switches and rollout

**Finished means switched on.** A feature or fix is not done while its intended customers cannot use it. A switch is a safety tool for the first hour, not a place to park finished work. Built-but-off work is reported as not done.

**Authority.** Deploys, store submissions and live-service changes happen within the release authority recorded for the project. Payments, store submission and live trading need the brief to name them. When that authority exists, switching an accepted feature on is part of the release: the lead does it without asking the founder again. Keeping a finished feature off needs a founder decision on record (their words and date) in the project's decisions file. Leads never invent holds.

1. **Decide what needs a switch.** Add one only for a risky new path: money, data, security, an external dependency or a migration. Plain UI and copy changes ship without one. Reuse an existing switch only if it covers every entry point. A switch never replaces access checks, entitlements, financial limits or migration compatibility.
2. **Activate within the agreed release authority.** Verify the actual candidate and supported recovery path, then complete the authorised switch. Respect explicit release dates, staged launches and user holds; do not invent a delay after the required checks pass.
3. **Choose exposure from the actual risk and traffic.** Use the existing release policy. For a small audience, a measured full release may be more useful than an uninformative percentage ladder; for larger or higher-risk changes, evaluate a staged rollout. No universal user-count threshold, percentage sequence or one-hour window establishes safety.
4. **Observe the intended outcome.** Check the deployed identity and real journeys, and use meaningful denominators and a representative window. Missing traffic is missing evidence, not a passing result. Contain or recover within existing authority when required.
5. **Keep recovery controls where needed.** Verify who can use them, their propagation and behaviour for in-flight/offline clients. A feature switch is not a refund, rollback of data, or permission to reject customers.
6. **Retire temporary switches when safe.** Inspect callers and supported older versions first. Remove only task-owned, no-longer-live paths within authority; no fixed seven-day deletion rule applies.

Use existing release records for the switch owner, candidate, observed outcome, recovery and any later cleanup; no separate form is required.

Optional services, where available: an existing configuration service or a hosted flag service (for example PostHog, GrowthBook or LaunchDarkly). Over-the-air channel delivery is a separate artifact control, not a substitute for a runtime switch. Do not install a flag service implicitly. An optional OTA skill such as `eas-update` applies only to the [OTA path](ota-updates.md).

Basis: LaunchDarkly's [flag decision, guarded rollout, cleanup and drift skills](https://github.com/launchdarkly/ai-tooling/tree/ef549715fe267e6027ba9172819205621b58eee1/skills/feature-flags) (Apache-2.0), adapted for small teams with low traffic. Further sources: Pete Hodgson, [Feature Toggles](https://martinfowler.com/articles/feature-toggles.html), on keeping release toggles short-lived; Uber, [Piranha](https://www.uber.com/blog/piranha/), on stale-flag debt; and Knight Capital's [2012 filing](https://www.sec.gov/Archives/edgar/data/0001060749/000119312512346917/d361681d10q.htm). All steps are in our own wording.
