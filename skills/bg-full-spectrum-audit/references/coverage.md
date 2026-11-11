# Coverage map

Use this as a map of questions, not a certificate or fixed test count. Assess all eight families for a product audit, then deepen the applicable areas. Use the [product challenge](product-challenge.md) throughout; this checklist does not define the outer boundary of discovery. Feature and change modes follow their affected outcomes and dependencies. A concern can span families. Record important exclusions, unavailable evidence and unsupported assumptions.

## A. Purpose, completeness and real use

1. **Intended value and audience.** What progress do people need to make, and is this the right problem and solution? Challenge the product's causal claim and assumptions, even if implementation perfectly matches the brief. Investigate unmet needs, neglected actors, incentives and alternatives to using the product. Distinguish measured behaviour, user research, stakeholder intent and hypotheses. Do not invent personas or treat a competitor's features as requirements.
2. **Requirements and decisions.** Link promises, accepted changes, approved screens/copy and relevant constraints to implementation and verification. Expose contradictory or superseded decisions. Distinguish deliberately excluded features from forgotten or incomplete work.
3. **Work and environment completeness.** Within authorised scope, reconcile branches, worktrees, uncommitted work, cloud jobs, pending migrations, feature configuration and installed/deployed versions. Do not reset or merge during an audit. A repository can look complete while approved work never reached the product.
4. **Whole service and actors.** Trace discovery/setup, first value, recurring use, administration/support, payment where present, recovery, export and exit, including work before and after the software. Include collaborators, recipients and operators. Look for gaps nobody has requested a feature for. Verify handoffs to external services and people; a successful request may not be a delivered outcome.
5. **Outcome measurement.** Define observable success and an appropriate baseline. Challenge proxies such as engagement or generated outputs when they conceal an unfinished job. Check meaningful task completion, errors, satisfaction or retention where evidence exists. Treat analytics validity, selection bias and small samples explicitly. Do not run experiments on customers without authority.

## B. Experience, accessibility and output quality

6. **States and navigation.** Exercise applicable empty, pending, loading, one-item, collection, boundary-content, error and recovery states. Include stale/cached/partial data, permission denial, cancellation and transitions. Check reachability, back navigation, focus and preservation of input. State lists adapt to the product.
7. **Approved design and content.** Compare real screens with the owner's current approved designs, terminology and copy. Check hierarchy, readability, layout, responsive behaviour, motion purpose, contrast and cross-platform coherence. An alternative visual preference is not a defect. Content must describe the actual state and next action accurately.
8. **Accessibility and input diversity.** Test full tasks with keyboard/focus, assistive technology, text scaling, zoom, contrast, reduced motion, touch targets, captions and alternatives as relevant. Combine automated checks with manual/device checks. A scanner or a single accessible control cannot establish accessible task completion.
9. **Localisation and contextual variation.** Check long translations, Unicode, right-to-left layout, pluralisation, locale formats, units, money precision, time zones and daylight-saving boundaries. Match supported languages and markets; do not require unsupported locales as new product scope.
10. **Feedback, comprehension and control.** Can users understand progress, result, cost, permissions and recovery? Does feedback reflect real work? Check confirmation, cancellation, correction and undo where promised. Do not demand fake progress steps or animation on every transition.
11. **Domain output substance.** Inspect actual reports, media, recommendations, calculations or other outputs against a domain rubric and representative difficult inputs. Check factual accuracy, provenance, usefulness, consistency and variation where desired. Duplicate-looking outputs can be correct; require diversity only when the purpose calls for it.

## C. Domain, architecture and implementation

12. **Domain model and invariants.** Identify entities, state transitions, ownership, units and business rules. Verify impossible states are prevented and allowed states remain reachable. Different bounded contexts may use different terms if translation is explicit and preserves meaning.
13. **End-to-end contracts.** Trace producers, consumers, API/event/file schemas, validation, defaults, null/missing values, errors and rendering. Inspect pagination, ordering, partial success and cancellation. Matching field names alone does not establish semantic agreement.
14. **Modularity and changeability.** Examine responsibility, coupling, dependency direction, cohesion, shared state and duplication using a concrete change scenario. Judge abstractions by the complexity they hide and the cost of change; file counts and repeated lines alone do not prove bad design.
15. **Runtime and resource lifecycle.** Check initialisation, disposal, subscriptions, async races, timers, native/browser surfaces, memory, file handles, workers and background services. Test repeated entry/exit and interruption where relevant. A particular guard expression is not proof of safe lifecycle behaviour.
16. **Architecture alternatives.** Evaluate whether the overall shape suits the product: boundaries, data flow, queues, sync, caching, deployment and failure isolation. Compare credible simpler, existing-package and replacement approaches on measurable scenarios. Include integration, licensing, migration and operational cost.
17. **Deterministic versus AI work.** Inventory model calls and heuristics. Use deterministic computation for exact rules when suitable; use models where semantic judgement or generation improves the result. Compare quality, uncertainty, latency, cost, privacy and fallbacks. Neither an LLM nor a hand-coded rule is automatically the right answer.
18. **Compatibility and evolution.** Check public APIs, file formats, events, plugins, old clients, saved data, supported runtimes and mixed deployments. Consider source, wire and semantic compatibility, version negotiation and deprecation. Test an actual representative consumer.

## D. Data, concurrency and irreversible effects

