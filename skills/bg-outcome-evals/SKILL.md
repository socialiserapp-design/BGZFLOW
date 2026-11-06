---
name: bg-outcome-evals
description: "Design and run checks that prove the user's intended outcome, including ongoing clarification, real browser/device/service effects, AI workflow evaluations, regression tests and deliberately broken cases. Use when defining completion, testing an agent or skill, or investigating a misleading green test result."
---

# Prove the intended outcome

Start with the user's request and consequential answers, not the builder's summary.
Describe the observable result in ordinary language: who can do what, where, with
which constraints. For substantial work, put these checks in the existing plan or
test suite. Do not ask the user to fill a form or approve engineering test details.

## Keep understanding aligned

Ask about missing choices that could change the result before implementing the
affected work. Use a concrete example, sketch or short demonstration when words
hide ambiguity. After an answer, explain the resulting change briefly and use it.
Revisit understanding when a prototype exposes a choice, an external limitation
changes feasibility, a new request conflicts with a decision, or a failed check
suggests the target was misunderstood. Continue independent work meanwhile.
Do not repeat answered questions or manufacture a question count or clarity score.

Test this behaviour too. Include conversations where the user changes their mind,
answers indirectly, supplies a constraint late, or tells the agent to use its
judgment. Check the resulting action against the latest intent. Merely asking a
question is not success; implementing the answer is.

## Use three complementary kinds of evidence

1. **Direct checks:** run assertions on observable outputs and effects. For an app,
   drive its real user route and read back the saved or external state. Confirm the
   process, served version, account and environment actually under test. A live
   process alone does not prove a feature; a passing unit test does not prove the
   installed app. For documents, open the exported artifact and reconcile figures,
   references and layout. For research, resolve citations and check that the actual
   passage supports the claim in the applicable date, version and jurisdiction.
2. **Independent judgments:** use a separate reviewer or calibrated model judge
   for qualities without a simple assertion, with explicit criteria and original
   evidence. Prefer blind comparisons for alternatives. Check the judge against
   human-labelled examples, including confident but unsupported answers. Its score
   cannot override a failed direct check, missing evidence or a user's decision.
3. **Real use:** exercise the actual intended environment and observe relevant
   outcomes after an authorised switch. Synthetic fixtures and simulated users
   are useful regression checks, not proof of customer benefit or consent.

## Choose the smallest effective test set

Use the project's existing tools first. Select relevant methods rather than running
every method on every edit: ordinary behavioural tests; Playwright or native device
automation for journeys; property-based tests for broad input rules; mutation tests
to see whether assertions catch wrong behaviour; recovery/concurrency/fault tests
for stateful operations; accessibility, security and isolation checks for affected
surfaces. Reuse unchanged evidence only while the candidate and relevant environment
are unchanged. Load specialist references only when needed.

AI workflows need multi-turn and tool-effect checks as well as final-answer checks.
Measure the selector (including no skill, explicit skills, wrong triggers and outage),
the delivered instructions, the action taken, and the final result separately.
Use [evaluation tools](references/tools.md) for a suitable existing runner. Capture
first attempts, failures and repairs separately. Repeated trials expose variation;
report sample size and uncertainty rather than a perfect-looking average alone.

## Test the tests

Include a known-good case and a realistic deliberately wrong case. A check claiming
to catch a dead server, ignored correction or missing save must fail for that case.
Inject faults only in isolated test work, never a user's live session. Verify that
the intended mutation really changed the fixture or program. A timeout or broken
test setup is inconclusive, not a successful detection. Keep unseen cases separate
from the examples used to improve the skill, prompt or router.

## Report and improve honestly

Assess every material promised outcome. Say what works, what failed and what remains
unobserved; a reply is allowed to explain a failure. Do not turn the word "done" into
a regex gate. Where the application owns execution, derive its verified status from
trusted checks tied to that exact run, not model-supplied success fields. Outside
those boundaries, describe the evidence and enforcement limitation honestly.

Turn a reproduced failure into a targeted regression example before changing the
method. Adopt tested improvements within existing authority; preserve rollback,
check unrelated held-out cases, and ask before expanding permissions or spending.
Keep private user/team evidence private. Shared improvements use public or synthetic
cases and research, never silently copied customer conversations.

Sources and research limits: [research](references/research.md).

## Use real execution checks when integrated

Native agents use the actual available test, browser, device and service tools and
retain their observed results. Do not turn the skill into a manual success form.
For an embedding application, the foundation session can use owner-configured
executable checks through `createExecutableChecks`. The trusted application owns
the commands and receives their exit/result observations; a proposed skill cannot
supply a command and certify itself. A check still proves only the outcome its
implementation really observes. Inspect that check with good and bad cases.
See `docs/foundation-session.md` in the source package; this optional API does not
replace real-surface verification or create user consent.
