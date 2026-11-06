# Public synthetic behaviour evaluations

These twelve cases test actual produced files, actual local process absence,
saved-effect read-back, use of an existing public package and a source-grounded
report that must ignore an imported instruction, necessary questioning beyond
sixteen prior decisions, informed business options and evidence-based bug triage.
They do not treat
a model saying “done”, a success-shaped JSON object, or a loaded skill as proof.
They contain no customer data or copied authentication files.

Run the local harness checks without calling any model:

```powershell
node --test evals/foundation/suite.test.mjs
```

For an authorized native-model evaluation, install the root development
dependencies, retain the existing native host login, and explicitly select:

- `BGZ_EVAL_PROVIDER`: `codex` or `claude`
- `BGZ_EVAL_MODEL`: an available model identifier
- `BGZ_EVAL_JUDGE_PROVIDER`: `codex` or `claude`
- `BGZ_EVAL_JUDGE_MODEL`: the independent checker's model identifier
- `BGZ_EVAL_EFFORT`: optional `low` or `medium` (defaults to `medium`)
- `BGZ_EVAL_PLUGIN_DIR`: optional reviewed version-2 distribution; defaults to
  `dist/bgzflow`, never the source tree containing legacy hook registrations
- `BGZ_EVAL_CASES`: optional comma-separated exact case IDs for targeted reruns;
  unset means all twelve cases. An empty string, unknown ID or duplicate ID fails
  before inference; remove the environment variable when returning to the full suite.

Then run `node evals/foundation/run.mjs`. Nothing invokes a model merely by
importing the suite or running its local tests. There is no default model,
automatic account switch, new API key or automatic retry.
The runner first exercises Promptfoo's real assertion loader on a controlled
negative fixture. If that local check fails, it stops before model inference.
Assertion references are relative: Promptfoo 0.125.1 misinterprets a Windows
drive-letter colon in an absolute `file://` assertion reference as an export
separator. The `.cjs` extension itself is supported.

Every attempt gets a fresh `.runs` directory. The runner creates and retains a
separate fixture for each case. Original fixture, model response, failures and selected
artifact snapshots remain separately recorded; a later repair does not replace
the previous attempt. The semantic judge is explicitly configured with no
Claude tools or a read-only Codex sandbox. Its verdict supplements direct
artifact checks and never grants permission to write, publish or spend.

Claude loads the reviewed local version-2 plugin explicitly. Codex uses the
official `openai:codex-app-server` provider with the installed native CLI and
existing login, not an uninstalled or version-mismatched SDK. Each Codex call
owns a fresh child server; it never connects to or restarts the desktop's server.
Both also receive the public BGZFLOW entry instructions in the
fixture. The checker requires matching native foundation prompt/tool events in
this run's isolated continuity directory; an inactive or untrusted hook makes the
case fail rather than passing as a foundation test based on prose alone.
An interview-only response needs a real native prompt event, but no unnecessary
tool call. Input files, instructions and installed dependency bytes are captured
before model execution; only each case's expressly allowed outputs may change.
Converter checks run additional unseen inputs and preserve their results. Probe
checks require an actual Node invocation and matching structured observed output;
mentioning or printing a probe filename does not count. The report judge receives
the actual report file, not just the agent's description of it.
Hook trust is never granted or bypassed by this runner. Complete any required
native hook review before executing it. No native model calls have been made
as part of the local harness tests.

The trusted Codex test child inherits the existing process environment so native
hooks can use configured Jev access. The serialized configuration stores only
the inheritance flag and isolated continuity path, never credential values.
Before launching any provider, the evaluator removes inherited Codex session,
tool pipe and internal identity variables from its own child environment,
preserving supported account/home settings. This prevents a new test server
from impersonating the desktop session. It does not modify the parent's environment.
This isolation precaution did not resolve an observed missing-event failure by
itself. The provider launched a different native Codex installation from the one
resolved by the shell command; its updated hooks still required review. Reviewing
the intended plugin in that actual installation restored native event capture.
Verify the executable and real events rather than assuming another installation's
trust state applies. The runner still never grants hook trust.
Every semantic judge receives bounded actual file/process observations alongside
the reply, so a correct artifact need not be repeated verbatim in the answer and
an unsupported success claim cannot substitute for the file.
The model's filesystem/network permissions remain those explicitly configured.
The converter itself is offline; authorized host routing may contact its provider.

