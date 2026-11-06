---
name: risky-changes
description: "Check assumptions and actual impact before changing APIs, provider data, billing, pricing, quotas, defaults, permissions or other behaviour where a mistake could harm users. Use when passing tests may hide a real-world regression."
---

# Check risky changes against real use

Identify which behaviour changes, who is affected, what could be lost, and which
assumptions are essential. Distinguish observed facts, sourced facts and guesses.
Inspect existing constraints and the current request; a risk review grants no
permission to change the product or impose new customer restrictions.

Check current provider documentation and representative real data before committing
to the change. Compare established packages and supported interfaces against custom
work. Explain a consequential design or business trade-off in plain language; ask
the user when that choice is unresolved. Existing compatible approval counts.

Measure the effect with cases that cover actual use, meaningful boundaries and
failure/retry behaviour. A filter can pass its unit tests while excluding nearly
every real result. Check how often the intended behaviour occurs, what gets excluded,
whether saved state is correct, and whether the user's original journey still works.
Choose sample size by diversity and consequence; no fixed count guarantees safety.

For material findings, use the existing review's
[shared impact ratings](../interrogate/references/impact-ratings.md): harm 1–10
and how often 1–10 separately. Name the eligible population/time window and
observed counts or estimate; use unknown when unsupported. Keep evidence status,
affected scope, reversibility, recovery and urgency distinct. Do not turn the
ratings into a new threshold, permission request or customer restriction.

Use read-only production observations or authorised isolated test accounts. Do not
purchase, publish or alter live customer data merely to collect a measurement.
Keep unavailable evidence explicit and continue unaffected work. Do not equate an
unknown effect with a failed action and repeat it blindly.

For an authorised switch, prepare recovery appropriate to the actual data change.
Observe relevant real outcomes after the switch and investigate regressions. Keep
the demonstrated failure as a regression check. Load bg-outcome-evals when designing
the checks and risky-decisions when the choice itself needs deeper examination.

Method informed by davidondrej/skills risky-changes; this BGZFLOW procedure is an
independent adaptation that removes fixed case counts and duplicate approval loops.
