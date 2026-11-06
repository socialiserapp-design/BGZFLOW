> BGZFLOW adaptation: use this technical reference only for the current requested outcome. Existing user decisions, actual project architecture and host permissions govern. Numeric examples and aesthetic opinions below are options, not universal rules, new gates or authority to redesign. External products, model weights and licences need current verification before use; none is installed by reading this page. Use the same brief and private project records; do not modify installed learning files.

---
title: design-vocabulary
summary: The precise word for each design phenomenon, and where this skill goes deeper. The lexicon behind articulate-precisely. Seeded by Index's articulate module.
tags: [meta, vocabulary, reference, articulation]
---

# Design vocabulary

The skill's working lexicon: the precise word for a design phenomenon, plus where the skill treats it in depth. Use it to name things exactly per [articulate-precisely](../philosophy/articulate-precisely.md) — in a critique, name the phenomenon; in a request, name the change.

Seeded by *Index*'s articulate module (Emil Kowalski & Glenn Carstens-Peters — [index.how/to/articulate](https://index.how/to/articulate)). The glosses here are this skill's own; `→ node (upstream companion; not bundled)` points to the node that goes deeper. Terms in **bold** with no arrow are vocabulary the skill adopts but does not yet cover in a dedicated node — name them precisely even where there is no node to open.

## How to use this file

- **Don't read it top to bottom.** Jump to the category, grab the word, follow the arrow if you need depth.
- **One job: stop the agent saying "weird."** If a critique reaches for a vague word ("off," "clean," "modern"), the right word is almost always here.
- **Pair it with the principle.** [articulate-precisely](../philosophy/articulate-precisely.md) is *why* precision matters; [review-checklist](review-checklist.md) is *what* to scan when reviewing. This file is a naming index, not a rulebook — the rules live in the linked nodes.

## 01 — Typography

How text is set, spaced, and read.

- **Kerning** — space between two specific letters, tuned by hand. Distinct from tracking.
- **Tracking** — uniform letter-spacing across a run; uppercase and small text usually need more. → [line-length-tracking](../typography/line-length-tracking.md)
- **Leading** — line-height; the vertical space between lines. Too tight suffocates, too loose stops reading as a paragraph.
- **Optical kerning** — spacing judged by eye instead of the font's metric tables; closes the gaps the defaults leave.
- **Tabular nums** — fixed-width digits so changing numbers don't jitter in a column. Essential for tables, prices, timers. → [data-is-content](../philosophy/data-is-content.md)
- **Type scale** — a fixed set of sizes (often a ratio) you pick from rather than inventing per use. → [type-scale-and-rhythm](../typography/type-scale-and-rhythm.md)
- **Weight** — stroke thickness. Bold is for hierarchy; italic is for linguistic stress or citation, not hierarchy. → [typography-humanity](../typography/typography-humanity.md)
- **x-height** — height of the lowercase; why two fonts at the same px read as different sizes. → [typography-humanity](../typography/typography-humanity.md)
- **Cap height** — height of the capitals; with x-height it governs perceived size. Matters when matching a fallback.
- **Ligature** — two glyphs merged to dodge a collision (fi, fl). Decorative ligatures are display-only.
- **Font smoothing** — antialiasing of glyph edges; `antialiased` renders lighter on Mac, worse on non-retina.
- **Text overflow / truncation** — cut at a word boundary with a real ellipsis character, never mid-word. → [copy-voice](../components/copy-voice.md)
- **Hyphenation** — breaking a word across lines; best left to the browser to place.
- **Clamp** — fluid sizing with a min, preferred, and max in one declaration (`clamp()`); scales between breakpoints.
- **Widow** — classically, a paragraph's lone last line carried to the top of the next column or page; colloquially also the lone word left on a last line. `text-wrap: pretty` targets the trailing-word case. → [line-behavior](../typography/line-behavior.md)
- **Orphan** — a paragraph's lone first line stranded at the bottom of a column or page — the mirror of a widow. CSS `orphans`/`widows` set the minimums, but support is uneven, so it is often fixed by hand.
- **Font stack** — the ordered fallback list; a size-matched fallback prevents reflow when the web font loads.
- **Line length** — the measure; ~65 characters reads comfortably, wider loses the next line. → [line-length-tracking](../typography/line-length-tracking.md)
- **Variable font** — one file spanning weight/width axes; lets you animate weight without layout shift.
- **Superscript / subscript** — `sup`/`sub` are oversized by default and break line rhythm; size and shift them by hand.

## 02 — Color

How color is defined, mixed, and applied.

