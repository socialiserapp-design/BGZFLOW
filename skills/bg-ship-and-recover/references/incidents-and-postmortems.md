# Incidents, recovery and post-mortems

Every role uses the existing project incident record and one incident owner. **No store submission, deploy, rollout or live-service change without the founder's existing approval.** Standing recovery approval may cover named containment actions; record its boundary before acting. Urgency never expands it. Payment, store submission and live trading happen only when the brief names them. Customer communication also needs existing authority; draft updates for the authorised sender when it is absent.

## Classify and start

Use the project's agreed severity definitions; otherwise use this proposed matrix and record the classification. Cadences are internal response targets, not invented customer SLAs.

| Severity | Observed impact | Response and update target |
|---|---|---|
| SEV1 | Broad outage, active data loss, security exposure or uncontrolled money effects | Engage immediately; update the owner and authorised communicator every 15 minutes |
| SEV2 | Major journey unavailable or severe degradation for a material cohort | Engage promptly; updates every 30 minutes |
| SEV3 | Limited impairment with a safe workaround | Assign this working day; update at agreed milestones |
| SEV4 | Small defect without material service impact | Queue with an owner and due date; normal status cadence |

In the first 15 minutes of a SEV1 or SEV2, record the detection and start time in UTC from the system clock, the affected customers and versions, the severity, the incident commander, the technical owner and the communicator. Link the alert evidence and recent releases, and keep facts apart from hypotheses. Preserve diagnostics without secrets or unnecessary personal data. Stop expansion and invoke only approved containment, then verify its result. If authority or a safe action is missing, escalate immediately while continuing read-only diagnosis.

For money incidents, retain durable operation IDs and reconcile unknown charges and orders before any retry. A project's pre-approved pause-charges or halt-and-flatten procedure may apply, but flattening positions, refunds and resuming payments are separate live effects that need their actual authority. No generic runbook grants it. A code rollback does not reverse money or data changes.

## Copyable runbook

```text
Incident/service ID; severity and impact; commander/technical owner/communicator
Runbook owner; last safely verified date; candidate/live configuration; dashboards
Authority source and scope; surviving holds; credentials by name; escalation contacts
Step N: prerequisite and target identity | action and durable operation ID
Expected observation and timeout | actual result/evidence and UTC time (system clock)
If failed/unknown: reconcile ID, stop condition, safe fallback and escalation owner
Recovery artifact/configuration; data/schema compatibility; rollback limits
Verification: affected journey, health window/sample, residual backlog or offline clients
Next update time; next action/owner; handover acknowledgement
```

Execute one reconciled action at a time. Before any resume or retry, reconcile job records against whether the process is alive: a job recorded as running or queued whose process is dead is uncertain, not active. Name any external resource a job creates with the job ID prefix, record it and clean it up before a retry. Verify containment and customer recovery independently of command success. Record partial recovery honestly, and announce resolution only when the affected journeys and the agreed health gates recover. Preserve incident findings, return fixes to their owners and search related paths for the same failure. For repairs of this release, require exact-SHA real-platform golden journeys and rollback proof, never another independent review. A distinct new release keeps its own single read-only review. Keep the two-repair-round cap, counted in the `bg-rounds` ledger with stable finding IDs; round 3 needs the founder's explicit approval. The cap never abandons authorised containment.

## Communicate, learn and hand over

```text
Customer update draft: incident/time | affected service and practical impact | confirmed current state
safe workaround | action underway | next update time
```

Separate unknowns; avoid secrets, blame and unsupported restoration promises. The authorised communicator records the destination, the approved content and the send receipt. A missed deadline needs an update even when the diagnosis is unchanged.

For a SEV1 or SEV2, data, security or money harm and significant near misses, assign a blameless post-mortem owner and a due date. Record the impact, a UTC timeline with evidence, detection and recovery delays, contributing system conditions, what worked and failed, and unanswered questions. Use evidence-led "why" analysis without forcing one cause or blaming an individual. Track prevention, detection and recovery actions in the existing backlog with stable IDs, owners, due dates and measurable closure tests. Verify completion and update the runbook.

On-call handover includes active incidents, current severity, deployed and rolled-back IDs, pending operations, holds, actions already attempted, dashboards, upcoming changes, the next customer update and the escalation contact. The incoming owner acknowledges receipt, verifies access and alert delivery through authorised checks and states the next action. Until acknowledged, ownership stays explicit with the outgoing owner or the agreed escalation recipient; a sent note alone is not a transfer.

Optional incident and alert tools, where available, use existing accounts and approved integrations. Public skills exist for runbook templates, post-mortem writing and on-call handoffs (e.g. `incident-runbook-templates`, `postmortem-writing`, `on-call-handoff-patterns`); do not assume they are installed or install them implicitly. Project recovery runbooks remain authoritative.

Basis: the public [incident-response skills in the wshobson/agents repository](https://github.com/wshobson/agents/tree/156b7a5e7a8b93642628a339ee4039c925b34c7f/plugins/incident-response/skills), MIT, read at that pinned commit. This is an independently worded, provider-neutral adaptation; it contains no infrastructure commands or copied templates.
