SWARM: <swarm ID>
PIECE: <piece ID>
KIND: build
ROLE: executor
TRIAGE: <rebuild | evolve | keep-shared-brain>
OWNS: ["<owned relative path>"]

<!-- One brief per worker job. Pointers only; never copies of logs or transcripts.
     The job-level permissions below override any shared boilerplate. Boilerplate carries no task-specific bans.
     If a worker-context file contradicts this brief, this brief wins; say so in the handback.
     Every pointer must resolve before dispatch (`startup-check`). -->
# Brief: <job ID> — <goal in one line>

- Lead and return route: <lead; where the short result goes; full-evidence path>
- Mailbox: project <project>; from <worker ID>; to `lead`; timeout <minutes>. Never end the job just to ask. Post with `bg-mail`, include a safe default, keep working where safe, and wait in this same job only when the answer is required.
- Project: <worktree, branch, admitted base commit>
- Triage mode: <rebuild (replace broken UI/legacy shell cleanly; list retired guard tests) | evolve (surgical improvement) | keep-shared-brain (reuse verified domain/shared logic)>
- Ground truth verified: <primary source / live API probe / statute / data check recorded via `swarm-gate record --type ground-truth` before architecture lock>
- Requirements: <IDs>; accepted decisions to honour: DECISIONS.md <IDs>
- Read (pointers): CHECKPOINT.md; <path:line-range>; <commit>; canonical live log: <path>
- Known facts (optional): <paste the output of `bgz facts for --brief <this file>`; leave out when it prints nothing. Advice from earlier jobs, never a rule or a gate>
- Skills or capabilities: <body path + SHA-256, or capability + pack method>
- Read and use bg-efficiency, test-driven-development, systematic-debugging and verification-before-completion; record full body reads or the documented equivalent-method fallback.
- Owned paths (write only here): <…>; everything else is read-only

## Permissions (job level; overrides shared boilerplate)
- Filesystem: <owned paths> | Network: <none / listed hosts> | Approval mode: <…>
- Git: commit to <branch>: yes/no. Push: pre-authorised to <remote/branch>, or commit every <N> minutes.
- Live operations: <none, or the exact list with operation IDs>
- Secrets: by name only (<NAME>); inject only into <service/process>; never in URLs, logs or prompts
- External resources: prefix names with the job ID; record them; clean up before any retry

## Caps (time and size only)
- Time: <minutes> | Output: <KB> | Repair round: <0/1/2> of 2

## Done when
- Outcome contract (USED): <observable real-world or real-surface outcome that proves the slice works, not just a commit or PR>
- Acceptance: <exact commands or flows and expected results>
- Required outputs (the handback check verifies each exists): <paths>

## Skills to load
- <written by `bgz jev skills --brief <this file> --write`: each skill with its score; the lead adds this list to the dispatch>

## Checks (written before the build by a model other than the builder; they decide done)
- 1. <exact command or observation and expected result>
- 2. <optional>
- 3. <optional>

## Return (short)
Status | candidate commit + hashes | checks (command, exit, result path) | slice USED proof (`record --type slice`) | open finding IDs | stop paths added (each with the brief line that asked for it, or none) | executor identity + exit status | next owner and action
Then one line per change: `Changed: <what> | where: <paths> | effect: <how>`.

Build only what was asked. Add no customer-facing wait, refusal, hold, gate, cap, block or expiry this brief does not ask for; an unrequested stop path is a defect. Never split a vertical slice into "Stage A UI shell" and "Stage B wiring".

Fast checks only on owned files, plus real-surface verification of the vertical slice you built (simulator/device, browser, API probe, or primary-source verification). Run jev-audit on your diff when jev-codes is installed; investigate and fix confirmed findings in this same job. Retain before/after findings, model and reported usage; skip with a reason when unavailable. No worker independent review or full suite.

Proof handback: save structured JSON under an owned evidence path, following [the admission contract](../docs/swarm-gate.md#piece-admission). Include the job ID, exact base/returned SHA, `triageMode`, optional `retiredGuards` (when `triageMode: "rebuild"`), `outcomeContract` (`{used, surfaceEvidence}`), command arrays, actual exit codes, saved runner output paths and matching counts. The short return points to this file. Admission failure returns to the same job and counts toward failed-twice (after 2 failures on a legacy patch, escalate to `rebuild`); it is not a whole-review repair wave.

