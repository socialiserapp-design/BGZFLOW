---
name: research-scout-ground-truth
description: Proactively scout current industry standards, MIT/Apache-2.0 open-source building blocks, and primary ground-truth documentation before planning or coding a slice, then emit a 3-Line Plain-English Advisory when a better practice exists.
---

# Research Scout & Ground-Truth Discovery

Before designing or coding a non-trivial slice, verify current ground truth rather than relying on stale training defaults or hand-rolling solved infrastructure.

## Workflow
1. **Check Context Graph Precedents First:** Run `bgz graph precedent query "<topic>"` and `bgz facts for "<goal>"` to see what was already evaluated or fixed in this project.
2. **Scout Current Industry Standard & Permissive OSS:** Check live official documentation and mature MIT/Apache-2.0 libraries that solve the problem cleanly.
3. **Emit a 3-Line Plain-English Best-Practice Advisory (when a better option exists):**
   - `Why it fits:` 1 plain-English sentence on the concrete user/engineering benefit.
   - `Main trade-off:` 1 plain-English sentence on what it costs or changes.
   - `Core concept:` 1 plain-English sentence explaining the single mechanism that makes it work.
   (Format via `bgz graph advisory --why "..." --tradeoff "..." --concept "..."`.)
4. **Register Ground-Truth Dependencies:** Record material external docs/files in current truth (`bgz engine truth`) and attribution in `SOURCES-AND-REUSE.md`.
