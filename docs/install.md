# Install

BGZFLOW installs from [socialiserapp-design/BGZFLOW](https://github.com/socialiserapp-design/BGZFLOW). The plugin name is `bgzflow`; the current version is in `VERSION`.

Hooks and tools need Node.js 18 or newer and install no npm packages. The notes map needs Python 3.10 or newer (standard library only).

Twelve tools (`bg-heavy`, `bg-mail`, `bg-governor`, `bg-route`, `bg-swarm`, `bg-rounds`, `doctor`, `notes-map`, `startup-check`, `swarm-resources`, `swarm-status`, `swarm-gate`) come with the plugin. Claude Code and Grok offer them and the swarm workflows as slash commands. Every host can use `node "<plugin root>/tools/<name>/<name>.mjs"`; POSIX/Git Bash users can add `tools/bin` to PATH. See [the swarm gate](swarm-gate.md) for required non-Claude checks, model policy and private state.

Checked against the installed CLIs on 2026-09-29. Command evidence is in [hosts.md](hosts.md).

## Claude Code

Install:

```shell
claude plugin marketplace add socialiserapp-design/BGZFLOW
claude plugin install bgzflow@bgzflow
```

Update:

```shell
claude plugin marketplace update bgzflow
claude plugin update bgzflow@bgzflow
```

Uninstall:

```shell
claude plugin uninstall bgzflow@bgzflow
claude plugin marketplace remove bgzflow
```

The default scope is your user account. Add `--yes` to skip the uninstall prompt. The CLI also accepts a local marketplace directory, but the current entries still fetch the public repository. The recorded local install tests used the earlier local-source tree.

## Codex

Install:

```shell
codex plugin marketplace add socialiserapp-design/BGZFLOW
codex plugin add bgzflow@bgzflow
```

Update:

```shell
codex plugin marketplace upgrade bgzflow
```

Uninstall:

```shell
codex plugin remove bgzflow@bgzflow
codex plugin marketplace remove bgzflow
```

The CLI also accepts a local marketplace directory; current entries still fetch the public repository. Recorded local install tests used the earlier local-source tree.

## Grok

Install:

```shell
grok plugin marketplace add socialiserapp-design/BGZFLOW
grok plugin install socialiserapp-design/BGZFLOW
```

Grok installs the repository itself. Update and uninstall use the plugin name:

```shell
grok plugin update bgzflow
grok plugin uninstall bgzflow
```

Add `--confirm` to `grok plugin uninstall` when you want to skip a prompt. `--keep-data` leaves the plugin's local data in place. The help text also accepts a local directory. That install was not run here, because this Grok CLI has no separate home switch.

## Files on your machine

The private overlay is `$BGZFLOW_OVERLAY` when that variable is set. Otherwise it is `~/.bgzflow/overlay/`. It holds `FOUNDER.md`, `ROUTES.md`, `PROJECTS.md`, and `denylist.txt`. Keep it on your machine. The public repository leaves it out.

Each project can keep a `.bgzflow/` folder:

- `config.json` for project settings
- `rounds.json` for round history
- `snapshots/` for saved project state
- `hooks.log` for hook output

The visible project memory is a one-page `CHECKPOINT.md`, older history in `ARCHIVE.md`, and handoffs in `HANDOFF` files.

Two tools keep machine-wide state outside any project:

- `bg-heavy` keeps its queue in `bgzflow/heavy` under `%LOCALAPPDATA%` on Windows, or under `~/.cache` elsewhere. `BG_HEAVY_DIR` moves it, `BG_HEAVY_SLOTS` sets how many heavy runs may share the machine, and `BG_HEAVY_PRIORITY` sets their priority.
- `bg-mail` keeps provider-neutral lead/worker messages under `$XDG_STATE_HOME/bgzflow/mail` (or `BG_MAIL_DIR`).
- `bg-swarm` keeps its worker registry in `bgzflow/swarm` under `%LOCALAPPDATA%` on Windows, or under `$XDG_STATE_HOME` (default `~/.local/state`) elsewhere. `BG_SWARM_DIR` moves it.

These environment variables override the same keys in `.bgzflow/config.json`. The defaults are:

| Variable | Default |
| --- | --- |
| `BGZFLOW_CHECKPOINT_KB` | 8 |
| `BGZFLOW_HANDOFF_KB` | 2 |
| `BGZFLOW_BIG_READ_KB` | 64 |
| `BGZFLOW_CHAT_MB` | 15 |
| `BGZFLOW_STARTUP_WORDS` | 3000 |

## After you install

Open any existing repository and start `/swarm <goal>`. Claude Code/Grok use `/bgzflow:swarm <goal>`. Codex does not load plugin slash commands: ask the agent to read the installed `commands/swarm.md` and follow it for your goal.

Choose worker resources once. A small qualifying job proves an approved route before real work; installation or a saved login is insufficient. The lead records limits/reserve, builds all pieces, then integrates, tests whole and independently checks. Publishing and spending need explicit authority. See the [README](../README.md) and [measured evidence](proof.md).

Read [SECURITY.md](../SECURITY.md) before you rely on hooks. Hook programs run on your machine.

## Local install rehearsal and undo

Before live cutover, copy the configuration that installation can change into disposable Claude and Codex homes. Keep credential stores, sessions and running jobs untouched. Save a private byte-for-byte backup of those copies. Point `CLAUDE_CONFIG_DIR`, `CODEX_HOME` and the child process home at the copies; install from a local marketplace pinned to the frozen candidate. Read the installed `AGENTS.md`, BG Efficiency and checkpoint chain, then run startup-check. Exercise installed hooks with an isolated ledger: refused dispatch, allowed dispatch, one-review limit, refused repair review, refused unrehearsed release and allowed exact-SHA passing rehearsal with no reproduced blocker.

UNDO removes the installation from the copies through native uninstall/remove, then restores the backed-up configuration tree. Compare the complete copied file/directory inventory and file bytes with the baseline. A successful uninstall alone does not prove exact restoration. Do not run these steps against live homes during a rehearsal. Existing global startup shims, bg-* skill aliases, live swarm commands/scripts and account-bound route/model policy need reconciliation by the installation owner; plugin discovery alone does not replace them. A session-start clock hook is not evidence that an agent read a skill body.
