# Adaptive BGZFLOW foundation

## Purpose

Turn an ordinary request into a useful, verified result across coding, research,
documents, marketing and other work. Ask consequential questions, choose useful
skills and available models, coordinate work, preserve the user's intent, and
improve from observed results. A large library is desirable when only relevant
material is loaded. The core is usable by a single provider and by teams.

BGZFLOW is the portable foundation. Product interfaces, named assistants,
subscription plans, voice and autonomous personal-assistant experiences belong
to the applications using it. The foundation must not impose one customer's
preferences on everyone else.

## Agreed behaviour

- Ask the user what matters when quality, elapsed time and usage materially trade
  off; use the answer throughout that task. Do not re-ask an unchanged decision.
- Respect the current request and standing permissions. A skill or model judgment
  cannot create authority to spend, publish, disclose data or expand the task.
- Public users supply their own Jev key. If Jev is unavailable, the current main
  agent selects from the same catalogue; the result identifies that fallback.
- Jev assesses fit and task characteristics. Code handles exact identities,
  permissions, resource availability, state changes and execution.
- Use a large discoverable catalogue. Honour explicit skill requests. Do not
  exclude a useful skill just because the user did not name its vendor.
- Respect exact plugin identities and recorded activation. Codex's explicit
  disable settings exclude that marketplace/plugin, without excluding a namesake
  from another source. Claude plugins require recorded activation and installation
  scope applicable to the current project. Personal/global skill folders and
  explicitly configured library roots remain independent of plugin activation.
  Cached method text does not establish that its tools or services are available.
  Preserve the current foundation's identity when its installed folder is also
  found through host discovery; it must not be discarded as an old duplicate.
  File discovery is not a complete mirror of workspace-managed or temporary host
  settings. Unknown Codex-managed cached methods are retained as library text;
  their presence grants no tool access. Applicable Codex repository-to-directory
  settings and root markers are read without launching a CLI on each hook.
- Reconsider selection after material task/stage changes, recovery or a changed
  capability pool. Reuse valid selection during unchanged work.
  Clear greetings, thanks, status-only questions and delay complaints are captured
  without replaying project history or calling the router. Mixed or unknown
  requests use ordinary selection. This shortcut never replaces compaction
  recovery, an explicit method request or an acknowledged new work stage.
  A partial or missing old plan is not new work and does not make status-only
  replies invoke the router indefinitely. It stays uncertain; later substantive
  requests and native stage events still take the normal selection path.
  A selection uses the hook's already-read source snapshot instead of reading
  the same session history twice; execution and permission checks still read fresh.
- Choose single-agent work, independent parallel work, or an independent check
  according to the task. Never require a fixed number of models or providers.
- Capture actual user messages, assignments and tool events automatically.
  Keep each session's state separate. Preserve original evidence behind the
  concise current view. Do not mistake an agent's claim for an observed result.
- Prefer native compaction and continuation in the same conversation. Restore
  task context after compaction/resume. Transcript file size must not force a new
  chat, stop a reply or block normal tools.
- Private user/team lessons stay private. Shared improvements use public research
  and test cases. Candidates can be adopted automatically after meaningful tests,
  without increasing permissions or spending limits. Keep a reversible version.
- No fake reviews, invented expertise, mandatory numeric clarity score, read
  receipts, success forms or global stop loops.
- Clarification continues when new evidence or user feedback exposes a consequential
  choice. Evaluate whether answers changed the action, not how many questions were asked.
- Completion checks combine direct assertions, independent judgments where needed,
  and observation of the actual intended environment. Test the tests with realistic
  wrong cases; retain first failures and repairs separately. A model score cannot
  override a failed direct check or supply missing user consent.

## Components and boundaries

1. Catalogue and Jev selector: discover skills, assess relevant candidates and
   deliver selected bodies; expose a transparent main-agent fallback.
2. Continuity store and host adapters: capture factual events and restore useful
   context using supported host lifecycle events. On-demand project recall retrieves
   original messages and recorded operations across sessions in the same project;
   it is partial evidence, not a new authority or a verified current-state summary.
   See project-recall.md for exact limits and host behaviour.
3. Execution controls: reuse operation reconciliation, current-evidence checks
   and scoped storage; enforce only facts that the host can actually observe.
4. Specialist skills: coherent task-specific procedures with current sources,
   dependencies and checks. They add expertise, not new authority.
5. Improvement: original observations, candidate change, targeted and unseen
   checks, adoption or rejection, and withdrawal of regressions.

The shared FoundationSession API connects these components to trusted host
capabilities, reservations, confirmed request/answer sources and actual outcome
observers. Native hosts automatically capture supported events and select methods;
they do not infer product decisions or provide unexposed account capacity.
Private text procedures can be tested with owner-configured executable checks,
adopted into the same selector and withdrawn. This is an available task-driven
path, not an always-running learning service. See
[Foundation sessions](foundation-session.md) for the APIs and actual boundaries.

Native-host integration must distinguish available instructions, delivered
instructions and observed behaviour. A host that cannot intercept an operation
cannot advertise enforced control over that operation. Application integrators
must keep user/team storage and tool permissions outside model-controlled input.

## Acceptance before activation

- Explicit skill selection; distinguishing similar skills by intended result;
  using an unfamiliar useful provider skill; and a simple no-skill request.
- Jev outage, malformed response, out-of-catalogue choice and main-agent fallback.
- A user correction affects the work while unrelated settled decisions survive.
- Separate concurrent sessions cannot overwrite one another's selections/state.
- Compaction and resume preserve the goal, corrections, owners and pending work;
  no instruction forces a new chat or blocks an ordinary reply.
- Single-provider work and independent multi-worker work respect available tools,
  permissions and ownership; unknown external effects are not blindly repeated.
- Failed or missing real-surface evidence never becomes a successful result merely
  because a model or a saved form says so.
- Private observations cannot be promoted into the shared library by the learner.
- Actual installed host events run the new version, including after compaction.

Activation follows focused acceptance checks with a backup and rollback path.
It does not wait for a prolonged comparison with the old installation. Later
improvements are measured against representative and unfamiliar tasks.

## Primary design references

- https://docs.typesafe.ai/cookbooks/skill_suggestion
- https://github.com/typesafe-ai/typesafe-sdk-js
- https://github.com/typesafe-ai/skills
- https://docs.typesafe.ai/primitives/choice
- https://code.claude.com/docs/en/hooks
- https://agentskills.io/specification
- https://github.com/google/elephant-goldfish-model
- https://github.com/google-research/harness2
- https://www.anthropic.com/research/demystifying-evals-for-ai-agents

The TypeSafe cookbook is a selection experiment, not an authorization system.
Its demonstrated limits and host-specific loading failures remain relevant.
