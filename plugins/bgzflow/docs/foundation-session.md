# Foundation sessions and trusted checks

`createFoundationSession` is exported from `tools/foundation/session.mjs` and
`tools/engine/index.mjs`. It uses the same canonical project and per-user event
store as native continuity. It adds no server, scheduler or database.

## Automatic native behavior

Supported hooks record original human messages, assignments, tool outcomes and
recognized structured question/answer envelopes. They restore relevant history
and selected procedures after supported continuation events. Native Q&A records
preserve question IDs/text and answer mappings; they do not invent a product
decision or permission. Unsupported envelopes remain an explicit coverage limit.

Every captured event refreshes a bounded, source-attributed session view. There is
no extra recordkeeping command. Missing, damaged or stale views rebuild from the
original events; the project view lists separate sessions without silently merging
tasks or declaring an exclusive owner. `current()` exposes this native view even
when the application has never called `acceptRequest`.

Native plans/todos describe reported progress, not verified completion. Only an
acknowledged successful plan update replaces the active plan; a proposal or failed
update stays separate. Recognized question tools preserve explicit answer links.
Host-supplied final assistant text preserves ordinary prose questions as quoted
assistant sources, not as human instructions or inferred decisions. Absent fields
and shortened context are identified rather than presented as complete memory.

Routing uses the same session API and large catalogue. The current agent falls
back to its actual host tools when Jev or verified capacity information is absent.
An unknown pool is not proof that one agent is best; it prevents claiming an
unobserved parallel capacity. Private adopted procedures join the same catalogue,
selection and complete-body delivery as other methods, including later sessions
in this exact project. They are never copied to the shared package automatically.

An acknowledged plan transition can select methods inside an ongoing turn. The
original human sources and latest corrections remain the task context; a plan
cannot grant new authority. Unchanged plan stages do not cause repeated routing
calls. Reusing a selection for a short continuation also checks catalogue,
capability and policy identity, including adopted private procedures. Discovery
retains the full available library; delivery still loads only the selected bodies.

## Current intent and execution

Create a session with `{projectRoot, sessionId, host, storageRoot?}`. The host is
an owning application or trusted adapter, not a callback object read from a model
response. `current()` returns the derived view and recent source messages.

- `acceptRequest({text,sourceId})` requires a matching captured human message or
  `host.confirmRequest` observation. It establishes a request revision. Ordinary
  captured follow-ups do not automatically replace the goal.
- `ask({id,question,revision,criteriaIds,required})` and
  `answer({questionId,text,sourceId,revision})` preserve the question and confirmed
  answer. The caller identifies affected criteria; no semantic association is
  guessed. `decide` labels the resulting interpretation and retains its source.
- `assign` takes explicit `questionIds`: an empty list permits independent work
  while other questions remain open. It keeps an owner and stable operation ID.
  Written paths require a real project-wide reservation adapter. The optional
  `createProjectPathReservations` implements local reservations with a shared
  lock; unknown external effects retain their ownership until reconciled.
- `execute` requires `host.authorizeExecution`, then calls the actual host. A
  repeated or concurrent call cannot silently launch the same assignment twice.
  `reconcile` uses the original identity through `host.reconcile`.
- `verifyOutcome` requires an observed source, observation identity, matching
  candidate and current request revision. A command exit or artifact match alone
  never establishes the whole requested outcome.

Answers affecting one criterion invalidate its checks while preserving unrelated
explicitly identified checks. Missing dependency metadata is treated conservatively.
Earlier full snapshots remain source evidence; bounded current views identify
partial recovery rather than silently claiming complete memory.

## Executable checks and private improvement

`createExecutableChecks` in `tools/foundation/executable-checks.mjs` produces
`observeOutcome` and `evaluateImprovement` callbacks from fixed owner-configured
commands. These commands receive JSON on stdin. A valid result needs exit zero
and JSON containing `matches:true`. Plain `echo done` cannot pass. Outcome checks
also require a configured `target` or `currentTarget()` matching the actual project,
candidate and request revision before and after execution. Optional `sources` pin trusted checker
files so a modified checker cannot reuse the original configuration unnoticed.

The check definitions must remain outside model-generated task input. An owning
application must isolate them with real filesystem/tool permissions if hostile
builders are in scope. Full-access native sessions cannot turn a locally writable
file into independent security evidence merely by hashing it. The adapter proves
what its trusted checks observe, not facts those checks fail to test.

`proposeImprovement` stores a private text procedure. `evaluateImprovement` calls
the actual evaluator and needs attributable regression and unseen-case results
for that candidate version, plus a distinct observed baseline failure corrected
by the candidate. Passing alone is not improvement. The executable adapter accepts
an owner-configured `baselineCandidate` for this comparison. After these checks,
adoption is automatic unless the trusted host sets `autoAdoptImprovements:false`.
`adoptImprovement` accepts only that tested candidate;
the procedure becomes available through normal selection. `rollbackImprovement`
withdraws it. Candidate text is never executed or installed as code by this API.
Corrupt private history is reported and preserved rather than overwritten.

Use existing native tools to supply these operations when a material task needs
them; there is no mandatory command sequence, receipt form, periodic learning job
or extra approval ceremony. The native main agent still interprets the user's
intent. Learning is available and consumable, not an always-running autonomous
optimizer or a guarantee that every suggested lesson improves future work.

## Existing engine integration

The explicit command engine selects from this same catalogue and passes selected
method snapshots to its runner. A host can provide `foundationHost` and optional
`continuityRoot`. A spec with an `outcome` requires confirmed request provenance
and an actual outcome observer; otherwise it cannot claim that outcome is verified.
Saved-effect and process tests distinguish working output from an `echo done`
checker. Rechecking an accepted goal re-observes its configured outcome.

Legacy specs without outcome observations retain their narrow declared-artifact
scope. Optional old execution graphs are context metadata, not a second automatic
scheduler. Runner output is bounded and redacted; no new global task timeout is
imposed. External effect reconciliation and process ownership remain necessary.


## Native learning bridge

The [native bridge](native-learning.md) connects observed tool failures and source-linked agent proposals to the same private checks, adoption and catalogue. It does not accept a greeting/status question as an application goal. Recognized composer suggestions stay recorded as app provenance but are excluded from human history, recall and routing. Old derived views rebuild without rewriting originals. Exact envelope matching is a compatibility fallback, not universal origin proof: a genuine unquoted copy of the complete envelope cannot be distinguished without host metadata.
