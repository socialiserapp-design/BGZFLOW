---
name: how
description: "Explain a codebase, system or process from its real sources, at the depth the user needs."
---

# Explain how it works

Start with the user's question and inspect the relevant source, callers and data flow. For a narrow question, answer directly. For a large system, separate the independent areas and use read-only helpers only when this improves the result within available capacity.

Trace one concrete example through the system. Separate what the source actually does from names, comments and intended behaviour. Verify changing external interfaces against official documentation. Ask a small clarifying question if the desired scope or audience would materially change the explanation.

Lead with the answer in plain language, then explain the important mechanism and consequences. Use a small diagram when it makes the relationships clearer. Cite the relevant evidence and disclose any area not inspected. Do not require an extra explainer agent or a fixed section template.
