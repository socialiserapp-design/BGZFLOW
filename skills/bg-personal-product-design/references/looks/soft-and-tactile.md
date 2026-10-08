# Looks: soft, tactile and natural

Part of the [looks library](../looks-library.md). Every value is a starting point for a direction, never a default. A product's approved look and tokens always win.

### S1 Soft Structuralism
**Suits:** consumer apps, health, portfolios, friendly SaaS. **Avoid for:** dense data.
- **Type:** massive bold grotesk headings (Satoshi, General Sans, Cabinet Grotesk), relaxed body.
- **Colour:** silver-grey or white ground, near-black text, one soft accent.
- **Space and shape:** airy, floating components; radius 20-32.
- **Material:** very diffuse ambient shadows tinted to the ground hue (for example `0 24px 48px -12px` at 6-8% alpha).
- **Motion:** gentle spring lifts; 0.98 press.
- **Signature:** components that seem to hover with no visible border.

### S2 Machined Double Bezel
**Suits:** premium hardware, AI and tech products, high-end SaaS marketing. **Avoid for:** dense operations, retro or raw brands.
- **Type:** refined grotesk (Geist, Plus Jakarta Sans), eyebrow tags as tiny pills with 0.2 em tracking.
- **Colour:** either light silver or deep near-black; hairline rings at 5-10% alpha.
- **Space and shape:** every major card is an outer shell (subtle fill, hairline ring, padding 6-8, large radius) holding an inner core whose radius is outer minus padding; section spacing 6-10 rem.
- **Material:** inner top highlight `inset 0 1px 1px rgba(255,255,255,.15)`; glass only on fixed elements.
- **Motion:** heavy fade-up with blur 800 ms on `cubic-bezier(0.32,0.72,0,1)`; floating pill nav whose menu icon morphs to a cross.
- **Signature:** button-in-button: a pill CTA whose trailing arrow sits in its own circle and nudges diagonally on hover.

### S3 Claymorphism
**Suits:** children's and learning apps, playful onboarding, gamified habits. **Avoid for:** finance, legal, serious data.
- **Type:** rounded friendly sans (Nunito, Baloo, Fredoka), large and bold.
- **Colour:** pastels (peach `#FDBCB4`, baby blue `#ADD8E6`, mint, lilac) on a light ground; dark text for contrast.
- **Space and shape:** radius 20-32, chunky 3-4 px borders optional, big touch targets.
- **Material:** inner plus outer soft shadows (`inset -2px -2px 8px` with `4px 4px 8px`), puffy 3D clay renders as illustrations.
- **Motion:** squishy press (scale 0.95 then spring back), bouncy entries in this look only.
- **Signature:** clay 3D mascots or objects; buttons that feel like soft toys.

### S4 Neumorphism (soft extrusion)
**Suits:** single-purpose controls, smart-home remotes, timers, meditation tools. **Avoid for:** complex apps, data, anything needing strong contrast.
- **Type:** quiet rounded sans.
- **Colour:** one mid-light ground (for example `#E8ECF2`) shared by surface and controls; accent only for the active state.
- **Space and shape:** radius about 14-20, generous spacing.
- **Material:** paired light and dark shadows (`-5px -5px 15px` light, `5px 5px 15px` dark); inset when pressed.
- **Motion:** 150 ms press into the surface.
- **Signature:** dials and toggles that look moulded from the background. Contrast is weak by nature: add text labels and a visible focus ring, and measure every pair.

### S5 Tactile Deformable
**Suits:** playful consumer apps, entertainment, toys, creative tools. **Avoid for:** enterprise, data.
- **Type:** bold rounded sans.
- **Colour:** glossy jelly colours (pink `#FF9ECD`, sky `#87CEEB`) with chrome highlights.
- **Space and shape:** blobby radii, squircles.
- **Material:** glossy highlight gradient (`linear-gradient(135deg, white, transparent 60%)`), deep soft shadow.
- **Motion:** press squash (scale 0.95, slight stretch), spring back (stiffness about 300, damping about 20); pair with a light haptic on native.
- **Signature:** controls that wobble like jelly when dragged.

### S6 Skeuomorphic Craft
**Suits:** music instruments, audio tools, games, premium collector apps, nostalgic utilities. **Avoid for:** modern enterprise, accessibility-critical flows.
- **Type:** engraved or embossed labels; a classic serif or industrial sans by subject.
- **Colour:** real material colours: wood, leather, brushed metal, enamel.
- **Space and shape:** physical proportions (knobs, faders, switches).
- **Material:** layered lighting gradients (8-12 stops), texture overlays, 3+ shadow layers.
- **Motion:** physical: 300-500 ms with inertia; knobs that rotate with drag.
- **Signature:** one convincing physical object (a dial, a record, a notebook) rather than textures everywhere.

### S7 Organic Biophilic
**Suits:** wellness, sustainability, gardening, outdoor, health. **Avoid for:** gaming, industrial.
- **Type:** humanist sans (Manrope, Nunito Sans) with a soft serif for headings.
- **Colour:** forest, moss, sky, sand; cream ground (`#F5F5DC`-like) or pale green `#F2F6EF`.
- **Space and shape:** organic radii (16-24, varied per corner for blobs), flowing SVG shapes.
- **Material:** soft natural shadows (`0 8px 32px` at 8%), leaf or paper texture.
- **Motion:** slow ease-out, growth metaphors (a progress plant, unfurling leaves).
- **Signature:** blob-masked photos, hand-drawn botanicals.

### S8 Nature Distilled
**Suits:** artisan goods, food, spas, slow travel, sustainable products. **Avoid for:** tech startups, nightlife.
- **Type:** warm serif headings with a clean sans body.
- **Colour:** terracotta `#C67B5C`, sand `#D4C4A8`, clay `#B5651D`, cream `#F5F0E1`, olive `#6B7B3C`.
- **Space and shape:** generous, radius 8-16, arch shapes.
- **Material:** grain at about 10%, muted gradients, natural-light photography.
- **Motion:** subtle parallax, natural ease-out.
- **Signature:** material photography (clay, linen, stone) as section grounds.

### S9 Sketch and Hand-Drawn
**Suits:** children's books, creative brands, early prototypes, informal community tools. **Avoid for:** fintech, healthcare.
- **Type:** handwritten display (Kalam), friendly hand body (Patrick Hand) or a clean sans for long text.
- **Colour:** warm paper `#FDFBF7`, pencil `#2D2D2D`, red marker `#FF4D4D`, ballpoint blue `#2D5DA1`, sticky-note yellow `#FFF9C4`.
- **Space and shape:** wobbly radii different per corner (15/25/20/10), 2-3 px solid or dashed borders, hard offset shadow (4 px, 4 px), cards rotated -1 to 1 degree.
- **Material:** paper texture, tape and sticky notes.
- **Motion:** sketch-in line drawing, jittered hover.
- **Signature:** doodled arrows and underlines that annotate the real UI.

### S10 Anti-Polish Raw
**Suits:** artists, indie makers, zines, music, handmade brands. **Avoid for:** corporate, finance, health.
- **Type:** mixed: typewriter, marker, collage cut-outs.
- **Colour:** paper `#FAFAF8`, marker black, kraft brown `#C4A77D`, watercolour washes.
- **Space and shape:** deliberately uneven alignment, collage layering, random rotation within -3 to 3 degrees.
- **Material:** scanned textures, tape, ink splatter.
- **Motion:** hand-drawn frame animation, no smooth tweening.
- **Signature:** visible process marks (crop marks, scribbles, scans).
