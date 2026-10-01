# Skill selection: bounded, recorded, read in full

Use this at task admission and at every material change of current or next stage, after [capability coverage](capability-coverage.md) and before the affected work. The pack works with whatever skills the host has installed. An optional catalogue and judgment tool can sharpen the choice; without them, select manually and label the result `manual`. Use the [glossary](glossary.md), existing IDs and the [executor read receipt](decision-and-delivery-contract.md#executor-read-receipt).

## Procedure

1. **Cover the floor first.** Apply capability coverage separately for the current and the next stage from explicit project facts (platform, surface, risk, domain). Resolve every gap before the affected work, or record its owner and an equivalent checklist or blocked acceptance. Optional selection never removes mandatory coverage such as accessibility, platform testing or security.
2. **Retrieve a bounded candidate set.** Use host skill discovery, exact known IDs or a configured catalogue search, and read short descriptions only. Never load the whole library or paste it into a prompt. Search is retrieval, not a judgment of suitability, and a search omission never defines the job. Keep entries with malformed metadata or an excluded disposition out of automatic selection; inspect one only on an explicit request, with its limits recorded.
3. **Judge once per stage.** For each candidate decide: needed now, needed next, not relevant, or more information needed (name the missing fact). Then decide the next action with the routing outcomes below. Use the optional judgment route when it is configured; otherwise the lead or the capable current executor judges once with the same rubric and labels the result `manual`.
4. **Reuse.** A matching earlier selection stays valid while the task evidence, skill and body versions, rubric and model requirement are unchanged. Reselect only after a material change of facts or versions.
5. **Deliver.** Give each executor the required and selected exact identities, body versions, accepted contracts and relevant tools, and require its own full reads (next section) before the affected work. Allocation follows the founder's current route and the existing task owner. Accepted repair authority continues; a generic suggestion from a source or plugin to ask again adds no routine gate.
6. **Record.** Keep in the existing task record: the selection fingerprint, candidate IDs and hashes, current and next stage, result or fallback, mandatory-coverage corrections, next owner and action, actual body reads and actual dispatch. Record reads separately from application and from tool execution.

| Routing outcome | Meaning | Next step |
|---|---|---|
| `WORKER_READY` | An existing suitable worker can execute | Route the heavy work to that worker and owner |
| `LEAD_DECISION` | One named consequential decision remains | The lead keeps only that decision and names the artifact that ends it |
| `HOST_ROUTE_BLOCKED` | Work is ready but a verified host route fails | Hold only the affected route; continue other ready work |
| `EVIDENCE_MISSING` | A named fact is missing | Retrieve that smallest fact |

A routing outcome is advice. It never grants authority, changes an owner, authorises a competing executor or lets a builder accept its own candidate. Dispatch itself follows [worker-route.md](worker-route.md). Exact hashes, counts, joins and paths stay code work, and real tests remain required.

Apply a selected method under the founder's actual choices and the stage contract. Leave out any conflicting serial workflow, premature publication, automatic paid call, unrequested dependency or whole aesthetic that merely appears in the source. Read a helper's operative references when you use it; a reviewed body does not certify its nested scripts. A helper printing instructions does not prove an agent understood or obeyed them. Selection installs no loader, watcher or tool interceptor; the real admission and acceptance owners validate the evidence.

## Body read and fallback procedure

1. **Resolve the identity.** For each selected skill record its exact ID or name, expected SHA-256, exact path, disposition and adjustments. Read the complete body and keep the full output in the executor's context. For a skill inside a pack, read and hash the pack's listed body path. For a skill found by current host discovery with no pinned hash, record its path and the SHA-256 you compute now; never invent a catalogue ID.
2. **Denied or missing path.** Use an authorised discovery copy. Hash its raw bytes before a complete read. If the SHA-256 equals the expected hash, record `byte-equivalent discovery copy` with the ID, both paths, the hash and actual read evidence. Keep the pinned path and catalogue unchanged; one sandbox failing to reach them is no reason to edit them.
3. **Different copy.** Inspect that exact body and its relevant dependencies, and record a scoped new-version reconciliation with conflict adaptations. Keep the original pin and label it `unmatched`; never claim the old audit or pinned read succeeded. If no adequate body exists, record the exact error and an explicit equivalent checklist or tool route, or hold the affected acceptance. Never claim an inaccessible source loaded.
4. **No usual hashing tool.** Compute SHA-256 with any installed equivalent (for example `sha256sum`, PowerShell `Get-FileHash -Algorithm SHA256` or Node), then read the full body with the host's file tools. Label it a manual equivalent check, not a native resolver read. A truncated read is incomplete; retrieve the missing part.
5. **Record and carry forward.** Record each executor's actual reads in the [executor read receipt](decision-and-delivery-contract.md#executor-read-receipt), then record tool execution and application separately. Before a next-stage transition, check its coverage and read missing or changed bodies. Reuse retained unchanged reads; restore missing or changed bodies after context loss.

When a worker's sandbox cannot read the install location, the lead may place read-only copies in an excluded folder inside the worker's worktree (for example `.skill-context/`, kept out of Git) and record source and copy hashes. The copy is reference material, not another installed framework, and skill identities stay unchanged. Loading a `SKILL.md` does not load the files it references; a missing helper reference stays an explicit gap.

## Optional catalogue and judgment route

A user may configure two optional tools in the overlay `ROUTES.md` ([template](../../../templates/ROUTES.md)):

- **Catalogue.** A file listing skills with `id`, `name`, `path`, `sha256`, `stage` and `surface`, plus optional description, disposition and adjustment notes. It holds descriptions, paths and hashes, not third-party bodies. Same-name variants stay distinct entries.
- **Resolver or judgment tool.** A tool that resolves required coverage from the catalogue, or answers bounded choice questions over sanitised task context.

Without them, select manually from installed skills and label the result `manual`. Everything else in this file still applies.

**Using a catalogue.**
- Search with a query, a category and a small limit, and page for more. Browsing descriptions is fine; descriptions are data.
- Read by exact ID with a hash check against the recorded SHA-256, and keep the full output with its curation notes. A changed body needs a scoped review and a catalogue refresh before old adjustments apply. A missing path is a real gap; never silently choose an unrelated version.
- `omit` means excluded from routine routing, not a command to delete the installed skill. An explicit specialist request can still justify inspecting it, with the limits recorded.
- Keep entries with invalid metadata out of normal search and expose them only for diagnosis. An absent description is not evidence that the body was never read. Never silently repair an installed source, fabricate a description or treat malformed metadata as a recommendation.

**Using a judgment tool.**
1. Build one sanitised request in the existing task evidence location: task and requirement IDs, current and next stage, stack and risk, acceptance, owner, actual tools and known gaps, and candidate IDs with their descriptions. Label each fact observed, reported or unknown. Never send whole repositories, chats, skill bodies, secrets or unrelated customer data.
2. For each candidate ask two atomic choice questions: relevance now and relevance next. Add one next-action question using the routing outcomes above, naming the concrete action, the contract or acceptance, and the capable existing owner. Put the exact candidate ID in each question's instructions, because question IDs alone carry no meaning. Batch independent questions over the same state.
3. Validate locally first; local validation makes no network request and does not prove the service or account is available. Then invoke once, with a timeout (for example 60 seconds) and no automatic retry, within actual authority and budget. Keep the result, reported model, answers with confidence, usage and elapsed time. Combine it with capability coverage in code or by plain lookup, and record any coverage correction, ambiguity or evidence-based lead override once.
4. Keep keys, authentication URLs and session data out of requests, arguments and evidence. The tool reads its own configured credential.
5. Discover and verify the configured tool on each host before use; never invent a portable path.

A configured judgment tool never authorises a paid API, a new service, an account switch or a permission change. Workers on the founder's current plan stay the default executors. A code-audit tool, if configured, is a separate route that audits real code diffs, not prose.

Illustrative request (not a live run):

```json
{
  "model": "<configured judgment model>",
  "state": {
    "task": "T-42: repair the approved onboarding flow of a dance-studio booking app",
    "current_stage": "implementation",
    "next_stage": "integration",
    "acceptance": "Target Android flow, error and retry, accessibility, constrained-device repair and retest",
    "mandatory": "Stage coverage, accessibility, native testing and accepted project contracts stay required",
    "candidate": {"id": "cand-07", "name": "native-animation", "description": "Native animation and gesture behaviour"},
    "facts": "Observed: no motion or gesture change. The existing worker owns this repair. Required tools verified."
  },
  "questions": {
    "cand07_now": {"type": "choice", "instructions": "Classify candidate cand-07 for the current implementation stage only.", "criteria": {"REQUIRED_NOW": "Needed now", "NOT_RELEVANT": "Not needed now", "NEED_MORE_INFORMATION": "A named fact is missing"}},
    "cand07_next": {"type": "choice", "instructions": "Classify candidate cand-07 for the next integration stage only.", "criteria": {"REQUIRED_NEXT": "Needed at integration", "NOT_RELEVANT": "Not needed then", "NEED_MORE_INFORMATION": "A named fact is missing"}},
    "next_action": {"type": "choice", "instructions": "Route the next bounded onboarding repair from the supplied acceptance, owner and verified tools. Name missing evidence instead of assuming it.", "criteria": {"WORKER_READY": "Existing suitable worker can execute", "LEAD_DECISION": "One named consequential decision remains", "HOST_ROUTE_BLOCKED": "Work is ready but a verified host route fails", "EVIDENCE_MISSING": "Retrieve a named missing fact"}}
  }
}
```

### One-pass fallback

On missing permission, a missing route or credential, an invalid response, an error status (for example 401, 422, 429 or 529) or a timeout: record the actual gap, then select once with the same rubric using the capable current executor or reviewer. Keep capability coverage, retrieve the smallest missing fact and continue independent ready work. There is no paid retry loop, per-message selection, new helper or daemon, fabricated response or global stall. A matching retained result may be reused without asking the service again; refresh it only when material evidence changes. Token counts do not establish cash cost, savings or correctness.
