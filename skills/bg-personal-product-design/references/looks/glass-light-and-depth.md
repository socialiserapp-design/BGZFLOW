# Looks: glass, light, depth and cinematic

Part of the [looks library](../looks-library.md). Every value is a starting point for a direction, never a default. A product's approved look and tokens always win. Cinematic looks are kept brief here: their recipes, levels and guardrails live in [cinematic motion and 3D](../cinematic-motion-and-3d.md), with native equivalents in [motion by platform](../motion-by-platform.md).

### G1 Ethereal Glass
**Suits:** AI products, developer platforms, premium tech launches. **Avoid for:** reading, accessibility-critical flows, low-end phones. Purple-blue glow is a common AI default: use it only with a brand reason and offer a non-purple alternative.
- **Type:** refined grotesk (Geist, Satoshi), white on dark.
- **Colour:** OLED near-black `#050505`, one or two blurred radial orbs (emerald, violet, cobalt) at low opacity.
- **Space and shape:** large radii 24-32, floating pill nav.
- **Material:** dark glass cards with `backdrop-filter: blur(24px)` on fixed or sticky layers only, white 10% hairlines, inner highlight; solid fallback for `prefers-reduced-transparency`.
- **Motion:** blur-to-sharp entries, orbs drift slowly (paused off-screen).
- **Signature:** spotlight borders that light up under the cursor.

### G2 Aurora and Mesh Gradient
**Suits:** creative brands, music, lifestyle, wellness launches. **Avoid for:** dashboards, dense text.
- **Type:** clean sans with confident weights.
- **Colour:** two to four soft lobes of colour blended across the ground; text on solid or scrimmed areas.
- **Space and shape:** generous; soft radii.
- **Material:** layered radial gradients or SVG mesh; grain to stop banding.
- **Motion:** very slow gradient drift (20 s plus) via `@property`-animated colours or a shader.
- **Signature:** a living background that shifts with time or scroll.

### G3 Platform Liquid Glass
**Suits:** apps that should feel current on Apple platforms (iOS 26 and later): navigation, toolbars, floating controls. **Avoid for:** content layers, dense reading, Android without a designed fallback.
- **Type:** platform font with Dynamic Type.
- **Colour:** content provides colour; glass tints only for primary actions.
- **Space and shape:** capsule and concentric shapes from the system.
- **Material:** system glass (`glassEffect`, `GlassEffectContainer`, `UIGlassEffect`), never a hand-made web imitation presented as the real thing; on the web label it an approximation.
- **Motion:** system morphing between glass elements (shared namespace IDs).
- **Signature:** controls float above full-bleed content and merge or split as state changes. Guard it by OS version and give the old OS and Android a designed plain fallback.

### G4 Spatial Layers
**Suits:** spatial computing, AR and VR, media apps, immersive tours. **Avoid for:** text-heavy documents.
- **Type:** platform sans, larger sizes for distance.
- **Colour:** frosted white at 15-30% opacity over the world; vivid system colours for active states.
- **Space and shape:** windows radius about 24, ornaments outside the window edge.
- **Material:** blur about 40 px with saturation about 180%, depth shadow `0 8px 32px` at 10%.
- **Motion:** parallax depth, focus scale about 1.02 on gaze or hover.
- **Signature:** layered panes that separate in depth when focused.

### G5 Dimensional Layering
**Suits:** SaaS marketing, product showcases, card-based apps. **Avoid for:** low-end devices, print-like layouts.
- **Type:** clean sans.
- **Colour:** neutral ground with a tinted elevation scale.
- **Space and shape:** overlapping cards with slight rotation (-2 to 3 degrees) on large screens; flattened below 768 px.
- **Material:** multi-level shadows, z-axis stacking.
- **Motion:** cards spread or stack with scroll; tilt toward the pointer on desktop only.
- **Signature:** a cascade of product screens floating at different depths.

### G6 Bento Showcase
**Suits:** feature overviews, product pages, personal sites. **Avoid for:** dense tables, long reading. The identical-card bento is a common AI default: vary cell content (image, number, live demo, quote) and keep 3-5 cells.
- **Type:** per brand.
- **Colour:** per brand; one cell may invert.
- **Space and shape:** asymmetric grid with `grid-auto-flow: dense` so no cell is empty; one radius scale; single column on phones.
- **Material:** flat or soft per brand.
- **Motion:** each cell carries one small live demo (a toggle, a counter, a chart).
- **Signature:** cells that are working miniatures of the product, not icons with text.

### G7 AI-Native Conversational
**Suits:** assistants, copilots, agents, chat-first tools. **Avoid for:** form-heavy workflows.
- **Type:** readable sans for conversation, mono for code and tool output.
- **Colour:** calm neutral ground; one accent for the assistant's presence.
- **Space and shape:** centred conversation column, side artifact panel, composer as the anchor.
- **Material:** minimal; a subtle glow or gradient only for "thinking" states.
- **Motion:** streaming text, truthful progress for tool steps, artifacts that slide in beside the chat.
- **Signature:** visible reasoning steps and sources as tidy collapsible blocks.

### Cinematic looks (brief; full recipes in the cinematic file)

- **C1 Cinematic One-Take:** the whole page plays as one directed camera move with carriers between sections. Suits launches and product stories. Follow the motion grammar in [cinematic motion and 3D](../cinematic-motion-and-3d.md#2-motion-grammar-for-any-recipe).
- **C2 Kinetic Typography:** type is the moving image (split-line reveals, scrubbed word opacity, marquees). Suits manifestos and campaigns. See text reveals (3.3).
- **C3 Parallax Storytelling:** chaptered scroll with pinned scenes and depth layers. Suits case studies, annual reports, launches; not catalogues or task flows. See scroll-driven story (3.2).
- **C4 3D Product Stage:** a lit real-time or pre-rendered object turntable. Suits hardware, furniture, fashion, cars. See product turntable (3.7) and the asset pipeline (5).
- **C5 Shader World:** a WebGL or 2.5D shader background or image distortion as the brand signature. Suits creative studios and premium tech. See shader backgrounds (3.5).
- **C6 Interactive Cursor Playground:** cursor-led reveals, magnetic elements, image trails. Desktop only; touch gets a still equivalent. See cursor and hover (3.8).
- **C7 Data World:** maps, globes or point clouds that explain real data. See data, maps and annotation (3.9).
