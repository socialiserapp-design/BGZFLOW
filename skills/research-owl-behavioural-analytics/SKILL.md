---
name: research-owl-behavioural-analytics
description: "Read funnels, retention curves, and event data as a designer — separating a design problem from a tracking artefact. Use when handed product data you did not design and asked why people drop off."
---
# Behavioural Analytics

Use this method only for the current research question. Reuse the existing brief, applicable user answers and private records; several selected methods contribute to one investigation, not repeated interviews. Inspect permitted actual evidence and preserve source links. Do not invent participants, quotations, emotions, findings, measurements or approvals; mark hypotheses and missing data explicitly. Planning a study does not authorise recruitment, messages, recording, tracking installation, spending, account changes or product changes. The current task and host permissions govern; shared automatic records are not proof that a study ran.
## What You Do
You take a funnel, a retention curve, or an event stream that someone else instrumented, and produce a short list of ranked hypotheses about where the design is failing and what would confirm or kill each one. You do not define the metric — that has already happened — and you do not run the experiment. You decide what is worth looking at next.
## Before You Trust the Number
Surprising numbers can reflect measurement, population or product changes. Investigate these explanations before treating a design hypothesis as supported:
- **The event does not mean what its name says.** `checkout_completed` may fire on render, not on payment. Read the tracking definition, not the label.
- **The denominator moved.** A conversion drop with a flat numerator may reflect acquisition mix, measurement or product changes. Inspect their timing and relevant segments; the arithmetic alone does not rule out a design problem.
- **The step is not a step.** Funnels imply an order the product does not enforce. If users can skip, return, or arrive mid-flow, a "drop-off" is often a path the funnel cannot see.
- **A release, a holiday, or a campaign lands on the same date.** Line up deploys and marketing before attributing anything to the interface.
- **The platform split is hiding the effect.** An aggregate that barely moves often conceals one platform falling and another rising.
Passing these checks does not establish causality. Tracking defects and interface failures can coexist; retain competing hypotheses until observations separate them.
## Reading the Shape
The shape carries more meaning than the value:
- **A cliff at one step** — investigate blocking requirements, errors, missing information and tracking gaps; shape alone does not identify the cause.
- **A slope across many steps** — investigate cumulative burden, segments and missing events; the curve does not prove excessive length or exclude a blocker.
- **Retention that falls then flattens** — a retained cohort may exist; inspect event definitions, observation windows, survivorship and segments before attributing early loss to onboarding.
- **Retention that keeps falling** — investigate value, lifecycle, cohort maturity and acquisition mix. The curve alone cannot show that onboarding fixes are futile or the value proposition is wrong.
- **A bimodal time-on-task** — investigate different tasks/populations, interruptions and tracking artefacts. Two peaks do not establish two populations; examine observations and relevant segments before selecting a design response.
## From Shape to Hypothesis
A hypothesis is only useful when it forbids something. "Users are confused at step three" forbids nothing. "Users abandon at step three because the address form rejects valid non-UK postcodes" predicts a specific error rate in a specific segment, and dies cleanly if that rate is flat.
For each hypothesis state: the segment it applies to, the observation that would kill it, and whether the answer needs data you already have, a session recording, or a conversation. Rank by how cheaply each can be killed, not by how likely you think it is.
## Best Practices
- Compare relevant segments with the aggregate; a mean can conceal variation without implying that everyone behaves alike
- Say how confident you are and why, in the same breath as the finding
- Prefer the smallest cohort that still answers the question — big numbers hide the mechanism
- Do not read a step change from a chart without checking what shipped that week
- Do not treat a statistically significant difference as a large one; ask what it is worth before designing for it
- Not for deciding whether the numbers or the interviews are right when they conflict — that is `research-owl-qual-quant-triangulation`


[Source and adaptation](SOURCES.md).
