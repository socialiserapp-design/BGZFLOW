# Craft toolbox

Concrete actions to apply **inside the chosen look**. Nothing here sets a look or overrides approved tokens. Items already covered elsewhere are linked, not repeated: polish principles and optical craft in [techniques](techniques.md), the effect contract in [motion and effects](motion-and-effects.md), cinematic recipes in [cinematic motion and 3D](cinematic-motion-and-3d.md), native motion in [motion by platform](motion-by-platform.md). Naming a tool, font or library grants no install or spending authority; anything paid needs the founder's OK first.

## Typography

- **Set roles before sizes.** Name the roles the screen needs (display, title, body, label, data, code) and use the fewest families that make the hierarchy unmistakable; combine size, weight, space and tone instead of size alone.
- **Use fluid type on the web.** Size display text with `clamp(min, preferred vw, max)`; keep body fixed in rem so user zoom works.
- **Use variable fonts.** Load one variable file per family instead of many weights; tune `wght`, `opsz` (optical size: tighter, higher-contrast for display, sturdier for small text) and `wdth` where the font offers them; set `font-optical-sizing: auto`.
- **Keep headlines to two or three lines** at real viewport sizes: widen the container or reduce the clamp rather than accept a tall wrapped wall. Use `text-wrap: balance` on headings and `text-wrap: pretty` on paragraphs.
- **Measure body text** at 60-75 characters (`max-width: 65ch`), line height 1.5-1.7; tighten display leading to 0.9-1.1.
- **Use tabular numerals** (`font-variant-numeric: tabular-nums`) for any number that changes or lines up in columns; lining figures in tables, old-style figures only in prose if the look wants it.
- **Clear italic descenders.** Display italics with y, g, j, p, q need leading of at least 1.1 and a small bottom reserve, or they clip.
- **Emphasise within one family.** Italic or bold of the same family for a highlighted word; mixing a stray serif into a sans headline is a look choice, not a default.
- **Hang punctuation and set real quotes** (curly quotes, true apostrophes, en dashes for ranges, non-breaking space before units).
- **Source fonts with licences in mind.** Free for commercial use: Google Fonts (OFL), Fontshare (free licence; Satoshi, General Sans, Cabinet Grotesk, Clash Display, Switzer), Geist, IBM Plex, Inter, JetBrains Mono, Manrope, Outfit. Paid families (for example Neue Haas, GT, PP, Söhne, Lyon) need the founder's OK; give a free alternative beside each. Record the licence in the design notes.
- **Self-host and subset** web fonts (WOFF2, `font-display: swap`, preload the one above-the-fold face, size-adjusted fallback to avoid layout shift). On native, bundle the files and map them to platform text styles so Dynamic Type or font scale still works.
- **Check pairing fit** with a specimen line in the real UI sizes, not a poster. Data sets of tested pairings exist in public style catalogues; treat them as candidates.

## Colour

