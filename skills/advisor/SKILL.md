---
name: advisor
description: >-
  Obtain a bounded independent second opinion when the user explicitly asks for
  an advisor or another model's view. Use the requested model when available;
  otherwise explain the capability gap. Never enable recurring consultation
  automatically.
icon: lightbulb
color: purple
---

# Advisor

Use this skill for an explicitly requested second opinion. The main agent remains
responsible for the task, its verification and its authorized completion. An
advisor supplies evidence and criticism; its verdict does not grant permission
or replace the user's decisions.

## Resolve the request

- `/advisor ask <question>` or "get a second opinion" requests one bounded consult.
- `/advisor <model>` requests that model for the consult. Check actual available
  models and supported routes. Do not infer availability from a name or subscription.
- `/advisor` without a question uses the current consequential decision as the
  subject. If neither subject nor scope is clear, ask the smallest useful question.
- If the user explicitly requests continuing advice, agree the useful checkpoints
  and scope once. There is no default consult before every stage or final reply.
- `/advisor off` ends future consultation in this conversation.
  `/advisor status` reports only what this conversation actually established.

Respect an explicit model or provider choice. Do not silently substitute a
different model, choose the highest effort by default, switch accounts or buy
capacity. If no model was specified, choose a capable available independent route
appropriate to the question and existing usage authority. A separate provider is
optional; its name alone does not make a review independent or better.

## Prepare a bounded brief

Use [the briefing guide](references/briefing-template.md) for relevant facts:
the user's objective and latest corrections, the specific question, the options,
observed evidence and uncertainties. Send only what the advisor needs. Redact
secrets and omit unrelated chats, private data and entire transcripts.

For an independent assessment, use a fresh read-only reviewer that did not build
the candidate. Give it the actual candidate and evidence to inspect where access
permits. Do not manufacture a separate identity by renaming the builder.

## Consult and act

Use an existing supported agent or provider tool, with an explicit model/effort
where the host supports it. Assign no writes, deployments, account changes or
external effects. Keep the native task identity and collect the actual result.
No Cursor-specific subagent type, persistent state file, stop hook or helper is
required by this skill.

Report a missing route honestly and continue independent authorized work. Do not
spawn repeated retries or run a substitute consultation merely to mark this step
complete. One necessary follow-up may resolve missing evidence; do not create a
debate loop.

Evaluate the advice against the evidence. Apply sound engineering corrections
within scope; resolve consequential product or authority questions with the
user. State material disagreement plainly. Before claiming success, still test
the actual requested outcome through the appropriate verification method.

Give the user a concise account of the advisor's useful finding, evidence limits
and resulting action. Never describe a requested, queued or failed consultation
as completed.

## Continuity

Keep the agreed advisory scope and useful conclusion in the current task context
or its existing record. Do not create `.cursor/advisor` files, delete old state,
inherit another chat's model choice, schedule nudges or add automatic consultations.
Historical advisor state is not current user authority.
