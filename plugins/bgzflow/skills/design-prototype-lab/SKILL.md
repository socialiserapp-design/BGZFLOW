---
name: design-prototype-lab
description: Build meaningful interactive design alternatives behind a live accessible variant picker, using Emil Kowalski's prototype procedure and concrete harness implementation. Use when a visual or interaction choice needs comparison before integrating the chosen direction.
---

# Interactive design comparison

Reuse the current brief, answered questions and approved look. This complements the existing logic-versus-UI prototype skill: it contributes an actual comparison picker, replay behavior and promotion procedure. Do not create a second harness when the project already has one that answers the decision.

Read [the detailed procedure](references/PROCEDURE.md) before constructing the comparison. State the unresolved decision and each genuinely distinct axis: layout, density, hierarchy, interaction or motion. The number of alternatives follows the decision and the user's request, with no fixed quota or maximum. If the direction is already chosen, implement it rather than reopening it.

Build an isolated project route or self-contained HTML surface appropriate to the current stack. Keep production imports and real customer data out of the experiment. Use realistic synthetic content; label simulated submissions and effects. No real payment, remote write or production integration follows from a prototype request alone.

Load [picker markup, CSS and wiring](references/PICKER.md) when building the harness. It provides active-state highlighting, URL selection, replay, keyboard controls and an instant full-size variant swap. Adapt it for safe areas, contrast, zoom, focus and framework state; never insert untrusted HTML or let the picker hide the work. Scope shortcuts to the comparison context and preserve text editing. Invalid URL selections must fall back safely.

Run the actual surface and check every offered variant's interaction, keyboard behavior and relevant mobile viewport. Explain where each alternative fits, its main cost and what the comparison does not prove. Honor the user's choice; integrate the selected direction when authorized. Preserve prototypes and failed evidence unless cleanup is explicitly authorized and the exact owned paths have been checked. Do not manufacture a preference or introduce extra approval gates for work already authorized.

See [pinned upstream source and adaptations](SOURCE.md). This is an MIT-licensed method and reference harness; it needs no external design account or remote model service beyond the user's existing agent. Runtime/browser verification remains necessary.
