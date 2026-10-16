# BGZFLOW private overlay

The public BGZFLOW pack is generic. Your overlay holds what is personal to you: your standing decisions, your providers and accounts, and your projects. Agents read it from `$BGZFLOW_OVERLAY`, else `~/.bgzflow/overlay/`. Keep it in a private folder or a private repository, never in a public one.

## Files

| File | Holds |
|---|---|
| `FOUNDER.md` | Your cross-project decisions, directions and preferences, each with a stable ID and date. |
| `ROUTES.md` | Which provider and account alias plays each role (lead, worker, independent checker), and any special authority. Fill each route with the public `templates/ROUTES.md` card. |
| `PROJECTS.md` | Your projects, paths, owners, approved looks and holds. |
| `denylist.txt` | Private strings that must never appear in public files: names, emails, handles, company and product names, domains, local paths, account aliases. One per line, no blank lines. |

## Rules

- The overlay adds preferences and routes. It never weakens a safety rule in the pack.
- Secrets never go in the overlay. Refer to them by name (a password-manager item or an environment variable name).
- Decisions that belong to one project go in that project's `DECISIONS.md`; cross-project ones go in `FOUNDER.md`.
- Take dates and timestamps from the system clock.
- Keep IDs stable. A later entry supersedes an earlier one by ID; keep both.

## Set up

1. Copy this folder to `~/.bgzflow/overlay/`, or anywhere private and set `BGZFLOW_OVERLAY` to it.
2. Fill in the files and delete the fictional example lines.
3. Before you publish anything, check public folders against the denylist. A blank line in the denylist matches everything, so keep none:

```sh
grep -rniF -f "${BGZFLOW_OVERLAY:-$HOME/.bgzflow/overlay}/denylist.txt" <public folders>
```

No output means no private string was found.