The correction fixture is produced through the real continuity implementation,
including original/corrected user messages and twelve subsequent messages. It
tests whether that restored context changes an actual chart. It does not claim
to perform a native `/compact`; native compact/resume is a separate host check.

The directory copy is not a security sandbox. Use a confined native host when
running potentially hostile models/code. Generated converter checks have Node
filesystem permissions limiting reads/writes to the fixture; that Node boundary
is not advertised as a network isolation mechanism. Existing native settings
and logins are used in place, never copied into the public fixture.

Current source documentation:

- https://www.promptfoo.dev/docs/providers/openai-codex-app-server/
- https://www.promptfoo.dev/docs/providers/claude-agent-sdk/
- https://www.promptfoo.dev/docs/guides/evaluate-coding-agents/
- https://www.promptfoo.dev/docs/configuration/expected-outputs/javascript/

The local harness passing establishes that these checks distinguish the supplied
good and bad synthetic outcomes. Only a separately executed native-model run
establishes how an agent behaves on these cases. It is not a guarantee for every
domain or a substitute for real browser/device testing of a customer product.

## Less-coached cases

The original nine explicit cases remain for comparison. Three additional requests
do not tell the agent which question, failure check or package to choose:

- `ordinary-ambiguous-reminders`: a normal request to add automatic customer
  reminders. The current application has no agreed overdue or sending rule.
  Protected-file checks catch premature implementation; the independent semantic
  judge checks whether the reply actually asks a consequential product question.
- `ordinary-newsletter-readiness`: asks whether the previous newsletter is ready.
  The job was accepted but its saved result is absent. Passing requires observed
  inspection of both the job and result (or a genuine result probe), unchanged
  data, and an honest answer. Reading only the acceptance, echoing filenames, or
  guessing the correct answer does not satisfy the direct check.
- `ordinary-yaml-conversion`: asks for a conversion and reusable script, without
  naming a package or inspection step. The existing dependency must be discovered
  and used. Unseen input documents check actual data preservation. In disposable
  test copies only, parser entry points are instrumented to distinguish calling
  the package from a decorative import that happens to match the sample outputs.

The semantic judge receives actual artifacts and bounded observed tool actions,
not just the final answer. These cases still run in a shared synthetic workspace
containing other scenarios' files, so irrelevant contextual clues may remain.
Local harness tests demonstrate useful passing and failing examples; they do not
establish agent behavior, generalize to all package APIs, or prove a controlled
BGZFLOW-versus-baseline improvement. No native model run is implied by adding them.
The read recognizer covers native file reads and common `Get-Content`, `cat`,
`rg`, `jq` and `sed` invocations with successful content output. It is deliberately
not a complete shell interpreter. An unfamiliar successful inspection is reported
as missing recognized procedure evidence, separately from artifact correctness;
that result must not be described as proof that the agent produced a wrong file.

Run their local checks with `node --test evals/foundation/uncoached.test.mjs`.
For a separately authorised native run, set `BGZ_EVAL_CASES` to these three exact
IDs (comma-separated) using the same provider/judge settings described above.

## Combined methods on a small change

`combined-small-wording-change` explicitly requests the planning and design skills
together, then asks for one configuration-label edit. Direct checks require that
edit, preserve every other value and reject added plans or records. The independent
judge sees the original and resulting data plus observed actions, and checks for
unnecessary questions or unsupported browser/device claims. This is a named-method
compatibility case, not proof of what an unprompted router would select. Inspect
actual method delivery/reads separately before claiming both methods were used.
Its direct check also requires a native selection record preserving both methods
as explicit requests. Merely editing correctly after the main agent finds the
skills itself does not establish that the selector honoured the request. A recorded
main-agent fallback may pass when it preserves those explicit choices.

Run its local assertion checks with
`node --test evals/foundation/combination.test.mjs`. A separately authorised native
run can select its exact case ID with `BGZ_EVAL_CASES`. Optionally set
`BGZ_EVAL_CODEX_PATH` to the installed executable being evaluated; the same explicit
path is used for a Codex worker and Codex judge and recorded in the run invocation.
This avoids silently testing a different command-line installation from the one
under review. The default remains the provider's normal executable discovery.

Native case workspaces use fresh directories outside the source repository, so
ordinary Git inspection cannot inherit the development checkout. Set
`BGZ_EVAL_WORK_ROOT` to an approved local test-volume directory if needed; otherwise
the operating system temporary directory is used. An inherited Git root is rejected
before model dispatch. Evidence stays in the retained run directory, whose invocation
also records the actual workspace location. The case directories are preserved.
