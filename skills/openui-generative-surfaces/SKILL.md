---
name: openui-generative-surfaces
description: Route UI work across the 2x2 Generative UI & Interactive Surface Matrix (deterministic app chrome vs schema-driven OpenUI generative cards, comparison tables, approval gates, and interactive artifacts).
---

# OpenUI & Generative Surfaces

Use the 2x2 UI surface routing matrix so every user-facing response uses the highest-leverage visual surface without sacrificing deterministic layout or design taste.

## 2x2 Surface Routing Matrix
1. **Core App Chrome & Persistent Workspaces:** Deterministic React/HTML components governed by `LOCKED_IDENTITY` and `bgz taste`.
2. **Structured Dynamic Agent Outputs (Comparisons, Plans, Cost/Risk Previews, Approvals):** Schema-validated generative UI blocks (OpenUI Lang / structured component schemas) rendered inside the conversation stream.
3. **Interactive Explorers & Visual Walkthroughs:** Self-contained interactive widgets or sidecars when the user benefits from direct manipulation.
4. **Short Status Replies:** Concise plain English (<=5 lines, zero internal IDs, paths, hashes, or raw logs).

## Verification
- Always verify rendered UI on the real browser surface (`control-ui`) and run `bgz taste anti-slop` before handing back a UI slice.
