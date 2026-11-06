# Design decisions, behaviour and proof

Use the user's current request, the project's existing decisions and the actual
interface. Add relevant design expertise to the shared workflow; do not start a
second interview, tracker, schema or approval process. A small requested change
does not require completing every section of this reference.

## Identity authority

Recover the latest applicable user decisions and approved references before
changing the product. Use the project's existing source, such as its current
decision page or design file. The optional
[decision example](../../../templates/DECISIONS.md) supplies structure only when
useful; it is not a required location or an approval certificate.

- Preserve established colours, type, geometry, material and composition unless
  the current request changes them. Ask about a material unresolved design choice;
  proceed with authorised technical fixes and clearly requested changes.
- Distinguish the running implementation, an approved target, an illustrative
  concept and a new proposal. An old screenshot or current code value is not
  blanket permission, and a later user correction can supersede an earlier choice.
- No universal glass, dark mode, font, corner radius or card layout defines quality.
  Use coherent hierarchy, readable information, clear actions and complete states.
- Compare rendered alternatives or a prototype when they resolve a real choice.
  Honour a requested number of alternatives; otherwise use the amount needed.
  Preserve existing design for an already clear small edit.
- Identify rights and availability for fonts, imagery and other assets. Do not
  count an illustrative preview as a cleared production asset or a working feature.

Explain differences in user terms: what each option feels like or enables, its
material downside, what can be reversed and what remains uncertain. Use the
[shared questioning procedure](../../bg-plain-english-builder/references/question-round.md);
several selected design/questioning skills still produce one conversation.

## Useful design context

Keep only relevant facts in the existing brief or design source:

- The requested experience, intended users, platform and observable result.
- Existing decisions and references, with enough source detail to locate them.
- Important components, interactions, content and states.
- Actual constraints, open choices and approved scope.
- The candidate and running environment to check; observed results and limits.

