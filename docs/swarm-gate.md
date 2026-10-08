# The swarm gate

Automatic model rediscovery and adoption is experimental and off by default (`modelUpdates.enabled: false`). Approved, qualified provider tiers work without it. Remaining fallback edge cases are after-launch work; enable automatic updates only after qualification on your machine.

The lead still plans and coordinates. A small local Node script refuses a worker launch or production release when the active swarm's records say it is unsafe. Exact checks use code and no network. Optional Jev judgment handles bounded questions code cannot decide; it never approves or grants authority. The gate opens no credential stores and adds no context to ordinary chats. A block goes to the lead with its reason and one next action.

## Start and defaults

In phase 0, inspect `swarm-resources`, recommend proven routes and ask one question round covering **resources and usage**. Show these numbers:

| Choice | Jobs | Worker-hours | Reserved jobs | Reserved hours |
| --- | ---: | ---: | ---: | ---: |
| Small | 8 | 4 | 3 | 1.5 |
| Medium | 20 | 12 | 5 | 4 |
| Large | 48 | 32 | 8 | 8 |
| Custom | Agreed count | Agreed hours | Agreed count | Agreed hours |

Recommend Medium for a multi-piece build, Small for a narrow repair. The limit includes the reserve. Builds, research and mechanical work cannot consume it; checks, fixes and diagnosis can. Every launch counts, including outside failures. Hours are reserved per job (`HOURS` in the brief, or `--worker-hours`; default 1). Running work counts at least its reservation and its elapsed time. A terminal handback reconciles actual worker-hours. Jobs already running finish when the ceiling is reached. The lead sends one message stating completed work and recommending whether to raise the limit, then records the sent notice.

Save the approved configuration and committed wave-0 SHA with:

```sh
node "${CLAUDE_PLUGIN_ROOT}/tools/swarm-gate/swarm-gate.mjs" presets
node "${CLAUDE_PLUGIN_ROOT}/tools/swarm-gate/swarm-gate.mjs" start --swarm build-01 --config swarm-start.json
```

The start JSON has `resources` (approved IDs), `limit` (preset name or `{jobs,workerHours,providerPercent}`), `reserve` (`{jobs,workerHours}`), `wave0Sha`, `acceptanceScript` (agreed journey steps), and `pieces` keyed by ID with `goal` and `owns`. Optional `policy`, `releasePatterns` and `suitePatterns` tailor the project. All IDs and paths are generic; preferences stay private. Start saves resource and limit defaults in `.bgzflow/swarm-defaults.json`. Present them next time as recommendations. Repeating start preserves active dispatches.

Each active swarm has **one** git-ignored `.bgzflow/swarms/<id>.json` ledger. Its fields are the existing checkpoint and dispatch-record concepts: approvals, ceiling/reserve, wave-0 SHA, pieces/owned files, exact jobs/settings/status, logical failures/root causes, integrated SHA, exact-SHA checks, stable findings, fix-wave count, notices and overrides. Continue to keep the readable checkpoint and `bg-rounds` finding history; update both from these same events. The gate ledger is the authoritative runtime guard, not a second independently maintained task board. A short atomic lock protects concurrent reservations. Never edit the ledger to bypass a block. `record finish` deactivates it only after jobs are collected or cancelled.

## Model policy and login proof

Policy comes from start's explicit `policy`, then project `.bgzflow/swarm-policy.json`, then `$BGZFLOW_SWARM_POLICY` or `~/.bgzflow/swarm-policy.json`, then the [public default](../templates/swarm-policy.json). It names no provider model and approves no route implicitly. Copy it to private user config; set `providers` by resource ID and `preference` in the user's chosen order. A single approved provider works alone. The old explicit model/effort policy remains readable for existing ledgers; new configurations use tiers.

| Tier | Work | Proposed setting |
| --- | --- | --- |
| `light` | Mechanical | Provider-marked fast model; its light effort |
| `standard` | Build, fix, integration and review | Provider-marked strongest model; highest single-worker effort |
| `heavy-write` | Repair after root cause | Strongest setting that keeps one writer per worktree |
| `heavy-read` | Unsplit read-only research or diagnosis | Strongest read setting, including self-splitting only where the route supports it |

