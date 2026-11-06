# A useful plan and prototype

Use the existing project brief or native task system. These examples help keep
the work understandable; they are not forms to complete before answering.
The [shared questioning procedure](question-round.md) governs discovery.
The [dependency guidance](../../bg-finish-the-whole-job/references/work-graph.md)
governs ownership and prerequisites. Neither requires a JSON graph, numbered
question rounds, per-skill hashes, receipts or a separate approval of a summary.

## Start with the actual request

Recover the user's objective, latest corrections, settled choices and relevant
existing work. State how the requested result could be observed. Investigate
discoverable facts; ask about consequential product choices, uncertainty and
authority before dependent work. Use the task's quality/time/usage preference.

Keep explicit deferred work visible, with its source. Do not turn a plausible
extra feature into an "original requirement". A worker's smaller assignment does
not replace the whole agreed objective.

## Optional short working brief

Use only the portions that help this task:

- **Result:** what the user wants, who will use it and what would prove it works.
- **Scope and sources:** the actual request, decisions that apply, exclusions and
  unresolved choices; link original sources rather than duplicate the transcript.
- **Approach:** existing code, packages or services considered; why the proposed
  approach fits, its material trade-off and any assumption needing investigation.
- **Work:** a useful complete slice, dependencies and owners where more than one
  person or agent contributes. A short native plan can be enough.
- **Authority and resources:** applicable permissions, spending and release limits;
  actual available accounts, tools and devices when needed. Unknown is not available.
- **Checks:** observable outcome, candidate and environment; meaningful automated
  checks and the actual browser/device/document/service actions needed for proof.
- **Current state:** what changed, observed results, retained failures, remaining
  work and its next action.

Update relevant facts as they change. Native event capture preserves supported
messages, questions and results automatically. An optional
[current-brief example](../../../templates/CHECKPOINT.md) is available when no
suitable project record exists. It does not require another tracker.

## Resolve a real design choice

For an unresolved experience or visual choice, show enough realistic alternatives
or a proportionate prototype to help the user decide. Explain what each option
does, its useful upside, material downside, reversibility and uncertainty. Give a
recommendation grounded in the user's priorities and the strongest case for an
alternative. An already clear small change needs no new design exercise.

A useful prototype brief includes the intended experience, existing decisions,
target surface, realistic content, the important journey and the question it will
answer. Identify simulated data or actions and what still needs real testing.
Use the user's actual choice in subsequent work; do not infer approval of behaviour
or features that the prototype did not explain.

Preserve the approved design and applicable accessibility needs. The
[design guidance](../../bg-personal-product-design/references/design-contract.md)
adds relevant expertise without starting another interview or approval workflow.

## Coordinate only the work that benefits

Use one agent for closely connected work. Delegate independent contributions or
a fresh evidence-based check when the task and available capacity justify it.
Keep one owner per shared file, device, service or release candidate. Give each
worker the current objective, corrections, necessary inputs, meaningful checks
and authority; use the [worker brief](../../bg-finish-the-whole-job/references/worker-packet.md).

Wait for an actual prerequisite when a contribution depends on it. Preserve the
native assignment identity and result where supported; a posted request is not
proof of execution. Reconcile interrupted or uncertain external effects before
retrying. There is no fixed provider team, worker count, job duration, repair
counter or manual schema imposed by this example.

## Check the whole requested result

Use checks matched to scope and consequence. Confirm that the actual running
instance and delivered artifact are the tested candidate. Exercise the requested
journey and inspect its resulting state, including relevant failure and recovery.
Keep native, fixture, simulated and unavailable coverage distinct.

When the task is consequential or complex, the independent checker uses the
original request and evidence rather than merely endorsing the builder's account.
A complete plan, a model verdict or an automated test passing is not whole-product
proof. A missing record field is not by itself a reason to block a normal reply.

A concise result can say what works, how it was verified, which parts remain
unverified and who takes the next action. Preserve every unfinished part of the
agreed objective; do not substitute completed subtasks for the whole result.
Continue already authorised work when its prerequisites are satisfied. Ask only
about consequential choices or authority that remain unresolved.

## Worked example: booking a free class

This example is fictional. It demonstrates reasoning and useful records, not
actual approval, implemented behaviour or passing evidence.

The user says: "Let students book a free class from the timetable on their phones.
Keep our existing look."

The original scope is phone booking from the existing timetable, at no charge,
with the current design retained. Payments, reminders, waitlists, accounts and
a new administration interface are not silently added to that scope.

The agent inspects the timetable, existing storage and available booking tools.
It finds that the site can currently record an inquiry but cannot confirm a seat.
That fact changes the question it asks:

- **Request a place:** the student sends an inquiry and the studio confirms later.
  This can reuse the existing form, but creates manual work and must not display
  an unconfirmed booking as a reserved seat.
- **Confirm a seat immediately:** the system reserves against actual remaining
  capacity and shows the result. This better meets an instant-booking goal, but
  requires a shared capacity check and safe handling of simultaneous requests.

The agent explains what it found and asks which outcome the user wants, without
presenting invented cost figures or treating its recommendation as consent.
The hypothetical answer is: "Confirm the seat. The front desk will handle changes."

The current brief preserves that answer and its source. It calls for immediate
confirmation and a reliable capacity check; it does not add self-service
cancellation or a new front-desk product. The agent uses an appropriate existing
package or integration where it fits, and explains any material new component.

A later correction, "Students should not need an account", affects the identity
flow. It leaves the free-class decision and existing look intact. The agent
clarifies any consequential contact-data choice instead of inventing it.

A complete slice lets a student choose a class, submit the agreed details and
see the observed result. The checks use the actual mobile browser and saved
booking state, then exercise a repeated submission and interrupted response
without creating duplicate reservations. The agent checks the actual serving
instance; source changes alone are not evidence that the phone loaded them.

An honest report distinguishes any verified booking flow from unavailable device
coverage or an untested failure case. The retained evidence supports continuation
in the same chat. It creates no new user approval ritual or mandatory paperwork.
