# Craft toolbox

Concrete actions to apply **inside the chosen look**. Nothing here sets a look or overrides approved tokens. Items already covered elsewhere are linked, not repeated: polish principles and optical craft in [techniques](techniques.md), the effect contract in [motion and effects](motion-and-effects.md), cinematic recipes in [cinematic motion and 3D](cinematic-motion-and-3d.md), native motion in [motion by platform](motion-by-platform.md). Naming a tool, font or library grants no install or spending authority. Use existing applicable approval; ask before new spending or access outside it.

## Typography

- **Set roles before sizes.** Name the roles the screen needs (display, title, body, label, data, code) and use the fewest families that make the hierarchy unmistakable; combine size, weight, space and tone instead of size alone.
- **Use fluid type on the web.** Size display text with `clamp(min, preferred vw, max)`; keep body fixed in rem so user zoom works.
- **Consider variable fonts where useful.** Compare a variable file with the required static weights for actual size, rendering and platform support. Where supported, tune `wght`, `opsz` (optical size: display versus small text) and `wdth`; test `font-optical-sizing: auto` against the approved design.
- **Compose headline wrapping at real viewport sizes.** Two or three lines can suit a compact hero, while editorial layouts or translated content may need more. Adjust the measure and type without shrinking readable text to meet a line quota. Consider `text-wrap: balance` for headings and `text-wrap: pretty` for paragraphs where supported.
- **Set a readable text measure.** For long web prose, try 60-75 characters (`max-width: 65ch`) and line height 1.5-1.7, then test the actual font, language, zoom and available space. Tighter display leading such as 0.9-1.1 is an option only when glyphs remain unclipped; do not impose it on body text or native controls.
- **Use tabular numerals** (`font-variant-numeric: tabular-nums`) for any number that changes or lines up in columns; lining figures in tables, old-style figures only in prose if the look wants it.
- **Clear italic descenders.** Display italics with y, g, j, p, q need leading of at least 1.1 and a small bottom reserve, or they clip.
- **Emphasise within one family.** Italic or bold of the same family for a highlighted word; mixing a stray serif into a sans headline is a look choice, not a default.
- **Hang punctuation and set real quotes** (curly quotes, true apostrophes, en dashes for ranges, non-breaking space before units).
- **Source fonts with licences in mind.** Free for commercial use: Google Fonts (OFL), Fontshare (free licence; Satoshi, General Sans, Cabinet Grotesk, Clash Display, Switzer), Geist, IBM Plex, Inter, JetBrains Mono, Manrope, Outfit. For paid families (for example Neue Haas, GT, PP, Söhne, Lyon), check existing licence and spending authority and compare a suitable free alternative before any new purchase. Record the licence in the design notes.
- **Self-host and subset** web fonts (WOFF2, `font-display: swap`, preload the one above-the-fold face, size-adjusted fallback to avoid layout shift). On native, bundle the files and map them to platform text styles so Dynamic Type or font scale still works.
- **Check pairing fit** with a specimen line in the real UI sizes, not a poster. Data sets of tested pairings exist in public style catalogues; treat them as candidates.

## Colour