Discover model markers and effort values from each CLI's own listing/help, never a ranking embedded in the plugin. A route without effort control uses `none` and its thinking flag for standard/heavy work. A CLI that exposes no catalogue needs its supported listing command or explicit user-selected `models`, `strongest`, `fast` and effort annotations in private config. Help alone is not qualification. Model names live in configuration and discovered maps, never gate code or rules. The phase-0 question shows the proposed mapping once and saves the chosen mapping. Policy blocks provide the corrected command. A read-only brief cannot authorize write, unrestricted sandbox or automatic write-approval flags.

`swarm-resources --refresh-models --policy policy.json` performs cheap version/list discovery only. The dated `swarm-model-map.json` records CLI version and command evidence. At every phase 0, run discovery; refresh the mapping when older than seven days, the version changes, a mapped model disappears or a model-not-found/deprecated error is recorded. After `start`, run `swarm-gate refresh-models --swarm ID`. It automatically runs small read-only qualifications for new exact settings on approved routes with a current account observation and non-reserve budget. Native local routes use the bundled foreground probe; custom/cloud routes need `qualificationCommand` as an argv array. A timed-out launch stays uncertain under its durable operation ID, with no automatic replay. Use `record qualification` to collect a configured asynchronous route's actual job record: `id,status,exitCode,model,effort,thinking,evidence,returnRef` (or `jobRecordFile`). A different effective setting cannot qualify.

New models are proposed after qualification. `autoAdoptNewFlagship` defaults to false; an opted-in qualified flagship can replace future dispatch settings. One old map cycle remains available as a fallback. Removed models use a qualified replacement at the same tier, then the next approved/proven route. Cancel and confirm an old writer dead and preserve its work before reassignment. The original swarm map and running job flags stay pinned; future changes are separate ledger updates. Status shows map age, proposals, auto-adoption and escalation usage. No real provider qualification is established by mocked listing tests.

Qualification is separate from approval. A route needs a dated passed job with account/environment, effective model/effort/access, returned result and evidence; cloud returns need a commit SHA. Only proof matching the **observed current account and environment** is reusable, even if another account has a newer proof. Unknown, legacy, ambiguous or logged-out observations do not qualify. Explicit `CODEX_HOME`, cloud home/environment, Kimi share directory and Claude config-directory changes invalidate mismatched observations.

Refresh the existing resource state with `swarm-resources --observe nonsecret-status.json`. Its JSON is `{identities:[...]}`; each identity has `id`, `account`, `environment`, `authenticated`, `at` and `source`. Export only identifiers from a supported provider status response, never tokens or auth files. Observations expire after five minutes. A provider that cannot expose a current account safely stays unavailable; a mode-only “logged in” response is insufficient. Grok local/cloud and Claude local/cloud need their scoped account/team or organization identifiers; Kimi needs its observed user identifier. No credential-file parsing is shipped.

An identity may contain `allowance:{available:true,usedPercent,at,source}` **only when a supported status surface actually exposes it**. The same five-minute freshness requirement applies. `providerPercent` enforces that reading where available. Otherwise status says **unavailable**, and job/hour limits still apply. Never add percentages from shared quotas or infer allowance from installation or login.

## Brief and dispatch

Every brief begins with the four fields below, then a blank line. `OWNS` is a JSON array of paths relative to that worker's tree. Directory ownership includes descendants; aliases and traversal cannot evade overlap checks.

```text
SWARM: build-01
PIECE: storage
KIND: build
OWNS: ["src/storage.mjs"]
HOURS: 1

Read bg-efficiency, test-driven-development, systematic-debugging,
verification-before-completion and the selected domain skills in full.
Fast checks only on owned files.
Proof handback: exact SHA, changed files, commands, exit codes, evidence,
actual skills read, confidence, assumptions and blocking findings.
```

Kinds are `build`, `fix`, `diagnose`, `check`, `research`, `mechanical`. Read-only jobs add `READ_ONLY: true` and `OWNS: []`. A check adds `CHECK: suite`, `journey` or `review`; the strongest read setting also requires `UNSPLIT: true`. A diagnosis adds `TARGET_KIND` naming the failed logical kind. The gate's small qualification briefs also carry `QUALIFICATION: true`; only a registered exact-scope probe can use this bootstrap.

Claude's PreToolUse hook recognizes the Codex companion (`cx task` and identifiable Codex/claudex task or exec tools), `bg-swarm launch`, `codex cloud exec`/`codex exec`, Grok/Kimi/Claude prompt launches and Agent/Task. Shell launches use `--prompt-file`; native tools use `prompt_file` or a `SWARM-BRIEF: absolute-path` line in the prompt, with explicit settings. Each launch is one tool call. PreToolUse reserves its durable call ID; PostToolUse binds the returned native job ID or records a failed launch. Background completion still needs the original job's handback. `bg-swarm` also enforces the gate before spawning on any host. The lead launch directory and Git common-directory metadata locate the main ledger for sibling worktrees; worker execution directories stay separate. In-tree path aliases resolve to the same logical ownership.

