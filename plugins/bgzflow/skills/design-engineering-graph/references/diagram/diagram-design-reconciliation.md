> BGZFLOW adaptation: use this technical reference only for the current requested outcome. Existing user decisions, actual project architecture and host permissions govern. Numeric examples and aesthetic opinions below are options, not universal rules, new gates or authority to redesign. External products, model weights and licences need current verification before use; none is installed by reading this page. Use the same brief and private project records; do not modify installed learning files.

---
title: diagram-design-reconciliation
summary: Where diagram-design, a project's .design contract and this graph give different values for a figure (skin source, paper, families, accent, component tokens, small type, motion clock, export, pov) and which value to use inside a diagram-design file.
tags: [diagram, diagram-design, precedence, companions, design-file]
---

# diagram-design reconciliation

The user’s current request and approved design govern. A selected diagram tool’s real API or file-format constraints matter for operation, but its style rules and linter preferences do not gain authority merely because scripts check them. The project's design contract supplies the skin: the color roles and the type families. This graph owns three things: whether to draw at all ([diagram-decision](diagram-decision.md)), whether the figure moves ([animation-decision-framework](../motion/animation-decision-framework.md)), and the review ([diagram-craft](diagram-craft.md)). Where two of these give different values, the table names the one to use.

## Precedence

Current user instruction and host permissions → applicable project decisions → the requested output and actual supported tool constraints → relevant method guidance. A historical `.design` or profile is evidence of a decision only while that decision still applies. A `.design` outranks every generic taste skill ([using-design-file](../meta/using-design-file.md)), and diagram-design's shipped style guide is one: its defaults are taste, not the project's brand.

## The handoff

diagram-design's first-run gate asks where the skin comes from. Its own discovery reads CSS, token JSON, Markdown and HTML `<style>` blocks. A `.design` file is YAML, and none of its patterns match it. So read the contract here ([using-design-file](../meta/using-design-file.md), or spawn [design-md-consumer](https://github.com/AgentsORG/design-engineering/blob/dbbe43b5e17c7525409ad4905b3857852cd5174d/agents/design-md-consumer.md)), map it onto the roles `paper`, `paper-2`, `ink`, `muted`, `soft`, `rule`, `accent`, `accent-tint` and `link`, and answer the gate with option (d), pasted tokens. Then offer to save a named profile. Write the `.diagram-design` marker (`profile: <slug>`) only with consent, as diagram-design's own rules require.

## The table

| Topic | diagram-design | Contract or this graph | Use inside a diagram-design file |
|---|---|---|---|
| Paper | warm-neutral, never pure white; URL onboarding swaps `#ffffff` for `#fafaf7` and asks | the contract's surface token | the contract's surface, white included; the contract is the confirmation it asks for |
| Families | Instrument Serif for title and callouts, Geist 600 names, Geist Mono technical text; keep the serif even when the brand is all-sans; never JetBrains Mono | the contract's typography | the contract's families in those role slots; the serif only if it fits an approved choice; silence does not establish a font preference; mono stays for technical text, in the contract's mono |
| Accent | one accent, on 1–2 elements | the contract's signature color | the contract's accent in the `accent` role; the 1–2 limit still holds |
| Component tokens (radius, elevation, padding) | node `rx` 6, no shadows | bind to the components that list them | not mapped: a figure node is not a contract component; no shadows |
| Small type | names 12, sublabels 9, arrow labels 8 on doc presets; 16 / 12 / 12 on slides | below 12px needs an excuse ([line-behavior](../typography/line-behavior.md)) | diagram-design's ramp, in SVG units held at the viewBox width; a figure scaled below that width is a finding, and so is the doc ramp on a projected slide |
| Motion | static by default; `reveal` runs once, `step` waits for the reader; clock 160 / 480 / 720 ms, ease `cubic-bezier(.2,.8,.2,1)`, ≤8 steps, ≤24px travel; the controller copied verbatim | UI under 300 ms ([duration-table](../motion/duration-table.md)) | diagram-design's clock: a 480 ms step is reading pace, not UI feedback, so don't flag it against the duration table; this graph still decides whether to animate |
| Reduced motion | the complete static frame, controls hidden | [prefers-reduced-motion](../motion/prefers-reduced-motion.md) | the same; no conflict |
| Export | manual only; `export_svg.py` carries class CSS and namespaces `<defs>` ids | [svg-creation](../svg/svg-creation.md)'s SVGO pass | export with `export_svg.py` only when asked; SVGO afterwards keeping `viewBox`, `<title>` and `<desc>` |
| [pov](../meta/pov.md) | none | the user’s current approved product decisions govern | a figure follows contract → profile → diagram-design; use the actual brief or resolve a consequential missing choice; no author-specific brand defaults apply |

## When to apply

Any diagram-design figure in a project that ships a `.design`, a DESIGN.md or a `.diagram-design` marker, and any review of such a figure by [ui-reviewer](https://github.com/AgentsORG/design-engineering/blob/dbbe43b5e17c7525409ad4905b3857852cd5174d/agents/ui-reviewer.md) or [motion-auditor](https://github.com/AgentsORG/design-engineering/blob/dbbe43b5e17c7525409ad4905b3857852cd5174d/agents/motion-auditor.md).

## Gotcha

Don't let diagram-design's defaults pose as the brand. Its shipped tokens (paper `#f5f5f5`, ink `#2d3142`, accent `#eb6c36`) trigger the first-run gate for a reason, and skipping the gate in a branded project ships someone else's palette. The reverse also happens: re-skinning the connector rules or the type ramp "to match the brand" breaks the checks diagram-design runs on them. The brand reaches the color roles and the families, and nothing else. diagram-design moves fast (plugin 2.6.68 on 2026-10-08), so re-read the named file before relying on a row.

## Sources

- Cathryn Lavery, `diagram-design` (MIT; HEAD `f4547ee`, read 2026-10-08): SKILL.md §0 (style-guide gate), §5, §10, §12; `references/style-guide.md` (roles, constraints), `onboarding.md` (§ Skill, § Folder, option d), `profiles.md` (marker, consent), `output-spec.md` (type ramp per preset), `animation.md` (modes, clock, controller), `export.md`.
- AgentsORG `.design` spec §5 (precedence); this repo's `templates/design-engineering.design`.
