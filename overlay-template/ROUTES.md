<!-- Which provider plays each role. Aliases only: no emails, passwords, tokens or keys.
     Describe each route with the public templates/ROUTES.md card. Every example below is fictional. -->
# Routes

## Roles
| Role | Route alias | Provider and host | Model and effort | Qualified (date + evidence) |
|---|---|---|---|---|
| Lead | lead-main | Example: a desktop chat app | Example: strongest supported model and effort | 2026-03-01, jobs/qual-01 |
| Worker | worker-a | Example: a CLI coding agent on a subscription | Example: strongest supported model and effort | 2026-03-01, jobs/qual-02 |
| Independent checker | checker-a | Example: a fresh read-only session of a different route | Example: strongest supported model and effort | 2026-03-02, jobs/qual-03 |

## Accounts (aliases only)
| Alias | Provider | Plan | Usage source | Reset | Status |
|---|---|---|---|---|---|
| acct-1 | Example provider | Example: monthly subscription | Example: usage page, observed | Example: Mondays | active |

## Special authority
- Example: an emergency pay-per-use provider only on my explicit direction for that task.

## Model and effort policy (example)

Example route setting: never medium or high; use your strongest setting. Choose the strongest available model and its strongest supported effort, then record the actual supported settings on the private route card. This is an example preference to adopt or change in your overlay, not a public model ID or a plugin-wide default.

## Swarm resources (examples only)

`swarm-resources` and `swarm-status` read this optional table. Replace examples with private route details; detection never proves login, quota or entitlement. `Home`/`Jobs` accept `~` or relative paths; Jobs is metadata, never credentials. Keep secrets out of dispatch text. `Qualified`/`Recommended` accept yes/no, but only a passed job saved with `--save-proven` enables real work or recommendations. Model/effort hold exact effective settings; `-` leaves them unspecified. Optional `Account`/`Environment` columns scope proof reuse. The capability card in `templates/ROUTES.md` records access, concurrency, allowance/reset, ceiling, check/fix reserve and return proof. Checkpoint them before dispatch.

| Resource | Kind | CLI | Home | Jobs | Dispatch | Cost | Qualified | Recommended | Model | Effort |
|---|---|---|---|---|---|---|---|---|---|---|
| example-local | local | <installed-cli> | - | - | <qualified prompt-file dispatch> | <verified usage basis> | no | no | - | - |
| example-cloud | cloud | <installed-cli> | <cloud-home> | <job-records> | <qualified cloud dispatch> | <verified included entitlement> | no | no | - | - |
