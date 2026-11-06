---
name: openui-generative-surfaces
description: "Choose and implement a useful interactive surface for structured AI results or a product interface, using existing components and the actual user brief."
---

# Choose the useful surface

Start with the user's activity and the host's available display tools. Short answers usually need plain language. Comparisons may suit a table; relationships a diagram; exploration an interactive widget. A visual should help the user make a decision or perform the requested task.

For persistent product interfaces, reuse the approved design and existing components. For structured generated content, compare supported schema-driven renderers such as OpenUI with the project's existing solution. Check the actual version and capabilities before choosing. Do not introduce a framework solely to display one small result.

Keep permissions and business rules in the application's trusted code. Generated UI does not grant authority. Do not expose implementation details, provider names or extra approval gates unless the user's product brief calls for them.

Drive the rendered result in the intended browser or device. Check interaction, accessibility, loading/error states and the real resulting action. A screenshot alone does not prove that controls work.
