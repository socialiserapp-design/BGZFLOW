# Relevant review questions

This BGZFLOW-authored reference supports the current review scope. Select applicable questions rather than filling every category.

- Intent: does the change implement the user's current result without extra features or restrictions?
- Correctness: do real callers reach the intended behaviour, including meaningful boundary and error cases?
- Data and effects: are ownership, persistence, cancellation, retry and concurrency correct? Reconcile an uncertain operation before repeating it.
- Trust: are permissions, tenant boundaries, private information and untrusted inputs handled by actual controls?
- Compatibility: do existing clients, saved data, provider interfaces and supported platforms still work?
- Reuse and structure: does an existing maintained option meet the need? Does the interface make the expected operation understandable without incidental complexity?
- Verification: do checks observe the actual candidate and user effects, and can they reject a realistic wrong result?
- Non-code impact: could unsupported claims, misleading omissions, wrong calculations, outdated sources or private data lead a reader or recipient to a harmful action?
- Recovery: is the authorised deployment reversible where required, including data compatibility and in-flight operations?

Trace any claimed defect to a reachable path and practical consequence. Separate unsupported assumptions from evidence. Neither an issue count nor a green test summary settles the review.

Use [the shared impact ratings](impact-ratings.md) to describe harm and occurrence
separately. Retain unknowns and context rather than inventing percentages.
