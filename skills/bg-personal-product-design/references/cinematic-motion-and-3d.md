# Cinematic motion and 3D

How to build award-level websites and polished motion as concrete actions. Everything here is an **option** for a direction, never a house style. The product's approved look, tokens and exclusions win ([identity authority](design-contract.md#identity-authority)), and every effect still fills the [effect contract](motion-and-effects.md#required-effect-contract). Native and desktop equivalents are in [motion by platform](motion-by-platform.md). Naming a library, skill or paid tool grants no install, spending or release authority; check each licence first.

## 1. Decide the fit first

Answer these in the design plan first:

1. **Which surface mode?** ([modes](techniques.md#choose-the-surface-mode))
   - Persuade and Experience web pages (launch, product story, portfolio, campaign): full cinematic range allowed.
   - Read pages: restrained motion; type and image reveals, no scroll-jacking.
   - Operate surfaces (dashboards, forms, checkout, settings, money, chat): no 3D or scroll scenes on the task path. Motion is feedback, state and spatial continuity only.
   - Native apps: platform-true motion first ([motion by platform](motion-by-platform.md)); 3D only for a product viewer, onboarding or a rare celebration.
2. **Does motion explain something real?** A real object (product turntable), a journey (camera descent through chapters), data (map, chart, point cloud) or a cause and effect. Decoration with no story is just a slow page.
3. **Does a real asset exist?** No model and no budget: choose 2.5D (shader, depth layers) or pre-rendered video, never a filler 3D blob.
4. **Can a poster tell the same story?** If not, the fallback will fail. Design the static version first.
5. **Who are the visitors?** Mostly mid-range phones on mobile data: prefer a pre-rendered video or image sequence to live 3D.
6. **Is any core action delayed?** Send, save, pay, book and call stay immediate; no effect, preloader or pause precedes them.

Record one ambition level per surface:

| Level | What it is | Typical tools | Good for |
|---|---|---|---|
| L0 Static | Composed still, strong type and image | CSS | Operate, trust-first, public service |
| L1 Motion | Reveals, transitions, scroll-linked 2D | CSS, Motion, GSAP | Most marketing pages and app polish |
| L2 2.5D | Shader backgrounds, depth layers, WebGL images synced to DOM | OGL, Three.js, Skia | Premium feel without a 3D asset |
| L3 Real-time 3D | Lit scene, camera moves, interaction | Three.js / R3F, Spline | Product objects, journeys, data worlds |
| L4 Pre-rendered | Video loop or image sequence of a 3D render | Blender, AV1/H.264, canvas frames | Mobile-heavy audiences, complex scenes |

In a direction round, vary the motion axis across directions (for example one L0, one L1 editorial, one L2 shader, one L3 scene) so the founder sees real alternatives. Once a look is approved, the builder makes implementation calls inside it without re-asking.

## 2. Motion grammar for any recipe

These make motion read as one directed film, not a stack of slides. They are the rulebook for the *Cinematic one-take* look and narrated video; other looks may choose differently.

- **One dominant direction.** Pick one forward vector for ordinary progress (for example right-to-left travel). Reserve others for meaning: up = conclusion or reveal, zoom forward = deeper into the same idea, zoom back = arrival of something bigger, scale burst = leaving a world. Never ping-pong directions without a visible cause.
- **Seam vector law.** At a cut, exit and entry share axis, direction and speed; the incoming element picks up its motion mid-path. On zoom seams, scale change has the same sign on both sides. In product UI a toast or panel leaves the way it came.
- **Carriers.** Hand a concrete element across the change: a card that docks into the next layout, a thumbnail that becomes the hero, a cursor mid-path. Web: GSAP Flip, Motion `layoutId`, View Transitions. Native: shared-element transitions.
- **Causal chains.** Press → squash → release → flight → land → recoil → reveal. Each effect starts on the frame that causes it; big elements rebound slower, small ones snap.
- **Stillness before the payoff.** 0.3-0.75 s of hold between action and a celebratory result. Never on time-critical actions.
- **Sustained motion, not idle wobble** (cinematic look and video). Fill time with staged reveals, a camera with intent (establish wide → travel → arrive), counters ticking, cursor-led demos. Ambient loops stay available to looks that choose them (aurora, playful), paused off-screen and stopped under reduced motion; loading and live-status loops are always allowed.
- **Only 2-3 transition types per product**, repeated consistently.
- **Signature curve.** A product may own one curve (GSAP `CustomEase`, cubic-bezier or spring token) used everywhere.
- **Opaque stage ground.** When two views overlap or crossfade, paint the root with the product's canvas colour so no white flash shows, especially on dark looks.

Timing starting points (product tokens override):

| Intent | Starting point |
|---|---|
| Interactive feedback (press, toggle, hover) | 100-200 ms, ease-out |
| UI enter/exit (sheet, menu, toast) | 200-300 ms enter; exit about 75-80% of entry |
| Hero or section entry | up to 800 ms per element |
| Stagger across a group | 30-80 ms per item, total under about 500 ms |
| Similar elements | share one ease and duration |
| Overshoot | `back.out(1.4-1.7)` allowed; bounce and elastic only in a playful look |

Easing: interactive UI uses ease-out (never ease-in on something the user is waiting for). Ease-in exits belong only to cut-mid-motion seams in cinematic pieces and video, where the next scene inherits the velocity. Crossfade stays the reduced-motion and quiet-look transition in product UI.

## 3. Recipes

Each recipe lists build steps, the budget and the fallback. Use the product's existing library where it has one.

### 3.1 Hero 3D scene
1. Real HTML headline, sub-copy and call to action render first, over a poster image of the scene's first frame. The poster is the LCP element.
2. Dynamic-import the 3D bundle on idle or when the hero is visible. Mount one full-bleed `<canvas>` behind the DOM text with `aria-hidden="true"`.
3. R3F: `<Canvas dpr={[1, 1.75]} frameloop="demand">` (or `"always"` only while animating); `useGLTF` with meshopt or Draco; `<Environment>` from a small HDRI; `<ContactShadows>`; one key light plus rim light in the product's hues.
4. Tone mapping ACES or AgX; one merged post pass (bloom on highlights only, grain, vignette).
5. Fade the canvas in over the poster once the first frame renders; never pop.
6. Pause rendering when the hero leaves the viewport or the tab is hidden.
Fallback: poster stays; reduced motion shows the poster or a single still render.

### 3.2 Scroll-driven story (chapters)
1. Write 4-7 chapters, one idea each; the static stacked version must read on its own.
2. GSAP ScrollTrigger: pin a stage, scrub one master timeline (`scrub: 0.5-1`); chapters are labels on that timeline. Pin only what needs pinning.
3. For a 3D descent, drive the camera along a `CatmullRomCurve3` with scroll progress; copy blocks fade in at camera stops; depth fog and dust particles give scale.
4. Lighter options: CSS `animation-timeline: view()` for reveals and progress bars inside `@supports (animation-timeline: scroll())`; Motion `useScroll` in React products.
5. Optional Lenis smooth scroll on Persuade/Experience pages only: `lenis.on('scroll', ScrollTrigger.update)`; off under reduced motion; never in apps or Operate pages.
6. Refresh ScrollTrigger only on real, debounced layout change; kill triggers on route exit.
Fallback: reduced motion or no-JS shows the chapters stacked with final states; no pinning, no scrub.

### 3.3 Text reveals
- **Masked line reveal:** SplitText `type: "lines", mask: "lines"`, lines rise from `yPercent: 100`, stagger 0.08, `power4.out`, 0.8-1 s. Use `autoSplit` so it re-splits on resize; keep the original text for screen readers (`aria-label` on the parent).
- **Scroll-scrubbed paragraph:** words from opacity 0.1 to 1 as the paragraph crosses the viewport.
- **Kinetic impact** (rare moments): slam from `y: -300` with `power4.out` plus a short landing shake; scale punch from 0.6 with `back.out(2.2)`; accent colour shift on the emphasis word; underline sweep `scaleX 0→1`.
- **Calm professional:** slide 150-200 px plus fade with `power4.out`; per-word reveal 0.1 s stagger; no overshoot.
- **Dreamy:** from `blur(14px)` and opacity 0 to sharp; slow ease-out; keep blur off frequently repainted areas.
- **Tech signal:** character decode, RGB split, neon glow; glitch only for real moments.
- **Variable fonts:** animate weight or width axes on hover or scroll.
Fallback: final text state, unsplit.

### 3.4 Page and section transitions
1. Multi-page sites: cross-document View Transitions (`@view-transition { navigation: auto; }`) with `view-transition-name` on the shared hero image or title. Supported in Chromium and Safari 18.2+ (checked October 2026); other browsers navigate normally.
2. SPA: same-document `document.startViewTransition()` or GSAP Flip / Motion `layoutId` for shared elements.
3. Award-style section changes: one shader transition (domain warp, SDF iris, dissolve, whip pan) rendered in a WebGL layer between two textures. Keep 2-3 types per product.
4. Obey the seam vector law; paint the root canvas colour.
Fallback: instant swap or short crossfade under reduced motion; shader transitions degrade to crossfade without WebGL.

### 3.5 Shader backgrounds and materials
1. One full-screen quad: OGL for a single effect (small bundle), Three.js TSL when the page already ships Three.js, Skia or platform shaders on native.
2. Fill shaders: noise-warped gradients, aurora, liquid caustics, halftone, dither. Effect shaders: distortion, refraction, colour grade.
3. Uniforms: `uTime` from an absolute clock (skipped frames never change the result), `uPointer` normalised to the layer, `uScroll` progress, colour stops from the product tokens only (2-8 stops).
4. Expose designer knobs with bounded ranges and good defaults (intensity, speed, scale, angle); record approved values. Prototype in Figma shaders where available so the founder approves the living material before code.
5. Render at reduced resolution (0.5-0.75 of the canvas) and upscale for soft fields; no branching or unbounded loops in the shader.
Fallback: a still frame exported from the shader at the approved values.

### 3.6 Particles, depth and point clouds
- Instanced meshes or `Points` with one buffer; WebGPU compute particles where available. Never allocate per frame.
- Depth: three or four parallax layers, fog, depth of field on the background only.
- Point-cloud look: lidar or particle terrain on near-black, thin mono labels, one accent for highlights, morph between datasets on scroll.
- Budget particle counts by tier (for example 50k / 10k / static image) and measure.
Fallback: a rendered still of the cloud.

### 3.7 Product turntable and stage
1. One hero object in a studio scene: HDRI reflections, contact shadow, one rim light, deep neutral backdrop.
2. Scroll or drag rotates or dollies around the object; spec copy appears at hotspots anchored to 3D points (projected to screen, rendered as DOM).
3. Cut to material close-ups instead of long orbits.
4. Drag with damped momentum, snapping to named views that also have buttons.
Fallback: turntable video or 24-36 frame image sequence scrubbed on a 2D canvas; reduced motion shows the hero still.

### 3.8 Cursor and hover
- Gate behind `@media (hover: hover) and (pointer: fine)`; never on touch or native.
- Followers and magnetic buttons: `gsap.quickTo(el, "x", {duration: 0.4, ease: "power3"})`, transforms only; magnet radius small and released on leave.
- Hover image reveal on project titles: one image follows the pointer with lag; distort only in WebGL.
- DOM-synced WebGL images (drei `View` or a scroll-rig pattern): one shared canvas renders planes over DOM image boxes so images ripple or bend while layout, accessibility and SEO stay in HTML.
Fallback: plain hover states; focus states mirror hover for keyboard users.

### 3.9 Data, maps and annotation
- SVG draw-on: `stroke-dashoffset` from path length; hide with `autoAlpha: 0` until drawing starts; if the length reads 0, show the final state.
- Count-up stats with a ring or bar filling alongside; real values only.
- Charts: staggered bars, drawing lines, value labels last.
- Broadcast map: neutral base, colour only for meaning, one continuous camera push, border draw-on, pins and callouts; no glows or particles.
- Editorial annotation: the real photo stays visible; data graphics fuse to its geometry (height → bar, liquid → pie) in colours sampled from it; placement measured, not eyeballed.

### 3.10 Illustrated delight
Lottie (dotLottie) for designer-made vector moments; Rive when the animation needs a state machine (hover, press, success, error). Size budget: icon under 10 KB, UI animation under 50 KB, scene under 150 KB, hero under 300 KB. Avoid masks, blur and 3D layers in Lottie. Real UI state stays in code with an accessible label. Reduced motion: rest pose.

### 3.11 Finish layer
Cinematic feel mostly comes from post: tone mapping, restrained bloom, shallow depth of field, low-opacity grain, vignette, slight edge chromatic aberration. Merge into one pass and drop it first on lower tiers. Grain and vignette also work as static CSS overlays on L1 pages.

## 4. Library choices

Versions and prices as checked in October 2026; verify before install. Use the product's existing library first.

| Library | Use it for | Licence and cost | Notes |
|---|---|---|---|
| GSAP 3 + ScrollTrigger, SplitText, Flip, MorphSVG, ScrollSmoother | Timelines, scroll stories, text, layout morphs | Free for commercial use under the GSAP standard licence, all plugins | Licence excludes visual animation-builder products that compete with its owner; for those, use Motion |
| Motion (formerly Framer Motion) | React/Vue component motion, `layoutId`, exits, `useScroll`, `useReducedMotion` | MIT; optional paid Motion+ | Simpler than GSAP for component state |
| Three.js (WebGPURenderer + TSL) | Real-time 3D, compute particles | MIT | WebGPU with automatic WebGL 2 fallback; built-in Inspector for frame cost |
| React Three Fiber v9 + drei | Declarative 3D in React 19 | MIT | `Environment`, `ContactShadows`, `ScrollControls`, `View`, `PerformanceMonitor`, `useGLTF` |
| pmndrs postprocessing | Merged post passes | Permissive (check) | Prefer over chained passes |
| OGL | One shader hero or image distortion | Unlicense | Tiny; no scene graph overhead |
| Lenis | Smooth scroll on marketing pages | MIT | Off under reduced motion; never in apps |
| CSS scroll-driven animations | JS-free reveals and progress | Free | Chromium and Safari 26; wrap in `@supports` |
| View Transitions API | Page and shared-element transitions | Free | Progressive enhancement |
| Theatre.js | Authored camera keyframes | Core Apache-2.0; studio AGPL, dev only | Ship core only; pre-1.0, so GSAP timelines are the maintained alternative |
| Spline | Designer-made interactive 3D | Free with watermark; paid plans for export (paid tier needs the founder's OK) | Heavier runtime; lazy-load behind a poster |
| Rive | Interactive vector state machines | Runtimes MIT; editor free tier, paid seat for export (paid tier needs the founder's OK) | Same file on web, iOS, Android, RN, Flutter |
| Lottie / dotLottie | Vector illustration playback | Free | Convert locally; never upload project files to a third-party converter |
| detect-gpu | GPU tier at startup | MIT | Pair with live fps |

## 5. 3D asset pipeline and sources

1. **Get or make the asset:** model in Blender (optionally agent-driven through a Blender MCP after a licence and security check), a scan, a CC0 source or an AI generator.
2. **Clean in Blender:** real-world scale, applied transforms, merged materials, baked lighting or AO where static, UVs for textures.
3. **Export glTF/GLB.**
4. **Compress:** `gltf-transform` weld, simplify, meshopt (or Draco) geometry, KTX2/Basis textures (lower GPU memory than PNG/JPEG), resize textures to at most 2K for hero and 1K for others.
5. **Generate the component:** `gltfjsx --transform` for a typed R3F component.
6. **Budget:** hero model aim a few MB after compression; draw calls low (instancing, merged meshes); measure triangles on the weakest target device.
7. **Record the licence of every asset** in the product's asset list.

| Source | Licence | Notes |
|---|---|---|
| Poly Haven (HDRIs, textures, models) | CC0 | Best first stop for HDRI reflections |
| ambientCG (PBR materials) | CC0 | |
| Sketchfab | Per-model licence | Check each model; attribution often required |
| Meshy, Tripo, Rodin (AI 3D) | Free tiers are public or non-commercial; paid plans needed for commercial use | Paid plans need the founder's spending OK; clean output in Blender before use |
| Hunyuan3D | Open weights, but its licence excludes the EU, UK and South Korea | Do not use commercially from those territories |
| AI image and video generators | Provider terms | Use for direction references and short muted video heroes (AV1/H.264 with a poster frame) |

Never copy an award site's assets, code or identity; log the link, date and technique observed.

## 6. Hard guardrails

Every cinematic surface meets all of these before acceptance.

**Frame budget.** 16.7 ms per frame at 60 Hz, 8.3 ms at 120 Hz, including the browser's own work. Keep main-thread script per frame small; no layout reads after writes in the same frame; animate transform, opacity and shader uniforms; scope `will-change` to elements that animate and remove it after.

**Loading and Core Web Vitals.** LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1 at the 75th percentile on mobile. The LCP element is HTML text or the poster, never the canvas. 3D and heavy motion code load in a separate chunk after first paint. Reserve the canvas box so nothing shifts. Preload the poster and fonts, not the model. A preloader screen is allowed only on Experience pages and never on Operate or Persuade checkout paths.

**Device tiers.** One module picks full, reduced or static from GPU tier, live fps (`PerformanceMonitor` or a rolling frame-time average), `navigator.connection.saveData`, low memory and user preferences. Reduce in this order: post passes, particle counts, DPR (cap at 1.5-2), shadow quality, then swap to the poster. Never flatten content, layout or identity. Provide a forced-tier switch for QA.

**Lifecycle.** Pause rendering off-screen (IntersectionObserver), when the tab is hidden (`visibilitychange`) and in a background desktop window. Dispose geometries, textures and render targets on route exit. Kill GSAP triggers and timelines on unmount (`gsap.context().revert()` or `useGSAP`).

**No WebGL or context loss.** Feature-detect WebGPU/WebGL before importing 3D code; on failure or `webglcontextlost`, show the poster or video and keep every call to action working.

**Reduced motion** (`prefers-reduced-motion: reduce`, via `gsap.matchMedia` or `useReducedMotion`). Remove scroll-scrub, pinning, parallax, smooth scroll, camera travel, large zooms, overshoot and loops. Keep opacity and colour changes that explain state; screen transitions become crossfades or instant.

**Reduced transparency and contrast.** Replace glass and blurred layers with opaque surfaces; text over shaders or video keeps at least 4.5:1 contrast via a scrim.

**Accessibility.** All text, links and controls live in the DOM in reading order; the canvas is `aria-hidden`. Pinned sections never trap keyboard focus. Every pointer interaction has a keyboard or button equivalent. No flashing above three times per second.

**Evidence.** Lighthouse and a performance trace on the built page; frame behaviour recorded on a real mid-range Android phone and an iPhone; each tier forced once; reduced motion, reduced transparency and no-WebGL checked. Label emulator and desktop results as such; missing device evidence stays an open gap, never a pass.

## 7. Add to the effect contract

Extend each cinematic effect's [contract](motion-and-effects.md#required-effect-contract) row with: level (L0-L4), LCP element, lazy-load trigger, compressed asset sizes, tier rules, no-WebGL and reduced-motion variants, and the measured result. Hand back the poster, fallback screenshots and trace with the candidate.
