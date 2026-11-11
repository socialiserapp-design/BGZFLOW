# Testing the requested outcome

Define observable success from the user's request before choosing checks. Clarify
consequential ambiguity; do not invent acceptance criteria that change the product.
Use the smallest complementary set of checks that can reveal the relevant failures.
Select a capable available runner within current permissions and spending authority,
balancing reliability, coverage, time and cost rather than price alone.

## Choose checks by consequence and medium

- During implementation, run focused unit, type, lint and contract checks where they
  test meaningful behavior. Add a regression case for a reproduced defect.
- For web interfaces, use the existing browser runner or supported computer-use tool
  against the actual candidate. Exercise the requested journey and inspect its
  resulting state, including relevant server processes and error output.
- For mobile work, choose a supported physical device, simulator or automated runner
  matching the risk and target platform. Maestro, platform test tools, EAS or hosted
  devices are options, not mandatory vendors. Respect device ownership, emulator
  restrictions and approved spending. A simulator pass does not prove every device.
  [Expo testing](../skills/bg-expo-testing/SKILL.md) coordinates Expo's official
  tools and suitable controllers when that option fits the app. Verify both the
  device journey and any promised service effect; preserve missing physical-device
  coverage and uncertain cleanup explicitly.
- For research, legal, marketing and documents, inspect source support, calculations,
  completeness and the final rendered artifact as appropriate. Expert review may be
  required by the task or consequences; a model judgment is not legal certainty.
- Before an authorized release, verify the relevant integrated journeys and effects
  in the intended environment. Exercise failure, retry and recovery where consequential.
  Apply the project's actual release depth; do not require a full new campaign for
  every small change or wait for the user to perform checks the agent can perform.

The user may make subjective product decisions or do a physical step that agents
cannot perform. Do not make them the default functional tester.

## Test behavior and compatibility

Use real supported interfaces and versioned schemas where the system has producers
and consumers. Check relevant old-client compatibility when an interface changes.
Fixtures must reflect documented or observed responses, with secrets removed.
Assert effects such as one charge, saved state or delivered content; a tool call
or successful process exit alone does not prove these effects.

Confirm that tests exercise the actual candidate and instance. Check relevant live
processes, configuration and bindings without exposing secrets. Use a known-good
case to distinguish environment failure from a product failure, and a realistic
wrong case or safe mutation to check that important assertions can detect a defect.
Keep first failures and repairs distinct.

## Evidence and missing access

Retain compact evidence in existing task records: candidate, environment, journey,
observed result and remaining gaps. Do not require a new receipt form or model score.
An unavailable required surface remains unverified; report it plainly and continue
independent work. Use an available equivalent only when it proves the same outcome.

Use [outcome evaluation guidance](../skills/bg-outcome-evals/SKILL.md) when applicable.
For a broader product or feature assessment, use
[full-spectrum audit](../skills/bg-full-spectrum-audit/SKILL.md) to challenge the
underlying concept, discover missing needs and compare better approaches alongside
the technical checks. Test results alone do not establish product value.
The foundation's direct tests and optional Promptfoo evaluations serve different
purposes: deterministic assertions check observable facts; an independent judge can
assess relevance and interpretation but cannot invent unobserved effects.
