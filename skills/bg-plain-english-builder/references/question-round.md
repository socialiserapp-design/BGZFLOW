# Thorough discovery in ordinary language

Run one interview, coordinated by this skill. Fold in useful techniques from other interview methods (if installed, e.g. `grill-me` or Superpowers `brainstorming`); run no competing interviews and apply no conflicting question-count defaults.

## Procedure

1. Read recorded decisions and inspect facts first; skip any question those facts already answer. Make a row for each relevant category in the [coverage table](planning-loop.md#coverage-and-stopping-rule), and mark an irrelevant category with a reason instead of asking about it. List settled decisions under "Known already" and never ask them again.
2. For a substantial new product, offer a manageable numbered round, normally 8-15 relevant independent questions. Ask fewer when that fits the remaining choices or the founder's needs. Put dependent questions in a later round, after their prerequisite is answered; never guess a branch to fill the first round. Thoroughness means covering the decision tree, not filling a quota.
3. Give each question 2-4 concrete options, a recommendation and one sentence on its impact. Allow a free answer. State the cost of guessing wrong when it is material. Ask for product, experience and business choices; determine technical details yourself.
4. Accept shorthand such as "yes to your recommendations except Q3". Record exactly what the founder accepted. A default option, silence or elapsed time is not an answer. Follow each correction into its affected branches.
5. While answers arrive, research unknown facts and sketch or prototype the experience. Apply relevant specialists as the domain becomes clearer. Keep settled independent work moving; hold only the work that waits on an open answer.
6. Stop discovery when every coverage row has evidence, an actual answer, an inapplicable reason, or an explicit deferral by the founder with the affected scope named. A deferred prerequisite stays held and visible in the plan. Keep unanswered evidence gaps open. Reflect the complete experience and the outstanding branches back, then record the decisions in the [plan](plan-template.md#copyable-plan).

## Copyable question round

```text
Round [n]: [what this round settles, in plain words]
Known already: [recorded answers and their source; not asked again]
Facts inspected: [source/version and finding; code-derived answers listed apart]
Open independent choices: [coverage rows this round addresses]
Held for a later round: [dependent question | prerequisite | work it holds]
Continuing meanwhile: [independent work that does not wait on this round]

Q1. [One product choice in ordinary language]
A. [Recommended outcome] (recommended) — [why it fits]
B. [Meaningful alternative] — [trade-off]
C. [Only if useful]
Why it matters: [one consequence the founder understands]
Cost of guessing wrong: [material consequence, or not material and why]
Depends on: [none, or the prerequisite answer; ask only after it arrives]

Answer in your own words, or say "your recommendations except Q...".
Record the round number, version and options shown. Keep each exception open
until the founder chooses or explicitly defers it; a preselected option is
never consent.
```

```text
Coverage: category | requirement IDs | answered/evidenced/inapplicable/deferred/open
  | answer or evidence + source | decision owner | open choice | affected work
Decision: ID | the founder's actual choice | source/time | accepted example
  | rejected alternative + reason
Deferral: choice | actual deferring source | owner | affected task/requirement kept
  | revisit trigger
Research: question | primary source/version/date | finding | effect on the plan
```

## Worked example

Illustrative, not a live run. Prompt: "Students keep messaging me to book classes. I want them to book on their phones." Infer no online payments, paid text messages or access to the studio's accounts. First inspect the studio's website and how bookings arrive today. Then ask who books, how people sign in, what happens when a class is full, the cancellation rule, reminders and payment, and research email-sending limits and costs. Use [BG Personal Product Design](../../bg-personal-product-design/SKILL.md) for different visual directions and a clickable prototype of the main flow. Derive identity, permissions, offline and failure behavior and acceptance tests as engineering work. The plan links the chosen outcomes to contracts and worker tasks, never substituting "a contact form" for the booking system the founder asked for.

The [filled question round](plan-template.md#illustrative-question-round) shows coverage and dependent branches. Its answers are hypothetical, not anyone's product decisions.

## Red flags

| Temptation | Required action |
| --- | --- |
| "They named three skills, so that is the whole scope." | Treat examples as clues; select further relevant expertise. |
| "Ask for every database and deployment choice." | Investigate and recommend engineering decisions; ask only for consequential product or business trade-offs. |
| "They said yes once, so all future designs are approved." | Bind the yes to what was actually shown and asked. |
| "A deferred question means we can omit that feature." | Keep its requirement and affected dependency explicitly unresolved. |
