> BGZFLOW adaptation: use this technical reference only for the current requested outcome. Existing user decisions, actual project architecture and host permissions govern. Numeric examples and aesthetic opinions below are options, not universal rules, new gates or authority to redesign. External products, model weights and licences need current verification before use; none is installed by reading this page. Use the same brief and private project records; do not modify installed learning files.

---
title: cmd-break
summary: "/design-engineering break [component | screen]" — feed one piece of UI the realistic worst case behind a dev-only toggle, report every break as Broken / Ugly / Fragile with the fix, then stop; fixes follow the actual task’s existing authority.
tags: [command, testing, worst-case, judge]
---

# /design-engineering break

Aliases: `worst-case`, `break-ui`. **Posture: adversary, then judge.** Use an existing authorised fixture or test path to expose realistic failures. A read-only review reports findings without edits; an already authorised repair may fix its scoped findings without another approval ritual.

## Target

One component or screen. A whole app is narrowed to the piece with the most user-authored data; say which and offer the rest as follow-ups. With no target, ask for one in a single line.

## Steps

1. **Map.** Read [stress-scenarios](../meta/stress-scenarios.md) and the component. List every value it renders — counts, timestamps, badges, labels from data, avatars, the list's own length — with its source, its limit from the schema, migration, API type or `maxLength`, and whether it's optional. No limit is written as "unbounded", and that's already a finding.
2. **Build the worst case.** One fixture shaped like the existing demo data, failures spread across the first rows rather than piled into row 1. Every value plausible or at the real limit, never keyboard mash. Include relevant empty, single-item and realistic large-data cases when the task needs them; 1,000 rows is an example, not a compulsory fixture.
3. **Wire the toggle.** Swap fixtures at the data boundary, never by editing markup. Prefer the existing test harness. Add an isolated development-only fixture control only when necessary within the authorised work; no new customer control, URL mode or HTML file is required.
4. **Break it.** Check at the real container width, 320px and the widest layout; at 200% zoom; under `dir="rtl"` and in dark mode if the product ships them. Match each break against the failure-signature table in [stress-scenarios](../meta/stress-scenarios.md) and the truncation rules in [line-behavior](../typography/line-behavior.md). Say which findings were seen in a screenshot and which were inferred from CSS.
5. **Report or repair according to the request.** Use existing records and reconcile any owned test process before handback. Apply already authorised scoped fixes using the project's conventions, then flip through *every* state again, Demo included, so a worst-case fix can't regress the happy path. Keep the fixture; remove only the toggle when asked.

## Output

1. **What broke** — a table: # · Severity (Broken = unreadable, unreachable or wrong data; Ugly = readable but visibly off; Fragile = fine until one realistic step more) · Field · Worst-case value · What happens · Fix with `file:line`. Worst first.
2. **Decisions for you** — breaks with more than one right answer (wrap or truncate, what an empty role shows, paginate or virtualize), one line each with a recommendation.
3. **What held up** — the cases already handled, so the test reads as real.

Close with the toggle's URL or path, its states, and "Say `fix all` or `fix 1, 3`."

## Hand-offs

- Taste and polish rather than robustness → [cmd-review](cmd-review.md) or [cmd-polish](cmd-polish.md).
- Overflow or layout root causes → [growth-and-overflow](../layout/growth-and-overflow.md); RTL → [logical-properties-rtl](../layout/logical-properties-rtl.md); copy, plurals and dates → [strings-and-locale](../components/strings-and-locale.md); missing empty or loading states → [empty-loading-states](../components/empty-loading-states.md).
- Undecided between directions, not stress-testing one → [prototype-picker](../meta/prototype-picker.md).
