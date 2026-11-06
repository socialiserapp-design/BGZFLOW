# Native private learning

Native hooks already preserve tool failures and original human feedback in the
private event store. A recorded failure is evidence of a failed tool, not its
cause, a verified product outcome or permission to do more work.

The current agent can propose a useful complete text procedure during the task
through `bgz learning propose --session <native-session> --stdin`. Its ordinary
JSON tool input contains `name`, `description`, `body` and `evidenceEventId` from
`bgz learning status --session <native-session>`. This is an agent integration,
not a form the user must fill out or a command required after every task. The
bridge verifies the source against the actual session. It never makes the latest
status question, greeting or feedback into an accepted application goal.

No model is called by this bridge. A proposal cannot supply a checker command,
claim its own test result or grant permissions. With no configured evaluator it
is retained as `proposed`, remains unavailable as an adopted method and ordinary
work continues. `evaluate` can retry a retained proposal after an owner supplies
a suitable evaluator; `rollback` withdraws an adopted procedure. These actions
receive the proposal identity through the same stdin tool input.

## Owner-controlled checks

An embedding application may supply an existing trusted evaluator callback.
Native CLI integration can instead read an optional owner-managed file at
`~/.bgzflow/native-learning/checks.json`. It is never created automatically or
read from the task/project. The structure is schema 1, with `projects` keyed by
the SHA-256 of the canonical project path. Each entry identifies `projectRoot`,
`baselineCandidate` and `improvementChecks` as defined by the existing
[executable-check adapter](foundation-session.md#executable-checks-and-private-improvement).

Native checks require fixed Node commands, actual script sources outside the
candidate's project and `sourceDigests` mapping each source path to its approved
SHA-256. Every command must reference a pinned source. The owner must choose
checks that actually evaluate the procedure's intended behaviour; a keyword
match or always-success script does not establish improvement. Candidate agents
must not create or modify owner configuration/checkers to certify their work.

Outside-project placement and pins detect some changes; they are **not OS
isolation**. An agent with the same unrestricted account can modify configuration
and pins together. The owning host must provide real access separation where
hostile or untrusted builders are in scope. No new filesystem permissions,
sandbox, account or customer gate is installed by this feature.

The existing API requires attributable real baseline failure corrected by the
candidate, passing regression and unseen observations for that candidate version.
After that, adoption is automatic unless the trusted host disables it. The text
method joins the same private catalogue, selection and complete-body delivery in
later sessions of the exact project. It is never installed as executable code or
published to the shared plugin. Check coverage still determines what is proved;
this is not an autonomous optimizer or a promise of improving every future task.
