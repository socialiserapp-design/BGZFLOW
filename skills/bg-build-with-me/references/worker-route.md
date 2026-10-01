# Worker route: lead, workers and independent checker

This is the single runtime procedure for running BGZFLOW's roles on any host. It makes no product decisions; the skills do. A host adapter only says how one tool performs these steps. Keep each worker's concrete commands on its capability card ([templates/ROUTES.md](../../../templates/ROUTES.md)); keep the founder's own provider and account mapping in the overlay `ROUTES.md` (`$BGZFLOW_OVERLAY`, else `~/.bgzflow/overlay/`).

| Role | Does | Never |
|---|---|---|
| **Lead** | Plans, dispatches directly, reads short results, decides, accepts a `ready` candidate, does mechanical steps under about 2 minutes itself | Rereads whole repositories or worker logs; approves its own build |
| **Worker** | Heavy reading, building, testing, integration, repair in its owned workspace | Grades its own work; writes outside its owned paths |
| **Independent checker** | Fresh, read-only assessment of the exact candidate; a different model from the builder wherever one is available | Is the builder, a resumed builder or any contributing job/thread |

Example host mapping (one of many): a chat assistant as lead, a CLI agent's background jobs as workers and a fresh job of that CLI (or another vendor) as checker. Any mix works if every step below holds.

Review verdicts are owned by the [verdict schema](../../bg-check-it-before-release/references/review-verdict.schema.json): `ready`, `changes-required` or `blocked`. Use `ready` only when required evidence passes and all findings are closed, `changes-required` for observed defects and `blocked` when required evidence or access is unavailable. Worker states, dependency acceptance and the readiness page's done / partly / not done are separate fields, never verdicts.

## 1. Prepare once per lead → ready and access record

1. Reconcile the current owner, existing jobs, admitted base, worktrees and holds. For every job record that says `running` or `queued`, check whether its process is alive. A live-looking record with a dead process is **uncertain**, not active: reconcile its effects before any resume or retry.
2. Run the host's readiness check once per lead chat and inspect its structured result, not a filtered exit code. If setup would install or change state beyond the brief's authority, stop that action and report the gap. Workers reuse the lead's receipt.
3. Record the signed-in account alias, dated allowance (observed, reported, estimated or unknown), the once-agreed project usage ceiling, model and effort where exposed, and actual access. Unknown usage stays unknown; never buy capacity or switch accounts silently.
4. Pick each job's model from a three-tier table (cheap, standard, strong), each tier filled with models actually available and proven by one test job before routine use. Record the actual model and effort used.
5. Agents handle routine sign-in and reauthentication with saved sessions, browser autofill, installed credential tools or password-manager entries wherever supported. An account change happens only on the founder's explicit direction, through the same tools, preserving the same task and session; ask the founder only for a required human step.
6. Keep one capability card per worker type ([templates/ROUTES.md](../../../templates/ROUTES.md)): permissions recipe, whether it can push, how to cancel and kill its process tree, the queued watchdog and where results land.

## 2. Bind workspace and brief → exact identity record

