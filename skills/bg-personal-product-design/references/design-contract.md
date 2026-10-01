# Design contract: identity, behaviour and proof

Use this inside the project's existing contract and evidence location. Keep the [shared glossary](../../bg-build-with-me/references/glossary.md), C4 identifiers, interface/data versions and requirement IDs unchanged. Templates describe records to create for real work; a blank or example field is never passing evidence.

## Identity authority

Product identity comes from the project's recorded decisions (`<project>/.bgzflow/DECISIONS.md`; [template](../../../templates/DECISIONS.md)) and, when present, the overlay `FOUNDER.md` and `PROJECTS.md` (`$BGZFLOW_OVERLAY`, else `~/.bgzflow/overlay/`). Read the latest project checkpoint before changing a product.

- An approved look (colours, fonts, corner shapes, material, composition) stays locked until the founder's new decision changes it; ask before changing it. Technical fixes inside the lock continue under existing authority.
- There is no universal dark, glass, font or radius house style. A single-mode product (e.g. dark-only) is that product's recorded exception.
- New products and major screens start with eight or more rendered directions and a clickable prototype ([procedure](techniques.md#eight-or-more-rendered-directions)); small changes reuse the approved design. Reuse the previous project's direction only when the founder asks. Never import another product's palette.
- Keep current code, approved target, illustrative concept and functional acceptance as separate records. Code tokens and old stylesheets are snapshots, not substitutes for approved values; old screenshots never imply blanket approval.
- A look's approval never closes a functional failure; retrieve current combined-candidate flow evidence.
- Preview images stay illustrative until their production rights are recorded.
- Aim for coherent identity, clear next actions, readable information, complete states and purposeful depth. Setting cards, switches, result boxes, glass and backgrounds are a repertoire, not a requirement for every surface.

Recover recorded answers before asking the founder. Read approved artifacts and exact current tokens, carry their versions into this contract and implement within the lock. Request a new decision only for an actual change to approved visual choices. Give each source gap an owner and continue unaffected work. Send code-versus-target drift, runtime parity and missing acceptance to the product's owner; this skill never approves its own result.

## Copyable design plan

Select bodies through the [body read and fallback procedure](../../bg-build-with-me/references/skill-selection.md#body-read-and-fallback-procedure); the [catalogue and judgment route](../../bg-build-with-me/references/skill-selection.md#optional-catalogue-and-judgment-route) is optional. Raise genuinely open product questions through the [question round](../../bg-plain-english-builder/references/question-round.md#copyable-question-round).

```text
phase: planning              # planning | prototype | implementation | acceptance
product: existing product ID
outcome: customer task and observable success
requirement_ids: []          # existing IDs; never redefined
owner: existing owner
candidate: {worktree: path, branch: name, base: SHA, revision_or_manifest: hash}
identity: {current_decision: DECISIONS.md ID or named gap, source: path, source_sha256: hash}
surfaces: [{surface: web | electron | ios | android | chat, mode: Operate, job: task}]
contracts: {glossary: existing path, c4: existing refs, interfaces: existing versions}
current_skills: [{name: skill or method, body: path, sha256: hash, read_evidence: receipt}]
next_skills: []
selection: {result: route result or one-pass fallback, routing: ready | blocked, reason: evidence}
directions: {round: 1, previous_project: fingerprint or gap, minimum: 8, matrix: path, renders: [], clickable: []}
work: [{task_id: existing ID, dependsOn: [], owned_paths: [], output: artifact, acceptance_command: exact command}]
judging_device: {model: exact or gap, os: version, display: viewport/scale/refresh, owner: owner}
constrained_device: {profile: exact or gap, artifact: build hash, owner: owner}
holds: []
open_questions: []           # link the existing question round; never re-ask a settled decision
next_owner_action: exact handoff
```

## Token and source template

Read the exact source before adapting it; pin its path and hash here. A reference kit's proposals carry no product approval; references are read-only research inputs, never runtime dependencies to install.

```text
identity_id: product_direction_revision
status: proposed             # approved only with the actual decision in the approval record
source: {path: exact path, sha256: exact hash, version: version, locator: object or selector}
classification: extracted_code   # extracted_code | approved_target | illustrative | proposal
mode: product-approved default and supported modes
units: {web: CSS px and rem, ios: pt with scalable type, android: dp and sp}
values:
  colour: {canvas: value, surface: value, text: value, muted: value, accent: value, onAccent: value, focus: value}
  type: {display: family/size/line/weight/fallback, body: family/size/line/weight/fallback}
  spacing: []
  radius: {control: value, card: value, panel: value, special_geometry: evidence or gap}
  elevation: {card: value, overlay: value}
  motion: {feedback: duration or spring, enter: value, exit: value, reduced: static behaviour}
component_aliases: {card_fill: surface, primary_fill: accent, primary_label: onAccent}
rights: {font: source licence or gap, imagery: ownership or gap}
unknowns: [{fact: missing value, owner: owner, next_action: retrieve source}]
```

## Component template

```text
component: existing component ID   # attach C01-C10 from techniques.md as reference, not a renamed API
purpose: one job
semantic_role: group | button | switch | input
inputs: existing props and domain contract
emits: existing intent and operation identity
anatomy: label, content, actions and reading order
tokens: semantic aliases and source versions
geometry: {padding: value, gap: value, radius: value, minimum_target: value with units}
states: [rest, hover, pressed, focus-visible, disabled, loading, empty, error, success, offline, pending, unknown]
state_exclusions: justified non-applicable states   # decorative panels emit no actions
interaction: {keyboard: behaviour, touch: behaviour, screen_reader: name/role/value, focus: behaviour}
recovery: {draft: retained, cancel: actual acknowledgement, retry: reconciliation rule}
platforms: {web: adaptation, electron: adaptation, ios: adaptation, android: adaptation, chat: fallback}
effects: {full: approved recipe, reduced_motion: static, reduced_transparency: opaque, constrained: measured effect reduction}
proof: {candidate: hash, scenarios: paths, result: unrun or actual, evidence: paths and hashes}
```

## Screen-state template

| Screen / requirement ID | Entry/data | State and visible meaning | Action → actual outcome | Recovery / focus / persistence | Surface/device | Evidence/status |
|---|---|---|---|---|---|---|
| Existing screen and ID | Real data or an explicitly labelled fixture | loading/empty/success/error/offline/pending/unknown | Existing operation contract | Exact retry/cancel/draft rule | Exact build and device | Command + artifact hash; pass/fail/blocked/unknown |

Fill every applicable state, long content, localisation/RTL, large text, permissions, slow response, an interrupted or backgrounded app, and empty or partly completed data. Keep an unconfirmed side effect labelled unknown until reconciled; never relabel it failed just to enable Retry.

## Approval template

```text
product: existing ID
direction: ID and revision
status: proposed             # approved | rejected | superseded, only with evidence
decision: {id: DECISIONS.md ID, owner: founder, timestamp: from the record or system clock, source: path, exact_excerpt: actual words}
shown: [{surface: surface, artifact: path, sha256: hash, viewport_device: exact, theme: mode}]
locked_tokens: {path: approved manifest, sha256: hash}
locked_choices: {colour: actual, font_and_fallback: actual, corners: actual, material: actual, layout: actual}
selected_attributes: []      # exact origins of recombinations
rejected_attributes: []
allowed_effect_reductions: []
behaviour_exclusions: []     # e.g. a later autosave decision removes a preview's Save button
supersedes: []
new_change: {requested_delta: delta or none, decision_id: actual or pending}
```

Keep the approved baseline independent and owner-controlled. Compare changes to semantic colour, typography/font fallback, radii/corner geometry, material/effects and major composition against the exact approval manifest; report old and new values with their decision ID. A new token hash alone never authorises a change, and a worker never updates both baseline and approval to turn the guard green. An unapproved identity change blocks the affected styling acceptance, not unrelated ready work. Verify each accepted DECISIONS.md ID that governs the look against the candidate at integration and again at check. This is evidence and change control, not a new founder-only technical unlock.

## Full effects and measured fallback

Keep the chosen full visual treatment on capable devices. Apply the product's approved exclusions first: a product whose approved look forbids live blur uses simulated glass even on a flagship phone. Reduced motion removes decorative loops and travel but keeps immediate static feedback; reduced transparency uses an opaque, contrast-tested material. If the platform cannot report a preference, supply an accessible in-app override and record that limit. Per-effect records follow the [motion and effects contract](motion-and-effects.md).

Measure cold start, typing, scrolling, opening details, switching theme, dragging/resizing and recovery on the exact candidate. Record the instrument, duration and sample conditions, frame stalls, input responsiveness, memory and crash/ANR observations. Agree task-relevant thresholds in the product contract from the supported refresh rate and a measured baseline; never promise a universal FPS figure. Separate rendering delay from network delay.

Change only the identified costly effect: stop an aurora's drift but keep its colour and composition; replace live frost with a simulated or opaque fill but keep the rims; reduce a costly shadow without deleting all depth. Retest the original failing interaction and accessibility. Record cause, changed effect, before/after evidence and remaining limits. Recheck the full tier on the judging device so the fallback never becomes the global default by accident.

## Surface checklists

These are product-stage obligations. A documentation candidate can specify them without claiming they ran. Match tools to the installed framework and version; unavailable required coverage stays blocked with an owner. Resolve bodies through [capability coverage](../../bg-build-with-me/references/capability-coverage.md) and [skill selection](../../bg-build-with-me/references/skill-selection.md); selection never installs anything globally.

| Surface | Execute and retain evidence |
|---|---|
| Web | At content-fit breakpoints and narrow `320/360/390` CSS px, tablet `768`, compact desktop `1024` and desktop `1440`, inspect long labels/numbers, realistic content and 200% zoom/text. Check page and container overflow, semantic headings/forms, Tab/Shift+Tab/Enter/Space/Escape, visible and unobscured focus with focus return, a non-hover path for every action, reduced motion/transparency, high contrast and RTL/localisation. Run installed automated accessibility tooling plus a manual keyboard and customer flow; screenshots alone prove nothing. |
| Electron | Test the packaged candidate on its version and OS: real window buttons/chrome, draggable blank area and non-drag controls, resize/minimise/maximise/fullscreen/restore, menus and keyboard accelerators with equivalents, text entry/IME unaffected by global shortcuts, focused/inactive window states, separate drafts and consistent operation identity across two windows, close/reopen recovery, 100/150/200% high-DPI where supported, moving to an external monitor, light/dark/system changes and title-bar contrast. Web renderer checks supplement Electron acceptance, never replace it. [Official title-bar guidance](https://www.electronjs.org/docs/latest/tutorial/custom-title-bar). |
| iOS | Use a real supported simulator or device, OS and build. Exercise Dynamic Type through accessibility sizes without a blanket cap, VoiceOver names/roles/values/order, native switches/navigation/back, keyboard avoidance, safe areas, rotation/tablet where supported, reduced motion/transparency, contrast, target areas (44 pt recommended), haptics, lifecycle and interruption recovery. A desktop browser cannot certify iOS; keep physical-device gaps (real haptics, material, performance) open. |
| Android | Use an owned, visible, constrained emulator at the first runnable candidate and again at integrated acceptance: test → repair → retest. Record AVD/serial, API/system image/ABI, display/density, guest RAM/heap, CPU, GPU mode and network. Include supported old/current APIs when relevant, Back/keyboard, TalkBack, scalable sp text, 48 dp targets, permissions, offline/reconnect, background/process restart, drafts and long lists. Record logs/ANR/memory/frame observations. A 720p-class, 2–3 GB, two-core profile is a starting proposal, not a reproduction of a cheap physical phone. Physical thermal/OEM/GPU checks and judging-device checks stay separate. [Android target guidance](https://developer.android.com/develop/ui/compose/accessibility/api-defaults). |
| Chat/channels | Record the exact adapter/API/client version and its supported formatting, message/caption length, button count/label/payload/action limits, card/media support and link handling. Record an unverified limit as a named gap instead of guessing. Test escaping, code/link chunk boundaries, attachments, duplicate taps, stale buttons, disabled actions, reply threading, offline/unknown write reconciliation and plain-text fallback. Telegram `sendMessage` allows 1–4096 characters after entity parsing; a 3,500-character chunk target is a proposal, not an API limit. Verify other limits against the actual adapter. WhatsApp button/template limits stay a named gap until verified; use numbered choices plus a text/link fallback. Promise only what the chat client renders: no custom fonts, glass or backgrounds. [Telegram source](https://core.telegram.org/bots/api#sendmessage). |

Normal text needs at least 4.5:1; large text at least 3:1, where large means 18 pt regular or 14 pt bold (24, or about 18.667, CSS px). Some accessibility guides tabulate large text as 18 px/14 px; that table is wrong, so never reproduce it. Essential non-text controls need 3:1, tested on actual translucent composites. The WCAG AA target floor is 24 CSS px, with exceptions; 44 CSS px is recommended for comfortable web touch, separate from native pt/dp. [W3C contrast guidance](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html).

## UI acceptance artifacts

A design task sends this additive contract to the verification owner and leaves gate code and enforcement files to their owner. Keep existing check IDs and CLI/profile behaviour. Product acceptance needs runtime proof; planning records only design decisions, proposed scenarios, source gaps and future checks. An approved prototype still has fixture limits.

| Artifact | Required binding and result | Reject as acceptance when |
|---|---|---|
| Approved-token change guard | Exact candidate/base, independently retained approved manifest hash, approved decision ID/source, changed role/value pairs, a decision covering each permitted delta, actual command/exit/output hash | Builder overwrote the baseline, approval missing, unexplained identity delta, stale candidate, text merely claiming "locked" |
| Overflow/clipping render result | Actual viewport/device/text scale/theme/screen/state, measured page and affected-node bounds, clipped text/focus/overlay inspection, output and screenshot hashes, intentional scroll exceptions | Only CSS searched or overflow hidden; screenshots omitted; long/large text not exercised |
| Approved-reference/running-app pair | Both image hashes and the exact approved decision, same screen/state/content where possible, known fixture differences, running artifact/config/device identity, mismatch ledger | Concept compared with concept, stale build, wrong viewport/mode, illustrative assets counted as functional completion |
| Real customer flow | Inputs/actions, actual connected environment and authorised data, expected and observed result/recovery, operation identity, logs/recording/screenshots and exact candidate | Mocked success presented as native/live, screenshot-only pass, unacknowledged write retried, payment/publication authority absent |
| Accessibility/performance | Exact platform/device/preferences, actual automated/manual tools and results, judging-device full tier plus constrained fallback/repair evidence | Emulator treated as every phone, source-only numerical guarantee, unsupported screen-reader/haptic/native claim |
| Final polish pass | Every changed app/web screen: method used (and, when an installed skill performs it, its full body read with hash), what it changed, seed/output of any code it ran, rerun overflow/token checks after polish ([final polish](techniques.md#final-polish)) | Screen skipped, only selected checks applied, or a simulated run claimed as executed |
| Independent verdict | Builder job/thread, a distinct fresh read-only checker job/thread, same candidate hashes, findings kept under stable IDs and closed with evidence, verdict and next owner | Builder self-approves, or a complete record is described as an accepted product |

```text
ui_evidence:
  phase: acceptance
  candidate: {base: SHA, source: SHA or dirty manifest, artifact: sha256, config: hash, dependencies: lock hash}
  builder: {job: actual, thread: actual}
  reviewer: {job: distinct actual, thread: distinct actual}
  decision: {id: actual, record: path, sha256: hash}
  checks:
    - kind: approved_token_guard   # repeat for overflow, pair, flow, accessibility, performance
      existing_check_id: design-decisions
      status: unknown              # pass | fail | blocked | unknown
      command: exact command or manual steps
      exit_code: null
      environment: {surface: actual, build: actual, device: actual, theme: actual, text_scale: actual}
      evidence: [{path: result, sha256: hash, type: native | fixture | manual | source}]
      finding: {id: existing finding ID, owner: actual, next_action: exact}
  candidate_verdict: blocked       # the checker owns ready | changes-required | blocked
```

Map the token guard to `design-decisions`, overflow and the pair to `visual-evidence`, the flow to `states-and-flows`, and accessibility and device performance to `accessibility` and `platform-and-performance`. Keep `intent-and-profile` and `next-action`. At planning, `visual-evidence` is document evidence; at runtime it is visual evidence. A missing required result never becomes a pass by changing phase after implementation. The [shared enforcement reference](../../bg-check-it-before-release/references/enforcement.md) separates record validation from acceptance; hand the candidate to [BG Check It Before Release](../../bg-check-it-before-release/SKILL.md).

The lead accepts a `ready` verdict itself and asks the founder only about open product, design or business choices. Keep each finding under one stable ID across at most two repair rounds (`bg-rounds` ledger); a third round needs the founder's explicit approval.

## Filled example

Illustrative, not a live run. A fictional dance-studio booking app: every name, ID and value is invented to show a fully filled planning specification, not an implementation assignment or a passing receipt. Requirements: `REQ-CLS-01` browse classes, `REQ-CLS-02` book, `REQ-CLS-03` recover an uncertain booking, `REQ-ACC-01` accessibility.

| Contract field | Filled value |
|---|---|
| Outcome / phase / owner | Specify the approved look and recovery checks for the Classes screen; planning. The design worker owns this specification; the project lead owns any later product change. |
| Candidate | Documentation candidate on branch `design/classes-spec` from `<base SHA>`; owned-file hashes in the handback. Product runtime candidate not supplied, so no acceptance claim. |
| Surface / mode / structure | Phone Classes screen, Operate: studio header, week strip, class rows (time, style, teacher, level, spaces left), Book and Join waitlist, then Add to calendar after booking. No domain or API redesign. |
| Authority | `DEC-014` records the founder choosing the rendered "Warm Studio" prototype in round 2 (artifact hash in handback). Later `DEC-019` replaces the prototype's confirmation dialog with inline confirmation; the separate Add to calendar export stays. They are different actions. |
| Colour / type / corners | Canvas `#FBF7F2`, surface `#FFFFFF`, text `#231C17`, muted `#6A5E54`, accent `#A63A24`, onAccent `#FFFFFF`; title `28/34/700`, row title `17/22/600`, meta `14/20/400`; card radius `16`, button `12`, chip `8`. The prototype's web font stands in for the system font; no font migration. Hex pairs compute at 5.89:1 or more; the rendered-composite check is `unrun`. |
| Material / elevation | Matte, no translucency. Card shadow `0 2px 8px rgb(35 28 23 / .08)` from the approved prototype, not older code tokens. |
| Motion / fallback | The prototype supplies no approved duration scale; its observed 150/250 ms transitions stay source evidence pending product mapping. Reduced motion: static feedback. Reduced transparency: not applicable. No invented tokens. |
| Component semantics | Class rows are navigation; Book and Join waitlist are distinct actions with 44 pt / 48 dp targets. Show "Booked" and spaces left only from confirmed server data, never from an optimistic tap. Every action keeps its accessible name. |
| Primary flow | Open Classes → pick a day → open a class → Book → inline confirmation → Add to calendar, with an authorised test account; confirm the booking and calendar entry exist. A day with no classes shows a meaningful empty state offering the next day with classes. |
| State coverage | Loading: reserved rows with labelled activity. Empty: explain and offer the next day. Success: real schedule. Failed fetch: scoped Retry. Offline: cached schedule with last-updated time, booking disabled with a reason. Unknown booking outcome: reconcile by booking operation ID before any retry. Cancel: actual acknowledged result. Planned acceptance cases, not claims of implemented behaviour. |
| Judging / constrained device | Judging phone and build not supplied; constrained Android profile and artifact not assigned; the project lead binds both. The prototype's 390×844 logical frame is a design reference, not a tested phone. |
| Checks / current evidence | Decision record and saved prototype inspected: performed. Token guard, overflow render, reference/running pair, customer flow, VoiceOver/TalkBack, Dynamic Type and measured frames: `unrun`, product candidate outside this task. Any earlier failed or not-run acceptance record stays open. |
| Approval / next action | Approved look retained; no new design approval claimed. An independent checker reviews this candidate; the project lead supplies the runtime candidate and devices. No live changes or release. |

Use the same fields for a newly selected direction, with `status: proposed` until the founder actually sees and chooses the rendered prototype. Never copy one product's skin to fill another product's unknowns.
