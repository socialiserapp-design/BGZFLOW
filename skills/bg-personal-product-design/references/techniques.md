# Techniques: explicit actions and reusable components

Apply these methods under the chosen product identity ([identity authority](design-contract.md#identity-authority)). Keep the [shared glossary](../../bg-build-with-me/references/glossary.md) and existing contracts. Pin each source's path and hash in the [token and source template](design-contract.md#token-and-source-template). Every value here is a proposal until a recorded decision approves it.

## Choose the surface mode

| Mode | Action | Acceptance question |
|---|---|---|
| Persuade | Arrange the real proposition, evidence, price or consequence, and a clear action. Spend expression where it explains the offer. | Does the visitor know what happens next, with no fabricated claims? |
| Operate | Prioritise task hierarchy, useful density, stable navigation and reversible feedback. Keep advanced controls near their parent setting. | Can the customer complete and recover the job? |
| Read | Build a readable column, heading hierarchy, linked sources and selectable text. | Can a reader follow and retrieve the information at large text sizes? |
| Experience | Give the artwork or media the main canvas and keep controls discoverable. | Can people experience and control the content without obstructive decoration? |

Assign modes by surface, not by company or product. In a notes app the editor controls are Operate, the rendered notes are Read and the pricing page is Persuade. A mode is design context, never authority to build a surface. The modes follow the framing of the public `impeccable` skill (optional).

## Eight or more rendered directions

Use the seed families V01–V16 and the starter slots S01–S08 below as seeds, not a finite theme picker. Add families as briefs change. Reuse the previous project's direction only when the founder explicitly asks for that continuity.

1. Record product purpose, audience, platform, real content and states, the previous project's selected direction and the last ten available direction fingerprints. Mark missing history and retrieve it from its owner before claiming novelty.
2. Assemble at least sixteen viable combinations. Remove platform-incompatible materials and layouts that cannot carry the real job. Select at least eight, varying seven axes (theme, density, material, typography, temperature, shape, motion) plus layout and background. If you break ties randomly, run a real seeded shuffle and save the seed and output; a simulated run is not evidence.
3. Require at least three different axis values between every pair and at least four distinct layout anatomies (a proposed mechanical floor). Unless the product brief constrains modes, include at least three light-led and three dark-led options. A light and dark version of one concept is one option. Count differences with colour excluded to catch recolour-only variety; artistic review still decides quality.
4. Render every selected direction with equivalent real-shaped content at the same comparison viewports. Include a setting card or switch, the core work surface, a result or detail view and a failure state. Make contact sheets and clickable desktop or native prototypes as relevant; preview chat's actual supported formatting separately. A named matrix without rendered artifacts does not count as a round.
5. Inspect every option for hierarchy, typography, accessible contrast, clipped text and full and fallback effect states. Replace weak or duplicate options so eight or more remain. Present clear names, one real trade-off each and links to the interactive scenes; offer more on request.
6. Capture selected and rejected attributes with their exact artifacts. For "type from B, boxes from E", render the combined whole and record its actual approval. If unresolved, the next round holds at least eight substantive refinements or recombinations. Never re-ask a question already answered in DECISIONS.md. Lock the approved colour, font, corner, material and composition choices with the [approval template](design-contract.md#approval-template).

### Eight starter slots

These recipes are proposals, not rendered or approved. Each organises work differently; the compositions assume a conversational or workspace product, so adapt the anatomy to the real job. The palette column is canvas/action only: derive complete semantic pairs and measure contrast before implementation (the [starter foundation](starter-foundation.md) has one resolved set). Native density stays touch-safe even when desktop is compact.

| ID / family | Seven axes (theme, density, material, typography, temperature, shape, motion) | Composition / background | Recipe and phone adaptation |
|---|---|---|---|
| S01 / V01 Daylight Workbench | light, comfortable, matte, geometric, cool, balanced, precise | sidebar + transcript + inspector; solid canvas | `#F6F7F9 / #1457CC`; Geist/system; card radius 16. Phone: one transcript and a dedicated artifact route. |
| S02 / V11 Quiet Companion | light, spacious, flat, editorial, warm, soft, instant | centred reading column + artifact sheet; no atmosphere | `#F4F2EF / #815236`; Lora/system; unboxed prose, 24 message rhythm. Phone: large-text reading first. |
| S03 / V05 Precision Console | dark, compact, matte, technical, neutral, sharp, precise | command-first results + docked inspector; solid | `#17191C / #FB9C79`; IBM Plex Sans/Mono; panel radius 8. Phone: search/recent conversations, comfortable rows. |
| S04 / V03 Clear Prism | light, comfortable, frost, native, neutral, soft, fluid | floating compact controls around content; cool edge wash | `#EDF2F6 / #1758B8`; platform rounded/sans; card radius 24. Keep reading opaque; native material only if approved and supported. |
| S05 / V04 Aurora Observatory | dark, spacious, simulated-glass, geometric, cool, balanced, expressive | overview canvas + conversation dock; two aurora lobes | `#10172A / #B6A8FF`; Outfit/system; panel radius 20. Phone: atmospheric header, opaque task cards, keyboard-safe composer. |
| S06 / V07 Botanical Atlas | light, spacious, matte, humanist, botanical, soft, fluid | today task stack + selected-task conversation; olive/mint wash | `#F2F6EF / #276443`; Manrope/system; radius 24. Phone: today stack and native detail navigation. |
| S07 / V13 Signal Rooms | dark, comfortable, flat, humanist, warm, balanced, fluid | room rail + transcript + thread drawer; restrained plum wash | `#211A29 / #DAB0F3`; Noto Sans/Mono; room card radius 12. Phone: chats, then a context sheet keeping the return position. |
| S08 / V09 Cobalt Blueprint | light, compact, flat, technical, cool, sharp, instant | data grid + docked assistant; 48 grid only in margins | `#F1F5FA / #0957C3`; IBM Plex Sans/Mono; controls 4, cards 8. Phone: stacked priority fields, Details for the rest. |

The other seeds are V02 Warm Notebook (document/task margins), V06 Studio Stage (media/timeline), V08 Ink Editorial (document annotations), V10 Tactile Canvas (spatial boards), V12 Research Library (citations/source inspector), V14 Silver Instrument (window/content layers), V15 Amber Exchange (numeric summary) and V16 Monochrome Gallery (media canvas). No seed licenses copying the previous project's winner. Font availability and redistribution rights stay product checks; show system fallbacks until verified.

## Component actions

These C01–C10 values are concrete proposals; product-locked values override their geometry. States and domain semantics stay mandatory whatever the skin. Values are CSS px on web/Electron and explicitly mapped pt/dp on native; use scalable text.

| Component | Recipe and action | States and semantics |
|---|---|---|
| C01 cards/result boxes | Padding `12/16/24`, gap `12`, balanced radius `16`, border `1`; height follows content, min-width zero. A setting row has title, purpose, control, then advanced disclosure. | Article/group/button semantics according to the action. Keep switches outside whole-card buttons. Preserve loading geometry, a useful empty action, a scoped error and labelled partial/pending/complete results. |
| C02 glass | Light fill white `.88`, dark `rgba(27,37,48,.88)`; rim white `.18` on dark, upper sheen `.10`, radius/padding `24`. Optional supported frost `16px`, saturation `120%`. | Test worst-case composites. Opaque fallback `#FFFFFF`/`#1B2530`; independent focus ring. A product whose approved look forbids live blur uses its approved simulated material, never this generic live frost. Loading/disabled keep explanatory text readable. |
| C03 switch | Track `44×26`, thumb `20`, inset `3`, travel `18`, row minimum `56`, gap `12`; expand the platform hit area without overlap. Native switches keep OS geometry. | Stable label, binary checked state, Space on web. On/off/hover/pressed/focus/disabled/saving/failed/unknown. Reconcile uncertain writes; after failure restore the confirmed value and offer scoped retry. No mixed-state switch; diagnostics stay out of the ordinary label. |
| C04 action | Heights `32/40` desktop or `48` touch, inline padding `16`, icon `20`, gap `8`, balanced radius `8`. One dominant action per task region. | Native button semantics; busy keeps width and verb and prevents double-send. Explicit hover/pressed/focus, a reason for disabled, persistent useful failure. A separate tested danger/onDanger pair; never assume onAccent works. |
| C05 input/composer | Input minimum `44` (`48` Android touch), padding `12`, label gap `8`, helper gap `4`; body `16/24`. Composer grows `48–160`, transcript max `720`, message gap `24`. | Label independent of placeholder; validating/invalid/read-only/offline draft/conflict. Preserve paste, autofill, IME, keyboard visibility and the draft on navigation. No press scaling on text fields. |
| C06 shell | Sidebar `248`, rail `72`, inspector `320`, row `40`, header `48` plus actual OS chrome. Collapse when content no longer fits. | Keyboard/menu equivalents, current-location cue, focus restore, Escape/back. Reserve real window buttons and non-drag controls. Phones use a navigation stack or justified major destinations, not squeezed columns. |
| C07 assistant | Unboxed readable answers; a result card names task, plain status, sources, artifact and next action. User bubble radius `16`, max `85%`. | Draft/queued/streaming/tool-running/complete, with cancelled/partial/error/offline/unknown branches. Stop requests cancellation; acknowledge the actual outcome. Reconcile the operation ID before retrying a write. Announce phase changes, not every token; preserve reading scroll. |
| C08 background | Solid, wash, aurora, grain, stage, grid or licensed media; one main treatment and at most one subordinate texture. Aurora alpha `.12/.08`; static grain `.025/.035`, tile `128`. | Decorative, behind content, pointer-events none. Stop optional motion off-screen, when inactive and under reduced motion. Keep the static identity on fallback; never request a sensor permission for decoration alone. |
| C09 dialog/feedback | Width `480` capped at viewport minus `32`, radius/padding `24`, gap `16`, dim `.40`. Native detents and safe areas. | Deliberate initial focus, contained modal focus, focus return, Escape/back, retained errors and truthful cancellation. Real totals only for determinate progress. An essential result outlasts a toast. |
| C10 list/table/status | Desktop rows `32/44`, native `56` or content-driven, cell padding `8×12`, badge `4×8` radius `8`. | Sort/filter/select/focus distinct; no-data differs from no-matches. Keep the focused row stable. Stack important phone fields; never clip money or convey state by colour alone. |

## Eight polish principles

Adapted from a product team's polish playbook, without accepting its unverified numerical or causal claims. Also apply intent-led grouping, visible failures, discoverable not-yet-connected capabilities, one consistent global vocabulary and controls near the job. A product's later recorded decisions supersede an older spec's scope.

1. **Native spring motion:** bind transitions to the product's actual spring tokens: snappy for controls, gentle for sheets, bouncy only where purposeful. Keep static and reduced-motion alternatives. Hard cuts are fine where they read better; animation is not mandatory everywhere. Output: transition/token map.
2. **Interruptible gestures:** test reversing a drag and handing release velocity to the existing supported animation implementation; keep focus and scroll. Output: the actual interruption scenario and result.
3. **Immediate feedback with reconciliation:** acknowledge input immediately; update optimistically only safe, reversible preferences. Keep confirmed or unknown state for money and publication and reconcile operation identity before retry. A changed row never proves a publish completed. Output: pending/error/rollback state tests.
4. **Content skeletons:** reserve expected geometry while data loads instead of flashing fake zeros. Use labelled activity for genuinely blocking work. Output: cold-load and empty-versus-loading captures.
5. **Bounded prefetch:** load the likely next permitted content where measured latency warrants it; respect data, battery and cancellation. Never generate paid content speculatively. Output: measured before/after next-view timing and data scope.
6. **Smooth long lists:** use the project's suitable virtualised or recycling list with stable identity; profile long real-shaped content and repair blank rows and frame stalls. No list-library migration is required and no guaranteed 60 fps or percentage gain is claimed. Output: exact device/frame/memory observations.
7. **Purposeful haptics:** map selection, impact and confirmed outcome to existing supported haptics; respect preferences and availability. Fire a success haptic only after confirmed success, never for a started request. Output: device observation, with hardware gaps explicit.
8. **Empty states and rhythm:** name the absent content and one useful next action; use shared spacing, type and radii with aligned edges. Output: empty/long/localised/large-text screen checks.

## Recurring craft rules

- Exercise every meaningful toggle and flow. Put diagnostics in Details while keeping saving, failed and unknown outcomes visible.
- Match ambition to the surface's purpose; judge usefulness and beauty separately.
- Group a setting's title, reason and switch; disclose advanced choices. Keep a product's chosen result style (e.g. capsules) without turning every product's tables into pills.
- Preserve exact selected artifacts; support combining named attributes, render the combined whole and keep a clickable proposal.
- Keep rich material available where approved; one product's selected material look stays specific to that product.
- Apply coherent tokens across neighbouring screens; keep accepted buttons, labels and behaviour intact during polish.
- Extend the repertoire, avoid prior-project repeats and match identity across platforms without imposing dark mode.
- Make an existing but not-yet-connected capability discoverable and label it; never show an affordance that promises a capability the product lacks.

## Optical craft and anti-generic checks

Use the concentric relationship: outer radius `24` with inset `8` gives inner `16` (inner = `max(0, outer − inset)`); unequal insets need each edge inspected, not one radius everywhere. Align the visual mass of play triangles and asymmetric icons with a bounded optical offset, leaving semantic hit boxes intact. Keep structure borders, focus/selection borders and elevation shadows separate. Prefer interruptible state transitions; name animated properties instead of `transition: all`. Use slow-motion playback only for inspection, then verify ordinary speed and reduced motion.

Before showing a round, compare silhouettes with the palette removed: navigation, content proportions, density, type hierarchy and primary action must differ where promised. Remove purposeless decoration, fake stats/testimonials, identical bento skeletons, indiscriminate glass and repeated prior-project motifs. Keep layout and reading order coherent at small widths and large text. An intentional approved style outranks an imported blanket font/pill/glow ban. Design expertise never approves every aesthetic in its sources: there is no universal dark, glass, bento, glow, GSAP or font default.

## Final polish

Run a final polish pass on every app and web screen after the direction is chosen and before handback. Apply every step: CTA and button-label contrast in all states; deliberate hero composition; heading wrapping checked at real viewport sizes (widen the measure or resize type rather than accept a tall wrapped wall); grid occupancy with no dead cells; real, observed motion within the reduced-motion rules; background craft within the approved look; and anti-repetition checks (no cheap meta-labels, repeated section layouts or prior-project motifs).

Where a step asks for randomisation or code, run it for real and record the seed and output; a simulated run is not evidence. Repair the real cause of overflow instead of hiding it, and keep reduced motion and reading order working. Rerun the overflow and token checks on anything the polish changed. Record one pass per screen in the handback. On chat-message surfaces (e.g. WhatsApp or Telegram messages), run only the wording, contrast and layout checks; hero, scroll-animation and grid steps do not apply.

If installed, the public `gpt-taste` skill can perform this pass in full: read its whole body, record its hash and apply every step under the rules above. Its fixed fonts and layouts (wide editorial type, AIDA page order, gapless bento, GSAP scroll effects, large section spacing) count as one style option among the variation families: use them only when that direction was chosen; otherwise keep the chosen or approved look's fonts, layout and tokens. It never overrides an approved look. Where its instructions conflict with this section (simulated randomisation, hidden overflow, mandatory motion, font bans), this section wins. Other aesthetic presets need an explicit, relevant choice; never load conflicting presets to "cover" UI.
