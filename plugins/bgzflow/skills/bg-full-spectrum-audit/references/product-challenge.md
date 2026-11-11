# Challenge the whole product

The audit owns discovering questions and opportunities. Do not ask the owner to enumerate unknown omissions or treat the current implementation, brief or competitor feature list as the complete definition of a good product. Requirements remain binding for implementation; questioning them produces a recommendation, not permission to change them.

## Reconstruct the real problem

Use available product material, actual flows, domain rules, research, support issues, usage evidence and surrounding work. Start with the progress someone needs to make, their circumstances, and how they judge success. Separate the paying buyer, daily user, recipient, collaborator, administrator and other affected people where relevant. For a developer tool, this includes the integrating developer and operator. Record which actors are evidenced and which are hypotheses.

State the product's causal claim: this capability changes this behaviour or situation, producing this useful outcome. Examine each link. A generated artifact, a clicked button, engagement or a passing test may be an intermediate result. Inspect the work needed to turn it into value. Ask:

- What happens immediately before entry, after the apparent finish, and when the task recurs? Where must someone retype, interpret, remember, reconcile, chase, copy or leave the product?
- Is the real bottleneck the one the product addresses? Would a flawless implementation still leave the user unable or unwilling to achieve the outcome?
- How is the job done today, including spreadsheets, people, another service or doing nothing? What benefit justifies switching, learning, permission or data demands?
- Which capabilities depend on another person, adequate data, trust, timely action or a later decision? Who supplies those conditions and knows when they fail?
- What is explicitly out of scope, what is assumed impossible, and what is merely inherited from the first implementation? Respect genuine constraints; investigate questionable ones.

If evidence is thin, state the strongest plausible account of the need and competing explanations. Continue with scenario analysis and clearly labelled hypotheses. Do not invent interviews, demand, willingness to pay or observed behaviour.

## Look beyond the feature list

Use perspectives that can reveal different classes of omission. Follow relevant leads deeply rather than producing a list of generic questions.

| Perspective | What to investigate |
| --- | --- |
| Whole journey and service | Discovery, first useful result, repeat use, collaboration, handoffs, exceptions, support, migration, exit and the work outside the interface. Check that local success adds up to the overall outcome. |
| Concept and coherence | Does the product have a clear purpose and understandable mental model? Are components consistent, mutually useful and discoverable? Do two individually reasonable choices conflict when used together? |
| User effort and control | Cognitive load, decisions, setup, permissions, defaults, correction, reversibility and confidence. Can the same outcome need less effort without hiding important choices? |
| Different people and circumstances | Novice and experienced users, non-payers and recipients, disabilities, language, interrupted attention, constrained devices/networks and occasional use. Investigate relevance instead of inventing universal personas. |
| Time and scale | First use versus a month later; changing data, accumulating history, team growth, stale assumptions, repeated actions and changing responsibilities. Does the concept remain useful as well as technically operable? |
| Trust and incentives | Explainability, meaningful consent, provenance, misleading promises, manipulation, conflicting stakeholder incentives and foreseeable misuse. Identify harm or loss of trust without imposing unapproved product policy. |
| Business and service viability | Acquisition and onboarding assumptions, differentiation, willingness-to-switch evidence, cost to deliver successful outcomes, support burden, dependencies and commercial constraints. Label projections and business choices. |
| Quality of the experience | Clarity, content, interaction, craftsmanship, emotional tone, confidence and appropriate delight. Judge these in the user's task and owner's intended character; personal taste and fashionable styling are not proof. |
| Outcomes and learning | What would distinguish useful adoption from activity? Can analytics, support evidence and qualitative research expose failure and unintended effects? Check the measurement itself. |

Seek contradictions: high completion but repeated support work; accurate output that nobody can act on; a faster step that increases total effort; an elegant interface that demands knowledge newcomers lack. These are investigation leads, not established findings until supported.

## Search for better concepts and approaches

Research relevant category examples and adjacent domains when it can change the judgement. Compare how they achieve the job, including tradeoffs and failures; copying a leader's feature does not establish fit. Use current primary sources for capabilities and label independent assessment. Existing suitable products, libraries and platform facilities are legitimate alternatives to new code.

Explore directions appropriate to the problem:

- Remove a step, feature, artifact or whole subsystem whose cost exceeds its contribution.
- Reframe the unit of work: an individual action, batch, continuous process, shared case or completed outcome.
- Change sequencing, entry point, information architecture or the point at which a user must commit.
- Bring the action to an existing workflow or integrate a missing handoff instead of requiring another destination.
- Shift suitable work between people, deterministic software and AI; preserve necessary judgement and user control.
- Reuse a simpler established mechanism or propose a substantially different concept where the current premise is weak.

Use [parallel concepts](../../research-owl-parallel-concepts/SKILL.md) for distinct approaches and select `principle-exhaust-the-design-space` from the current catalogue for a meaningful comparison. Select other available domain and research skills as needed. A list of colours, extra dashboards, notifications, AI features or other generic additions is not evidence of exploration. Adding functionality is only one possible improvement.

Give credible competing concepts comparable attention. Work through the same realistic scenario, including difficult cases, with each. Compare useful outcome, effort/time-to-value, quality, accessibility, trust/control, adoption, feasibility, reliability, total cost and migration/reversibility where relevant. Do not invent numerical scores or weightings. State why an option wins, what it loses, and what evidence could reverse the recommendation. Keeping the current design is a legitimate option, not a strawman.

## Turn discovery into an evidence-based judgement

For each material opportunity record:

1. The unmet need, wasted effort or limitation, including the actor, circumstances and concrete scenario.
2. Supporting observations or sources, the inference from them, competing explanations and what is still unknown.
3. The proposed approach and how it changes the outcome; include removal/simplification where useful.
4. The expected benefit and tradeoffs, dependencies, risks and decisions the owner would need to make.
5. The cheapest meaningful next check: inspect existing evidence, work a scenario, compare a prototype, measure a task, or plan a properly authorised study. State the result that would weaken or reject the idea.

Prioritise by consequence, reach, evidence and effort without false precision. Separate an observed broken promise, a supported product weakness and a speculative opportunity. Include worthwhile ideas outside the present brief as clearly bounded proposals. Do not silently redefine the task or launch a new build.

Conclude with a judgement of the concept and experience as well as technical health: which assumptions hold, where the approach is weak, which ideas deserve action or investigation, and what should stay. If no material opportunity is supported, say which alternatives were considered and why the existing approach remains sound. Neither a quota of suggestions nor a claim to have found every possible issue improves the review.

## Revisit after technical investigation

Technical discoveries can change the product judgement. Excessive latency may reveal an unsuitable interaction model; difficult permissions may expose unclear ownership; repeated retries may show that the product promises the wrong unit of completion. Conversely, a product concern may require a targeted technical experiment. Keep this exchange active throughout the audit, while preserving the full [technical coverage](coverage.md).

Do not equate agent simulation with real user research. A simulated walkthrough can expose a contradiction or generate a hypothesis; it cannot prove desirability, comprehension or commercial demand. Recommend the next evidence needed without making the owner supply the original idea.