- **sRGB** — the legacy default space; every hex value lives here. Narrower gamut than modern screens can show.
- **P3** — a wider gamut most current displays support; reaches greens and reds sRGB cannot describe.
- **OKLCH** — a perceptually uniform space; equal lightness actually looks equally bright. Best for generating palettes.
- **Alpha** — the transparency channel. An alpha border recedes into the surface; a solid hex sits on top of it.
- **Semantic token** — a color named for its job, not its value (`--border-subtle`, not `#e0e0e0`). → [using-design-md](using-design-md.md)
- **Contrast ratio** — luminance difference of foreground to background; WCAG wants 4.5:1 body, 3:1 large/UI. → [contrast-and-color-scheme](../surface/contrast-and-color-scheme.md)
- **Tinted neutral** — a grey with a slight hue bias; pure `#808080` reads as a placeholder, a tint reads as chosen. → [color-monochromatic](../surface/color-monochromatic.md)
- **Saturation** — a color's intensity; a fully-saturated brand hue that sings on a light page can buzz on a dark one — drop it roughly a quarter to settle it.
- **Chroma** — OKLCH's perceptually-accurate saturation. Reduce chroma for a light tint; reducing opacity instead just greys it. → [color-monochromatic](../surface/color-monochromatic.md)
- **Gradient** — a transition between colors; built in OKLCH it stays vivid where sRGB/HSL go grey at the midpoint.
- **Opacity vs visibility** — `opacity:0` still takes space and catches clicks; `visibility:hidden` kills interaction but keeps space.
- **Dark mode** — surfaces built dark, brightest at the top of the layer stack; light tokens rarely translate directly. → [dark-mode](../surface/dark-mode.md)
- **Blending** — how a layer mixes with what is beneath. Multiply darkens, Screen lightens, Overlay does both.

## 03 — Iconography

How icons are drawn and balanced.

- **Stroke weight** — icon line thickness; it has to scale with size or it disappears small and looks frail large. → [icon-systems](../components/icon-systems.md)
- **Optical centre** — where a shape *looks* centred vs where it mathematically is; a play triangle may need a slight optical offset. → [icon-systems](../components/icon-systems.md)
- **Filled vs outlined** — two styles signalling state; filled often means active/selected, outlined means default. → [icon-systems](../components/icon-systems.md)
- **Cap style** — how a stroke ends, square or round; round and square ends are legitimate choices within the approved icon language.
- **Pixel hinting** — nudging paths onto the pixel grid at small sizes so a 16px glyph doesn't turn to mush.
- **Icon library** — a single family tuned to one size, weight, and corner radius; pulling glyphs from a second set — however close — leaves small inconsistencies that pile up. → [icon-systems](../components/icon-systems.md)
- **Icon size system** — the defined sizes (12/16/20/24/48) each ideally drawn for its context, not scaled from one master.
- **Meaning collision** — the same icon doing two jobs (a star for favourite *and* rating); users learn neither.
- **Contextual swap** — switching outlined↔filled to mark a state change; only works if the convention is consistent.
- **Breathing room** — the deliberate spacing between a glyph and its text (start ~6–8px); design it as a property of the component, not whatever the flex gap happens to leave.
- **Unified weight** — icon stroke matched to the adjacent text weight, so they read as one family. → [icon-systems](../components/icon-systems.md)
- **Metaphor accuracy** — whether the glyph still means what it depicts (a floppy disk for save) as the audience ages.

## 04 — Layout

How space and structure organise a page.

- **Border radius** — corner rounding; an inner radius = outer radius − padding, or the gap shows. → [border-radius](../surface/border-radius.md)
- **Gap** — space between flex/grid children, set on the parent; unlike margin it leaves no trailing space.
- **Negative space** — the empty area that gives a layout its edges and steers the eye; packing things tighter erases the structure the eye was reading, it doesn't add content.
- **Flexbox** — the row/column layout model controlling direction, alignment, and grow/shrink.
- **Auto layout** — Figma's flexbox: elements that space themselves and resize with content.
- **Layout shift** — content jumping as the page loads (images, fonts, reorders); reserve space to prevent it. → [sticky-and-scroll-tells](../layout/sticky-and-scroll-tells.md)
- **Overflow** — what happens past a container's bounds; `hidden` clips silently and breaks child sticky positioning.
- **Sticky positioning** — scrolls then pins at a threshold; a parent with `overflow:hidden` silently breaks it. → [sticky-and-scroll-tells](../layout/sticky-and-scroll-tells.md)
- **Aspect ratio** — fixed width:height; setting it reserves space before media loads and prevents layout shift.
- **Viewport units** — units relative to the window; `dvh` accounts for mobile browser chrome that `vh` ignores. → [viewport-custom-design](../layout/viewport-custom-design.md)
- **Safe area** — the screen region clear of notches and home indicators; fixed bottom chrome must inset for it. → [viewport-custom-design](../layout/viewport-custom-design.md)
- **Max-width** — a cap on container width so lines don't stretch unreadable on wide screens. → [line-length-tracking](../typography/line-length-tracking.md)
- **Breakpoint** — where layout changes; set it where the content breaks, not at assumed device widths. → [viewport-custom-design](../layout/viewport-custom-design.md)
- **Responsive** — a layout that adapts via fluid sizing, flexible media, and breakpoints. The web baseline.
- **Grid** — a column system organising layout; 12 is conventional, 8 often suits simpler layouts.
- **Asymmetry** — columns or elements weighted on purpose rather than mirrored; the imbalance is what carries energy. A perfectly balanced grid is safe and usually inert. → [visual-imperfection](../surface/visual-imperfection.md)
- **Baseline grid** — horizontal rhythm from body line-height; great for editorial, usually overkill in product UI.
- **Z-index** — stacking order on a plane; modals, tooltips, dropdowns need explicit values or they clip behind. → [tray-rules](../motion/tray-rules.md)

