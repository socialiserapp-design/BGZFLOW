# BGZFLOW

BGZFLOW is a free plugin that lets one founder run AI worker swarms from idea to launch.
It plans the work, builds the pieces together, then tests and checks the whole result.
It works with your existing agents and subscriptions; their normal usage costs still apply.

[Public repository](https://github.com/socialiserapp-design/BGZFLOW) · [Verification evidence](docs/proof.md) · [MIT licence](LICENSE)

## Install in 5 minutes

You need your host CLI and Node.js 18 or newer. Python 3.10 or newer is needed only for the notes map. No npm packages are installed. Local-source validation and remote installation are separate evidence; this candidate makes no remote-install claim. Details: [install guide](docs/install.md), [verification evidence](docs/proof.md).

**Claude Code**

```shell
claude plugin marketplace add socialiserapp-design/BGZFLOW
claude plugin install bgzflow@bgzflow
```

**Codex**

```shell
codex plugin marketplace add socialiserapp-design/BGZFLOW
codex plugin add bgzflow@bgzflow
```

## A 60-second first run

Open any existing repository in your agent. Start with `/swarm <goal>`: describe the result you want in plain words.

Claude Code uses the plugin prefix:

```text
/bgzflow:swarm <your goal>
```

Codex does not load plugin slash commands. Tell it: `Read the installed BGZFLOW commands/swarm.md and run that workflow for this goal: <your goal>`.

The lead recovers the project, shows a short plan, asks once which worker resources it may use, and carries the approved work through building, integration and whole testing. Give any product constraints with your goal. Publishing requires separate explicit authority.

## Commands

The names below are workflow shorthand. Claude Code and Grok use `/bgzflow:<name>`; on Codex ask the agent to follow the matching installed `commands/<name>.md`.

| Swarm command | What it does |
|---|---|
| `/swarm <goal>` | Plan, build all pieces, combine, test whole and independently check |
| `/swarm-fix <findings>` | Repair a batch, re-integrate at a new SHA and retest; two waves maximum |
| `/swarm-research <question>` | Investigate in parallel and return one sourced answer |
| `/swarm-design <target>` | Explore at least eight new looks, then prototype your choice |
| `/swarm-check [candidate]` | Test and independently check the complete pinned candidate |
| `/swarm-ship <version> [submit]` | Prepare one release; publish only with named authority |
| `/swarm-status` | Show activity, stale/unknown jobs, coverage and recent results |
| `/swarm-resources` | Inspect resources and save explicit approval or route proof |

| Other command | What it does |
|---|---|
| `/bg-heavy` | Queue heavy local tests/builds, one at a time |
| `/bg-swarm` | Launch, list, stop and reap local workers |
| `/bg-rounds` | Keep the repair-wave ledger |
| `/swarm-gate` | Enforce resources, usage, retries, ownership, ordered checks and release readiness |
| `/doctor` | Check for secrets in URLs and plugin context costs |
| `/notes-map` | Find the relevant lines in project notes |
| `/startup-check` | Check startup reading, pointers and owners |

## Resources and approval

You choose resources and a usage limit together once per swarm: Small (8 jobs/4 worker-hours), Medium (20/12), Large (48/32), or custom. Each includes a check/fix reserve; both choices become next time's suggested defaults. The local [swarm gate](docs/swarm-gate.md) saves one private ledger, checks worker briefs and reservations, breaks failure loops, prevents concurrent ownership, orders whole checks and blocks an unready production release. A block gives the lead one next step. Ordinary chats receive no swarm gate context.

Installed tools and logins need a small qualifying job and a proof matching the current observed account/environment. Provider allowance percentages are enforced only when actually readable; otherwise they are labelled unavailable. The plugin never buys capacity or silently switches accounts. Non-Claude leads use the same required gate CLI. Hooks cannot prove that workers really read skills or tested honestly: their proof handback and the whole test supply that evidence.

The gate uses provider-neutral tiers and a discovered, dated model map. Each tier needs an exact-flags qualification; a changed model affects new jobs while running jobs keep their settings. Optional [Jev judgment and jev-codes](docs/swarm-gate.md#optional-jev) help detect semantic rule breaches and test-evidence gaps. They are off by default, use sanitized evidence and reported usage, and cannot approve a candidate or authorize release.

Your provider settings, routes and project notes stay in the private overlay, outside this repository. See [resource setup](tools/swarm-resources/README.md) and [job status](tools/swarm-status/README.md). Resource approval grants no spending or publishing authority. Failed checks or a blocking finding prevent customer release.

Eight skills and small local hooks support the workflow. Read [SECURITY.md](SECURITY.md) before relying on hooks, which run on your machine. BGZFLOW is MIT: Copyright (c) 2026 BGZFLOW contributors. [Attribution](ATTRIBUTION.md).

The finish line is real-platform rehearsal: freeze and run the combined suite once, execute golden journeys and one rollback on the exact target build, then one read-only review per release ID. Only reproduced wrong money, data loss, security/privacy or missing rollback blocks; other findings go after-launch. Repair by rerunning rehearsal, never another review. For customer-visible changes the founder checks the verified build on a phone or capable device as the final step; only their approved-design mismatch blocks on design. Launch small within authority, watch live errors for one hour, fix forward or roll back, then widen. Automatic model updating is off by default while remaining fallback edge cases wait until after launch.

## v0.3 automation

The [testing ladder](docs/testing-ladder.md) makes runners do the tapping: Playwright for web, Maestro on EAS for every mobile candidate, occasional BrowserStack device sampling, and the founder's phone only for the approved-design check. Leads and workers use the [two-way mailbox](docs/mailbox.md) instead of ending a job to ask. The [resource governor](docs/resource-governor.md) protects disk, machine/build slots and thread archives, while [account receipts](docs/account-routing.md) prove which configured route actually ran a job.
