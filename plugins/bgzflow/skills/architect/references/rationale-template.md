# Architecture rationale

Use the sections that help a reviewer assess a consequential design. A routine
change does not need a new document or an invented tournament.

## Problem and constraints

State the user's desired outcome, current interfaces and meaningful constraints.
Separate observed facts from assumptions and unresolved user decisions.

## Caller's view

Show a realistic usage example before designing types. Explain what the caller
provides, receives and can rely on. Keep the proposed interface consistent with it.

## Shape and ownership

Describe responsibilities, data flow, state ownership and validation boundaries.
Address cancellation, retries, compatibility and recovery where relevant. Explain
what complexity the interface hides and what the caller must still manage.

## Alternatives and trade-offs

For a meaningful structural choice, compare viable alternatives by capability,
reliability, integration, cost and maintenance. Explain the selected approach and
its trade-offs. Do not manufacture extra candidates or require another model,
a tournament command or a fixed vote.

## Evidence and open questions

Record verified interface facts, relevant experiments, uncertainty and failure
risks. Ask the user only about consequential unresolved product or authority
choices; resolve ordinary engineering questions from evidence.

## Next step and verification

Name the smallest complete usable slice, dependencies and checks that demonstrate
the intended outcome. Work within existing authority once required questions are
resolved. No readiness score, unlock command or approval form is required.
