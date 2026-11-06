> BGZFLOW adaptation: use this technical reference only for the current requested outcome. Existing user decisions, actual project architecture and host permissions govern. Numeric examples and aesthetic opinions below are options, not universal rules, new gates or authority to redesign. External products, model weights and licences need current verification before use; none is installed by reading this page. Use the same brief and private project records; do not modify installed learning files.

---
title: cmd-review
summary: "/design-engineering review [file | selection | diff | PR]" — a judge-posture UI code review returned as the Before | After | Why table, scanned against the checklist; change-scoped when the target is a diff.
tags: [command, review, judge]
---

# /design-engineering review

**Posture: judge.** Read and report. A review-only request remains read-only. Existing authority to repair is not cancelled by this reference; do not require the user to ask again after a table.

## Target

The selection, the files named, or the current diff. A branch, pull request or uncommitted change is a **diff**, not a screen. With no target and no selection, ask for one in a single line.

## Steps

1. Read [review-format](../meta/review-format.md), [review-checklist](../meta/review-checklist.md), [gotchas](../meta/gotchas.md) and [pov](../meta/pov.md), in that order. The installer's files outrank the checklist.
2. For a diff, also read [change-scoped-review](../meta/change-scoped-review.md). Review only the surfaces the diff touches, read the removed lines, add a Status column (Introduced / Regression / Pre-existing), and include material pre-existing findings separately without an arbitrary count cap.
3. Quote the real lines into Before, and never paraphrase them. Apply relevant checklist criteria to the actual scope; report concrete observed defects, not every irrelevant row.
4. End each Why with the `node (upstream companion; not bundled)` that owns the principle. If you cannot name the node, drop the row.
5. Order findings by actual impact, distinguish blockers and optional improvements, and preserve all consequential findings. A concise summary can point to supporting detail without dropping issues to meet a count.

## Output

1. **A verdict on the first line**, which is one of:
   - **Blocked**: at least one interaction or accessibility-floor failure.
   - **Approve with changes**
   - **Ship it**
2. **The table.** Rank rows in this order: interaction, accessibility floor, layout stability, motion, spacing, type, surface, component API, performance, polish. Group them under **Blocking**, **Should fix** and **Nits** when there are more than three.
3. **A one-line lede** if the issues share a theme.

Every row names its owning node, so "fix it" can route to that node. If nothing fails, the verdict is "Ship it" with one sentence of reason; nothing to change is a valid review.

## Hand-offs

- Motion is most of the problem → run [cmd-motion](cmd-motion.md) instead.
- "Does this look AI-made?" → [cmd-tells](cmd-tells.md).
- A rendered film → [cmd-film](cmd-film.md) `review`.
- The whole app before launch, not one diff → [cmd-ship](cmd-ship.md). Review judges a change; ship checks every lane and fixes as it goes.
- Where the host has the `ui-reviewer` subagent (Claude Code plugin install), you may delegate to it with this file as the brief. Otherwise do it inline: this file is the whole procedure.
