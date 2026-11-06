# Watch customer outcomes, not machinery

A job that "ran" or a handler that returned success only shows the machinery turned. Health is whether customers got what they came for. Use this during the authorised post-release observation period. Ongoing monitoring or scheduled canaries require the existing service policy or task authority. It adds no gate or customer-facing limit: a bad reading means contain or fix forward under the existing steps.

## What to watch

| Check | Plain question | Example reading |
|---|---|---|
| Due items done on time | Of the things that were due, how many were completed when promised? | Scheduled posts due in the last hour versus posted; renewals due versus renewed |
| Freshness of the newest customer output | When did a customer last actually receive something, and is that older than it should be? | Newest published post, delivered file or sent message is hours old when it should be minutes |
| Money in and out balance | Does what was charged match what was delivered, settled or refunded? | Charges with no delivered result, delivered results with no charge, refunds pending past their time |
| Canary | Does one company-owned test account still complete a golden journey from start to finish? | A scheduled run signs in, makes the real request in provider test mode, and checks the result arrived |

Read each from the customer's side (the stored result, the delivered output, the ledger), not from the job's own log. "Accepted" by a provider is not "published"; check the published state.

## Canary

Use one company-owned account, never a customer's or the founder's own. When a recurring canary is authorised, it runs a representative golden journey and records the observed result and time from the system clock. A canary failure is an outcome alert for the owner, handled like any live finding; it never blocks or limits customers.

## Each project lists its own

Use the project's existing release or operating record for its outcome checks: what is observed, where, when a result needs attention, and who owns the response. The optional [project template](../../../templates/PROJECT-AGENTS.md) gives examples. For an authorised release, derive missing relevant checks from its golden journeys and record unavailable evidence plainly. Do not require editing an authority-controlled instruction file, create a duplicate tracker or start recurring monitoring merely to fill this section.

## Record

In the launch handback: each check, its reading with the time, and the decision to keep or contain. Do not report "healthy" on handler or cron success alone. When a check is missing, say so under limits.
