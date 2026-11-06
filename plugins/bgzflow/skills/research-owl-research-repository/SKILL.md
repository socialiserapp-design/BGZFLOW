---
name: research-owl-research-repository
description: "Build a repository that makes findings findable, reusable, and cumulative across teams. Use when the same research keeps getting redone."
---
# Research Repository

Use this method only for the current research question. Reuse the existing brief, applicable user answers and private records; several selected methods contribute to one investigation, not repeated interviews. Inspect permitted actual evidence and preserve source links. Do not invent participants, quotations, emotions, findings, measurements or approvals; mark hypotheses and missing data explicitly. Planning a study does not authorise recruitment, messages, recording, tracking installation, spending, account changes or product changes. The current task and host permissions govern; shared automatic records are not proof that a study ran.
## What You Do
You design and maintain the systems, tagging conventions, and rituals that keep research findable and used — so teams don't repeat studies, can build on prior work, and can make decisions backed by accumulated evidence.
## Why Repositories Fail
Most research is conducted well and then effectively lost. Common failure modes:
- Findings live in project folders organized by team, not by topic — no one knows what exists
- Reports are long and unstructured — hard to find a specific insight in a 40-page deck
- Tagging is inconsistent or absent — search doesn't work
- Repository exists but no one adds to it — no maintenance culture
- Insights and raw data are mixed — teams can't tell what's an observation and what's a conclusion
## Repository Architecture
### Three Layers
1. **Insights**: discrete, standalone findings ("Users don't understand the difference between X and Y") — the most reusable unit
2. **Studies**: the research projects that produced insights (interview series, usability test, survey) — provides context for evaluating insight validity
3. **Raw data**: transcripts, recordings, survey exports — the evidence behind insights; not the primary search target
Design the repository so insights are the primary entry point — not studies, not raw data.
### Insight Structure
Useful insight context, reusing fields that already exist rather than requiring a new schema:
- **Statement**: one clear sentence (past tense, specific)
- **Evidence strength**: Explain method quality, relevance, sampling limits, independent corroboration and uncertainty; study count alone does not establish confidence
- **Method**: how it was gathered (interview, usability test, survey, analytics)
- **Date**: when gathered
- **Sample**: who (segment, n)
- **Tags**: topic, feature area, user segment, sentiment
- **Source links**: back to the study and raw data
- **Related insights**: manually or automatically linked
## Tagging System
Consistent tagging can improve retrieval; preserve a useful existing system rather than treating one taxonomy as universally best. Reuse the existing taxonomy; propose minimal new terms only where retrieval needs them:
### Tag Dimensions
- **Topic/theme**: navigation, onboarding, pricing, notifications, mobile, accessibility…
- **Feature or product area**: checkout, dashboard, settings, home feed…
- **User segment**: new users, power users, enterprise, mobile-only, specific personas…
- **Sentiment**: pain, delight, confusion, trust…
- **Recency signal**: evergreen vs time-bound findings
- **Status**: validated, superseded, conflicting
### Rules
- Use consistent tags without blocking useful work on a new taxonomy exercise
- Tags are plural and lowercase: `onboarding` not `Onboarding` or `onboard`
- Use specific tags without redundant label inflation; no fixed count
- Reconcile relevant changes when needed; recurring maintenance needs actual authority
## Repository Culture and Maintenance
A repository is only as good as the habits around it:
### Adding research
- Retain useful findings and source links in the existing private study record; a new summary form is not a completion gate
- Preserve findings when meaningful evidence changes; no invented one-week deadline
- Link permitted raw data in existing private storage. Do not copy recordings or broaden access just to populate a repository
### Keeping it current
- Mark affected insights superseded when new evidence contradicts them; no automatic review schedule
- Link new findings to insights they reinforce or contradict — build the evidence chain
- Archive (don't delete) superseded insights — the history of what you thought and why is valuable
### Making it useful
- Prepare a digest only when useful and requested; sending it requires actual communication authority
- Link repository insights in product briefs, design rationale, and PRDs
- When starting new research, search the repository first — what's already known?
## Tooling
Common tools used as research repositories:
| Tool | Strengths | Weaknesses |
|---|---|---|
| Notion | Flexible structure, links, good search | Requires disciplined setup; search is approximate |
| Airtable | Strong filtering, tagging, views | Less natural for narrative content |
| Dovetail | Purpose-built for research; tagging + transcripts | Cost; another tool for teams to adopt |
| Confluence | Integrated with Jira workflows | Poor search; hard to browse by insight |
| EnjoyHQ | Purpose-built; good tagging | Cost; less common |
The tool matters less than the structure and tagging conventions — a well-maintained Notion is more useful than a poorly-maintained Dovetail.
## Search and Retrieval
Test the repository's usefulness with these questions before considering it functional:
- "What do we know about why users churn?" → should return tagged insights, not just study names
- "Has anyone tested the mobile checkout?" → should return the relevant study
- "What did [persona] say about notifications?" → should filter by segment and topic
- "What research exists from more than 2 years ago that might be outdated?" → should be filterable by date
## Best Practices
- Start with reliable evidence relevant to this decision, including older evidence that still applies; no arbitrary six-month cutoff
- Assign a repository owner; shared ownership without a named owner means no owner
- Make the repository part of onboarding — new team members should be directed there on day one
- The repository is a team resource, not just a research team resource — product managers and engineers should be reading it too


[Source and adaptation](SOURCES.md).
