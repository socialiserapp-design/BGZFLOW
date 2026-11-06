---
name: principle-prove-it-works
description: "Apply after completing a task, before declaring done. Verify against the real artifact (run the feature, read the actual value, inspect the diff), not a proxy, self-report, or 'it compiles.'"
---

# Prove It Works

Verify every task output by checking the real thing directly. Do not infer from proxies, self-reports, or "it compiles."

**Why:** Unverified work has unknown correctness. Indirect verification (file mtimes, output freshness, agent self-reports, cached screenshots) feels cheaper than direct observation. Acting on a wrong inference costs far more than checking the source.

Check the real thing, not a proxy:
- Check process liveness directly, not indirectly through derived state
- Read the actual value, not a cached or derived representation
- When verification fails, distinguish a broken observation from a broken system using independent evidence; preserve the first failure and do not presume either explanation

## Script the check when you can

Use a repeatable check when it improves confidence. Prefer an existing test or supported tool; write a focused script only when needed. Scripts, real-device observation and source inspection prove different things; choose the combination that demonstrates the requested outcome.

Retain relevant evidence in authorised private storage. Report the useful result concisely, with details available when needed. Do not commit private logs or create a new artifact for every trivial action.
