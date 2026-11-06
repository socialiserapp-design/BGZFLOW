# What is actually running

Optional release comparison for the existing release record. Use observations
from the actual entry points; do not create a second success certificate.

| Relevant fact | Before the change | Intended change | Observed after the change |
|---|---|---|---|
| App, service and entry point | Actual running instance | Intended instance | Instance reached by the user |
| Source and delivered build | Current version | Tested candidate | Version and assets actually served |
| Configuration | Relevant names and states | Authorised change | Actual observed state |
| Database or interface version | Current compatible version | Required migration, if any | Applied and compatible version |
| Secrets | Names only when relevant | Names only | Presence checked without exposing values |
| Recovery | Last usable version | Recovery method | Evidence it can restore the required result |

Include only relevant rows. Identify native, fixture, staged and live observations
accurately. Check the user journey and resulting state as well as process presence.
A new source file or build does not establish that the running app loaded it.

Preserve failures and unresolved differences with the affected action and owner.
Use the project's actual release and observation policy. This example adds no
fixed watch period, extra permission step, recurring monitor or customer restriction.
