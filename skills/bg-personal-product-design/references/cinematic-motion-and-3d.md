# Cinematic motion and 3D

Concrete options for polished websites and motion, never a house style. Current user decisions, approved tokens and exclusions govern ([identity authority](design-contract.md#identity-authority)). Consider the applicable [effect design questions](motion-and-effects.md#relevant-effect-design-questions) for an effect the task actually needs. Native and desktop equivalents are in [motion by platform](motion-by-platform.md). Naming a library, skill or paid tool grants no install, spending or release authority; check each licence first.

## 1. Decide the fit first

Resolve the relevant questions from the current brief, implementation and user decisions. Ask only about consequential gaps; no new design-plan document is required:

1. **Which surface mode?** ([modes](techniques.md#choose-the-surface-mode))
   - Persuade and Experience web pages (launch, product story, portfolio, campaign): the cinematic range may help when it supports the requested experience; the category itself grants no authority.
   - Read pages: restrained motion; type and image reveals, no scroll-jacking.
   - Operate surfaces (dashboards, forms, checkout, settings, money, chat): protect reading, input and immediate actions. Interactive 3D may be the task itself, such as an editor, map or model viewer. For decorative scenes, explain and resolve any material distraction or performance trade-off instead of silently refusing or moving the feature elsewhere.
   - Native apps: compare appropriate native and reusable implementations ([motion by platform](motion-by-platform.md)); use 3D when it serves the requested task, not only for a prescribed category of screen.
2. **Does motion explain something real?** A real object (product turntable), a journey (camera descent through chapters), data (map, chart, point cloud) or a cause and effect. Decoration with no story is just a slow page.
3. **Does a suitable asset exist?** Check reuse, rights and available tooling. If an asset or spending authority is missing, compare an achievable alternative such as 2.5D or a still; do not invent assets, buy them or replace the requested object without resolving the affected choice.
4. **What remains usable without the effect?** A poster may carry a decorative story; an interactive 3D task may require another operable representation, accessible controls or a truthful capability message. Design the relevant fallback alongside the feature rather than claiming a still replaces every task.
5. **Who are the visitors?** Mostly mid-range phones on mobile data: prefer a pre-rendered video or image sequence to live 3D.
6. **Is any core action delayed?** Send, save, pay, book and call stay immediate; no effect, preloader or pause precedes them.

These levels can help compare implementation options when needed. A surface may combine them; no per-surface record is required:

| Level | What it is | Typical tools | Good for |
|---|---|---|---|
| L0 Static | Composed still, strong type and image | CSS | Operate, trust-first, public service |
| L1 Motion | Reveals, transitions, scroll-linked 2D | CSS, Motion, GSAP | Most marketing pages and app polish |
| L2 2.5D | Shader backgrounds, depth layers, WebGL images synced to DOM | OGL, Three.js, Skia | Premium feel without a 3D asset |
| L3 Real-time 3D | Lit scene, camera moves, interaction | Three.js / R3F, Spline | Product objects, journeys, data worlds |
| L4 Pre-rendered | Video loop or image sequence of a 3D render | Blender, AV1/H.264, canvas frames | Mobile-heavy audiences, complex scenes |

When motion is an unresolved choice, compare materially different options, such as a still, an editorial transition or an interactive scene. Do not add unrelated levels to fill a quota. Once the look is agreed, make implementation choices within it without repeating approval; new consequential changes still need resolution.

## 2. Motion grammar for any recipe

These make motion read as one directed film, not a stack of slides. They are the rulebook for the *Cinematic one-take* look and narrated video; other looks may choose differently.

- **One dominant direction.** Pick one forward vector for ordinary progress (for example right-to-left travel). Reserve others for meaning: up = conclusion or reveal, zoom forward = deeper into the same idea, zoom back = arrival of something bigger, scale burst = leaving a world. Never ping-pong directions without a visible cause.
- **Seam vector law.** At a cut, exit and entry share axis, direction and speed; the incoming element picks up its motion mid-path. On zoom seams, scale change has the same sign on both sides. In product UI a toast or panel leaves the way it came.
- **Carriers.** Hand a concrete element across the change: a card that docks into the next layout, a thumbnail that becomes the hero, a cursor mid-path. Web: GSAP Flip, Motion `layoutId`, View Transitions. Native: shared-element transitions.
- **Causal chains.** Press → squash → release → flight → land → recoil → reveal. Each effect starts on the frame that causes it; big elements rebound slower, small ones snap.
- **Stillness before a cinematic payoff.** A 0.3-0.75 s hold can give a narrated scene rhythm. Do not delay an operation or hide its confirmed result for a flourish; any celebration supplements immediate truthful feedback.
- **Sustained motion, not idle wobble** (cinematic look and video). Fill time with staged reveals, a camera with intent (establish wide → travel → arrive), counters ticking, cursor-led demos. Ambient loops stay available to looks that choose them (aurora, playful), paused off-screen and stopped under reduced motion; loading and live-status indicators should be truthful, accessible and compatible with reduced motion; their purpose does not automatically justify a loop.
- **A coherent transition vocabulary.** Two or three types can be enough for a small experience; use the amount the product needs and preserve approved transitions.
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
1. Use the chapters the requested story needs, with a clear idea in each. Four to seven is one sample structure, not a requirement. The static or no-script representation should preserve the content and useful navigation.
2. GSAP ScrollTrigger: pin a stage, scrub one master timeline (`scrub: 0.5-1`); chapters are labels on that timeline. Pin only what needs pinning.
3. For a 3D descent, drive the camera along a `CatmullRomCurve3` with scroll progress; copy blocks fade in at camera stops; depth fog and dust particles give scale.
4. Lighter options: CSS `animation-timeline: view()` for reveals and progress bars inside `@supports (animation-timeline: scroll())`; Motion `useScroll` in React products.
5. Optional Lenis smooth scroll for a requested cinematic web story: `lenis.on('scroll', ScrollTrigger.update)`. Prefer the existing native scroll behaviour for frequent tasks; use custom scrolling only when justified by the experience and verified for keyboard, assistive technology and reduced motion.
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
4. Keep useful internal parameters such as intensity, speed and scale bounded. Use a live prototype when it resolves an open material choice, in Figma or another available tool. Reuse agreed values; do not require a new approval or add customer-facing controls merely to implement an effect.
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
- Enable pointer-following decoration only with a suitable hover-capable fine pointer, using the host's capability checks. Native desktop and tablet pointer modes can qualify; touch and keyboard users need equivalent content and operable controls without a cursor effect.
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
Lottie (dotLottie) for designer-made vector moments; Rive when the animation needs a state machine (hover, press, success, error). Illustrative size targets are 10 KB for an icon, 50 KB for a UI animation, 150 KB for a scene and 300 KB for a hero. Measure actual loading and quality; these are not acceptance caps. Avoid masks, blur and 3D layers in Lottie. Real UI state stays in code with an accessible label. Reduced motion: rest pose.

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
| Lenis | Custom scrolling for a requested web story | MIT | Prefer native scrolling for tasks; verify input, accessibility and reduced-motion behaviour |
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
4. **Compress:** `gltf-transform` weld, simplify, meshopt (or Draco) geometry, KTX2/Basis textures (lower GPU memory than PNG/JPEG), try 2K hero textures and 1K secondary textures as starting points, then choose sizes from visible quality, zoom needs and measured memory/loading cost.
5. **Generate the component:** `gltfjsx --transform` for a typed R3F component.
6. **Budget:** hero model aim a few MB after compression; draw calls low (instancing, merged meshes); measure triangles on the weakest target device.
7. **Record the licence of every asset** in the product's asset list.

| Source | Licence | Notes |
|---|---|---|
| Poly Haven (HDRIs, textures, models) | CC0 | Best first stop for HDRI reflections |
| ambientCG (PBR materials) | CC0 | |
| Sketchfab | Per-model licence | Check each model; provenance often required |
| Meshy, Tripo, Rodin (AI 3D) | Free tiers are public or non-commercial; paid plans needed for commercial use | Paid plans need the founder's spending OK; clean output in Blender before use |
| Hunyuan3D | Open weights, but its licence excludes the EU, UK and South Korea | Do not use commercially from those territories |
| AI image and video generators | Provider terms | Use for direction references and short muted video heroes (AV1/H.264 with a poster frame) |

Never copy an award site's assets, code or identity; log the link, date and technique observed.

## 6. Relevant reliability and accessibility checks

Select the checks that can reveal failures in the requested surface. Existing release criteria and user authority govern acceptance; this reference adds no universal performance gate or device matrix. Preserve unavailable evidence rather than inventing a pass.

**Frame timing.** A 60 Hz display gives about 16.7 ms per frame and 120 Hz about 8.3 ms, including the browser's own work. Use these to interpret traces on the intended display, not as a new pass/fail threshold for every product. Keep main-thread script per frame small; no layout reads after writes in the same frame; animate transform, opacity and shader uniforms; scope `will-change` to elements that animate and remove it after.

**Loading and Core Web Vitals.** For a relevant public web experience, useful reference targets are LCP ≤ 2.5 s, INP ≤ 200 ms and CLS ≤ 0.1 at the 75th percentile. Distinguish observed field data from a local run and follow the project's actual criteria. Render meaningful HTML or a poster promptly instead of waiting for a decorative canvas. 3D and heavy motion code load in a separate chunk after first paint. Reserve the canvas box so nothing shifts. Preload the poster and fonts, not the model. Do not add a blocking preloader to hide a slow decorative effect. If loading is intrinsic to the requested task, show truthful progress and preserve any actions that can already work.

**Device tiers.** Where adaptive rendering is needed, reuse a module that combines supported capability signals with measured performance and user preferences. Post passes, particle counts, DPR (for example 1.5-2) and shadow quality are candidates for reduction; choose the order by measured cost and visual purpose. A poster can replace decoration, but must not replace an interactive task that requires an operable fallback. Preserve content, layout and identity. Use an existing test seam for relevant fallbacks. Add a private test override only if needed; it must not override accessibility preferences or become an unrequested customer setting.

**Lifecycle.** Pause rendering off-screen (IntersectionObserver), when the tab is hidden (`visibilitychange`) and in a background desktop window. Dispose geometries, textures and render targets on route exit. Kill GSAP triggers and timelines on unmount (`gsap.context().revert()` or `useGSAP`).

**No WebGL or context loss.** Check supported graphics capabilities and handle context loss. Decorative scenes can fall back to a poster or video; interactive tasks need their agreed operable fallback or an accurate limitation with a next action. Preserve working controls and any unsaved state.

**Reduced motion** (`prefers-reduced-motion: reduce`, via `gsap.matchMedia` or `useReducedMotion`). Remove scroll-scrub, pinning, parallax, smooth scroll, camera travel, large zooms, overshoot and loops. Keep opacity and colour changes that explain state; screen transitions become crossfades or instant.

**Reduced transparency and contrast.** Replace glass and blurred layers with opaque surfaces; text over shaders or video keeps at least 4.5:1 contrast via a scrim.

**Accessibility.** For decorative canvas scenes, keep text, links and controls in the DOM and hide the decoration from assistive technology. For an interactive canvas task, provide accessible semantics and an equivalent operable interface; do not hide the sole task interface. Pinned sections never trap keyboard focus. Every pointer interaction has a keyboard or button equivalent. Avoid flashing content; assess any requested flashing against current applicable accessibility guidance, including size, contrast and frequency, rather than assuming a frequency alone makes it safe.

**Evidence.** Use the actual built surface and inspect its resulting behaviour. Lighthouse or a performance trace can supplement relevant web checks. Exercise supported reduced-motion, transparency, graphics-loss and performance fallbacks where affected. For device performance claims, use representative available hardware for the target audience, not a mandatory Android-and-iPhone pair. Label desktop, emulator and fixture evidence accurately; missing device evidence stays a stated gap, never a performance pass.

## 7. Add to the effect contract

For a requested cinematic effect, retain relevant [design and performance evidence](motion-and-effects.md#relevant-effect-design-questions) in the existing record: its purpose, loading behaviour, asset sizes, supported tiers, fallback and reduced-motion behaviour, and observed results. Include representative screenshots or traces when they prove a material claim; an effect does not require a separate contract row or unrelated tests.
