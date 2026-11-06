> BGZFLOW adaptation: use this technical reference only for the current requested outcome. Existing user decisions, actual project architecture and host permissions govern. Numeric examples and aesthetic opinions below are options, not universal rules, new gates or authority to redesign. External products, model weights and licences need current verification before use; none is installed by reading this page. Use the same brief and private project records; do not modify installed learning files.

---
title: MOC-commands
summary: The verbs behind the single entry `/design-engineering [verb] [target]` — one command file per job, each a whole procedure that points into the graph.
tags: [moc, commands, routing]
---

# MOC — Commands

The skill has one entry point. `/design-engineering` reads its first argument, and if that is a verb, it opens the matching file here. The dispatch table at the top of SKILL.md is the canonical index of verbs and aliases. This MOC exists so the graph view shows the cluster.

- [cmd-review](cmd-review.md) — a judge-posture UI review; change-scoped for a diff.
- [cmd-polish](cmd-polish.md) — the screen works but feels unfinished; fixes applied.
- [cmd-motion](cmd-motion.md) — whether it should move, then concrete timing and easing.
- [cmd-tells](cmd-tells.md) — AI-default tells as a deletion list.
- [cmd-a11y](cmd-a11y.md) — an evidence-only accessibility audit.
- [cmd-tokens](cmd-tokens.md) — find the design contract and thread its tokens.
- [cmd-sound](cmd-sound.md) — decide, design, generate and wire a sound family.
- [cmd-svg](cmd-svg.md) — `create`, `animate` or `sticker`.
- [cmd-film](cmd-film.md) — `plan`, `review` or `formats` for a launch film.
- [cmd-stage](cmd-stage.md) — `still`, `demo`, `bento` or `review`: faux product UI, framed first and filmed.
- [cmd-ship](cmd-ship.md) — scoped release preparation using existing authority and real verification.
- [cmd-break](cmd-break.md) — worst-case data until something breaks; reports and stops.
- [cmd-mobile](cmd-mobile.md) — a web app that feels native on a phone.
- [cmd-small](cmd-small.md) — `diagram`, `options` (`riff`, `tune`, `mix`, `keep`), `pick`, `name`, `which`, `agentation`, `pov`.

## Rules for a command file

A command file is a procedure, not knowledge. It names its posture, the nodes to read in order, the steps, the output shape and where to hand off, and it says nothing a node already says. Each one must run on its own, because a skills.sh install has no subagents. A new verb needs a row in the SKILL.md table, a file here and a line in `evals/dispatch.jsonl`, or CI fails.

## Gotcha

A bare `/design-engineering` never auto-runs a verb. It shows the menu and leads with the two or three verbs that fit what is in front of it, the way impeccable's no-argument menu does. Auto-running surprises users, and a wrong guess spends a whole pass.

## Sources

- HKTITAN, the 3.0.0 single-entry migration. Its pattern comes from pbakaus/impeccable's command table and no-argument menu (`SKILL.md`, `reference/routing.md`), and from the Claude Code skills docs (`ARGUMENTS:` is appended when the body has no placeholder; routing belongs in the first 5,000 tokens, which survive compaction).
