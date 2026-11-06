# Inspect the actual candidate and intended result

Use the [current brief](../../bg-build-with-me/references/decision-and-delivery-contract.md)
and original evidence to assess the user's requested outcome. A completed form or
internally consistent record cannot establish that the product works.

## Who checks, and when

Use independent scrutiny when the task or consequences require it. An independent
checker did not author the candidate and can inspect its actual behavior and
sources. A second provider is optional. A simple change may need only direct
verification; do not add a universal review council or user design-approval round.

Apply the project's current release policy and explicit user requirements. Check
the relevant risks without imposing the most extensive release procedure on every
task. Keep real protections for money, data, security, privacy, compatibility and
recovery. No new customer-facing wait, refusal, cap or hold is authorized by this
reference.

## Contract and trust boundary

Identify the exact source, built artifact, configuration and environment under
review. Verify which version and process actually ran. Reconcile a stale or
different candidate before applying its results to the current work.

Prefer original host observations, test output and actual state read-back over
the builder's narrative. Retain failed and unavailable evidence. A checksum can
detect changed bytes but cannot prove that a reviewer, command or customer
journey really ran; model-written records are not independent attestations.

## Disposable test execution

Use a supported isolated environment when tests need to write or change state.
Respect candidate ownership and host permissions. A clone or worktree by itself
does not isolate credentials, network access or services.

Verify the test uses the intended candidate and does not modify an unauthorized
target. Keep useful output and inspect relevant side effects. Clean up only owned
resources under applicable user rules; never reset a shared worktree or silently
delete useful work. No disposable clone is required for an ordinary read-only review.

## What to inspect

- Original intent, latest corrections, authorized scope and current unresolved choices.
- The whole affected flow and integration boundaries, including real consumers.
- The actual browser/device/service/artifact and resulting state where relevant.
- Meaningful failure, retry, cancellation and recovery behavior for the risks involved.
- Money calculations, entitlements, authorization, isolation and sensitive-data handling.
- Approved UI behavior and relevant accessibility; rendering alone is not functional proof.
- For factual work, direct source support, currency, jurisdiction or version,
  calculation accuracy and appropriate uncertainty.

Use [capability coverage](../../bg-build-with-me/references/capability-coverage.md)
to find relevant expertise, not to require every possible test. Retain a clear
distinction between simulator, fixture, headless, physical-device and live evidence.

## Report findings and repairs

Give concrete findings: what was observed, how to reproduce it, why it affects
the objective and what evidence would close it. Retain unresolved findings across
repairs. Distinguish proven defects from uncertainty or a reviewer's preference.

After a repair, recheck affected behavior and relevant integration. Reuse valid
unchanged evidence. Do not create another full review or rerun unrelated suites
without a reason. Respect explicit project repair limits.

State what the inspection supports, what remains unverified and the next action.
The accountable owner decides within existing authority; a reviewer cannot grant
spending or release permission, and the user need not approve a technical verdict.

## Legacy structured evidence

Older versions used JSON contracts, typed receipts, protected pins and a Python
evidence gate. Those optional legacy artifacts do not define this workflow and
are not a completion requirement. Do not create them merely to satisfy an old
link. Existing useful evidence should be retained without rewriting it to look new.
See [enforcement boundaries](enforcement.md) for what observations can establish.
