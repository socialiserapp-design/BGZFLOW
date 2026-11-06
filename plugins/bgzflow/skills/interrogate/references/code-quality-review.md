# Review implementation quality

Use this BGZFLOW-authored lens for the affected change, not as authority to redesign an unrelated system.

Trace a real caller through the implementation. Check whether state, validation and failure ownership are clear, whether existing packages and shared helpers were considered, and whether the chosen boundary hides useful complexity. A line count, cast, wrapper or extra branch is a clue to inspect, not an automatic defect.

For a proposed simplification, show the concrete complexity or failure it removes and the behaviour it must preserve. Avoid replacing working code merely because another design is possible. Distinguish a demonstrated reliability or maintainability problem from a preference.

Check tests at the boundary that matters. Include real effects, cancellation, concurrency and recovery where the change can affect them. Do not prescribe every possible test or force a new framework.

Report consequential findings with reachable trigger, affected code, practical consequence and a proportionate correction. Review-only work does not authorise implementing that correction. Zero findings is a valid outcome.
