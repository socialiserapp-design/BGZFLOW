---
name: autopsy
description: "Investigate a repeated or serious failure by reproducing it, comparing evidence and isolating its cause before choosing a repair."
---

# Diagnose a failure

Preserve the failing input, actual output, environment and last known working behaviour. Reproduce the smallest relevant case without repeating an uncertain external or paid effect.

List plausible causes with a discriminating observation for each. Inspect the real boundary that failed: input, state, concurrency, dependency, tool or assumption. Do not guess that every failure is a timeout or broken server.

Use the observations to reject explanations. Repair the demonstrated cause within scope, reproduce the original case and check nearby behaviour. Record the reusable lesson privately with its evidence and scope; propose a general change only after broader testing.

The user's current request and host permissions govern. This skill adds expertise, not authority or a mandatory separate workflow.