- **Build roles, not swatches:** canvas, raised surfaces, primary and secondary text, action, focus, selection, border, success, warning, error, info, and a separate data palette when charts exist.
- **Generate ramps in OKLCH** for new web palettes so lightness steps are even; keep the project's existing colour space when one exists.
- **Give accents clear roles.** Reuse the approved palette consistently; one accent can simplify hierarchy, while multiple brand or semantic accents may be appropriate. Explain a meaningful new role in the existing design context rather than demanding a separate record.
- **Choose contrast and tone for the approved look.** Off-black and off-white may soften large areas; pure black or white may be right for branding, high contrast or OLED. Measure the actual pair and preserve user preferences. Tinting shadows toward the ground hue is an optional material technique.
- **Explore palette families when the choice is open.** Alternatives to warm cream and brass include silver/chrome/smoke, forest/bone/amber, black and tan, cobalt and cream, terracotta and slate, or monochrome with a saturated accent. Compare only useful alternatives; a shared brand or an already chosen palette need not change between products.
- **Choose colour dosage deliberately.** Restrained colour often supports reading and dense tasks; immersive colour can support a campaign or experience. These are starting points, not restrictions on an approved expressive task interface.
- **Measure contrast on the real composite** (see [starter foundation](starter-foundation.md#craft-notes)); add an APCA reading for large display and thin type where the tool supports it.

## Dark mode

- **Decide per product whether dark exists**, then design it, never invert it. Never impose dark mode on a product that has not chosen it.
- **Use tonal elevation:** higher surfaces get lighter, not shadowed; keep 3-4 surface steps.
- **Desaturate and lighten accents** for dark grounds so they do not vibrate; recheck every pair.
- **Keep separate tokens** for light and dark with the same role names; switch with a class or `prefers-color-scheme`, and suppress transitions during the switch so colours do not animate.
- **Test the supported modes** on affected screens, including images, charts, shadows and focus rings. Adapt assets where needed for a supported dark mode; do not introduce a new theme or duplicate assets simply to complete this list.

## Layout and responsive or adaptive

- **Design for the intended devices and tasks.** Start with the primary surface, then adapt to the other supported sizes, input methods and orientations. A narrow layout may need one column; determine its breakpoint from content fit rather than a universal 768 px rule. Preserve useful overlaps or rotation if they remain readable and operable on touch.
- **Choose layout primitives for the actual runtime.** Container queries help components reused at different widths. For full-height web sections, compare dynamic, small and large viewport units with a compatible fallback; test browser chrome and the keyboard rather than universally replacing `100vh`.
- **Adapt, not just stretch.** Extra panes can benefit a supported tablet or desktop task, but are not new feature requirements. Respect foldable hinges where relevant and let large text reflow rather than truncate.
- **Check a chosen grid at relevant breakpoints.** `grid-auto-flow: dense` can fill gaps but must not create a confusing visual order relative to reading and keyboard order. Intentional whitespace is valid; do not add content to fill a cell.
- **Draw hairline grids** with `gap: 1px` on a contrasting parent instead of many borders.
- **Prevent horizontal scroll** caused by off-screen animation: fix the overflowing element; `overflow-x: clip` on the root is a last resort that must not hide real content.
- **Vary the hero architecture** across directions: cinematic centre, editorial split, asymmetric with overlapping image, manifesto poster, media mask, pinned hero.
- **Compare section layouts where useful:** asymmetric bento, a z-axis cascade with slight rotations, an editorial split, or a plain long-form column. Adapt rotations, overlaps and horizontal controls when content fit or input testing shows a problem; no universal breakpoint is required.

## Surfaces and materials

- **Separate structure, focus and elevation:** borders for structure, rings for focus, shadows for elevation; never one doing another's job.
- **Nest radii concentrically** (see [optical craft](techniques.md#optical-craft-and-anti-generic-checks)); the double-bezel shell is one look's signature, not a rule for all.
- **If the approved look uses grain or noise,** a single `pointer-events-none` overlay can reduce duplicated work. Choose fixed, local or pre-rendered placement by the intended material and measured paint cost; keep content and controls unobstructed.
- **Use blur where its measured cost and readability are acceptable.** Fixed or sticky chrome is one common placement, not the only permitted one. Provide an appropriate opaque or static treatment for reduced transparency and unsupported or constrained devices.
- **For a chosen halftone, dither or scanline treatment,** compare a pre-processed image with a bounded overlay and keep text crisp. Do not add a texture solely because this recipe exists.
- **Outline images subtly** (1 px at about 10% alpha, inside) so pale images keep their edge on pale grounds.

## Micro-interactions

- **Press:** scale to the product's press token (sources range 0.95-0.98); pair with a colour or shadow change so the state is visible without motion.
- **Hover (pointer devices only):** use `@media (hover: hover)`; directional fill from the entry side, spotlight borders, magnetic pull of 4-8 px, or a nested icon that nudges diagonally, chosen by look.
- **Choose feedback for icon swaps** such as copy-to-check or play-to-pause. A short opacity or scale change may help; a hard swap is appropriate for reduced motion or an intentionally immediate interface. Keep the accessible name and actual state correct.
- **Optional menu and dialog continuity:** a menu icon can become a close icon, or a button can carry into a dialog through a shared element. Use stagger only when it improves comprehension without delaying interaction; preserve an existing simpler transition when it fits.
- **Avoid repetitive entry animation.** Preserve context on back navigation and animate a first load only when the approved experience benefits; reveal useful content promptly and honour reduced motion.
- **Make exits subtler than entries** (shorter, smaller distance, about 75-80% of entry time).
- **Keep animations interruptible** and use `will-change` only while something animates.
- **Optimistic toggles** only for safe, reversible preferences (see polish principle 3 in [techniques](techniques.md#eight-polish-principles)).

## Sound and haptics

- **Haptics map to meaning:** selection tick for pickers and snaps, light or medium impact for a drag landing, success, warning or error notification only after the outcome is confirmed. Use the platform API: SwiftUI `.sensoryFeedback`, UIKit feedback generators, Android `performHapticFeedback` with `HapticFeedbackConstants`, Expo `expo-haptics`. Respect system settings; never vibrate on the web as a substitute.
- **Honour the approved audio experience,** browser autoplay requirements and system sound preferences. Do not add sound or a new consent control merely to follow a recipe. For requested UI sound, short cues (often under 200 ms) can work; keep essential feedback available visually or accessibly, with haptics only where appropriate.
- **Choose sounds by look:** soft wood or felt clicks for calm looks, chiptune for pixel looks, glassy tones for glass looks, none for document looks.
- **Source sounds** from CC0 or royalty-free libraries, or synthesise them with the Web Audio API or a tiny tone generator; record the licence. Use existing licence and spending authority; new paid packs need approval when not already covered.
- **Never use sound for errors alone** and never autoplay audio on page load.

## Icons and illustration

- **Use coherent icons matched to the product and platform.** A single family often helps; platform symbols, brand marks or a justified specialist set can coexist with consistent optical size, stroke and meaning. Candidates include Phosphor, Remix, Tabler, Radix, SF Symbols and Material Symbols.
- **Match icon stroke to text weight** and size icons on a 16/20/24 grid; centre asymmetric glyphs optically.
- **Give illustrations a coherent art direction.** Line art, geometric, isometric, clay, collage, hand-drawn and pixel work are options. Preserve an approved mixed-media identity where it has a purpose; do not force every asset into one style.
- **Use spot illustrations** for empty states, onboarding and success; never as filler on task screens.
- **Avoid emoji as icons** unless the look is deliberately playful and the platform renders them consistently.

## Asset generation

- **Use visual alternatives when they resolve an open design choice.** Show enough of the real screen and content to compare plausible directions; the number and medium depend on the decision. Reuse an already agreed look for ordinary changes. Ask when a material choice remains unresolved, without adding a routine approval step or treating an illustrative image as approval of every detail.
- **Write art-direction prompts** with subject, light, lens or viewpoint, palette, texture, composition and a text-safe area; keep a short design bible (palette, type character, materials) and reuse it so a set of screens stays consistent.
- **Record provenance** for every generated or sourced image: tool, prompt or source link, licence. Never present generated people as real customers or testimonials.
- **Prefer real product imagery** over generic stock; when stock is needed, grade it to the palette (desaturate, warm or cool, grain).
- **Optimise delivery:** AVIF or WebP with fallbacks, `srcset` and `sizes`, blurred low-quality placeholders, explicit width and height, posters for video, lazy loading below the fold.
- **3D and motion assets** follow the [asset pipeline](cinematic-motion-and-3d.md#5-3d-asset-pipeline-and-sources).

## Data visuals

- **Pick the chart by the question:** change over time (line), comparison (bar), part of whole (stacked bar, rarely pie), distribution (histogram, box), relationship (scatter), geography (map) and a plain table when exact values matter.
- **Label directly** on lines and bars instead of legends; highlight the one series that matters and grey the rest.
- **Use a dedicated data palette** that is colour-blind safe, with sequential and diverging scales separate from UI colours.
- **Make data changes understandable.** A short transition can reveal a filter or time-range change; an immediate redraw may be clearer for frequent or live updates and reduced motion. Do not animate numbers in a way that obscures their current value.
- **Show the chart's shape while loading** and give an accessible table or summary sentence beside every chart.
- **Render large datasets** on canvas or WebGL; keep SVG for small, interactive charts.

## Empty, loading and error states

- **Name the empty kind and design each:** first use (value plus a template or sample), user cleared (light touch, easy to recreate), no results (suggest a new query, clear filters), no permission (why and how to get access), failed to load (what happened, retry).
- **Choose the loading form by wait:** under about 300 ms show nothing, short waits a skeleton in the real layout shape, longer known work a progress bar with truthful steps, unknown blocking work a labelled activity indicator.
- **Write errors as cause plus fix** in plain words and keep the user's input. Hide raw internal errors; use provider names only where the product and user's current decisions call for them, preserving approved provider-selection labels.

## Onboarding

- **Get to value fast:** let people act first and learn by doing; ask only for what the first task needs.
- **Show, don't tell:** sample data, templates and a pre-filled example beat slides.
- **Keep every tour skippable and resumable;** onboarding never becomes a new gate in front of the product.
- **Ask for permissions in context,** just before the feature that needs them, with a sentence on why.
- **Use contextual tips and a short checklist** for feature discovery instead of a long upfront tour.
- **Keep the first screen focused on its actual job.** A single message and action can suit onboarding; dashboards and returning users may need several actions and no image. Preserve essential content and approved navigation.

## Delightful details

- **Choose purposeful delight where it fits.** Agree the intended feeling when consequential and use it at meaningful moments such as success or mastery; a separate thesis document is unnecessary.
- **Match the response to the effort:** routine saves feel certain and quiet; big milestones may celebrate.
- **Keep delight honest:** no fake waiting, no delayed completion for a flourish, no jokes about money, privacy or lost work.
- **Make repeated interactions satisfying after the hundredth use;** surprise only where it cannot confuse.
- **Apply the peak-end rule:** polish the best moment and the last moment of each flow most.

## Words in the interface

- **Label buttons with the verb and object** ("Save draft", "Send invoice"), not "OK" or "Submit".
- **Use real, specific content** in mocks: no lorem ipsum, no "John Doe" or "Acme", no filler statistics.
- **Cut cliché words** such as elevate, seamless, unleash, next-gen and game-changer; say what the product does.
- **Avoid template chrome** that appears whatever the subject: tracked-out labels above every heading, "SECTION 01" markers, dot-joined meta strings.

## Design QA with screenshots

- **Capture representative affected screens and states on their supported surfaces.** Choose sizes around actual content-fit boundaries, relevant text scaling and supported themes or accessibility preferences. Phone, tablet and desktop widths are examples, not a required matrix for every change.
- **Freeze moving parts** (clocks, prices, animations, random seeds) before capture so comparisons are fair.
- **Compare with the approved reference or baseline** under equivalent conditions. Record meaningful differences and inspect alignment, radius and icons where affected; do not turn intended or irrelevant differences into a new approval gate.
- **Run the silhouette test:** remove colour and compare directions or before and after; hierarchy must still read.
- **Check overflow, focus order and contrast** on the rendered result, not the design file; record tool and dimensions.
- **On phones, check the real device or simulator build;** web screenshots are not proof of native rendering.
- **Screenshot baselines are a report for the checker, never a customer-facing block.**

## Reference gathering

- **Gather references when they inform an open choice.** Use enough varied, relevant examples to understand the approach, stopping when the decision is supported. Existing approved references may suffice. Possible sources include screen galleries, actual products and typography collections; retain the source links without a quota.
- **Seek different relevant approaches when comparing directions.** Use references for layout, flow and detail ideas without copying protected assets or imposing variation on an already agreed identity.
- **Check access cost:** use existing authorised access where available. A new paid plan needs the relevant approval; do not buy it merely to fill a reference quota.
- **Capture what makes each reference good** in one line (for example "pinned title with scrolling proof"), so the idea transfers without the skin.

## Native craft pointers

- **Apple:** Dynamic Type text styles, SF Symbols with rendering modes and symbol effects, sheets with detents, system materials, Liquid Glass guarded by OS version with a designed fallback, 44 pt targets.
- **Android:** Material 3 roles and dynamic colour, tonal elevation, predictive back, edge-to-edge with insets, 48 dp targets.
- **Expo and React Native:** guard glass with an availability check before using it, prefer native tabs and sheets where the look allows, keep one styling system, virtualise long lists.
- **Pick one platform feel per screen** (iOS-native, Android-native or cross-platform neutral) and stay coherent.

## When sources disagree

Keep both options and choose by product and look. The approved look always wins.

| Topic | Option A | Option B | Choose A when | Choose B when |
|---|---|---|---|---|
| Inter and system fonts | Avoid as a default to escape the generic look | Use them | The look needs character (marketing, premium, expressive) | Neutral, accessibility-first, public-sector or enterprise looks, or the product already uses them |
| Serif display | Discourage; sans display by default | Use an editorial serif | Most modern, technical and product UI | Editorial, luxury, publishing, heritage or scholarly looks; rotate the serif per product |
| Glass and blur | Heavy glass and orbs | No glass, flat | Glass, spatial and platform-glass looks on capable devices | Minimal, editorial, brutalist and data looks; low-end devices |
| Endless motion | Ambient loops and perpetual micro-motion | No endless loops | Aurora, playful and cinematic looks, paused off-screen | Operate surfaces, reading, reduced motion |
| Icon weight | Ultra-thin line sets | Bolder or filled sets | Refined, luxury, glass looks | Technical, friendly, small sizes, low vision |
| Centred hero | Avoid centre bias | Centred hero | Asymmetric, editorial, product-led pages | Manifesto, launch announcement, cinematic centre |
| Pills | Pills for buttons and nav | No large pills | Soft, glass, Material looks | Minimal, Swiss, brutalist looks |
| Cards | Cards everywhere for grouping | Dividers and space instead | Elevation carries real hierarchy | Dense data, documents, minimal looks |
| Press scale | 0.95 squish | 0.98 subtle | Playful and tactile looks | Calm, professional looks; the product token wins either way |
| Emoji | Allowed | Banned | Deliberately playful, social, chat | Everything else |
| Purple and neon | Avoid as a default | Embrace | No brand reason | The brand or brief asks for it; execute with one palette |
