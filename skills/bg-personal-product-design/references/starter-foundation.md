# Starter foundation: proposed tokens and one resolved palette

These values are proposals for a new direction. They are not approved product tokens and never a house default. Use them only inside an explicitly proposed direction or a newly approved identity. A product's recorded decisions and approved tokens always win ([identity authority](design-contract.md#identity-authority)). Record the values you adopt in the [token and source template](design-contract.md#token-and-source-template) with `classification: proposal`.

## Proposed scales

- **Spacing:** `0, 2, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96`. Card padding compact, comfortable and spacious `12/16/24`; related-item gap `12`, group gap `24`.
- **Type (size/line/weight):** caption `12/16/400`, label `14/20/600`, body `16/24/400`, section `20/28/600`, title `28/36/600`, display `40/48/700`. Map web text to rem and use native scalable type. Confirm font rights and fallbacks before use.
- **Shape (control/card/panel):** sharp `4/8/12`, balanced `8/16/24`, soft `12/24/32`; pill `999` only where it suits the element. Derive nested corners from the actual inset: inner radius = `max(0, outer radius − inset)`.
- **Motion:** feedback `120ms`, quick `140ms`, standard `240ms`, enter `300ms`, exit `180ms`, easing `cubic-bezier(0.2, 0, 0, 1)`; optional press scale `.98`. Reduced motion uses static feedback. Other sources use other press scales (for example `.96` or `.97`); record which source you used and never claim that different sources agree.
- **Elevation:** light card `0 2px 8px rgb(22 36 50 / .08)`, floating `0 8px 24px rgb(22 36 50 / .14)`, modal `0 24px 64px rgb(22 36 50 / .20)`. Dark equivalents use alpha `.20/.32/.45` plus tonal separation. Translate shadows into native APIs instead of pasting CSS shadows into native styles.

Numbers without CSS units in native files are logical layout values; text must still scale.

## One resolved proposal: Porcelain Workbench

A fully resolved light and dark proposal, never a default.

| Semantic role | Light | Dark |
|---|---|---|
| canvas / surface / inset | `#F6F7F9 / #FFFFFF / #EDF0F4` | `#121820 / #1B2530 / #0E141B` |
| text / muted | `#17212B / #52606D` | `#F4F7FA / #B0BDCA` |
| control border / focus | `#667788 / #1457CC` | `#8096AA / #8BB8FF` |
| accent / hover / pressed / onAccent | `#1457CC / #1048AC / #0B3B91 / #FFFFFF` | `#8BB8FF / #A6C8FF / #72A5FA / #09204A` |
| success / warning / danger | `#146C43 / #8A4B00 / #B42318` | `#77DBA8 / #F5C56C / #FFADA5` |
| disabled fill / text | `#E5E7EB / #657080` | `#2A3541 / #8795A4` |

Computed from these hex values with the WCAG relative-luminance formula (opaque pairs only): text and muted on canvas, surface and inset reach at least 5.65:1; onAccent on accent, hover and pressed at least 6.43:1; success, warning and danger on canvas and surface at least 6.02:1; control borders at least 4.03:1 and focus at least 6.00:1. Hex arithmetic is not a rendered measurement, so measure again on the real composite.

Resolve values in this order: quality policy → identity and mode → component role → platform → accessibility override. Reference semantic roles instead of scattering raw hex values, and keep the brand accent separate from success.

## Craft notes

- **Measure contrast on the real composite.** Check colour against the actual rendered background and context, including transparent glass over its worst-case backdrop. Apply the thresholds in the [surface checklists](design-contract.md#surface-checklists). Measure afresh and record the tool and result; never copy a source's approximate contrast comment as a new measurement.
- **A failing source pair is evidence, not a recipe.** For example, white text on a mid-teal brand colour measuring about 3.0:1 stays source evidence, not an accessible normal-text recipe. When a contrast correction changes locked values, route it through the approved-look change decision.
- **Never transplant another product's skin.** Values extracted from another product are source facts, not permission to reuse them. Start each product from its own directions and decisions.
- **Bind typography to shipped assets.** Check actual component imports and bundled font files before asserting a running screen's typography. A theme's system-font aliases and a design file's font roles are not universal font approvals.
- **Supplement instead of rewriting.** When a source lacks a layer (for example elevation), supplement it from a named, recorded source and leave the original unchanged.
- **Treat sources as read-only inputs.** Read the exact source (path and hash) before adapting it. A reference kit's proposals carry no product approval, and references are research inputs, not runtime dependencies to install.
