SWARM: <swarm ID>
PIECE: <piece ID>
KIND: build
OWNS: ["<owned relative path>"]

<!-- One brief per worker job. Pointers only; never copies of logs or transcripts.
     The job-level permissions below override any shared boilerplate. Boilerplate carries no task-specific bans.
     If a worker-context file contradicts this brief, this brief wins; say so in the handback.
     Every pointer must resolve before dispatch (`startup-check`). -->
# Brief: <job ID> — <goal in one line>

- Lead and return route: <lead; where the short result goes; full-evidence path>
- Mailbox: project <project>; from <worker ID>; to `lead`; timeout <minutes>. Never end the job just to ask. Post with `bg-mail`, include a safe default, keep working where safe, and wait in this same job only when the answer is required.
- Project: <worktree, branch, admitted base commit>
- Requirements: <IDs>; accepted decisions to honour: DECISIONS.md <IDs>
- Read (pointers): CHECKPOINT.md; <path:line-range>; <commit>; canonical live log: <path>
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
- Acceptance: <exact commands or flows and expected results>
- Required outputs (the handback check verifies each exists): <paths>

## Return (short)
Status | candidate commit + hashes | checks (command, exit, result path) | open finding IDs | stop paths added (each with the brief line that asked for it, or none) | executor identity + exit status | next owner and action

Build only what was asked. Add no customer-facing wait, refusal, hold, gate, cap, block or expiry this brief does not ask for; an unrequested stop path is a defect.

Fast checks only on owned files. Run jev-audit on your diff when jev-codes is installed; investigate and fix confirmed findings in this same job. Retain before/after findings, model and reported usage; skip with a reason when unavailable. No worker independent review or full suite.

Proof handback: save structured JSON under an owned evidence path, following [the admission contract](../docs/swarm-gate.md#piece-admission). Include the job ID, exact base/returned SHA, command arrays, actual exit codes, saved runner output paths and matching counts. The short return points to this file. Admission failure returns to the same job and counts toward failed-twice; it is not a whole-review repair wave.
