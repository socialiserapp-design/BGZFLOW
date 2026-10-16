# Looks: quiet and editorial

Part of the [looks library](../looks-library.md). Every value is a starting point for a direction, never a default. A product's approved look and tokens always win.

### Q1 Warm Utilitarian Minimal (document style)
**Suits:** writing tools, notes, knowledge bases, calm productivity, documentation. **Avoid for:** games, youth brands, loud launches.
- **Type:** characterful system or geometric sans for UI (Geist, Switzer, SF Pro); an editorial serif only for page titles and quotes (Newsreader, Lora); a mono for shortcuts and metadata. Body line height 1.6, never pure black text (`#111111` to `#2F3437`), secondary text a warm grey near `#787774`.
- **Colour:** white or warm off-white canvas (`#FFFFFF`, `#F7F6F3`); hairline borders `#EAEAEA`; colour only as washed-out pastel tags with dark text of the same hue (pale red `#FDEBEC` / `#9F2F2D`, pale blue `#E1F3FE` / `#1F6C9F`, pale green `#EDF3EC` / `#346538`, pale yellow `#FBF3DB` / `#956400`).
- **Space and shape:** large section spacing, content width about 4xl-5xl; radius 8-12 on cards, 4-6 on buttons; pills only for tiny tags.
- **Material:** flat; shadows below 0.05 alpha or none; near-invisible warm grain on photos.
- **Motion:** quiet: 12 px fade-up over 600 ms on `cubic-bezier(0.16,1,0.3,1)`, 80 ms stagger, 0.98 press.
- **Signature:** `<kbd>` keys drawn as small physical keycaps; faux window chrome around product shots; FAQ as divider lines with a sharp `+`; continuous-line ink illustration with one offset pastel shape.