Non-Claude leads must run the **same CLI** before launching workers:

```sh
node "${CLAUDE_PLUGIN_ROOT}/tools/swarm-gate/swarm-gate.mjs" dispatch --job-id build-storage-01 --resource codex-local --worker-hours 1 --command 'cx task --background --model chosen-model --effort max --prompt-file storage.md'
```

The CLI exits 2 with JSON `rule`, `reason`, `next` and, for a policy error, `correctedCommand`. Exit 0 means allowed. `check-dispatch` is a dry reservation check; non-Claude leads use `dispatch` to **reserve** before launch and `record job` to bind its native ID. Preserve a reservation if a launch outcome is uncertain; reconcile by durable ID before retrying. Failed, completed and cancelled handbacks all count. One reservation ID cannot describe a different command or replay a terminal job. Active hook redelivery revalidates the current qualification without another charge; native re-launch needs a new durable ID. An unmatched `--swarm` selector blocks while any swarm is active.

For a host without a native prompt-file flag (including Codex cloud exec), pass `--prompt-file` to **swarm-gate dispatch**, and put the actual supported launch in `--command`. Embed or transport that brief and the full selected skills to the worker through the qualified cloud route. Claude's launch hook claims the same command reservation once, rechecks its unchanged brief/current proof and binds the returned job ID. It neither adds unsupported host flags nor charges a second job. Inline account-home changes are checked against the observed scope.

Two counted failures of `swarm + piece + kind` block the next attempt, including a blocking finding surviving two fix waves. Code classifies known causes first; optional Jev classifies ambiguous causes once. Environment/access/login and flaky infrastructure need lead remediation evidence, without a heavier model. Unclear contracts go to the lead; only a product decision needs the human. Code/logic and unknown failures require one `heavy-read` diagnosis. A completed diagnosis must supply nonempty **Cause** and **Evidence** via `record root-cause`. Include that note in the one next `heavy-write` attempt. If it fails, report the problem and recommendation to the human; no further escalation. `crossFamilyDiagnosis` optionally permits one additional read-only diagnosis on a different approved, proven family with `CROSS_FAMILY: true`. It counts toward usage. Quota/rate, network, provider outage and cancellation errors do not count as logical failures, but consume usage. `record remediation` stores the lead's environment/flaky/contract fix evidence.

## Piece admission

`record piece` with `status:returned` first checks the saved handback. A claim alone cannot enter integration. Use `jobId`, `returnRef` (SHA), `evidence` and `handbackFile` pointing to the structured JSON below; all output paths must be inside the project and outside credential stores. Transport worker evidence into that owned location while retaining its original hashes.

```json
{"jobId":"worker-01","source":{"baseSha":"<base SHA>","sha":"<returned SHA>"},"checks":[{"argv":["node","--test","test/storage.test.mjs"],"exitCode":0,"stdoutFile":"evidence/fast.log","counts":{"tests":3,"pass":3,"fail":0,"skip":0}}],"audit":{"available":false,"reason":"jev-codes not installed"}}
```

Admission parses TAP/Node, pytest, unittest or `RESULT files N errors M` output and compares actual counts with claims. Source changes require test-file changes, except docs/config-only pieces. Newly added skip/only/xfail/todo markers and unfinished TODO/placeholder lines fail; negative-example strings and regexes are data. The base and return must match the exact physical diff. When installed, the worker runs `jev-codes audit --json` under the jev-audit skill, fixes confirmed findings in the same job and returns `audit:{available:true,before:[...],after:[...]}` with reported usage. Missing tooling is skipped with a reason.

With Jev enabled, one sanitized two-question admission batch asks whether tests exercise the piece goal and whether claims match output. A definite failure leaves the piece pending and returns the reason to the same worker job, counting toward failed-twice. Ambiguity goes to the AI lead as a warning. This is build quality work, not a whole-candidate review round. The human is not asked to approve the handback.

## Optional Jev

