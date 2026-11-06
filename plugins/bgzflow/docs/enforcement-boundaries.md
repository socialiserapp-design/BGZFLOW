# What BGZFLOW can actually enforce

The plugin must never call a prompt, a read receipt or a model-written JSON success
field an execution guarantee.

## Portable native plugin

Supported lifecycle hooks capture the user's words and observed events, restore
context, choose relevant methods and provide actual selected bodies. They never
block Stop or require a fresh chat because a transcript grew. An acknowledged
native plan changing its active step triggers selection for that stage, once per
unchanged stage. Proposed or failed plan updates do not count. Agent-triggered
`route --stage ...` remains available when a host exposes no usable plan event;
arbitrary tool names do not establish a new task or stage.

Each supported event also updates a rebuildable current view in the same private
store. It tracks original messages, captured questions and replies, declared work,
plans and unresolved operations. Session views remain separate within a project.
This is automatic bookkeeping, not an inferred replacement for the user's decisions:
agent-reported progress stays unverified, and a stopped worker is not marked done.
Missing or partial history stays explicit. Free-form questions remain quoted
assistant sources where the host supplies the text; semantic answer associations
still require interpretation by the agent or owning application.

The mechanical hook catches a narrow class of literal destructive root commands
in supported shell tools, including Claude Desktop's PowerShell tool,
checks actual saved JavaScript after supported edit events, and enforces configured
write roots for supported structured file tools when the host supplies that policy.
It is not a shell sandbox. Arbitrary shell scripts, other tools and unsupported host
events can bypass a regex check. Native OS/tool permissions remain the security
boundary. Agent-selected model names do not prove accounts or worker slots exist.

Questioning, package reuse, truthful completion claims and subjective quality also
need instructions, evaluation and observation. The plugin cannot promise to prevent
every semantic mistake in a host it does not control. A reply must remain possible
when a task failed or evidence is missing.

## An application using the foundation, including Lucian

For stronger guarantees the application's trusted execution layer owns permissions,
user/team separation, active request and external operations. Route suggestions are
data, not authority. Use the existing execution engine's operation reconciliation
and scoped contexts; never accept a new paid operation identity as a blind retry.

The application supplies the actual available model and resource-pool information.
List of models, account allowance and reservable worker slots are separate facts.
Only observed, authorised capacity can be selected; unknown capacity remains unknown.

Use executable checks tied to the exact output and environment for a verified status.
The builder cannot set that status with its own report. Missing or failed checks stay
unverified; model judgments can add evidence but cannot override direct failures.
Define the check from the user's intent before implementing the candidate and retain
independent grading. Do not add a customer-visible wait or refusal outside the brief.

No universal check can establish that every answer is true or every user is satisfied.
Source retrieval, calculations, real effects, calibrated judgments and useful questions
cover different risks. A mature system measures where each fails and improves it.

## Connected session API

FoundationSession records confirmed requests, explicitly associated clarification
answers, ownership and outcome observations in the existing event store. An answer
invalidates affected criteria; unrelated explicitly identified evidence remains
available. Structured native question-tool answers are captured automatically,
but the main agent/application supplies their semantic association.

Its execution API needs trusted authorization and real resource/path reservation
callbacks. The provided local project-path adapter coordinates participating sessions;
it does not stop unrelated programs writing files. Native tools outside this API
remain governed by their host permissions. Unknown capacity asks the main agent to
inspect the actual host; it is not a quality judgment in favor of one worker.

Owner-configured executable checks bind an observed target's project, candidate and
request revision before and after a run. Exit zero alone is insufficient. The
application must prevent builders changing those trusted checks when independence
is required. Private procedure improvements need actual regression and unseen-case
results before adoption; they enter normal selection and can be rolled back. The
plugin does not independently invent or run a continuous learning program.

See [Foundation sessions](foundation-session.md) for precise integration contracts.