Use existing project identifiers and contracts where they help integration.
Do not invent manual identifiers, per-skill hashes or a required design receipt.
Choose supporting methods through
[selection and delivery](../../bg-build-with-me/references/skill-selection.md#selection-and-delivery);
missing optional routing never prevents a normal answer.

## Tokens and components

Recover actual approved values before adapting them. Use semantic colour roles,
type and fallbacks, spacing, geometry, elevation and motion appropriate to the
platform. Keep source values and proposed changes distinct. Reuse the existing
component system or a suitable package rather than reproduce it without reason.

For a component, understand its purpose, inputs, emitted action, reading order,
accessible role and actual state. Check focus, keyboard/touch use, labels and
feedback. Decorative elements do not need invented actions. A button's appearance
must not imply that an unconfirmed operation succeeded.

For an interactive surface, consider the applicable loading, empty, success,
error, offline, pending and uncertain-result states. Include relevant long text,
large text, localization, permissions, interruption and partially entered data.
Keep drafts where the requested experience needs them. Reconcile an uncertain
effect before retrying; do not relabel it failed to make a retry button convenient.

These are design questions and test cases, not a requirement to add every state,
control or feature to every screen. Existing behaviour and the user's scope govern.

## Check design changes against their source

Compare material changes with the actual decision or reference. Explain changed
values or interactions and their basis. Do not overwrite a retained reference
merely to make the implementation appear compliant. A changed file or fingerprint
does not establish user approval.

Use version identifiers or retained artifacts where needed to distinguish the
candidate and reference. Their role is reproducibility, not a manual unlock.
Respect the host's permissions and the existing project ownership.

## Effects and measured performance

Keep the chosen visual treatment on devices that support it. Apply relevant
accessibility preferences and the product's existing fallback policy. A new
customer setting or product mode is a design choice, not something this skill
automatically adds.

Measure the interaction that is failing: startup, typing, scrolling, navigation,
resizing or recovery. Record the actual candidate, device, conditions and useful
observations. Distinguish rendering delay, network delay and a wrong running
version. Use task-relevant expectations and an observed baseline; do not promise
a universal frame rate or impose a new performance cap.

Change the demonstrated costly effect while preserving the intended design where
possible. For example, reducing a costly moving background need not remove its
colour or composition. Recheck the original failure and relevant accessibility,
and make sure a limited-device fallback did not become the unintended global style.
Use [motion and effects](motion-and-effects.md) for the relevant techniques.

## Match checks to the actual surface

Apply these where the task and platform require them. Respect device ownership,
local emulator restrictions, available tools and spending authority. An unavailable
required surface stays unverified; it does not justify inventing evidence.

| Surface | Relevant observations |
|---|---|
| Web | Content-fit sizes, long and large text, zoom, overflow and clipped focus; semantic headings/forms, keyboard and non-hover actions; relevant accessibility preferences and the requested saved result. Automated accessibility checks supplement actual interaction. |
| Desktop/Electron | The packaged app on its actual OS, window controls and dragging, resizing, menus, shortcuts, text entry, display scaling and close/reopen recovery where affected. A browser view alone does not establish desktop behaviour. |
| iOS | The supported device or simulator and build; relevant text scaling, VoiceOver, navigation, keyboard, safe areas, accessibility preferences and lifecycle recovery. Identify physical-device limits such as haptics or performance separately. |
| Android | An available authorised device or emulator matching the intended check; Back/keyboard, TalkBack, text scaling, permissions, reconnect, lifecycle recovery and relevant performance. One emulator profile does not prove every phone. |
| Chat/channel | The actual client and adapter, supported formatting and controls, message limits, attachments, stale or repeated actions, threading and plain-text fallback. Verify current limits before depending on them; do not promise an interface the client cannot render. |

Consult the current applicable primary guidance when implementing a platform:
[W3C accessibility](https://www.w3.org/WAI/WCAG22/Understanding/),
[Electron title bars](https://www.electronjs.org/docs/latest/tutorial/custom-title-bar),
[Android accessibility](https://developer.android.com/develop/ui/compose/accessibility/api-defaults)
and the channel's own documentation, such as
[Telegram](https://core.telegram.org/bots/api).
Judge the actual rendered contrast, text and hit targets, including translucent
composites; source colour values alone do not prove the visible result.

## Evidence that answers the user's request

Choose complementary checks that can reveal the relevant failures:

- Compare the actual approved reference with the running screen using comparable
  content, state and size. Record meaningful differences and known fixture limits.
- Exercise affected actions on the real target surface and inspect their resulting
  state. A screenshot can show layout; it cannot prove saving, payment or recovery.
- Check clipping, reading order, focus and applicable accessibility on the changed
  interface. Test relevant slow, failed and interrupted behaviour.
- Identify the actual running app/service and delivered assets. A successful build
  does not prove that the user received it. Reconcile a stale instance before
  claiming the new interface works; do not restart another owner's service merely
  to make the test convenient.
- Preserve first failures, repairs and missing evidence. Recheck affected behaviour
  and relevant integration; reuse unchanged valid evidence.

For complex or consequential completed work, use the existing independent check
under [BG Check It Before Release](../../bg-check-it-before-release/SKILL.md).
No new review round is created by this reference. Do not require a fresh checker,
every supported device, a polish campaign or a full suite for each small edit.

The result should explain what changed, what was observed and what remains
unverified. A selected method, approved prototype, filled form or positive model
verdict cannot establish the complete product outcome.

## Small-change example

Fictional request: "Move the conversation title above the messages and keep the
rest of the chat behaviour."

Inspect the existing title, layout and interaction before editing. Ask only if
its intended placement is consequentially ambiguous; do not redesign the composer
or add controls to complete a template. Keep the current design and behaviour.

Check the new placement in the actual requested app, including narrow or large-text
conditions when relevant. Exercise the existing chat action affected by the layout
and confirm that the correct build is being served. Report any unavailable target
plainly. The example grants no deployment authority and claims no test was run.
