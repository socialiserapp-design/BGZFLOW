# Match expertise and checks to the actual task

Use this reference when the current work needs additional expertise. Its rows
are prompts for relevant risks, not a required bundle, a fixed skill floor or
a current/next-stage form. Choose useful methods through the catalogue and
[selection guidance](skill-selection.md), with the main agent as fallback.

A method can change how well the work is done; it cannot authorize a different
product, new spending, customer restrictions or broader tool access. Preserve
explicit user requirements even when the selector misses relevant expertise.

## Coverage table

| Task or risk | Expertise and observable checks to consider |
|---|---|
| Unclear product outcome | Recover the current request; resolve consequential choices; define what the user will be able to do and how to observe it. |
| Software design and shared interfaces | Existing callers, useful packages, ownership, compatibility, failure behavior and realistic consumer examples. |
| Changed behavior or reproduced failure | Meaningful behavioral checks; a failing-before/passing-after regression where practical; isolate the cause instead of patching symptoms. |
| Independent work | Disjoint ownership, real capacity, current instructions and a combined-candidate check. |
| Substantial or consequential result | Independent scrutiny appropriate to the consequence, plus direct evidence of the requested outcome. |
| UI, web, mobile or chat surface | Approved direction, interaction states, accessibility and actual rendering on the relevant supported surface. |
| Native integration or performance | Runtime/version compatibility and measured behavior on the target platform; identify any device evidence still missing. |
| Security boundary | Authorization, isolation, secrets, untrusted inputs and failure/retry behavior at the affected boundary. |
| Money, quotas, pricing or commercial defaults | Applicable risky-changes expertise, accurate provider facts, realistic normal/edge cases, approved customer behavior and actual spending authority. |
| Multi-step external work | Stable operation identity, unknown-outcome reconciliation, cancellation, recovery and protection from duplicate effects. |
| Research, legal or factual work | Applicable primary sources, dates, jurisdiction or version, supported claims and explicit uncertainty. |
| Documents, calculations or creative work | Correct content, formulas or data; intended audience; assembled/rendered artifact, including sound or motion where relevant. |

Use relevant existing specialists rather than loading every row. Missing required
tools or expertise remain specific gaps; an equivalent method is acceptable only
when it proves the same requirement. Record limitations honestly.

## Recording coverage

Keep a short current brief connecting the objective, current decisions, authority,
owned work, selected methods, meaningful checks and unresolved gaps. Reuse existing
task records and native events. Do not ask the model to manufacture a separate
coverage form or full-body-read receipt.

The foundation can capture native messages, method selections, assignments and
some tool outcomes. These observations do not prove complete coverage or method
application. Check the actual result before making that claim.

## Pack methods

### M1 Test first

Use test-first development when requested or when a concrete regression makes
it useful. For a bug, show that a meaningful check can detect the original fault
before trusting its pass. Avoid tests that merely copy the implementation.
Not every prose edit, investigation or reversible low-impact change needs a
new automated test.

### M2 Verify before claiming

Define observable success, exercise the actual relevant candidate and inspect
its effects. Use commands, browser/device observation, source checks or independent
calculations as the task requires. Identify the actual instance and relevant
server processes. Reuse unchanged valid evidence; do not rerun for ceremony.
A successful command or model statement alone is insufficient.

### M3 Systematic debugging

Reproduce the problem, trace relevant inputs and boundaries, compare a working
case, test a specific hypothesis and recheck affected behavior. Preserve failed
evidence. If repeated attempts fail at the same boundary, reconsider the approach
and surface consequential unresolved choices. Honour the task's repair limits.

### M4 Review

Check the complete affected outcome against the original request. Consolidate
concrete findings with reproduction, consequence and closure evidence. Builders
check their own work; an independent assessment, when required by risk or the
task, comes from someone who did not author the candidate. Provider names alone
do not establish independence.

### M5 Parallel work

Delegate independently ready contributions only when useful and supported by
actual capacity. Keep one writer for shared changes and one integration owner.
Use appropriate isolation; worktrees do not isolate credentials or services.
Preserve the same accepted interfaces and user decisions across workers.

### M6 Accessibility

For the affected surface, check keyboard or assistive input, meaningful control
names and states, focus order, contrast, text scaling, touch targets and reduced
motion as applicable. Use current platform guidance and the project's adopted
accessibility standard. Measure actual rendering; do not claim certification
from a checklist or add unrelated redesigns.

### M7 Real-flow acceptance

Exercise the intended journey on the actual relevant browser, device, service
or final artifact. Include applicable loading, empty, error, retry, offline,
permission and cancellation behavior. Respect local device restrictions and use
authorized test accounts. Label simulator, headless, fixture and physical-device
evidence accurately; missing target proof stays unverified.

### M8 Security review

For affected security-sensitive work, identify assets and trust boundaries, then
check the risks that apply: input validation, authorization and tenant isolation,
secret handling, injection, unsafe fetches/uploads, configuration, dependency
provenance, data retention and failure paths. Use current authoritative guidance
and existing project controls. A threat-model method can help complex work but
is not a mandatory new exercise for every task.

For relevant web and service changes, inspect parameterized queries and output
encoding, authenticated and authorized actions, tenant separation, safe session
cookies, password storage, transport security and abuse controls. Check unsafe
server-side fetches and file paths, untrusted provider responses, dependency
provenance and reachable advisories. For sensitive data, check the stated purpose,
consent, retention and working deletion/export behavior required by the product.
Exercise the actual affected boundaries; a long security checklist is not evidence.

Do not expose credentials or personal data, broaden permissions or silently
change accounts. Confirm ownership and the user's applicable rules before
destructive actions. New sensitive features or access outside the authorized
scope require resolution before that work.

### M9 Misuse resistance

At consequential API or configuration boundaries, test empty, missing, invalid,
swapped and boundary values, unsafe defaults and misleading success paths.
Prefer an interface whose ordinary correct use is safe. Do not treat an LLM
judgment as validation of untrusted runtime input.

### M10 Money and risky changes

Verify current provider semantics and real data assumptions before changing
charges, prices, quotas, subscriptions or customer-visible defaults. Preserve
the user's approved behavior and required risky-changes checks.

Give external operations a stable identity and reconcile unknown outcomes before
retry. Protect against duplicate charges or deliveries, mismatched retry payloads
and concurrency. Check taxes, fees, currency, entitlements and agreed margin when
applicable. Use authorized test modes; live charges, store submissions or trading
need the actual task's authority. Reverting code does not reverse money or data.
Do not add a staged rollout, cap or customer hold merely because it is suggested
here; use the approved release and recovery policy.

### M11 Domain vocabulary

Use the project's current names and shared definitions across owners. Resolve
ambiguous terms with concrete examples. Keep user choices separate from engineering
proposals and superseded decisions. Use existing records; a new glossary file or
numbered decision form is not mandatory.

### M12 Interface design

Inspect real consumers and external schemas. Make ownership, accepted inputs,
outputs, errors, compatibility and retry behavior explicit at the affected boundary.
Prefer suitable existing interfaces. Validate untrusted input where needed; do
not assume every system must share one error format or identical schema strategy.
Provide a migration or compatible change when existing consumers require one.
