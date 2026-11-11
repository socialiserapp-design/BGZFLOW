---
name: bg-expo-testing
description: "Plan, set up and run Expo end-to-end testing using official Expo workflows/simulators and available agent-device, Argent or Maestro methods. Connect whole-product requirements to real app and service evidence; reconcile runs, failures and cleanup."
---

# Expo end-to-end testing

Use Expo's existing tools and skills to test the intended app outcome. This coordinator chooses coverage, connects the supported tools and assesses the evidence. It does not replace Expo's CLI, the device controller or the project's established test suite.

Any agent with this skill, a suitable shell/controller and authorised project access can use it. The current lead can drive a remote device with its own reasoning session. Unattended QA Swarm workers additionally need an approved non-interactive agent runner. Do not assume one provider, account, model or concurrency limit.

## Choose the requested work

- **Plan or skills-only:** inspect requirements, current tooling and source guidance; produce or improve the test method. Do not start an app, cloud run, session or account change when these are outside the request.
- **Set up:** read [setup and upstream reuse](references/setup.md). Inspect and merge the project's existing configuration; use the official recipes and current schema. Validate the actual configured workflow in its project context.
- **Test or investigate:** read [coverage and flows](references/coverage.md) and [execution and evidence](references/execution.md). Run only within current app/account/data/spending authority, observe the actual result and reconcile cleanup.

For an audit, use the applicable outcomes from [full-spectrum audit](../bg-full-spectrum-audit/SKILL.md). A test can establish behaviour and reveal experience problems; it cannot decide market demand, product strategy or subjective taste on its own.

## Reuse the upstream capabilities

Discover installed relevant skills first. Prefer Expo's `eas-workflows` and `eas-simulator`; use `eas-observe` or `eas-update-insights` only when appropriate to the task. For controller-specific interaction, exploratory testing or repeatable regression authoring, use Callstack's `agent-device`/`dogfood` or Software Mansion's Argent skills. The [upstream map](references/setup.md#upstream-map) provides primary sources if a host does not have them installed. Read only the selected method and needed references.

Choose the smallest complementary combination that proves the requirement:
- Lead-driven remote inspection for diagnosis or exploratory checks.
- QA Swarm for independent natural-language flows across selected platforms.
- Agentic CI for change-specific PR checks.
- Existing deterministic tests, Maestro on EAS, or supported Argent regression flows for repeatable assertions.

Bug-triage and issue-to-PR recipes can post messages or write code. Use them only when those actions are included in the request. No testing recipe grants permission to merge, publish, buy capacity or alter a customer account.

## Assess the result

Tie evidence to the actual candidate, platform, fixture and required outcome. Inspect screenshots and controller observations, and read back service effects when a journey promises persistence, delivery, money or other external state. Keep functional failure, infrastructure failure and unverified coverage distinct.

Never accept a model-written PASS, successful report job or complete-looking artifact directory as sufficient proof. Check required lanes, process results, per-step evidence, candidate identity and session cleanup. Preserve failed attempts. An unavailable physical-device or service check stays unverified even when simulator checks pass.

Return what was exercised, what actually worked or failed, the evidence, remaining coverage limits and next action. Feed that into the existing project verification process. This skill adds no independent release gate or automatic recurring spend.