## 05 — Interaction

How elements respond to input.

- **Affordance** — the cue a control gives about how to operate it; a raised edge says press, an underline says click. Strip the cue and the user is left to experiment.
- **Hover state** — the change on cursor-over; confirm interactivity with cursor + color, not color alone. → [hover-states-subtle](../components/hover-states-subtle.md)
- **Focus state** — the keyboard-focus indicator; never delete it, replace it. → [accessibility-baseline](../components/accessibility-baseline.md)
- **Active state** — the pressed change; a small scale or color shift, or the button feels dead. → [responsive-feedback](../motion/responsive-feedback.md)
- **Disabled state** — non-interactive; a muted token is more reliable than opacity, which can pass or fail contrast. → [accessibility-baseline](../components/accessibility-baseline.md)
- **Cursor** — the pointer contract: pointer = clickable, text = selectable, default = static. The wrong one lies.
- **Pointer events** — whether an element catches input; `none` makes a decorative layer present but click-through.
- **Optimistic update** — update the UI before the server confirms; feels instant, needs a rollback path. → [optimistic-updates](../components/optimistic-updates.md)
- **Debounce** — delay a function and reset on each trigger; stops a request per keystroke (~300ms is common).
- **Touch target** — the area accepting a tap; choose platform-appropriate accessible sizing. 44×44 is a common usability recommendation, not a universal unit or sole WCAG threshold. → [accessibility-baseline](../components/accessibility-baseline.md)
- **Copy to clipboard** — needs visible confirmation (a checkmark for a beat) or users click it again thinking it failed. → [responsive-feedback](../motion/responsive-feedback.md)
- **Skip link** — a visually-hidden link, revealed on focus, that jumps past nav to main content. → [accessibility-baseline](../components/accessibility-baseline.md)
- **Hydration mismatch** — server HTML and the first client render disagree (a theme, a date, a stored toggle), so the page flashes or React throws; set persisted state before first paint. → [ui-polish-pass](../components/ui-polish-pass.md)
- **FOUC** — flash of unstyled (or wrongly themed) content before styles or fonts apply; a blocking theme script and preloaded fonts prevent it. → [performance-discipline](../motion/performance-discipline.md)
- **Light dismiss** — closing an overlay by clicking outside or pressing Escape, without a dedicated button; popovers and menus expect it, destructive dialogs often shouldn't. → [keyboard-patterns](../components/keyboard-patterns.md)
- **Race condition** — two async results landing out of order, so an older response overwrites a newer one (search-as-you-type); cancel or ignore stale requests. → [optimistic-updates](../components/optimistic-updates.md)
- **Passive listener** — a `touchstart`/`wheel` handler marked `{ passive: true }`, promising not to call `preventDefault`, so scrolling never waits on script. → [performance-discipline](../motion/performance-discipline.md)

## 06 — Motion

How things move and transition. The largest cluster in this skill — see [animation-decision-framework](../motion/animation-decision-framework.md) first.

- **Easing** — the speed curve of an animation; built-in and custom curves can both fit. → [easing-curves](../motion/easing-curves.md)
- **Ease-out** — fast then slow; the default for things entering the screen. → [easing-curves](../motion/easing-curves.md)
- **Ease-in** — slow then fast; for things leaving. On an entrance it feels reluctant. → [easing-curves](../motion/easing-curves.md)
- **Ease-in-out** — slow-fast-slow; for moves across the screen (a toggle, a sliding card). Overkill for simple enter/exit.
- **Stagger** — list items animating in sequence (~40ms apart); all-at-once reads as a flash. → [stagger-choreography](../motion/stagger-choreography.md)
- **Duration** — UI is sub-300ms; hovers ~150ms, buttons 100–160ms, >400ms with no feedback looks broken. → [duration-table](../motion/duration-table.md)
- **Transition property** — the CSS properties whose changes interpolate. Name intended properties and measure actual cost; transform/opacity are often useful but not the only valid choices. → [transform-opacity-only](../motion/transform-opacity-only.md)
- **Reduced motion** — the `prefers-reduced-motion` preference; any significant movement must honour it. → [prefers-reduced-motion](../motion/prefers-reduced-motion.md)
- **Skeleton shimmer** — a gradient sweep on a skeleton to suggest activity; must respect reduced motion. → [empty-loading-states](../components/empty-loading-states.md)
- **Spring** — physics-based easing that overshoots and settles; reads more alive than a fixed curve. → [spring-animations](../motion/spring-animations.md)
- **Choreography** — timing several animations as one phrase so attention lands in one place; uncoordinated motion just scatters the gaze. → [stagger-choreography](../motion/stagger-choreography.md)
- **Enter vs exit asymmetry** — enter decelerates in, exit accelerates away; a reversed enter feels like arriving backwards. → [compose-subtract-asymmetry](../motion/compose-subtract-asymmetry.md)
- **Shared axis transition** — motion direction reflects spatial relationship: forward animates right, back animates left. → [fly-not-teleport](../motion/fly-not-teleport.md)
- **Motion as feedback** — press-compress, error-shake, success-draw: the motion *is* the response, not decoration. → [responsive-feedback](../motion/responsive-feedback.md)
- **GPU compositing** — assembling rendered layers, often without relaying out their contents; actual promotion and cost depend on engine, property and scene. → [transform-mastery](../motion/transform-mastery.md)

