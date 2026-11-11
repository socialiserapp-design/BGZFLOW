# Turn product outcomes into test flows

Start from the requested user outcome, accepted designs and supported environments. Inventory the app's real entry points and important journeys. Include work that is expected but absent; do not restrict coverage to what the implementation happens to expose.

For each material outcome, identify:
- The intended user/role, platform, candidate and starting state.
- The user actions and visible expectation.
- The saved, delivered or other authoritative effect, and how it can be observed.
- Relevant failure/retry/cancellation behaviour and any irreversible action.
- Fixture ownership, evidence visibility and the tool that can actually check it.

Use the existing project plan or a compact coverage table. An explicit unverified row is better than pretending a simulator can check everything.

## Choose the right kind of test

| Need | Suitable route |
|---|---|
| Discover broken navigation, confusing states or unexpected behaviour | Lead-driven exploration or Callstack dogfood/Argent UI flow |
| Test explicit independent journeys at the same time | QA Swarm with one isolated flow per lane |
| Inspect behaviour introduced by a PR | Agentic CI plus the relevant existing regression tests |
| Repeat a stable acceptance or regression case | Existing test suite, Maestro on EAS or supported Argent QA regression |
| Verify save, delivery, entitlement or a financial effect | Device journey plus separate authorised service/provider readback |
| Compare approved visuals, accessibility or performance | Appropriate controller/platform tools and manual evidence review, with stated limits |

Reuse the selected upstream skill's semantic selectors, readiness waits, deterministic setup and replay method. Do not replace executable assertions with a screenshot or narration. Do not add a second testing service if an existing runner proves the same requirement.

## Coverage beyond launch and navigation

Select cases according to the app and requested depth:
- First use, onboarding, return visits, authentication and role changes.
- Core create/read/update/complete journeys, persistence after refresh/restart, collaboration and relevant external delivery.
- Empty, pending, slow, partial, error and recovery states; invalid/boundary inputs and long content.
- Offline/reconnect, expired sessions, permission denial, background/foreground, interrupted and cancelled work.
- Duplicate actions, concurrent writers, delayed/out-of-order results and safe retry, using isolated test data.
- Supported screen sizes/platforms, text scaling, focus/keyboard, assistive technology and reduced motion.
- Approved copy/design, comprehensible progress, useful output and correct next actions.
- Measured launch/action latency, responsiveness, memory/resource behaviour and network conditions where tools permit.
- Upgrades, migrated existing data, old/new clients, sign-out/account switch and promised data export/deletion controls.

Keep effects within authorised test accounts and environments. Test-mode money and provider state require explicit setup; tapping a simulated purchase button does not verify production billing.

## Natural-language flow format

Keep the official simple Markdown format, adding the context necessary for repeatability. For example:

```md
Check that a saved draft survives an app restart.

Starting state: the approved test account is signed in; this lane owns an empty draft collection. Use a unique draft title provided by the run.

1. Open Drafts and create the named draft. Save it. Capture the visible result.
2. Open the draft again. Verify its full title and body match the entered values.
3. Close and reopen the app using the controller. Return to Drafts and verify the same draft and contents.

Out of scope: publishing, buying, changing account settings, other lanes' records and deleting user data.

Pass condition: the same draft retains the entered title and body after restart. Record the draft identifier privately for the separate authorised persistence check. If that check cannot run, report persistence beyond the observed client as unverified.
```

Use the app's actual labels, realistic data, clear pass conditions and boundaries. Platform-specific flow files can adapt interactions while preserving the same outcome. One flow should cover a coherent journey; do not divide a necessary causal chain between agents that cannot share its state reliably.

## What remains outside a simulator-only result

Physical cameras/sensors, real push delivery, hardware performance, accessibility behaviour on actual devices, store purchase/subscription flows, signing/distribution, external recipients and production service bindings may require separate real-platform checks. Verify the specific capability rather than assuming simulation is equivalent. Product desirability, strategy and the value of alternative features also require product evidence and judgement.

The final report must distinguish what the simulator demonstrated, what another tool or service demonstrated, and what remains untested. A comprehensive plan is not a comprehensive execution result.
