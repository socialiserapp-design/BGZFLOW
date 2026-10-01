# Security

## Hooks run code

A BGZFLOW hook is a program the host runs on your machine when something happens in a session, such as a session starting or a command finishing. Review that code before you trust an install or an update.

1. Open `hooks/hooks.json`.
2. Open every program that file names.
3. Install or update only when those files match what you expect.

Hook programs are JavaScript for Node.js 18 or newer. They have no npm dependencies. The host tells a hook where the plugin lives. Claude uses `CLAUDE_PLUGIN_ROOT`, `CLAUDE_PLUGIN_DATA`, and `CLAUDE_PROJECT_DIR`. Codex also sets `PLUGIN_ROOT` and `PLUGIN_DATA`. Grok sets `GROK_PLUGIN_ROOT` and `GROK_PLUGIN_DATA`.

## What stays on your machine

The private overlay (`~/.bgzflow/overlay/`, or the folder in `BGZFLOW_OVERLAY`) holds founder notes, routes, the project list, and `denylist.txt`. The public repository leaves that folder out.

A project's `.bgzflow/` folder holds config, round history, snapshots, hook logs and ignored swarm ledgers/defaults/policy. Treat it as private state. The [swarm gate](docs/swarm-gate.md) is a coordination guard, not a sandbox: it checks recognizable commands and recorded proofs. Non-release internal errors warn and fail open; an active swarm release without established readiness fails closed. Manual records cannot authenticate chat authority or prove honest tests. Ordinary chats and preview builds have no swarm gate restrictions.

`denylist.txt` lists words that the leak check must catch. One word or phrase per line. Lines that start with `#` are comments.

## Reporting a vulnerability

Use the private security advisory for `socialiserapp-design/BGZFLOW`. Describe the version, impact and reproduction. Keep live credentials, tokens and private paths out of public issues.

## Checks in this repository

Continuous integration runs the tests, a manifest drift check, `scripts/leak-check.mjs`, and gitleaks. The leak check scans tracked files, the full git history, and author and committer identities. It flags private keys, common provider tokens, password assignments, email addresses other than noreply addresses, Windows profile paths, and every phrase in the deny list. A match is printed in masked form.

Those checks are a backstop. Review the hooks yourself.
