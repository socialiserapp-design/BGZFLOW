# bg-heavy

bg-heavy is a machine-wide queue for heavy local jobs: full test runs and native builds. One slot is allowed for every 16 logical CPUs, and at least one slot. The job runs at below-normal priority so other work can still use the machine. A slot whose process is gone, or that was taken more than 4 hours ago, is free for the next job.

## Commands

Run a job:

```
node tools/bg-heavy/bg-heavy.mjs [--label TEXT] [--slots N] [--wait-max MINUTES] [--priority below|normal] -- <command> [args...]
```

Show who holds a slot:

```
node tools/bg-heavy/bg-heavy.mjs status
```

`--wait-max` is how many minutes to wait for a free slot (default 180). If the wait expires, the exit code is 75. Otherwise the exit code is the job's exit code.

Environment variables: `BG_HEAVY_SLOTS`, `BG_HEAVY_DIR`, `BG_HEAVY_PRIORITY` (`below` or `normal`).

## Example

```
node tools/bg-heavy/bg-heavy.mjs --label my-app-tests -- node --test
```
