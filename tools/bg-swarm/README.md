# bg-swarm

bg-swarm launches local workers and shows them in one view. The prompt is always a file. The process is started with an argument array, so a long prompt cannot break the command line. A launch counts as started only when the process is still alive and has written output.

## Commands

Launch:

```
node tools/bg-swarm/bg-swarm.mjs launch --project my-app --name review --host grok|codex|claude|custom --cwd /path/to/project --prompt-file /path/to/prompt.txt [--model M] [--effort E] [--max-turns N] [--session-id UUID] [--verify-seconds 90] [--command X] [-- extra args]
```

Status (plain text, or `--json`):

```
node tools/bg-swarm/bg-swarm.mjs status [--project my-app] [--json] [--stall-minutes 30]
```

Stop one worker and the processes it started:

```
node tools/bg-swarm/bg-swarm.mjs stop --project my-app --name review
```

Mark dead workers, and with `--prune` delete records older than 7 days:

```
node tools/bg-swarm/bg-swarm.mjs reap [--prune]
```

The registry is one JSON file per worker. Override the folder with `BG_SWARM_DIR`.

In an active swarm the [gate](../../docs/swarm-gate.md) checks and reserves a valid brief before spawning. Use explicit supported model/effort (`codex` maps effort to `model_reasoning_effort`), and optional `--resource`, `--worker-hours`, `--gate-id`. Read-only Codex briefs add the read-only sandbox; read-only Claude briefs add plan permission mode. Custom hosts carry their native settings in extra arguments and must have proven access. Preflight errors do not consume a reservation. Collect background results with `swarm-gate record job`; detached processes do not supply a guaranteed completion callback. An uncertain launch retains its reservation until reconciled. Stops record cancellation, preserving the native result for recovery. Ordinary launches without a ledger are unchanged.

Kimi launches use `--model`, `--thinking` where configured, stdin text with `--print`, and `--plan` for read-only briefs. Kimi print mode auto-approves tool calls; plan mode is a provider control, not an OS sandbox. Qualify effective access and exact flags before assigning work. Effort-less providers omit the effort flag; their map records `none`. Build/fix handbacks include admission JSON and saved fast output, plus installed jev-audit before/after findings. The lead collects background completion from durable provider evidence; PID death alone is uncertain.

## Example

```
node tools/bg-swarm/bg-swarm.mjs launch --project my-app --name review --host grok --cwd /path/to/project --prompt-file /path/to/prompt.txt
node tools/bg-swarm/bg-swarm.mjs status
```
