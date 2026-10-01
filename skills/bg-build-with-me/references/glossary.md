# Shared BGZFLOW language

Use these meanings in every plan, assignment and handback, whatever the model or host. Keep the project's own domain and component names, requirement IDs, C4 identifiers and contract versions.

This is the one glossary for every BG skill. Link it from a sibling `SKILL.md` as `../bg-build-with-me/references/glossary.md` and from a sibling references file as `../../bg-build-with-me/references/glossary.md`. Add a missing term here instead of copying a definition elsewhere or renaming a project identifier.

## Roles

| Term | Meaning |
| --- | --- |
| The founder | The person the agents work for. The founder owns product, design and business decisions; agents own engineering, coordination and verification. |
| Lead | Plans, dispatches, reads short results and decides. One accountable lead per project. |
| Worker | Does heavy reading, building, testing, repair and integration inside its brief. |
| Independent checker | A fresh, read-only role that inspects the exact candidate. Never the builder and never a resumed builder. |
| Integration writer | The one owner who combines contributions into the candidate. |
| Owner | The one executor or controller entitled to act on a named task or shared resource. |

## Work and evidence

| Term | Meaning |
| --- | --- |
| Outcome | The real result the person wants to use, not merely an edited file. |
| Requirement | A named observable behaviour or constraint with a stable ID. |
| Decision | A recorded choice with its owner, evidence and affected requirements, kept in the project's `DECISIONS.md`. |
| Assumption | An inference that still needs evidence or a product decision. It is never an approval. |
| Contract | Shared input/output, error, identity and compatibility rules at a boundary. |
| Plan | The whole outcome mapped to decisions, work, dependencies and verification. |
| Task | One bounded, owned contribution to the plan, with finish conditions. |
| Ready (task) | Prerequisites, authority, tools, owner and available capacity all permit execution. |
| Brief | A worker's assignment: goal, pointers, owned paths, permissions, caps, required outputs and checks. Its job-level permissions override shared boilerplate. |
| Pointer | A path, commit or line range that locates evidence. Packets carry pointers, never copies of logs or transcripts. |
| Worktree | An isolated Git checkout. It does not isolate credentials or running services. |
| Candidate | The exact source, artifact, configuration and dependency versions being evaluated. |
| Worker-complete | The worker has produced its assigned result and evidence for pickup. |
| Integrated | The contribution is present in the identified combined candidate. |
| Evidence | Inspectable source, command output or observed behaviour tied to a candidate and environment. |
| Finding | A concrete defect or missing requirement with a stable ID, owner and closure evidence. The ID stays the same through every repair round; `bg-rounds` keeps the ledger. |
| Repair round | One consolidated return of findings to their owner. At most two per package; a third needs the founder's explicit approval. |
| Verdict | `ready` (required evidence passes and every finding is closed), `changes-required` (observed defects) or `blocked` (required evidence or access is unavailable). Worker states and the founder's `done`/`partly`/`not done` checklist are separate fields, never verdicts. |
| Assessment | Review accounting plus a reasoned verdict. It may correctly reject the candidate. |
| Accepted | The accountable lead accepted the specified scope and version from evidence, normally on an independent `ready` verdict. |
| Release authority | Existing permission for a specified external action and scope. Tests never imply it. |
| Verified live | The deployed version actually passed the agreed production or customer checks. |
| Receipt | Evidence of one delivery state. Submitted, received or read, and acted on are distinct. |
| Uncertain effect | An external action whose result is unknown after a timeout, closed window or dead process. Reconcile it before any retry. |
| Hold | A scoped instruction that forbids named actions until its condition or authority changes. |

## State and continuity

| Term | Meaning |
| --- | --- |
| Checkpoint | `CHECKPOINT.md` in `<project>/.bgzflow/`: one page of current state (about 1,500 words, `BGZFLOW_CHECKPOINT_KB`) with a single CURRENT RULES block and an OWNERS block (one lead, one integration writer). It points to full evidence and names the next owned action. Update it at every state change. |
| Archive | `ARCHIVE.md` beside the checkpoint. History moves there and is never deleted. |
| Handoff | A short note (`HANDOFF*.md`, at most `BGZFLOW_HANDOFF_KB`) that starts a fresh chat for the next stage. |
| Start prompt | The one current prompt that opens a project or stage. Superseded prompts move to `archive/`. Compulsory startup reads stay within `BGZFLOW_STARTUP_WORDS` without dropping any safety rule. |
| Overlay | The founder's private settings folder: `$BGZFLOW_OVERLAY`, else `~/.bgzflow/overlay/`, holding `FOUNDER.md`, `ROUTES.md`, `PROJECTS.md` and `denylist.txt`. |
| Limits | Defaults: `BGZFLOW_CHECKPOINT_KB` 8, `BGZFLOW_HANDOFF_KB` 2, `BGZFLOW_BIG_READ_KB` 64, `BGZFLOW_CHAT_MB` 15, `BGZFLOW_STARTUP_WORDS` 3000. A project sets its own in `<project>/.bgzflow/config.json`; an environment variable of the same name overrides that. |
| Usage ceiling | The agreed project or account consumption limit. Distinguish hard enforcement from estimates. |
| Urgent steer | A correction delivered to an active recipient at a supported safe boundary. |
| Idle wake | The host activates an idle recipient to process work without the founder relaying it. |
| Job / thread | A job records one run; a thread keeps conversation history. Record both IDs and the owning lead session. |
| Launch cwd / resolved workspace | The requested working directory and the host's resolved job namespace. Neither is an owned write path. |
| Resume preview | A host lookup of the latest eligible task. It neither selects an exact job nor proves there is no active writer. |

## Guidance

| Term | Meaning |
| --- | --- |
| BG Efficiency | The shared method that cuts cost and delay per accepted outcome without shrinking quality. |
| Capability coverage | The deterministic current- and next-stage floor applied before any optional selection ([capability-coverage.md](capability-coverage.md)). |
| Skill selection | Choosing relevant instructions. Delivering, reading and applying a body each need separate evidence. |
| Selection route | The bounded optional selection and routing judgment, or its labelled one-pass fallback ([skill-selection.md](skill-selection.md)). It grants no authority. |
| Maps first | Find code through a code map (CodeGraph or graft) and notes through `notes-map` before reading files; `rg -n` is the fallback. |

"Test everything" means every applicable agreed requirement and risk case: connected customer journeys, approved visual behaviour, supported platforms and devices, security and access, money and entitlements, failure, retry and recovery, accessibility and relevant performance. Existing tests are evidence for that coverage, not its definition. A finite test run never proves every possible behaviour.

"Use all the skills" means consider every available skill, load the necessary compatible bodies at each stage and supply them to the executors. It never means pasting the whole library into every prompt.
