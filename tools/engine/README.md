# BGZFLOW engine

A portable ESM runtime for explicit goals, local command execution, durable operation records, artifact verification and scoped context. This development package is used by BGZFLOW's `bgz engine` command and can be installed separately by a host adapter.

## Automatic methods outside the app

New goals automatically retain a hash-pinned default policy and shared intent,
research, recovery and efficiency methods. Both executor and checker receive
the same `methodContext` and concise `guidance` through the existing adapter;
resume uses the saved method version. The local adapter also exposes a
non-secret `BGZFLOW_METHOD_CONTEXT_FILE` to each child process. No additional
model or routing service is called. Legacy goals remain readable.

For an ordinary primary-model turn, use `prepareRequest({ text, product })`
and `methodGuidance(context)`, then `readMethod(context, id)` for relevant full
bodies. Product is `bgzflow` or `lucian`; the underlying method bytes are shared.
The CLI exposes `prepare [--text-file file] [--product lucian]` and
`method --id research-and-check [--context saved-file]`. Preparation returns
guidance and metadata first; `--json` includes the frozen full context.

The full plugin's SessionStart hook supplies this policy/catalog and its
UserPromptSubmit hook supplies a short reminder. These instructions tell the
primary model to investigate material unknowns with relevant permitted sources
and verify actual effects without a separate user request. They keep simple
tasks direct. Supported host loading and actual model/tool effects still need
verification in each host: context delivery alone is not proof of research,
truth, skill application, better answers or lower usage.

### Shared meaning across subjects

The primary model interprets ordinary wording and supplies task-relevant
`vocabulary: { domain, entries: [{ term, userWording, meaning, sourceRef, scope? }] }`.
The domain is open text, with no fixed software taxonomy. Preserve the user's
source phrases, clarify material ambiguity and explain better options; the
schema does not perform semantic translation by itself.

`prepareRequest({ text, product, vocabulary })` retains an immutable vocabulary
snapshot and digest. `engine.start(spec)` automatically includes `spec.vocabulary`
or `spec.goalContract.vocabulary` in the same saved method context delivered to
executor, checker and resume. CLI preparation accepts `--vocabulary file.json`.
An empty/simple task needs no vocabulary. The existing `bgz goal compile/lock`
also retains supplied definitions and binds them to the original-intent proof;
unrecognised subjects receive general outcome standards, not software rules.

Keep `methodGuidance(context)` as the static prefix. Hosts append the relevant
`context.vocabulary` as dynamic task data alongside the user's request; they
must verify actual loading and faithful use in each model/host. Delivery and a
hash prove which definitions arrived, not whether an interpretation was correct.

## Optional Harness2 experiment

`bgz engine harness2-example --harness CHECKOUT --python PYTHON --evidence NEW_DIR`
runs the separately supplied, byte-pinned Google Research core against this
engine using the bundled agenda adapter. It performs local recipe trials,
held-out exact-byte checking, promotion and rollback. This reproducible example
uses a scripted proposer and no model/network calls. It demonstrates the
integration boundary; it is not an automatic cloud learner or a model-quality
comparison. See `improvement/harness2-example/README.md` and third-party notices.

## Run a goal

Save this as `goal.json` and choose an existing project directory:

```json
{
  "id": "answer",
  "text": "Write and verify the answer.",
  "steps": [{
    "id": "write",
    "command": {
      "file": "node",
      "args": ["-e", "require('node:fs').writeFileSync('answer.txt','42')"]
    }
  }],
  "checker": {
    "id": "read-answer",
    "command": {
      "file": "node",
      "args": ["-e", "if(require('node:fs').readFileSync('answer.txt','utf8')!=='42')process.exit(1)"]
    }
  },
  "artifacts": [{
    "id": "answer",
    "path": "answer.txt",
    "acceptance": { "equals": "42" }
  }]
}
```

```sh
bgz engine run --project ./my-project --spec ./goal.json
bgz engine status --project ./my-project --goal answer
bgz engine resume --project ./my-project --goal answer
```

The standalone package exposes the same commands as `bgz-engine`. Commands run as argument arrays in the selected project. Use the host's credential mechanisms; keep secrets out of goal specifications. Default output reports the goal ID, status, freshness, acceptance time, last integrity check and reason. `--json` returns full state for integrations.

## Embed in a host

```js
import { createEngine, createLocalHostAdapter, createScopedContextStore } from '@bgzflow/engine';

const engine = await createEngine({
  projectRoot,
  adapter: createLocalHostAdapter(),
});
const unsubscribe = engine.subscribe(event => renderProgress(event));
const result = await engine.start(spec);
await engine.dispose();
unsubscribe();

const context = createScopedContextStore({ storageRoot, projectId, agentId });
context.put('current-task', { summary: 'Write and verify the answer.' });
const saved = context.get('current-task');
context.close();
```

Each host supplies explicit project identity and its execution adapter. The portable runtime accepts the declared commands and artifact bytes: `acceptanceScope: "declared-artifacts"`, `wholeOutcomeStatus: "not-assessed"`. Its `accepted` status does not certify the user's complete product or deployment. Hosts should reuse the existing BGZFLOW goal/verification tools, or their own supported equivalent, to retain the original intent, check requirement coverage and verify actual outcomes. Report component and whole-outcome evidence separately. A missing or ambiguous execution receipt requires reconciliation; callers must not treat it as permission to repeat an external action. Retrying verification preserves completed builder effects.

