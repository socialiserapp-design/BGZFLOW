---
name: create-loop
description: "Create or adapt a recurring automation when the user requests a schedule or ongoing watch, using supported host scheduling and real result checks."
---

# Create a useful recurring automation

Clarify the desired outcome, trigger or schedule and timezone when missing, the permitted actions, and what result should notify the user. Reuse existing answers and check for an existing automation before creating a duplicate.

Prefer the host's supported automation service. A local process that happens to be running is not a durable schedule. Inspect the available action API; do not invent scheduling commands or promise zero cost. State expected model or provider use where it affects the choice.

Keep a run small and idempotent. Reconcile an uncertain external action before retrying. Test the actual allowed action and resulting state, including what happens on failure, before claiming the automation works. Verify the registered schedule and its target after saving.

Notify on useful outcomes or a required user action according to the request. Do not create recurring work from a one-off task, automatically schedule scans after several days, or add a reporting board the user did not request. Use the same permission and spending boundaries on every run.
