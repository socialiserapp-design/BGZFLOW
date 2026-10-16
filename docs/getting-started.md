# Getting started: your first ten minutes

BGZFLOW is a free plugin for Claude Code, Codex and Grok. It gives your agent a set of skills (working methods it loads when they apply) and a few small local tools, so an idea in plain English can go through planning, parallel building, one whole-product test and a launch, and be picked up again after a break.

You need your agent's CLI and Node.js 18 or newer. BGZFLOW installs no npm packages.

## Minutes 0 to 2: install

Run the two commands for your host from the [install guide](install.md). It also covers updating and uninstalling. Then start a new agent session so the plugin loads. In Claude Code and Grok the commands appear under `/bgzflow:`. Codex does not load plugin slash commands yet; you ask it to read the command file instead (shown below).

## Minutes 2 to 3: open a project

Open the repository you want to work on in your agent.

BGZFLOW looks upward from where you started for a folder that has `.bgzflow/`, then for one that has `.git`. If it finds neither, the folder you started in is the project. It keeps the project's state in `.bgzflow/` (see "Where things are kept" below).

When you start or continue a project, `bgz setup` runs by itself. It asks you nothing.

## Minutes 3 to 6: ask for something

Say what you want in everyday words. You do not need to name a skill: each one loads when its description fits what you asked. Some examples:

| You say | What loads |
|---|---|
| "I want an app where friends split a bill. Research what exists and show me a clickable prototype." | Plain English Builder: questions, research, a prototype and a buildable plan |
| "Redesign the settings screen and show me a few different looks." | Personal Product Design: eight or more directions, then your pick |
| "Build the plan we agreed." | Finish the Whole Job: workers build every piece in parallel, then one combined product is tested |
| "Carry on where we left off." | Continue My Project: recovers state after a crash, a break or a host change |
| "Check it is ready, then ship it." | Check It Before Release, then Ship and Recover |

For a bigger goal, use the swarm command. It plans, builds every piece in parallel, combines the pieces and tests the whole once:

```text
/bgzflow:swarm Add Apple and Google sign-in, and make sure existing email users keep their accounts
```

In Codex, ask: `Read the installed BGZFLOW commands/swarm.md and run that workflow for this goal: <your goal>`.

The lead asks once which workers and how much usage it may spend. After that it carries on and asks only about real product, money or release decisions. Publishing, store submission and payments always need your explicit say-so.

## Minutes 6 to 7: see what setup saved

Open `.bgzflow/project.json` in your project. `bgz setup` detected how your project builds, tests and lints and saved those commands there, so there is one saved answer to "how do I build, test and lint this?". It does not ask anything. Run `bgz setup` again if your project's commands change: it rewrites the detected commands and keeps anything you put under `manual`.

## Minutes 7 to 10: first useful commands

`bgz` is the command-line tool in the plugin. Run it as `node "<plugin root>/tools/bgz.mjs" <command>`, where the plugin root is the install folder that holds `commands/` and `tools/`. Or ask your agent to run it for you. The examples below write `bgz` for short. `bgz --help` lists every command.

| Command | What it does |
|---|---|
| `bgz setup` | Detects the project's build, test and lint commands and saves them in `.bgzflow/project.json`. Asks nothing. |
| `bgz start-now` | Lists the tasks in the work graph that are planned or ready and whose dependencies are done. |
| `bgz jev plan --plan <file>` | Checks a plan for things nobody asked for, before work is handed out. Advice only. |
| `bgz facts for --brief <file>` | Prints the project's saved facts for the files a brief touches. |
| `bgz facts add --text "..."` | Adds a project fact. Workers can propose facts; the lead accepts them. |
| `bgz lessons status` | Shows recorded lessons: counts and open groups. Add one with `bgz lessons add`. |

Jev is a fast, cheap judge for small questions. If it is unavailable it prints a failure and exits 1. It never blocks work, so carry on and judge by hand.

In Claude Code and Grok you can also use these slash commands:

- `/bgzflow:swarm-status` shows running, stale and finished jobs.
- `/bgzflow:swarm-resources` shows which agents and accounts are available.
- `/bgzflow:startup-check` checks that start-up reading stays short and the checkpoint is in order.
- `/bgzflow:doctor` looks for secrets in URLs and for the context cost of your enabled plugins.

On any host, run the same tools with `node "<plugin root>/tools/<name>/<name>.mjs"`.

## Where things are kept

**In your project: `.bgzflow/`.** This is the project's own state:

- `project.json` holds the build, test and lint commands from `bgz setup`, plus a `manual` section for commands you enter by hand (a manual command wins over the detected one). Running `bgz setup` again keeps `manual` as it is and rewrites the detected parts.
- `facts.json` holds the short per-project facts from `bgz facts`.
- `work-graph.json` holds the work graph the lead hands tasks out from; `bgz start-now` reads it.
- The system map lives in `project.json` (under `system`) and in each work-graph task's `change`. `bgz map` shows it; see [the system map](system-map.md).
- `config.json` holds project settings, such as size limits.
- `lessons.jsonl` holds recorded lessons.
- `rounds.json` holds repair-round history.
- `snapshots/` holds saved copies of project state, and `hooks.log` holds hook output.
- `swarms/` holds one ledger per active swarm (git-ignored).

The project's current state is a one-page `CHECKPOINT.md`, with older history in `ARCHIVE.md` and short `HANDOFF` notes for starting a fresh chat. Treat `.bgzflow/` as private state; see [SECURITY.md](../SECURITY.md).

**On your machine: `~/.bgzflow/`.** This holds your personal settings, which never belong in a project or a public repository:

- `overlay/` (or the folder in `BGZFLOW_OVERLAY`) holds your private notes, routes and project list. The [overlay template](../overlay-template/README.md) shows the files and how to set it up.
- `swarm-policy.json` is your choice of providers for swarms, in your order of preference.
- Jev keeps its own records here, such as its call log.

## What to read next

- [README](../README.md): the full picture, the command table and the safety notes.
- [Install guide](install.md): updating, uninstalling, size limits and the private folders.
- [The swarm gate](swarm-gate.md): usage limits, ownership, retries and release order.
- [Testing ladder](testing-ladder.md): which runner to use for which fault.
- [Mailbox](mailbox.md): how workers ask the lead a question without stopping.
- [Resource governor](resource-governor.md) and [account routing](account-routing.md): protecting disk and build slots, and proving which account ran a job.
- [Host notes](hosts.md): what was checked on Claude Code, Codex and Grok.
- [Lessons](../tools/lessons/README.md): turning repeated problems into tests, hooks and skill edits.
- [Changelog](../CHANGELOG.md): what changed in each version.
