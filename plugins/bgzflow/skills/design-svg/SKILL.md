---
name: design-svg
description: Create or refine SVG artwork and assemble trusted local SVG frames into a self-contained animated flipbook with reduced-motion fallback, frame timing and optional inline colour variables. Use for icons, mascots, logo reveals, vector animation or existing vector-frame sequences.
---

# SVG craft and local flipbooks

Use the current shared brief, approved artwork/tokens and existing records. This adds specific vector construction, animation and a working frame assembler. Keep design-motion/animation-review ownership of broader motion and design-prototype-lab ownership of variant exploration. Media acquisition and video production stay with existing media methods. Do not redraw approved artwork, add a loop or vectorize unrelated media without the request.

Read [SVG creation](../design-engineering-graph/references/svg/svg-creation.md), [animation](../design-engineering-graph/references/svg/svg-animation.md) and, when relevant, [path morphing](../design-engineering-graph/references/svg/svg-path-morphing.md). Choose the actual embedding context: inline SVG, external image, framework component or video. CSS variables outside an SVG image document do not automatically recolour its contents. Preserve viewBox, accessible name, referenced IDs and reduced-motion states. An icon's decorative/informative role follows actual use, not a blanket rule.

## Dependency-free local assembly

With Node, run:

`node <skill-directory>/scripts/svg-flipbook.mjs <trusted-frames-directory> --out <fresh.svg> --fps 12 --title "Requested illustration"`

The helper reads lexically sorted `.svg` files with the same explicit viewBox, collapses consecutive identical frames into holds, namespaces frame-local IDs and emits stepped CSS frame animation. Use padded filenames for intended ordering. `--no-loop` plays once; otherwise it loops, so select looping only when appropriate to the request. `--vars` lifts literal fill/stroke colours into CSS variables useful for inline integration. The first frame is the reduced-motion fallback; author it as a meaningful resting state. Output must be a fresh path with no linked ancestors; existing artifacts remain intact.

Inputs must be your trusted self-contained SVG frames, not arbitrary downloaded XML. The helper rejects obvious active/remote content but is not a complete SVG sanitizer or XML engine. It does not preserve every SVG-root attribute, stylesheet or nested animation behavior. Normalize complex artwork using the existing project toolchain and inspect the rendered result; do not silently drop unsupported detail. Externally referenced images/fonts and CSS are not fetched or packaged.

Check output syntax/structure, viewBox, frame order/holds, IDs, title escaping, normal playback, one-shot ending and reduced motion on an authorized real renderer/browser. Code generation and file inspection do not prove appearance or animation playback. If no renderer is available, report artifact checks separately and leave the visual claim unverified. Do not auto-launch a browser while its use is paused.

[Video-to-vector guidance](../design-engineering-graph/references/svg/video-to-vector-pipeline.md) describes optional ffmpeg, vectorizer and SVGO stages. Those dependencies, AI video generation, model accounts and source-media rights are not included or automatically installed. Existing supplied frames work without them. SVG is not inherently the right format for photographic or detailed footage. Preserve source frames and output evidence; no automatic cleanup. [Pinned source and licence](SOURCE.md).