Jev judgment and the optional `@kushwho/jev-codes` package are separate integrations. Install their CLI/skill by your host's supported method. The plugin bundles neither credentials nor third-party skill bodies. Public Jev is off. In private config set `jev.enabled:true` and `jev.command` to the argv prefix for the jev-judgment skill's `judge.py` CLI (Python executable and installed script path). The gate appends the request file and `--output` path using the documented `model/state/questions` schema. Credentials remain the configured helper's responsibility. Set `timeoutMs` (default 2,000; capped at 5,000), `maxMessageChars` and individual `enforcement` toggles in the policy template.

Code decides exact matches and ledger rules. Jev runs only for semantic gaps, one batch per event and no paid retry. Violation probability at least 0.8 blocks with a lead correction; 0.4 to below 0.8 warns the lead; below 0.4 passes. Positive coverage/quality questions are converted to violation probability as `1 - noul`. Labelled mock examples exercise these bands; they are calibration cases, not measured classifier accuracy. Record actual response model, usage, reported cost if present and elapsed time. Missing, errored or timed-out Jev warns and falls back to code; it cannot open an unready release ledger.

Enforcement covers reworded retries when failed steps exist, duplicate work when another job runs, concrete done-when/goal alignment for build/fix briefs, and journey-step coverage as an extra release condition. A Stop-hook code pre-filter triggers only on possible human acceptance/testing/routine-choice questions or an over-length message. One definite breach blocks Stop so the lead rewrites; `stop_hook_active` prevents another block. Ordinary messages make no Jev call. Only sanitized goals, file names, test names, diff summaries and fast output are sent; credentials, env values, private paths, customer records and whole files are excluded. Jev cannot approve, certify release, or grant authority.

## Collection, checks and fixes

All record payloads are JSON files, passed with `record TYPE --file record.json`. They update the active ledger in this project (use `--swarm` to select an exact ID):

| TYPE | Payload / condition |
| --- | --- |
| `job` | `id,status`; terminal records need `evidence`, completed records need `returnRef`; optional `nativeId,workerHours,error` |
| `piece` | `piece,status:returned,returnRef,evidence,handbackFile,jobId`, or `status:deferred,reason`; passing admission and no active writer |
| `candidate` | `sha`; all pieces returned/deferred and all jobs collected |
| `result` | `stage,sha,status,evidence,exitCode`; ordered exact-SHA results |
| `finding` | stable `id,blocking,status,detail`; closure requires `evidence,sha` |
| `fix-wave` | optional affected `pieces`; increments the batch count and invalidates candidate/checks |
| `root-cause` | `piece,kind,note` or `noteFile`; a completed diagnosis is required |
| `notice` | `type:limit` or `third-wave`, plus the sent `chatRef` |
| `finish` | empty object after all jobs are terminal |

Before whole tests use `check-suite --sha SHA`; before real-platform rehearsal use `check-rehearsal --sha SHA`; before the single independent review use `check-review --sha SHA`. Order: integration, full suite once, golden journeys and rollback on the real platform, one read-only review per release ID. The hook recognizes common full-suite commands; project `suitePatterns` register aliases. Briefs requesting a full suite use KIND check/CHECK suite. Workers keep fast checks only. Repairs require new exact-SHA rehearsal evidence, never another review.

Open one whole-review fix wave **before** dispatching its complete parallel batch. At most two waves are available across resumes and nested commands. This cap applies to repairs from the lead's independent whole-candidate review, not workers' test-driven quality work while building. Advance original workers to the failed combined candidate, preserving dirty work and prior commits; never restart from stale wave zero. Integrate all repairs, record a new SHA, and rerun real-platform golden journeys and rollback; never another review. The third review repair wave needs explicit human chat authority.

## Release

`check-release --sha SHA` requires that exact integrated SHA, passing real-platform golden journeys and rollback, with no open reproduced blocker-class finding. Builds and preview deployments are allowed. The conservative hook list covers store submit (`eas submit`, `asc submit`, `fastlane deliver/pilot`), `vercel --prod` or `--target production`, `wrangler deploy --env production/prod`, `eas update --channel production/prod`, `fly`/`flyctl deploy --app production/prod`, Supabase DB pushes (including the default remote form), production Kubernetes/Helm contexts, npm/pnpm/Yarn package publish (including `yarn npm publish`) and `gh release create`. Global options and their values are parsed before the subcommand, including quoted paths. Explicit local DB pushes, supported dry-runs, printed command text and release inspection are excluded. Register project-specific production commands with `releasePatterns`; generic deploy aliases and production names cannot be inferred safely.