### Motion: the finer words

When "make it animate" is the whole prompt, the agent guesses. One of these names usually settles which of several animations is meant.

- **Fade / scale in / slide in / pop in** — four different entrances: opacity only; growing from ~0.95 to 1 together with a fade; arriving from an edge; overshooting the final size and settling. A pop may use overshoot; choose it where the approved motion language fits. → [never-scale-from-zero](../motion/never-scale-from-zero.md), [spring-animations](../motion/spring-animations.md)
- **Reveal** — a clip-path or mask uncovers content in place, so nothing moves. → [clip-path-tricks](../motion/clip-path-tricks.md)
- **Origin-aware animation** — a popover or menu grows out of the control that opened it (its `transform-origin` set to the trigger), not out of its own centre. → [transform-mastery](../motion/transform-mastery.md)
- **Transform origin** — the anchor a scale or rotation pivots on. Choose the origin from the actual trigger and intended geometry. → [transform-mastery](../motion/transform-mastery.md)
- **Skew / 3D tilt / perspective** — slanting the axes; rotating in X or Y for depth; how close the virtual viewer sits (a lower value exaggerates the depth). Use them sparingly: a tilt card is a marketing-surface move, not a product one. → [marketing-vs-product-ui](../philosophy/marketing-vs-product-ui.md)
- **Keyframes / interpolation (tween)** — the stops you author versus the frames the engine fills in between them.
- **Stepped animation** — jumps between discrete states (`steps()`), as a countdown or a sprite does; smooth easing would be wrong there.
- **Fill mode** — whether an element holds an animation's first or last frame outside its active time (`forwards` keeps the end state).
- **Orchestration** — sequencing several animations so they read as one gesture; it is the plan, and [stagger-choreography](../motion/stagger-choreography.md) is one technique inside it.
- **Asymmetric easing** — a curve that accelerates and decelerates at different rates. Real motion is asymmetric, which is why `ease-in-out` often reads mechanical. → [easing-curves](../motion/easing-curves.md)
- **Linear** — constant speed. Right for spinners, marquees and progress tied to time; wrong for anything that starts or stops. → [easing-curves](../motion/easing-curves.md)
- **Velocity / momentum** — how fast and which way something moves at the moment you touch it, and motion that keeps going after the input ends. A spring inherits velocity; a tween restarts from zero. → [gesture-momentum](../motion/gesture-momentum.md)
- **Stiffness · damping · mass** — the three spring dials: how hard it pulls, how fast it loses energy, how heavy it is. Name the dial instead of saying "bouncier". → [spring-animations](../motion/spring-animations.md)
- **Interruptible animation** — it can be redirected mid-flight and curves toward the new target instead of jumping or finishing first. CSS transitions retarget; keyframe animations restart. → [spring-animations](../motion/spring-animations.md)
- **Crossfade / morph / layout animation** — two elements swapping in one spot; one shape becoming another; an element animating to its new size or position instead of snapping. → [cross-blur-transitions](../motion/cross-blur-transitions.md), [morphing-icons](../motion/morphing-icons.md), [fly-not-teleport](../motion/fly-not-teleport.md)
- **Continuity / shared element transition** — before and after are visibly the same object (a thumbnail grows into the card it opens), so the user never loses the thread. → [fly-not-teleport](../motion/fly-not-teleport.md)
- **Direction-aware transition** — forward slides one way and back slides the other. Also called a shared-axis transition (above).
- **Scroll reveal / scroll-driven animation** — content animating as it enters the viewport, versus animation whose progress *is* the scroll position. The first is usually decoration. → [sticky-and-scroll-tells](../layout/sticky-and-scroll-tells.md)
- **Page transition / view transition** — animation between routes; the browser's View Transitions API morphs the elements two states share. → [fly-not-teleport](../motion/fly-not-teleport.md)
- **Press feedback / ripple / hold to confirm** — a scale-down while held (~0.97); a circle spreading from the tap point (Material's idiom, foreign elsewhere); a fill that completes while the button is held, guarding destructive actions. → [responsive-feedback](../motion/responsive-feedback.md), [destructive-actions](../components/destructive-actions.md)
- **Number ticker / typewriter** — digits rolling to a value (with tabular figures, or the width jitters); text appearing one character at a time. Both read as gimmicks when used for routine updates. → [line-length-tracking](../typography/line-length-tracking.md)
- **Mask** — like clip-path, but the edge can fade. A mask fade is how overflowing animated content gets clipped softly without breaking the animation. → [clip-path-tricks](../motion/clip-path-tricks.md)
- **Frame rate / dropped frame / jank** — frames drawn per second (60 is the floor and 120 is common); a frame that missed its deadline; the visible stutter of several in a row. → [performance-discipline](../motion/performance-discipline.md)
- **Layout thrashing** — repeated forced layout caused by interleaved layout-dependent reads and writes. Layout animation can cost work without necessarily being thrashing. → [transform-opacity-only](../motion/transform-opacity-only.md), [debugging-animations](../motion/debugging-animations.md)
- **Opacity vs visibility** — `opacity: 0` keeps both the space and the clicks; `visibility: hidden` keeps the space and drops the clicks; `display: none` drops both. Fading something out leaves invisible click targets behind unless you also set `pointer-events: none` or `visibility`.
- **Filled vs outlined (contextual swap)** — outlined icons for the default state and filled ones for active or selected, applied as one rule everywhere or not at all. → [icon-systems](../components/icon-systems.md)

## 07 — Accessibility

How interfaces work for everyone. The baseline is non-negotiable — see [accessibility-baseline](../components/accessibility-baseline.md).

- **WCAG** — the contrast standard most teams use; AA is 4.5:1 body, 3:1 large/UI. → [contrast-and-color-scheme](../surface/contrast-and-color-scheme.md)
- **APCA** — a newer perceptual contrast model accounting for size and weight; sometimes disagrees with WCAG.
- **Screen reader** — reads the UI aloud; navigates by DOM order, headings, and ARIA roles, not visual layout. → [accessibility-baseline](../components/accessibility-baseline.md)
- **Tab order** — the keyboard focus sequence; should match reading order, broken when DOM and visual order diverge.
- **Prefers color scheme** — the media query for system theme; the right way to honour dark mode without a custom toggle. → [dark-mode](../surface/dark-mode.md)
- **aria-label** — an accessible name for a control with no visible text; describe the action ("Search"), not the icon.
- **Focus trap** — keeping keyboard focus inside an open modal so it can't escape to the page behind. → [tray-rules](../motion/tray-rules.md)
- **DOM order** — the HTML sequence screen readers follow; reordering visually with CSS desyncs seen from read.
- **Semantic HTML** — the right element for the job; a `button` gets keyboard, focus, and role for free, a `div` does not.
- **Label association** — tying a `label` to its input via `for`/`id` so clicking the label focuses the field. → [forms-validation](../components/forms-validation.md)
- **Color-only state** — color as the sole signal (a red border) is invisible to colorblind users; always pair with icon or text.

## 08 — Information architecture

How content is structured and found.

- **Progressive disclosure** — reveal complexity as the user goes deeper instead of dumping it all on one screen.
- **Navigation** — the system for moving between areas; labels should match how users describe things, not internal naming.
- **Mental model** — the assumptions a user already holds about how a thing behaves; architecture that fits them feels obvious, architecture that fights them makes users feel stupid.
- **Hierarchy** — the deliberate ordering of importance; with none, every element shouts equally and the user hears nothing.
- **Empty state** — the no-content-yet view; explain why and offer the first action. "No data" ends the journey. → [empty-loading-states](../components/empty-loading-states.md)
- **Error state** — what shows on failure; say what broke and a specific way to recover. → [states-are-the-work](../philosophy/states-are-the-work.md)
- **Onboarding** — the best kind delivers value immediately; one completed action beats a watched tour. → [delight-impact-curve](../philosophy/delight-impact-curve.md)
- **Confirmation dialog** — a gate before a destructive action; describe what is lost, keep safe and destructive far apart.
- **Wayfinding** — the signals (breadcrumbs, active nav, titles, URL) that say where you are and where you can go. → [url-as-state](../layout/url-as-state.md)
- **Signpost** — an element whose sole job is to orient (a section header, a step counter); you only notice it once it's gone.
- **Labelling** — the wording on nav and categories; when users search for something they should have browsed to, the query is a receipt for a mislabel.
- **Depth** — levels of nav to reach content; past three, users lose track — add wayfinding or flatten.
- **Search as escape hatch** — search can reveal missing navigation or can be the best intended route; investigate actual task success rather than treating high volume as proof of failed IA.
- **Content inventory** — a complete list of everything before restructuring; skipping it just moves broken content.
- **Card sorting** — a research method: real users cluster items the way they expect to find them, exposing where the team's labels and the user's expectations split.

## 09 — Copywriting

How words guide and reassure. The skill's voice work lives in [copy-voice](../components/copy-voice.md).

- **Microcopy** — the small text (labels, errors, placeholders) that outsizes its length in how trustworthy a product feels. → [copy-voice](../components/copy-voice.md)
- **CTA** — the primary action label; "Save changes" outperforms "Submit." Own the action, don't apologise for it. → [copy-voice](../components/copy-voice.md)
- **Error message** — name what went wrong and how to fix it; "Invalid input" names nothing. → [forms-validation](../components/forms-validation.md)
- **Placeholder** — hint text that vanishes on typing; it cannot replace a label — the reminder is gone when needed.
- **Sentence case** — cap only the first word and proper nouns — the UI default; capitalising Every Word gives microcopy a stiff, contractual tone.
- **Front-loading** — lead with the word that carries the meaning, because eyes grab the first token and move on; "3 errors" lands before "There were some problems with your submission" finishes. → [copy-voice](../components/copy-voice.md)
- **Inline error** — the message next to the offending field; a top-of-form summary makes users hunt. → [forms-validation](../components/forms-validation.md)
- **Voice** — a product's fixed character in language — warm or clinical, plain or technical. Voice is the constant; tone is what flexes by moment.
- **Tone** — how the voice adapts to the moment (encouraging in onboarding, careful around destructive actions).
- **Success message** — specific and brief ("Saved", not "Done"); often neglected, never a press release.
- **Destructive language** — say "Delete"/"Remove" plainly; softening a permanent action ("clear", "reset") misleads.
- **Scannability** — copy built for the glance: lead with the outcome, keep clauses short, stay active. Most UI text is skimmed, not read — write for that.
- **Truncation strategy** — where and how overflowing text gets cut; a heading, a nav label, and a body line each want a different cut rule, never one global ellipsis. → [copy-voice](../components/copy-voice.md)
- **Contextual help** — one sentence placed at the moment of need; cheaper than a tooltip (hover) or docs (navigate).
- **Numeric formatting** — `1,000` vs `1000`, `3.5k` vs `3,500`; consistency matters more than the convention, match the locale. → [data-is-content](../philosophy/data-is-content.md)

## 10 — Tools

How design is made and shared.

- **Design system** — shared components, tokens, patterns, and guidelines; a living product, not a static doc. → [using-design-md](using-design-md.md)
- **Source of truth** — the one place a team defers to; increasingly the codebase, not the Figma file. → [using-design-md](using-design-md.md)
- **Variables** — named, reusable values updated from one place; change once, everything referencing it updates.
- **Tokens** — design decisions as named variables both tools and code reference; what makes a system portable. → [using-design-md](using-design-md.md)
- **Visual language** — the cohesive color/type/shape/motion/tone that makes a product recognisable without its name. → [marketing-vs-product-ui](../philosophy/marketing-vs-product-ui.md)
- **Artboard / Frame** — a named canvas for a screen or component; Figma frames also define clipping and auto layout.
- **Prototype** — an interactive mockup to test a flow; fidelity should match the question being asked.
- **Handoff** — design moving to engineering; done well it is shared tokens and an available designer, not guesswork. → [using-design-md](using-design-md.md)
- **Redline / annotation** — measurements and notes on a design to communicate intent; less needed with a shared system. → [agentation-workflow](agentation-workflow.md)
- **Moodboard** — a reference collection to align on direction; the best ones make an argument, the worst are Pinterest. → [taste-is-trained](../philosophy/taste-is-trained.md)
- **HiDPI / Retina** — 2×+ pixel-density screens; assets, icons, and borders must account for 2× and sometimes 3×.
- **Open Graph** — the share-preview metadata (image, title, description); the first impression for most who don't visit.
- **Skeuomorphism** — modelling an interface on a physical object (a leather calendar, a legal-pad notes app) to borrow familiarity. Shadows and gradients alone are depth, not skeuomorphism.

## 11 — Analysis

How design decisions are measured.

- **A/B test** — two variants run live to measure which wins; only as good as the metric chosen.
- **Heatmap** — a visualisation of clicks/taps/scroll; spots affordance problems and content nobody reaches.
- **Session recording** — replayed footage of one real user's path; where an aggregate heatmap blurs, a recording puts a face on the moment someone gave up — much harder to dismiss.
- **Funnel** — the staged path to a goal (sign-up, checkout, activation); every step that sheds users is a problem to diagnose, not a law of nature.
- **Conversion** — the moment a visitor takes the desired action; design moves it via clarity, trust, and friction.
- **Bounce rate** — share who leave without acting; high on a key page signals an expectation mismatch.
- **Retention** — how many return after the first visit; harder and more important than acquisition.
- **Churn** — the rate at which existing users leave — retention read backwards; a rising number is the product admitting it no longer earns the return visit.
- **NPS** — likelihood-to-recommend, 0–10; a blunt instrument, widely used as a rough satisfaction signal.
- **Scroll depth** — how far down users actually read; content below the fold reaches fewer than assumed. → [sticky-and-scroll-tells](../layout/sticky-and-scroll-tells.md)

## 12 — Components

The building blocks. Their state behaviour is where craft lives — see [states-are-the-work](../philosophy/states-are-the-work.md). For the pairs people confuse, see [component-confusables](../components/component-confusables.md).

- **Button** — an action trigger with the states actually reachable in its context, accessible naming and appropriate feedback; no universal one-primary-per-view rule. → [hover-default-imperative](../motion/hover-default-imperative.md)
- **Input** — a text field; needs a persistent label above it, not just a placeholder, and a distinct state each. → [forms-validation](../components/forms-validation.md)
- **Textarea** — a multi-line input; same state treatment as a single-line field. → [forms-validation](../components/forms-validation.md)
- **Select** — a one-of-many dropdown; the native element is accessible but hard to style, customs need keyboard care.
- **Checkbox** — a binary toggle; clicking the label should toggle it, not just the box. → [forms-validation](../components/forms-validation.md)
- **Radio group** — exactly one of a set; distinct from checkboxes, which allow several.
- **Switch** — an on/off with immediate effect; for settings that apply without a save.
- **Slider** — a value selected within a range; preview may update continuously while an expensive or consequential effect commits separately, as the actual contract requires.
- **Modal / Dialog** — an overlay that interrupts and demands attention; trap focus, make the background inert. → [component-confusables](../components/component-confusables.md)
- **Sheet** — a panel sliding from a screen edge; same focus and dismissal rules as a modal. → [component-confusables](../components/component-confusables.md)
- **Drawer** — a bottom sheet pulled up from the base; a common mobile dialog replacement. → [component-confusables](../components/component-confusables.md)
- **Popover** — a click-anchored overlay that *can* hold interactive content (links, buttons). Not a tooltip. → [component-confusables](../components/component-confusables.md)
- **Tooltip** — a hover label that *cannot* hold interactive content; if you need a link inside, use a popover. → [component-confusables](../components/component-confusables.md)
- **Toast** — a temporary auto-dismissing notification; duration should track reading time, not a flat 2s. → [sonner-principles](../motion/sonner-principles.md)
- **Badge** — a small label attached to another element and read-only; numeric implies a count. → [component-confusables](../components/component-confusables.md)
- **Tag** — a label the user can pick up, toggle, or remove — it categorises and it's interactive. A badge is pinned on; collapsing the two hides a real difference. → [component-confusables](../components/component-confusables.md)
- **Accordion** — stacked expand/collapse sections; good for FAQs, not a substitute for tabs when comparing.
- **Tabs** — switches between related views in one space; for filtering the same content, not navigating unrelated sections.
- **Stepper** — a multi-step flow showing progress; show the steps upfront to set expectations.
- **Carousel** — a horizontal scroll row; on desktop often a sign the layout wasn't solved. The first item gets the attention.
- **Navigation menu** — top-level or flyout structure; labels reflect how users think, not how it was built.
- **Sidebar** — persistent edge navigation; works when users move between sections often.
- **Breadcrumb** — a location trail in a hierarchy; navigate back at depth without the browser button. → [url-as-state](../layout/url-as-state.md)
- **Pagination** — page controls for lists too long to load at once; infinite scroll is the tradeoff alternative.
- **Skeleton** — a placeholder holding content's shape while it loads; better than a spinner for list/page loads. → [empty-loading-states](../components/empty-loading-states.md)
- **Spinner** — an indeterminate loader; fine for short action waits, a skeleton wins for page/list loads. → [empty-loading-states](../components/empty-loading-states.md)
- **Avatar** — a small user image; needs a fallback (initials or icon) when the image fails. → [avatar-systems](../components/avatar-systems.md)
- **Card** — a contained surface grouping content; inner radius < outer, and a fully-linked surface kills text selection. → [cards-design](../components/cards-design.md)
- **Data table** — a row/column grid; right-align numbers with tabular nums — alignment does zebra-striping's job. → [data-is-content](../philosophy/data-is-content.md)
- **Combobox** — an input/control associated with a popup; some patterns allow free text, others require selecting an option. Implement the appropriate actual pattern.
- **Command menu** — a keyboard-triggered search for navigating or acting; for power users avoiding the mouse.
- **Progress** — a bar for a determinate process; for unknown durations use a spinner instead.
- **Separator** — a visual divider; often overused where spacing would do the same job.

## 13 — Sound

The words for what an interface sounds like. This category is the skill's own extension of the Index module; see [MOC-sound](../sound/MOC-sound.md).

- **Transient** — the sharp onset of a sound; the part you sync to a frame. → [sound-motion-sync](../sound/sound-motion-sync.md)
- **Earcon** — a short abstract tone whose meaning is learned (rising = success); distinct from an *auditory icon*, which imitates a real sound. → [sound-palette](../sound/sound-palette.md)
- **Contour** — the pitch shape of a sound over time: rising, falling, flat. Carries meaning before timbre does. → [sound-palette](../sound/sound-palette.md)
- **Timbre / material** — what the sound is *made of* — wood, glass, breath. A product has one. → [sound-palette](../sound/sound-palette.md)
- **Envelope (ADSR)** — attack, decay, sustain, release; UI sounds are nearly all attack and decay. → [sound-spec](../sound/sound-spec.md)
- **Tail** — the decay after the event; the first thing to cut. → [sound-spec](../sound/sound-spec.md)
- **Dry / wet** — without / with reverb; UI sounds are dry. → [sound-generation-elevenlabs](../sound/sound-generation-elevenlabs.md)
- **One-shot / loop** — a sound that plays once vs one that sustains a state (processing, recording). → [sound-spec](../sound/sound-spec.md)
- **Sprite** — several sounds in one file addressed by offset; one decode for the whole family. → [sound-spec](../sound/sound-spec.md)
- **LUFS / dBFS / true peak** — perceived loudness, sample level, and the reconstructed peak; the three numbers a spec names. → [sound-spec](../sound/sound-spec.md)
- **Ducking** — lowering one track (a bed) while another (a hit, a voice) plays. → [launch-video-music](../sound/launch-video-music.md), [sound-from-motion](../sound/sound-from-motion.md)
- **Pre-roll** — silence before a file's transient; a sync bug disguised as an asset. → [sound-motion-sync](../sound/sound-motion-sync.md)
- **Whoosh / riser / stinger / braam** — the motion-graphics vocabulary: movement, tension build, a brand hit, a cinematic drone. Product UI uses none of them. → [launch-video-sound](../sound/launch-video-sound.md)
- **Audio-haptic harmony** — Apple's term for sound, haptic, and visual describing the same physical event at the same instant. → [sound-motion-sync](../sound/sound-motion-sync.md)

## 14 — Launch film

The words for a rendered film's editorial choices. Like Sound, this category is the skill's own extension of the Index module; see [MOC-launch-video](../launch-video/MOC-launch-video.md).

- **Register** — the editorial mode that fixes a film's cut rate, stillness and loudness; pick it before anything else. → [launch-video-registers](../launch-video/launch-video-registers.md)
- **Poster frame** — 1-4 frames of the finished title or hero at t = 0, then a cut; it fixes the autoplay thumbnail. → [launch-video-structure](../launch-video/launch-video-structure.md)
- **Cut the curve** — HyperFrames' lateral hard cut taken at peak speed: the exit accelerates into the cut and the entry decelerates out of it on mirrored curves, so the speed is equal on both sides. Inside a HyperFrames project the stamped eases win ([hyperframes-reconciliation](../launch-video/hyperframes-reconciliation.md)). → [launch-video-seams](../launch-video/launch-video-seams.md)
- **Scale cut** — scale changed by a cut rather than a zoom: a one- or two-frame jump of ~2-3× on the element being read. → [launch-video-cuts](../launch-video/launch-video-cuts.md)
- **Subtractive punctuation** — the low end or the whole mix taken away just before a key beat, so the reveal lands on something withheld. → [launch-video-sound](../sound/launch-video-sound.md)

## Sources

- *Index — Say Precisely What You Mean*, Emil Kowalski & Glenn Carstens-Peters — [index.how/to/articulate](https://index.how/to/articulate). The 188-term articulate module this lexicon is seeded from; the canonical reference, arriving fall 2026. Glosses here are this skill's own.
- Launch film terms: HKTITAN's launch-film corpus (Skale and acclaimed films, measured 2026-09-28, `docs/research/launch-films/`) and heygen-com/hyperframes `.agents/skills/cut-the-curve/SKILL.md` (Apache-2.0, repo-internal).
- Cross-linked throughout to this skill's own clusters: [MOC-philosophy](../philosophy/MOC-philosophy.md), [MOC-motion](../motion/MOC-motion.md), [MOC-surface](../surface/MOC-surface.md), [MOC-typography](../typography/MOC-typography.md), [MOC-components](../components/MOC-components.md), [MOC-layout](../layout/MOC-layout.md), [MOC-anti-patterns](../anti-patterns/MOC-anti-patterns.md), [MOC-sound](../sound/MOC-sound.md), [MOC-launch-video](../launch-video/MOC-launch-video.md).
