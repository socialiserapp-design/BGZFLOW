# Choose evidence that can answer the question

Start with the actual claim, its consequence and the environment in which it must hold. Use existing evidence only while the candidate and relevant conditions still match. A larger test count is not necessarily stronger evidence.

## Practical methods

| Question | Useful method | What it cannot establish alone |
|---|---|---|
| Does the intended task work? | Drive the running product from its entry point, then inspect its saved or external result | A screenshot of a success message cannot prove persistence, delivery or charging |
| Are inputs and contracts handled correctly? | Unit, integration, consumer-contract, property and boundary tests | Mocks cannot prove the remote provider uses the assumed contract |
| Can the assertion detect the wrong result? | Known-good case plus realistic negative/mutation, checking the mutation actually took effect | A broken environment or timeout is not successful defect detection |
| Does a stateful action remain correct? | Concurrent, duplicate, reordered, interrupted and retry cases, with authoritative readback | A happy path cannot establish idempotency or safe recovery |
| Is the experience useful and understandable? | Approved-design comparison, task walkthrough, domain rubric and appropriately scoped user research | A model preference or competitor screenshot does not establish customer benefit |
| Is it accessible? | Automated checks plus keyboard, focus, assistive-technology and scaled-text task completion | Scanner success cannot certify accessible end-to-end use |
| Is it fast and reliable? | Measured baseline and representative workload/device/network/data; distribution and resource measurements | Reasoning from code or reporting only the fastest sample hides real variability |
| Is the architecture better? | Compare alternatives on explicit change, load, failure, deployment and cost scenarios | Novelty, fewer files, fashion or a named pattern is not a quality measure |
| Is security effective? | Threat model, versioned applicable requirements, static checks and authorised exploit/negative cases | Scanner output alone neither proves exploitability nor proves absence of vulnerabilities |
| Is generated output dependable? | Reference answers or calibrated domain rubric, held-out cases, adversarial inputs and tool-effect checks | The generator's self-score and a small curated sample are weak evidence |
| Can it be shipped/recovered? | Installed/distributed artifact, real entry points, mixed versions, rollback or restore drill | Build success is not installation, and code rollback is not data recovery |

For causal claims such as improved conversion, separate observation from an actual controlled comparison. Use sufficient samples and uncertainty appropriate to the decision; do not invent universal numeric thresholds.

## Plan states and boundaries

Select material states and combinations from the coverage map. Examples include unauthenticated/authenticated/role-revoked, fresh/existing/imported data, empty/single/batch, slow/offline/reconnect, expired sessions, cancelled actions, concurrent edits, old clients and resumed work. Add states specific to the domain, rather than forcing media-generation states onto a backend library.

For a supported platform matrix, compare shared outcomes and intended platform differences. A browser emulating a phone viewport is not a native app test. A simulator is not a physical device. A test-mode charge is not production settlement. State the scope each observation supports.

Measure against the actual candidate and configuration. Preserve identifying metadata privately: artifact/version, platform/runtime, relevant configuration names, test role, initial state, steps, expected/observed result, evidence and limitations. Do not put credentials or unnecessary personal data in reports.

## Authority and recovery

Audit permission does not authorise destructive tests, security testing of unrelated systems, public posts, purchases, data deletion or new infrastructure charges. Use existing approved test environments and identities. Ask only for missing authority that matters; continue independent work while it is pending.

For uncertain external operations, inspect the original operation and provider state before deciding whether any retry is appropriate. Simulated or test-mode failures are preferable when they answer the question. Keep effect ownership and rollback/reconciliation clear.

## Independent review and practical limits

Use an independent checker where the project's consequence requires one. Give it raw observations and the original objective, not a verdict to endorse. It may investigate alternate explanations and test an apparent pass. Preserve disagreements until evidence resolves them; voting does not resolve truth.

Missing access, skipped tests, inconsistent measurements and flaky infrastructure stay visible. Distinguish product failure, test/fixture failure, environmental unavailability and inconclusive evidence. Avoid retrying until a lucky pass hides the failure. Make the resulting coverage limits clear in the main report.

An audit may be complete as an investigation while the product remains incomplete. Record both outcomes accurately.