Source deployments use Git HEAD in the effective tool `workdir`/`cwd`, literal shell directory change or provider directory flag. Ambiguous directory changes block with one explicit-directory next step. Use one release per tool call. A standalone gate command is exempt from its own hook; composing it with another action does not exempt that action. Store/prebuilt releases require `record release-intent` with `sha,command,artifact,hash` (SHA-256), binding the exact command and actual artifact bytes. The release hook rejects changed or unreadable artifacts, including configured production aliases. Supplied and canonical input paths are checked against credential paths before content reads. Release readiness never grants publishing authority.

Only supported true simulations are exempt. `--dry-run false`, `--dry-run=false`, `--no-dry-run`, underscore/colon equivalents and conflicting true/false flags remain releases. Kubernetes/Helm `client` or `server` simulation is exempt; `none` is a release. A made-up dry-run flag on a store/deploy command cannot bypass readiness, and configured production aliases remain guarded.

Three swarm-limit/override permission questions are allowed: raising usage, a third fix wave, and an emergency release override. `record limit`, an additional `record fix-wave`, or `record override` require `authorisedBy,reason,chatRef`, copied from the human's explicit word in chat. A release override also requires the exact `sha`; it never follows a new candidate. The final founder design-match check is also required for UI changes. The gate cannot authenticate a chat author: the lead must not invent authorization.

## Limits and recovery

On an internal error the gate prints a short warning and leaves non-release operations open. A release whose active ledger cannot establish readiness stays closed. A normal allowed hook adds no context; a block adds one concise reason and next action. Exact code checks are local and bounded; enabling optional judgment adds its bounded CLI/API latency, and phase-0 qualifications are separate worker jobs. Ledgers, proofs and briefs are bounded local reads. Do not delete in-flight state to bypass the gate; reconcile the exact owner and pending effect first.

This is a coordination guard, not a security sandbox. The gate checks recorded evidence and recognizable commands. It cannot prove that a worker really read a skill, tested honestly or exported the right login identity. Inspect the proof handback and run the whole test. Unregistered aliases, tools without hooks, falsified records and deliberate direct shell bypasses need the lead's required CLI discipline. No live provider entitlement, billing percentage, production release, device journey or plugin effectiveness is claimed by fixture tests. See [measured proof](proof.md).

## Finish line and design match

Keep one stable `releaseId` in the start config across all repairs and resumes. A second independent review for that ID and a review whose `REVIEW_TARGET` is `repair` are refused, including in another swarm. The single review blocks only `wrong-money`, `data-loss`, `security`, `privacy` (or `security/privacy`), `missing-rollback` and `unapproved-stop-path`, each with a nonempty `reproduction`. `unapproved-stop-path` is a new or changed customer-facing wait, refusal, hold, gate, cap, block or expiry without the founder's written approval; the reproduction is the customer journey that now stops. The review lists every such stop path it finds with the quoted approval; only the unapproved ones are recorded as this finding. A refusal that stops a money error the customer didn't choose is allowed; tell the founder once afterwards. Older records keep their categories unchanged. Other findings, including reviewer design findings, go after-launch. An unconfirmed critical claim is flagged to the AI lead.

After the frozen combined suite, rehearse the real platform with matching runtime, bindings, database version, secrets and provider accounts; money in test mode. Run golden journeys and one rollback. Record actual evidence, never an invented pass:

```json
{"sha":"EXACT_CANDIDATE_SHA","goldenJourneys":"passed","rollbackProven":true,"exitCode":0,"evidence":"journey-output.log","rollbackEvidence":"rollback-output.log","platform":"installed target","steps":["agreed journey steps"]}
```

Save JSON privately and run `swarm-gate record rehearsal --file FILE`. Failed journeys or unproven rollback close release. Repairs need a new candidate SHA and another rehearsal, never another review or a required `ready` verdict. `record result` with `stage: review` records the one review completion; findings decide blockers independently of its verdict. The gate does not itself deploy, execute tests or authenticate chat authority.

For customer-visible changes set `uiChanging: true` and `designOwner` to the founder's local identity. The final pre-launch step is that founder checking the verified TestFlight/internal-track/preview build on a phone or capable device. Record `design-check` with `sha`, `status: matched|mismatch`, `authorisedBy`, `reason`, `chatRef`, `device: phone|capable-device` and evidence. Only their mismatch blocks on design; a missing result holds this final step. Never ask them to accept a review or test unfinished work. Non-UI releases have no design hold. Then launch small under existing authority, watch live errors for one hour, fix forward or roll back, and widen.