- Fill the [brief](../../../templates/BRIEF.md) and the [worker packet rules](../../bg-finish-the-whole-job/references/worker-packet.md#worker-prompt). Give pointers (paths, commits, line ranges, canonical live-log path), never copies of logs or transcripts. Supply current and next capability coverage, selected skill bodies or their read routes, contracts, acceptance, owned paths, required outputs and evidence paths.
- Job-level permissions in the brief override shared boilerplate, and the brief says so. A worker-context file (project AGENTS.md, CLAUDE.md or similar) never contradicts the brief; when it does, the brief wins and the worker reports the conflict. Every compulsory pointer must resolve before dispatch (`startup-check` on each worktree), and compulsory reading stays within the startup budget (BGZFLOW_STARTUP_WORDS, default 3,000) with no compulsory file over BGZFLOW_BIG_READ_KB.
- Copy needed outside references into the owned workspace through a lead preparation step; record source and copy hashes and keep copies out of Git. The executor still reads the copied bodies.
- Give every parallel writer its own worktree. Prepare shared dependencies, pin wave 0 and name its SHA explicitly: `git worktree add <path> -b workers/<slug> <wave0-sha>`. Stack admitted prerequisite commits where needed; repair lanes retain their prior commits. Build the code map there, leave Git hooks unchanged and exclude the map from Git. Worktrees do not prove permission/network inheritance. Convert brief paths to the worker's native absolute format at shell/platform boundaries, using a supported path converter where required.
- Record both the requested working directory and the host-resolved workspace root. Changing directory does not migrate a recorded job: collect, preview and recover older jobs with their original launch directory and session.
- Follow the brief's explicit commit instruction. If Git refuses (for example, worktree metadata outside the sandbox), preserve the patch and checks and return the exact error for an owner commit. Never stage blindly, change permissions or edit Git metadata by hand.

```text
Task / owner / lead session:
Host tool + version / readiness receipt / account alias / model tier + actual model:
Job ID / thread ID / turn ID (unknown if not exposed) / executor identity:
Launch directory / resolved workspace root:
Owned worktree / branch / admitted base:
Candidate commit + artifact/config hashes:
Brief path + current/next coverage + body reads:
Result/evidence paths outside the host's job index:
Status (submitted/queued/running/completed/failed/uncertain) / exit status / pending effects / repair round 0-2:
```

## 3. Dispatch directly → submission receipt

- Dispatch directly with a prompt file, for example `<worker-cli> task --background --write --cwd "<owned-worktree>" --prompt-file "<brief-path>"`. Pin the route's supported model/effort on builds, repairs, reviews and cloud jobs, and verify effective settings; defaults are unverified. Source investigation/checking stays read-only; a proven route may use disposable writable scratch for runtime/Python/network access without project/external mutations. Check effective access first. Start lean, with no forwarding agent. Capture output once and preserve the original exit code; extract from that capture, never rerun a job to recover filtered output.
- Save the returned job ID at once and record the executor's real identity (provider, model, account alias) from the host, never from a title. Distinguish submitted, queued, running and completed.
- Watchdog: a job still `queued` after 5 minutes is checked once (is the worker process alive? did anything run?), then cancelled and redispatched once after reconciliation. Record both job IDs.
- Mechanical steps the lead can finish in about 2 minutes (a single command, a status query, a one-line edit) are done by the lead, not dispatched.
- Cloud workers get push pre-authorised in the brief, or commit to their branch every N minutes (the brief names N). Credentials come from a credential helper or the host's secret store; a token never goes into a URL, including Git remotes.
- Keep one owner per task, shared resource and worktree, and one integration writer.

## 4. Wait once and collect → short result

- Arm one background completion wait per job using the lead host's background-notification facility. Beside it, arm `bg-mail watch --project <project> --to lead` as a second bounded background wait, so a worker question wakes the lead immediately. Reply, restart the mailbox watch if the job remains active, and read the exact job result when completion fires. Never run a polling loop.
- A timeout or failure is unresolved: inspect that exact job once, reconcile its effects and do not replay it. A job that ended with no final message has an **uncertain** outcome; reconcile any external effect (store submission, payment, deployment, message) by its durable operation identity before any retry.
- Record the job's exit status and executor identity. Verify that the brief's required outputs exist before accepting the handback.
- Read only the short result during normal operation. Full evidence stays in files and host history; never dump logs or transcripts into the lead chat. Verify that the notification actually reaches the lead before relying on idle pickup.

## 5. Check independently → exact-candidate verdict

Bind the check to the exact candidate: commit SHA, base, worktree, original done-when checks, open findings, handback and accepted DECISIONS.md IDs. Require checker job **and** thread IDs distinct from every builder, resumed builder and integrator. Confirm HEAD equals the pinned SHA before and after; the candidate stays unchanged during review.

- Before dispatch, the controller (lead) captures a launch pin in a protected evidence folder outside builder and checker write access, and keeps its SHA-256 in the controller receipt. After the terminal response, it captures a completion pin from the launch pin and the response hash. Both captured HEADs must equal the contract revision; equal merge-bases or timestamps alone never bind a review, and no review of an earlier commit can be relabelled for a newer contract. The [inspection reference](../../bg-check-it-before-release/references/inspection.md) has the contract and the capture helper.
- When a host's native review emits its own fixed verdict format, never pass that raw output to the evidence gate or rename its verdict. A thin host adapter translates it: preserve the raw bytes, check identities, review class, read-only flag and successful execution, bind the native target (repository root, base, revision still checked out, merge-base, review started after the commit) to the pinned contract, and derive coverage only from inspected evidence (every required check and every changed file, deletions included, has a typed result and conclusion). Raw findings stay open at their original severity until a later independent review closes them. A host rejection without findings becomes `blocked` with a stated limitation. Missing evidence becomes an accountable typed gap, never a pass. Adapter success is not a gate pass: run the [evidence gate](../../bg-check-it-before-release/references/enforcement.md) afterwards.
- Non-Git work: dispatch a fresh read-only checker task from a separate working directory whose resolved workspace root differs from the builder's. Point it at the exact candidate and handback. Collect with the checker's directory; preview and repair with the builder's.
- The lead runs the single cheapest decisive proof on the exact candidate and reads the short verdict. Worker checks support a candidate; they never let the builder approve itself.
- On `ready`, the lead accepts the candidate itself, records it and continues. It never asks the founder to confirm or accept a review, verdict or candidate. It asks the founder only about undecided product, design or business choices, spending, release actions outside the brief's authority, or serious findings still open after two repair rounds, each with a recommendation.

### Disposable checkout for tests that write files

Give a fresh checker task its own independent clone (its own Git directory, never a linked worktree), detached at the contract revision. Before launch, compare both HEADs with the protected revision, capture the candidate's byte inventory and verify that the host permits writes only inside the clone (a write/read/delete probe there). An unknown or broader write scope blocks this route; a clone alone is not a sandbox. Record the checker as `read_only=false` with its verified execution record. After the job ends, recheck both HEADs and the candidate inventory; reject any change, identity mismatch, resumed builder or missing evidence. Copy and hash the inspection, command output and artifacts into controller evidence, then remove only that clone by literal path. Never clean or reset the candidate or a shared worktree.

## 6. Repair safely → matched continuation or scoped hold

- Keep every finding under one stable ID through repairs and re-checks. Count repair rounds per package across resumes and handoffs in the `bg-rounds` ledger. After 2 rounds with findings still open, stop and escalate to the founder with the open IDs and a recommendation; never start round 3 without the founder's explicit approval.
- Send confirmed findings, consolidated, to the existing owner under existing repair authority without another routine permission question. Review-only assignments stay read-only.
- Before every resume, preview the candidate target under the original session and launch directory. Compare job ID, thread ID and session with the recorded builder, plus workspace, branch, base, current candidate, terminal state, exclusive owner and pending effects. Preview availability alone is not proof: hold the resume when session identity is missing or mismatched. Never assume "resume last" selects a named worker under a shared parent folder. Serialize this boundary and preview again after any intervening submission.
- If the host reports no previous thread, reconcile the failed job, confirm the old builder is terminal with no conflicting writer, then dispatch a fresh repair task pointed at the committed candidate SHA and its handback. Record it as the successor; the round count does not reset.
- For any other identity mismatch, hold only that repair, keep its candidate and findings, and use a supported exact continuation or a single-owner successor handoff after the old job is terminal. Never edit host state or caches to force selection, and never resume a thread another app owns.

## 7. Verify effective access → access record or named gap

Requested flags do not prove what a child actually received. For a real job, record the lead's and the worker's effective sandbox, approval and network settings where exposed. Have the worker read an agreed non-sensitive source, write/read/delete a small probe in its own scratch folder (writers only), run the required test runner and, when network is needed, make one harmless request to an owner-approved endpoint. Capture commands, exit codes, times and identities. Compare required with observed access. On denial, keep the exact error and use a verified equivalent authorised route; never elevate silently, bypass host security or waive a failed check.

## 8. Preserve and continue → durable handback

- Save results, commands, hashes, finding dispositions and the job mapping in project evidence outside the host's rolling job index; hosts prune old jobs (retention, not a concurrency limit).
- Cancel only the exact owned job, from its original directory. Verify the terminal status, stop its whole process tree and reconcile subprocesses and pending external effects; cancelling is not rolling back. Before closing a session that may cancel local jobs, update the checkpoint; on return, reconcile survivors as in step 1.
- External resources a job creates (proof apps, test projects, buckets, preview deployments) carry the job ID as a name prefix, are recorded in the handback and are cleaned up before any retry.
- On usage exhaustion, preserve the mapping, recommend the exact known account alias with its dated evidence, and continue after the founder-directed change with a verified harmless resumed action. Local background jobs need the local machine; work while the machine is off follows the [account and cloud checklist](../../bg-continue-my-project/references/account-cloud-checklist.md). Preserve every release, spending and customer-data hold.

## Questions without restarts

A worker never ends a job just to ask. It posts uncertainty through `bg-mail` with its recommended safe default and timeout, keeps working where safe, and waits in the same job only when the answer is required. The lead replies through the same mailbox. On timeout the worker uses the recorded default; secrets never enter messages.