19. **Persistence and integrity.** Verify the saved result, constraints, transaction boundaries, deduplication, ordering, precision and consistency. Test realistic fresh, existing, partial and large records. Refresh/restart and read from the authoritative store when permitted.
20. **Concurrency and distributed state.** Exercise duplicates, parallel requests, stale reads, out-of-order delivery, retries, late completion and cancellation. Identify the operation identity and atomic transition. Test convergence or conflict behaviour instead of assuming exactly-once delivery.
21. **Migrations and data recovery.** Test old/new code with the proposed schema, interrupted/backfilled data and compatible deployment order. Examine lock and availability effects. Prove the relevant rollback or restore and its retained/lost data; reverting code is not a database rollback.
22. **Money, entitlement and consequential actions.** Check amounts/currencies/rounding, authorisation, idempotency, provider state, refunds and reconciliation as applicable. Verify that retries do not duplicate a charge, publication or other external action. Use provider test modes and authorised test identities. Do not invent quotas, holds or customer gates.
23. **Complete data lifecycle.** Follow collection, minimisation, sharing, retention, logs/analytics, backup, export, deletion and derived data. Verify the product's stated controls and account switching. Separate an observed policy mismatch from a legal conclusion needing jurisdiction-specific expertise.

## E. Security, privacy and supply chain

24. **Threat model and access boundaries.** Identify assets, attackers and trust boundaries. Check authentication, authorisation, session/token expiry and revocation, account/tenant isolation, role changes and administrative capabilities. Test denial at the actual boundary, not just hidden buttons.
25. **Untrusted inputs and platform security.** Examine injection, output encoding, uploads, traversal, network requests, secrets, crypto/transport and rate/abuse handling relevant to the system. Mobile/desktop includes local storage, logs, backups, deep links, permissions, IPC and update trust. Test only within authorised security scope.
26. **Dependencies and delivery integrity.** Check real dependency versions, reachable advisories, install scripts, licences, build provenance, CI permissions, artifact signing and update paths. Prefer supported maintained components; popularity or a clean scanner is insufficient evidence.
27. **Privacy and evidence handling.** Keep tokens and personal data out of reports, screenshots, recordings and model prompts. Verify access to artifacts and third-party disclosures. Test with representative non-sensitive data where possible; permission to audit does not permit publishing customer evidence.

## F. Reliability, performance and operations

28. **Failure and recovery.** Exercise timeout, partial response, dependency outage, disconnection, exhaustion and process restart. Check backpressure, bounded retries, cancellation, durable work and safe reconciliation. An automatic retry is useful only when it preserves the intended effect and does not duplicate harm.
29. **Measured performance and capacity.** Define a representative workload, device/network/data conditions and budgets. Measure user-visible latency and tails, throughput, error rates, queue depth, CPU/memory/storage/network, cold start and battery where relevant. Identify bottlenecks and overload behaviour. Record sample size and uncertainty.
30. **Observability and supportability.** Can an operator detect, locate and explain a failed journey without exposing private data? Check useful logs/metrics/traces, correlations, actionable alerts, ownership and runbooks. Verify signals by causing a safe known failure, not by counting dashboards.
31. **Release, configuration and restoration.** Match tested and distributed artifacts, config, dependencies and data. Exercise upgrade/install/restart, deployment order and rollback/restore on representative environments. Check drift and every intended entry point. Preserve current users' work and active operations.
32. **Cost, maintainability and resource efficiency.** Estimate and, where possible, measure cost per successful outcome including retries, inference, builds, storage, egress, support and operations. Examine sustained workloads and maintenance/exit cost. Treat energy/resource efficiency as a relevant tradeoff, not an invented universal target.

## G. AI and autonomous systems, when present

33. **Evaluation and generalisation.** Define the task, trusted expected outcomes or a clear rubric. Use representative, difficult, subgroup and previously unseen cases. Check factual support, hallucinations, output validity, drift and quality/cost/latency tradeoffs. Calibrate model judges; preserve first failures and evaluate the full agent trajectory as well as final text.
34. **Authority and adversarial inputs.** Test direct/indirect prompt injection, cross-user memory leakage, tool misuse, unsafe interpretation of generated output, and automation beyond user intent. Enforce consequential permissions outside the model. Trace the actual tool effect, not just the proposed action.
35. **Human correction and autonomous recovery.** Verify uncertainty communication, handoff, correction, approval where required, interruption and resumption. Check that a later user instruction affects dependent work. A fallback must preserve the task and its permissions. Inspect memory freshness and provenance.

## H. Verification and product stewardship

36. **Test validity.** Inspect assertions, fixtures, mocks, skipped/flaky tests and the boundaries they omit. Reproduce important defects and use known-good/known-wrong cases or mutation/property testing where valuable. Coverage counts, source-pattern checks and model agreement do not demonstrate the desired effect.
37. **Documentation and developer/operator experience.** Follow fresh installation, onboarding, examples, help and recovery instructions using the distributed artifact. For CLI/API/library products exercise real consumer code, stdout/stderr and exit status, schemas and non-interactive use. Check supported maintainers and operational handoffs.
38. **Evidence, decisions and remaining opportunities.** Link conclusions to candidate, conditions and observations. Separately report broken promises, supported product weaknesses and newly discovered opportunities. Compare substantive concept/workflow alternatives, including simplification and removal, and identify evidence that would reject an idea. Return actionable owner questions with a recommendation and tradeoff. Include coverage limits and reasons to retain sound existing work.

## Relationship to the original twenty lenses

The original inspection topics remain represented: runtime (15); UI states (6); batch quality/diversity (11); copy/wayfinding (7,10); state contracts (12,13,19,20); tenancy/revenue (22,24); architecture fit (1,4,16); progress (10); visual/motion craft (7,8); output substance (11,33); comprehension (10); competitive comparison (1,7,16); omissions (2–4); deep modules/change cost (14); domain language (12,13); failure/control loops (20,28,35); architecture economics (16,29,32); operability (30,31); deterministic/AI allocation (17); external research and architecture alternatives (16,26).

These are inspection instructions, not evidence that any of the checks has run. The original twenty headings were not twenty executable tests.