### Q2 Editorial Luxury
**Suits:** lifestyle, real estate, hospitality, studios, premium consumer stories. **Avoid for:** dense operations, children.
- **Type:** high-contrast variable serif at very large display sizes with tight tracking (-0.02 to -0.04 em), paired with a quiet grotesk; small caps or wide-tracked micro labels used sparingly.
- **Colour:** warm cream or bone canvas, espresso or ink text, one muted accent (sage, olive, oxblood). This warm-craft palette is a common AI default: pick it only with a product reason, and offer an alternative family in the same round (see colour rotation in the [craft toolbox](../craft-toolbox.md#colour)).
- **Space and shape:** editorial split (huge type one side, image or scrolling pills the other), generous margins, sharp or very small radii.
- **Material:** fixed, pointer-events-none film grain at about 3% opacity; full-bleed photography with warm grade.
- **Motion:** slow image reveals (clip or scale 1.05 to 1), line-by-line headline rise.
- **Signature:** a drop cap or numbered chapter, captioned photography, one italic word in the headline set in the same family.

### Q3 Exaggerated Minimalism
**Suits:** fashion, architecture, portfolios, agencies, one-message launches. **Avoid for:** catalogues, dashboards, forms.
- **Type:** one family, weight 800-900, display at `clamp(3rem, 10vw, 12rem)`, tracking about -0.05 em, leading 0.9.
- **Colour:** black, white and a single saturated accent used once or twice per page.
- **Space and shape:** huge empty space (sections about 8 rem), sharp corners, content pinned to one edge.
- **Material:** none.
- **Motion:** few, decisive moves: a word slides in, a mask opens; nothing ambient.
- **Signature:** one oversized word or number as the composition; the accent marks the single action.

### Q4 Swiss Modernism 2.0
**Suits:** institutions, museums, corporate sites, editorial SaaS, annual reports. **Avoid for:** playful or children's products.
- **Type:** rational neo-grotesk with strong size steps; flush-left, ragged-right; numbers lined and tabular.
- **Colour:** white, black, light grey `#F5F5F5`, one vivid accent (signal red, cobalt); no gradients.
- **Space and shape:** visible 12-column grid, 8 px base unit, modular blocks aligned to grid lines, radius 0-4.
- **Material:** flat; rules and blocks instead of shadows.
- **Motion:** instant or short linear slides; grid-snapped transitions.
- **Signature:** asymmetric layout with large numerals, captions hung in the margin column, rules spanning the full grid.

### Q5 Swiss Industrial Print
**Suits:** engineering brands, hardware, studios, technical portfolios, data-forward marketing. **Avoid for:** soft consumer, wellness.
- **Type:** heavy uppercase grotesk at `clamp(4rem, 10vw, 15rem)`, leading 0.85-0.95, tracking -0.03 to -0.06 em; uppercase mono micro text 10-14 px with wide tracking for metadata.
- **Colour:** unbleached paper `#F4F4F0` or `#EAE8E3`, carbon ink `#050505`-`#111111`, one hazard red `#E61919` as the only accent.
- **Space and shape:** blueprint grid with visible 1-2 px borders, `gap: 1px` grids on a contrasting parent for hairlines, radius 0 everywhere, bimodal density (packed metadata next to vast empty fields).
- **Material:** halftone or 1-bit dithered imagery, global low-opacity noise.
- **Motion:** mechanical: instant state changes, counters, ticker text.
- **Signature:** ASCII framing (`[ SECTION ]`, `>>>`), registration and trademark marks used as graphic elements, crosshairs at grid intersections, warning stripes, revision labels like `REV 2.6`.

### Q6 E-Ink Paper
**Suits:** reading apps, journals, newsletters, distraction-free writing, long-form archives. **Avoid for:** video, games, high-energy marketing.
- **Type:** a reading serif or humanist sans at comfortable size (18-20 px web), 60-70 character measure, generous leading.
- **Colour:** off-white `#FDFBF7`, ink `#1A1A1A`, pencil grey `#4A4A4A`, one highlighter accent used only for marks.
- **Space and shape:** single centred column, page-like margins, radius 0-4.
- **Material:** faint paper grain; no blur, no glow.
- **Motion:** none or crisp page turns; no fades.
- **Signature:** margin notes, highlighter marks, footnotes that open inline.

### Q7 Magazine Editorial Grid
**Suits:** news, magazines, blogs, long-form publishing, content-led brands. **Avoid for:** apps, dashboards, catalogues.
- **Type:** display serif or condensed grotesk for headlines, readable text face for body, kicker labels, bylines.
- **Colour:** paper white and ink with one section colour per category.
- **Space and shape:** multi-column asymmetric grid, hairline rules, image crops of varying sizes, radius 0. The broadsheet hairline look is also a common AI default: choose it for publishing products, not as a generic premium look.
- **Material:** photography first; pull quotes as type objects.
- **Motion:** restrained; image reveal on scroll, sticky section labels.
- **Signature:** pull quotes, drop caps, captioned photos, issue or section numbering.

### Q8 Scholarly Academia
**Suits:** knowledge management, deep reading, study tools, archives, ritual-heavy personal apps. **Avoid for:** fintech, fast consumer.
- **Type:** classical serif headings (Cormorant, EB Garamond), drop caps, Roman numerals for volumes; readable body serif.
- **Colour:** mahogany `#1C1714` and oak `#251E19` grounds, parchment text `#E8DFD4`, faded ink `#9C8B7A`, brass `#C9A962` actions, library crimson `#8B2635` marks.
- **Space and shape:** radius about 4, arch-topped images (radius about 100 on the top edge), framed panels.
- **Material:** vignette, sepia-tinted images, deep soft shadows.
- **Motion:** slow, time-based fades; no bounce.
- **Signature:** arch frames, brass rules, numbered volumes and chapters.

### Q9 Bold Typography Poster
**Suits:** brand heroes, events, exhibitions, reading-led apps with a strong voice. **Avoid for:** dense tools.
- **Type:** headlines 48-72 px on mobile (about 5:1 to body), tracking about -1.5 px, edge-to-edge words; a sans for UI, an optional italic display for one word, a mono for meta.
- **Colour:** near-black `#0A0A0A`, warm white `#FAFAFA`, one vermilion accent `#FF3D00`.
- **Space and shape:** 60 px plus vertical gaps, radius 0, underline CTAs with a 2-3 px accent line.
- **Material:** none; type is the image.
- **Motion:** 200 ms instant-feeling transitions, no bounce.
- **Signature:** poster-scale words that crop off the edge, underline links as the main action style.

### Q10 Monochrome Gallery
**Suits:** photography, art, fashion e-commerce, media libraries, portfolios. **Avoid for:** data-heavy work.
- **Type:** small, quiet sans labels; the work is the hero.
- **Colour:** pure greys from white to black; colour only from the content itself.
- **Space and shape:** wide gutters, masonry or justified grid, radius 0-2, thin image outlines (1 px at 10% alpha) so pale images hold their edge.
- **Material:** none.
- **Motion:** shared-element zoom from grid to detail, drag-to-pan for large sets.
- **Signature:** a lightbox that feels like walking closer; captions that appear on hover or tap.
