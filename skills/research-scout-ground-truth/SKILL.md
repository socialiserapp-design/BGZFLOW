---
name: research-scout-ground-truth
description: Proactively discover, download, and adopt existing open-source tools, packages, repos, and primary ground-truth documentation via 4-Channel x 4-Angle Saturation (bgz eval research), Build-vs-Buy (bgz eval architecture), and Skill Forge (bgz skill-forge) so you never build from scratch what can be discovered and downloaded.
---

# Research Scout, 4x4 Open-Source Discovery & Build-vs-Buy Engine

Before designing or coding any non-trivial feature, workflow, or research deliverable, verify whether an existing permissive open-source tool, library, CLI, or reference implementation can be **discovered, downloaded/installed, or forged into a skill** instead of built from scratch.

## Mandatory Workflow

1. **Check Context Graph Precedents & Project Facts First:**
   - Run `bgz graph precedent query "<topic>"` and `bgz facts for "<goal>"` to reuse what was already evaluated, downloaded, or fixed in this project.
2. **Run 4-Channel x 4-Angle Open-Source & Research Discovery (`bgz eval research`):**
   - Never rely on a single keyword search. Search across all **4 Channels**:
     1. `github` (GitHub code, repositories, trending topics, issues/discussions)
     2. `social_dev` (X/Twitter developer threads, release announcements, engineering blogs)
     3. `community_forums` (Hacker News, Reddit, specialized developer/domain forums)
     4. `registries_or_papers` (npm, PyPI, crates.io, Go pkg, arXiv, official specs/statutes)
   - Across all **4 Query Angles**:
     1. `problem_symptom` (how users describe the pain point)
     2. `mechanism_architecture` (the underlying algorithm, protocol, or data structure)
     3. `ecosystem_alternatives` (`"alternatives to X"`, `"awesome-<topic>"`, comparison benchmarks)
     4. `recent_breakout` (newly released 2025–2026 tools, libraries, and models)
   - Verify saturation with `bgz eval research --channels github,social_dev,community_forums,registries_or_papers --angles problem_symptom,mechanism_architecture,ecosystem_alternatives,recent_breakout --candidates <count> --saturated true --disconfirming true`.
3. **Enforce Build-vs-Buy (`bgz eval architecture`) & Download/Forge Instead of Reinventing:**
   - If a mature permissive open-source package or tool (`MIT`, `Apache-2.0`, `BSD`) solves the capability, **download/install it or wrap it** rather than writing custom code from scratch.
   - If an open-source repo, paper, book, or teardown teaches a reusable workflow or architecture pattern, turn it into a permanent skill with `bgz skill-forge --name <slug> --from-source|--from-paper|--from-video|--from-book|--from-rea <target>`.
4. **Emit a 3-Line Plain-English Best-Practice Advisory (`bgz graph advisory`):**
   - `Why it fits:` 1 plain-English sentence on what existing open-source tool/standard we can download or use instead of building from scratch.
   - `Main trade-off:` 1 plain-English sentence on what it costs or changes.
   - `Core concept:` 1 plain-English sentence explaining the single mechanism that makes it work.
5. **Register Ground-Truth Dependencies:**
   - Record material external docs/repos in current truth (`bgz engine truth`) and license attribution in `SOURCES-AND-REUSE.md`.
