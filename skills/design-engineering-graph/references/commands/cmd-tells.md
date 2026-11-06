> BGZFLOW adaptation: use this technical reference only for the current requested outcome. Existing user decisions, actual project architecture and host permissions govern. Numeric examples and aesthetic opinions below are options, not universal rules, new gates or authority to redesign. External products, model weights and licences need current verification before use; none is installed by reading this page. Use the same brief and private project records; do not modify installed learning files.

---
title: cmd-tells
summary: "/design-engineering tells [target]" — scan UI, code or copy for AI-default tells and return a prioritized deletion list, not a redesign.
tags: [command, anti-patterns, unslop, judge]
---

# /design-engineering tells

Aliases: `unslop`, `slop`. **Posture: judge.** The output is a list of things to delete, not a new visual direction.

## Steps

1. Pick the surface and read only its nodes:
   - a screen or page → [ai-default-tells](../anti-patterns/ai-default-tells.md), [content-authenticity](../anti-patterns/content-authenticity.md)
   - a screenshot → [screenshot-critique](../anti-patterns/screenshot-critique.md)
   - copy, a README or release notes → [copy-tells](../anti-patterns/copy-tells.md)
   - code → [code-tells](../anti-patterns/code-tells.md)
   - a dashboard → [dashboard-tells](../components/dashboard-tells.md)
2. Read [gotchas](../meta/gotchas.md) and [pov](../meta/pov.md). The installer's hard rules outrank the catalog.
3. Run [unslop-pass](../anti-patterns/unslop-pass.md) in its order. Every tell you remove must leave something better behind, because removing tells and leaving a thin screen is its own failure.

## Output

A numbered deletion list, highest impact first. Each item gives what to remove or replace, where it is (file:line or the region of the screen), and the `node (upstream companion; not bundled)` that names the tell. Then one line on what to enlarge or keep, so the screen is not left empty.

## Hand-offs

Propose a new direction only if the user asks after the scan, and then run `options` from [cmd-small](cmd-small.md). You may delegate to the `anti-pattern-scanner` subagent where the host has it.
