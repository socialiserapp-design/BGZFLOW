# Assess review findings

Compare each finding with the actual user request, candidate and relevant callers. Do not accept a conclusion merely because several models repeat it, and do not reject it because it is inconvenient.

For each material issue, verify the triggering input or state, the affected boundary and the consequence. Existing upstream validation may rule out a hypothetical path; cite that validation rather than assuming it. A rare reachable loss or privacy failure can still matter.

Separate observed defects, unresolved evidence and optional improvements. A different design preference is not automatically a release blocker. A clean-looking review is not independent proof that the requested outcome works.

Give the owner a consolidated actionable result. Preserve original failures through targeted repairs. Apply the actual project's release authority and checks; the reviewer cannot create permission or a new universal hold.

Apply [the shared impact ratings](impact-ratings.md) once to the consolidated
finding, not once per reviewer. Keep harm, occurrence, evidence strength and
urgency separate. Resolve disagreement by inspecting the trigger and consequence;
never use a model vote or a multiplied score as a substitute for evidence.
