# Adapt the audit to the product

Use all applicable profiles for a mixed system. These are additions to the shared coverage map, not mutually exclusive product categories.

- **Web/mobile/desktop:** real navigation and task completion, responsive/native differences, permissions, accessibility, lifecycle, offline/sync, local storage, deep links, notifications, upgrades and packaging. Verify supported platforms; retain explicit physical-device and store-specific limits. Inspect native resource handling instead of demanding one React or UI pattern.
- **API/service:** consumer setup, authentication/roles, request and response semantics, validation, pagination, rate/backpressure behaviour, timeouts, idempotency, concurrency, data consistency and version compatibility. Include administrative and operational use. Do not require graphical screens.
- **CLI/developer tool:** installation, discoverability/help, options/config precedence, stdin/stdout/stderr, exit codes, structured output, scripts/pipes, non-interactive operation, cancellation, resumption and safe file handling. Test the actual distributed executable from a clean consumer environment.
- **Library/SDK/plugin:** supported runtime/compiler/package versions, public types and semantics, minimal consumer examples, dependency boundaries, concurrency/lifecycle, error behaviour, performance and binary/source compatibility. A passing internal test is not proof the package exports or installs correctly.
- **Data/analytics pipeline:** ingestion, lineage, schema evolution, duplicates, late/out-of-order events, backfill, quality constraints, reproducibility, privacy, resource/cost use and downstream consumer correctness. Verify aggregate definitions against original data and account for sampling and missing records.
- **AI/agent/automation:** intended task and human oversight, grounded output, uncertainty, tool authority, untrusted retrieved content, isolation/memory, dynamic providers and fallback, interruptions, deterministic alternatives, quality/cost/latency evaluation and resulting real effects. Evaluate interactions and corrections, not only one final answer.
- **Payments/commerce/accounts:** lifecycle and state transitions, currency/precision, refunds/reconciliation, entitlement changes, taxes/pricing rules as specified, account ownership and test-mode provider evidence. Never infer permission for real money from audit scope.
- **Infrastructure/internal operations:** provisioning/configuration, access, backups/restores, upgrade/drift, observability, incident/runbook usability, capacity, cost and blast radius. Review operator outcomes as product outcomes. Internal use does not remove data/security consequences.
- **Safety-critical or regulated work:** identify applicable domain standards, hazards, assurance requirements and who can make expert judgements. Review evidence and escalation with the appropriate specialist. A general software audit is not regulatory certification or professional sign-off.

## Select existing expertise

The main agent should choose relevant available skills and tools rather than load all specialists. Common fits in BGZFLOW are architecture/domain modelling, accessibility/content/product flows, threat/risk review, property-based or mutation testing, research-ground-truth and outcome evaluations. Confirm that a selected tool exists in the current host. If missing, use authoritative guidance directly or report the capability gap.

Preserve the owner's current preferences and approved designs. Repeated examples from one project remain in that project's private guidance. Do not publish customer research, internal incidents or conversation transcripts as shared defaults.