### Acceptance history and current bytes

`start()` returns `freshness: 'checked'` when it accepts the goal. `acceptedAt`, the original `artifacts`, checks and events record that historical completion. Calling `resume(id)` after acceptance reads every requested artifact again without executing builders or the checker. It appends an `artifact-integrity-checked` event and updates `integrity: { checkedAt, matches, artifacts }`. It returns `status: 'accepted'` for matching bytes or `status: 'invalidated'` for mismatched, missing or unreadable bytes, with `freshness: 'checked'`. Restoring the requested bytes allows the next resume to return accepted again without replaying effects.

`status(id)` is a read-only historical snapshot and always returns `freshness: 'historical'`; it does not inspect current artifact bytes. Its persisted `status: 'accepted'` records past completion even when the latest `integrity.matches` is false. Original artifact evidence and acceptance events are retained. Use the top-level status from `resume()` and its `integrity` for an observation of current bytes, never the old `artifacts[].matches`. A read is an observation at `checkedAt`, not protection against subsequent edits or an atomic snapshot of multiple files. Existing stores without `acceptedAt` retain their old events and gain new integrity evidence on resume.

### Overlapping calls and recovery

`start()`, `resume()` and `recover()` acquire an OS-owned local endpoint for the canonical project root and goal ID before loading or modifying goal state. On Windows this is a named pipe; elsewhere it is an exclusive loopback TCP listener. There is no retry loop, lease timeout or stale-file stealing. Process death releases ownership, allowing a later resume to reconcile the existing stable operation receipts.

For a failed goal, `engine.recover(id, { recoveryId, stepId, command, reason })` applies an explicit authorised repair under the existing goal. The CLI accepts the same object in a JSON file: `bgz engine recover --project ./my-project --goal answer --repair repair.json`. A stable repair ID binds its logical step and command; repetitions reconcile the existing operation rather than repeat a completed effect. Original failed operations, criteria and method/vocabulary bytes remain. Actual host reconciliation must settle unknown effects before further repair/checker actions or acceptance. The existing checker and actual artifact bytes still determine component acceptance; this does not establish whole-product completion or universal external exactly-once execution.

If the endpoint is already in use, the call returns `{ id, status: 'busy', freshness: 'historical', reason, snapshot }` without running commands, revalidating artifacts or writing goal state. `snapshot` is the read-only historical state, or null if the owner has not yet created it. Busy means coordination contention, not a failed goal or proof that this goal is running; an unrelated listener or a TCP hash-port collision can also cause it. CLI exit codes are 0 for acceptance or status reads, 1 for incomplete/invalidated outcomes, 2 for errors and 3 for busy. Try again after the owner finishes; accepted snapshots in busy responses are not fresh checks.

Coordination is advisory and local to cooperating engines on one host. Other programs can edit the files, separate hosts/network namespaces do not share ownership, and aliases that resolve to different root strings can require host coordination. Endpoint bind failures are errors, not permission to proceed. Windows execution and crash recovery are tested; other operating systems require their own real-process qualification before claiming equivalent behavior.

Context transfers are explicit: `source.transferTo(target, { key, targetKey, transferId })` records provenance and a stable transfer identity. A project or agent name is not converted into a shared ambient directory. See `THIRD_PARTY_NOTICES.md` for the Ruflo scope-model attribution.

## Development status

The local adapter and clean-install package are the initial executable slice. Native model providers, phone/desktop UI integration and cross-host equivalence require their own adapter qualification. The package is marked private while that work continues; packing it locally does not publish it.

Run `node --test tools/engine/test/*.test.mjs` from the BGZFLOW repository. Tests use real temporary files and local processes. They do not establish model quality, comparative performance or universal exactly-once execution.

## Current evidence dependencies

The runtime reads a project-scoped .bgzflow/current-truth.json record before new
effects, before acceptance and when revalidating accepted work. Use the exported
captureFileTruth function to capture explicitly selected file dependencies; it
returns a record without writing it or proving the meaning of its contents. The
host owns saving/correcting this record through its existing project authority.
Read it back with bgz-engine truth --project PROJECT. Unconfigured work remains
explicitly unconfigured and follows the existing direct path.

Import captureFileTruth and checkCurrentTruth from @bgzflow/engine/truth, or from
the main package entry. A live dependency needs the host adapter observeTruth
callback: read the actual allowed resource and return status observed, its stable
instance identity, and actual value. Saved reports cannot replace this callback.
The checker itself makes no model, network or shell calls.

Changed, missing, unavailable or explicitly conflicting registered evidence
prevents dependent new effects and acceptance. A saved plan pins its evidence
contract; changing expected hashes cannot silently rebase that plan. Reconcile
uncertain earlier effects under their original operation identity even if the
evidence changes. Read-only status stays historical. Only registered dependencies
are covered; unchanged bytes do not prove semantic truth, automatic dependency
coverage or whole-product completion. Checks are at boundaries, not a transaction
locking every external system. Full-plugin hooks supply scoped context using the
same checker; arbitrary host tools and native application wiring need their own
verified integration.
