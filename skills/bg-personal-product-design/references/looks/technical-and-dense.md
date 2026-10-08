# Looks: technical and dense

Part of the [looks library](../looks-library.md). Every value is a starting point for a direction, never a default. A product's approved look and tokens always win.

### T1 Precision Console
**Suits:** developer tools, pro productivity, command-driven apps, power users. **Avoid for:** first-time consumers, children.
- **Type:** technical sans (IBM Plex Sans, Geist) with a matching mono for numbers, IDs and code; all numbers tabular.
- **Colour:** dark graphite ground (`#17191C`-`#1C1E22`), two tonal surface steps, one warm accent for focus and action; status colours desaturated so they never shout.
- **Space and shape:** compact rows (32-36 px), panels radius about 8, docked inspector, command bar first.
- **Material:** matte; separation by tone, not shadow.
- **Motion:** 100-150 ms ease-out; instant list filtering; no ambient motion.
- **Signature:** keyboard hints beside every action, a command palette, monospaced right-aligned numbers.

### T2 Tactical Telemetry (CRT terminal)
**Suits:** security, monitoring, infrastructure, space or defence-flavoured brands, technical portfolios. **Avoid for:** wellness, family, long reading.
- **Type:** mono dominant (JetBrains Mono, IBM Plex Mono, Space Mono), uppercase micro labels with wide tracking; one heavy grotesk for big headings.
- **Colour:** deactivated-CRT ground `#0A0A0A`-`#121212` (not pure black), phosphor white `#EAEAEA` text, one hazard red accent; terminal green `#4AF626` for one single readout only.
- **Space and shape:** dense tabular data, visible borders, radius 0, ASCII brackets and crosshairs.
- **Material:** scanlines via `repeating-linear-gradient` on a fixed overlay, global noise, no glass.
- **Motion:** text scramble on load, blinking caret, ticking counters; respect reduced motion.
- **Signature:** semantic `<data>`, `<samp>`, `<output>` elements; status codes and unit IDs as decoration that is also true.

### T3 Data-Dense Dashboard
**Suits:** analytics, finance, operations, admin, BI. **Avoid for:** marketing pages.
- **Type:** one sans with tabular numerals; mono for IDs; three to four sizes only.
- **Colour:** neutral ground, one brand accent for selection, a dedicated data palette (sequential, diverging, categorical) separate from UI colour.
- **Space and shape:** compact density, cards only where elevation means something; otherwise divider lines and whitespace; radius 4-8.
- **Material:** flat.
- **Motion:** charts morph between states instead of redrawing; numbers count only on first load.
- **Signature:** sparklines inside table cells, direct labels on charts, sticky header plus frozen first column.

### T4 Cobalt Blueprint
**Suits:** engineering SaaS, construction, planning tools, B2B data grids. **Avoid for:** lifestyle.
- **Type:** IBM Plex Sans and Mono or similar; precise and small.
- **Colour:** pale blue-white `#F1F5FA`, cobalt `#0957C3` for action and lines, ink text.
- **Space and shape:** compact, radius 4 controls, 48 px grid visible only in margins.
- **Material:** flat with fine grid paper texture.
- **Motion:** instant; lines draw in on first view only.
- **Signature:** dimension-line annotations, grid margins, small coordinate labels.

### T5 Terminal CLI
**Suits:** developer and crypto tools, hacker-culture products, alternate-reality games. **Avoid for:** broad audiences.
- **Type:** one mono for everything; size steps via weight and case.
- **Colour:** black or very dark ground with a single phosphor colour (green, amber or cyan) and dimmed variants.
- **Space and shape:** character-grid layout, box-drawing characters for frames, radius 0.
- **Material:** optional glow on text (subtle), scanlines optional.
- **Motion:** typewriter output, cursor blink, instant screen swaps.
- **Signature:** prompt lines, ASCII art headers, commands as buttons.

### T6 HUD and Sci-Fi Interface
**Suits:** games, space tech, simulation, immersive dashboards, film-style brand moments. **Avoid for:** reading, ordinary business, accessibility-critical flows.
- **Type:** condensed technical sans or mono; tiny labels around large readouts.
- **Colour:** dark ground, cyan or amber line work, translucent fills.
- **Space and shape:** angled corners (clip-path chamfers), thin frames, radial gauges.
- **Material:** glow lines, faint grid, holographic transparency.
- **Motion:** scanning sweeps, boot sequences, data streaming (always with a reduced-motion still).
- **Signature:** brackets that frame the focused item, live coordinates, reticles.

### T7 Enterprise Calm (system-aligned)
**Suits:** B2B back offices, government, finance, internal tools with many forms. **Avoid for:** launch marketing.
- **Type:** one highly legible sans; Inter or the platform font is right here (see the font conflict in the [craft toolbox](../craft-toolbox.md#typography)).
- **Colour:** neutral grey ladder, one trustworthy blue or green accent, complete semantic colours with text labels.
- **Space and shape:** comfortable density, radius 4-6, clear form groups.
- **Material:** light elevation for overlays only.
- **Motion:** minimal, under 200 ms.
- **Signature:** perfect forms: labels above inputs, inline validation, clear required markers, readable tables.