- **Build roles, not swatches:** canvas, raised surfaces, primary and secondary text, action, focus, selection, border, success, warning, error, info, and a separate data palette when charts exist.
- **Generate ramps in OKLCH** for new web palettes so lightness steps are even; keep the project's existing colour space when one exists.
- **Lock the accent.** One accent used consistently across the page or app; a second accent only with a documented role.
- **Never pure black or pure white text on large areas**; use off-black and off-white; tint shadows toward the ground hue.
- **Rotate palette families across products.** When a premium or craft brief pulls toward warm cream plus brass, offer other families in the same round: cold luxury (silver, chrome, smoke), forest (deep green, bone, amber), black and tan, cobalt and cream, terracotta and slate, olive and brick on paper, monochrome plus one saturated pop.
- **Choose the colour dosage deliberately.** Restrained (colour for action and status only) for Operate and Read; immersive (colour owns large regions) for Persuade and Experience when the look calls for it.
- **Measure contrast on the real composite** (see [starter foundation](starter-foundation.md#craft-notes)); add an APCA reading for large display and thin type where the tool supports it.

## Dark mode

- **Decide per product whether dark exists**, then design it, never invert it. Never impose dark mode on a product that has not chosen it.
- **Use tonal elevation:** higher surfaces get lighter, not shadowed; keep 3-4 surface steps.
- **Desaturate and lighten accents** for dark grounds so they do not vibrate; recheck every pair.
- **Keep separate tokens** for light and dark with the same role names; switch with a class or `prefers-color-scheme`, and suppress transitions during the switch so colours do not animate.
- **Test both modes** on every changed screen, including images, charts, shadows and focus rings; give logos and illustrations a dark variant.

## Layout and responsive or adaptive

- **Design the phone first and the large screen deliberately.** Asymmetric layouts collapse to a single column below about 768 px; overlaps and rotations are removed on touch screens.
- **Use container queries** for components that live in different widths; use `min-height: 100dvh`, never `100vh`, for full-height sections.
- **Adapt, not just stretch.** Tablet and desktop get extra panes (list plus detail, inspector), foldables respect the hinge, and large text sizes reflow rather than truncate.
- **Fill bento grids** with `grid-auto-flow: dense` and check for empty cells at every breakpoint.
- **Draw hairline grids** with `gap: 1px` on a contrasting parent instead of many borders.
- **Prevent horizontal scroll** caused by off-screen animation: fix the overflowing element; `overflow-x: clip` on the root is a last resort that must not hide real content.
- **Vary the hero architecture** across directions: cinematic centre, editorial split, asymmetric with overlapping image, manifesto poster, media mask, pinned hero.
- **Vary the section layout** too: asymmetric bento (mixed spans), z-axis cascade (overlapping cards at slight -2 to 3 degree rotations), editorial split with horizontally scrolling pills, plain long-form column. Remove rotations and overlaps below about 768 px.

## Surfaces and materials

- **Separate structure, focus and elevation:** borders for structure, rings for focus, shadows for elevation; never one doing another's job.
- **Nest radii concentrically** (see [optical craft](techniques.md#optical-craft-and-anti-generic-checks)); the double-bezel shell is one look's signature, not a rule for all.
- **Put grain and noise on one fixed, pointer-events-none overlay**, never on scrolling containers.
- **Blur only fixed or sticky layers** (nav, sheet, modal); give a solid fallback for reduced transparency and for low-end devices.
- **Use halftone, dithering or scanlines** through pre-processed images or one overlay, keeping text crisp above them.
- **Outline images subtly** (1 px at about 10% alpha, inside) so pale images keep their edge on pale grounds.

## Micro-interactions

- **Press:** scale to the product's press token (sources range 0.95-0.98); pair with a colour or shadow change so the state is visible without motion.
- **Hover (pointer devices only):** use `@media (hover: hover)`; directional fill from the entry side, spotlight borders, magnetic pull of 4-8 px, or a nested icon that nudges diagonally, chosen by look.
- **Animate icon swaps** (copy to check, play to pause) with a short scale, opacity and blur cross-change instead of a hard swap; one SVG recoloured per state.
- **Morph menus and dialogs:** the menu icon turns into a close icon; a button expands into its own dialog (shared element); menu items enter with a short stagger.
- **Skip entry animation on first page load** and on back navigation; animate only what changed.
- **Make exits subtler than entries** (shorter, smaller distance, about 75-80% of entry time).
- **Keep animations interruptible** and use `will-change` only while something animates.
- **Optimistic toggles** only for safe, reversible preferences (see polish principle 3 in [techniques](techniques.md#eight-polish-principles)).

## Sound and haptics

- **Haptics map to meaning:** selection tick for pickers and snaps, light or medium impact for a drag landing, success, warning or error notification only after the outcome is confirmed. Use the platform API: SwiftUI `.sensoryFeedback`, UIKit feedback generators, Android `performHapticFeedback` with `HapticFeedbackConstants`, Expo `expo-haptics`. Respect system settings; never vibrate on the web as a substitute.
- **Sound is opt-in by default** on the web and respects silent mode on phones. Keep UI sounds short (under about 200 ms), quiet and in one family; pair each with a visual and, on phones, a haptic.
- **Choose sounds by look:** soft wood or felt clicks for calm looks, chiptune for pixel looks, glassy tones for glass looks, none for document looks.
- **Source sounds** from CC0 or royalty-free libraries, or synthesise them with the Web Audio API or a tiny tone generator; record the licence. Paid packs need the founder's OK.
- **Never use sound for errors alone** and never autoplay audio on page load.

## Icons and illustration

- **One icon family per product,** matched to the look: thin line sets (Phosphor Light, Remix Line) for refined looks, bolder sets (Phosphor Bold or Fill, Tabler, Radix) for technical or friendly looks, SF Symbols on Apple platforms, Material Symbols on Android (use its weight, fill and grade axes).
- **Match icon stroke to text weight** and size icons on a 16/20/24 grid; centre asymmetric glyphs optically.
- **Pick one illustration style** per product and keep stroke, palette and perspective consistent: continuous line with one pastel shape, flat geometric, isometric, clay 3D render, editorial collage, hand-drawn, pixel sprite.
- **Use spot illustrations** for empty states, onboarding and success; never as filler on task screens.
- **Avoid emoji as icons** unless the look is deliberately playful and the platform renders them consistently.

## Asset generation

- **Generate comps before code** when exploring: whole sections or screens as images, not cropped fragments; three compositional options, then one approval point; the approved comp becomes the spec.
- **Write art-direction prompts** with subject, light, lens or viewpoint, palette, texture, composition and a text-safe area; keep a short design bible (palette, type character, materials) and reuse it so a set of screens stays consistent.
- **Record provenance** for every generated or sourced image: tool, prompt or source link, licence. Never present generated people as real customers or testimonials.
- **Prefer real product imagery** over generic stock; when stock is needed, grade it to the palette (desaturate, warm or cool, grain).
- **Optimise delivery:** AVIF or WebP with fallbacks, `srcset` and `sizes`, blurred low-quality placeholders, explicit width and height, posters for video, lazy loading below the fold.
- **3D and motion assets** follow the [asset pipeline](cinematic-motion-and-3d.md#5-3d-asset-pipeline-and-sources).

## Data visuals

- **Pick the chart by the question:** change over time (line), comparison (bar), part of whole (stacked bar, rarely pie), distribution (histogram, box), relationship (scatter), geography (map) and a plain table when exact values matter.
- **Label directly** on lines and bars instead of legends; highlight the one series that matters and grey the rest.
- **Use a dedicated data palette** that is colour-blind safe, with sequential and diverging scales separate from UI colours.
- **Morph between states** (filters, time ranges) instead of redrawing; animate numbers only on first load.
- **Show the chart's shape while loading** and give an accessible table or summary sentence beside every chart.
- **Render large datasets** on canvas or WebGL; keep SVG for small, interactive charts.

## Empty, loading and error states

- **Name the empty kind and design each:** first use (value plus a template or sample), user cleared (light touch, easy to recreate), no results (suggest a new query, clear filters), no permission (why and how to get access), failed to load (what happened, retry).
- **Choose the loading form by wait:** under about 300 ms show nothing, short waits a skeleton in the real layout shape, longer known work a progress bar with truthful steps, unknown blocking work a labelled activity indicator.
- **Write errors as cause plus fix** in plain words; keep the user's input; never show raw error text or supplier names to customers.

## Onboarding

- **Get to value fast:** let people act first and learn by doing; ask only for what the first task needs.
- **Show, don't tell:** sample data, templates and a pre-filled example beat slides.
- **Keep every tour skippable and resumable;** onboarding never becomes a new gate in front of the product.
- **Ask for permissions in context,** just before the feature that needs them, with a sentence on why.
- **Use contextual tips and a short checklist** for feature discovery instead of a long upfront tour.
- **Make the first screen clean:** one message, one action, one supporting image.

## Delightful details

- **Write one delight thesis** per product (what feeling, where it appears) and spend it at meaningful moments: first success, milestones, recovery, mastery.
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

- **Capture every changed screen** at phone (about 375), tablet (about 768) and desktop (about 1280 and 1440) widths, in light and dark if both exist, at the largest text size, and with reduced motion.
- **Freeze moving parts** (clocks, prices, animations, random seeds) before capture so comparisons are fair.
- **Compare side by side** with the approved picture or baseline and list every difference; zoom crops for alignment, radius and icon checks.
- **Run the silhouette test:** remove colour and compare directions or before and after; hierarchy must still read.
- **Check overflow, focus order and contrast** on the rendered result, not the design file; record tool and dimensions.
- **On phones, check the real device or simulator build;** web screenshots are not proof of native rendering.
- **Screenshot baselines are a report for the checker, never a customer-facing block.**

## Reference gathering

- **Pull 6-8 real references per surface** before drawing directions, from screen and site galleries (for example Mobbin, Page Flows, Refero, Godly, Awwwards, Land-book, Siteinspire, Fonts In Use, Dribbble for illustration). Record each link.
- **Spread references across looks and sources** so directions do not converge; use them for layout, flow and detail ideas, never as templates to copy.
- **Note access cost:** a gallery that needs a paid plan needs the founder's OK; free tiers first.
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
