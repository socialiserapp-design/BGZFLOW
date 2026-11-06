> BGZFLOW adaptation: use this technical reference only for the current requested outcome. Existing user decisions, actual project architecture and host permissions govern. Numeric examples and aesthetic opinions below are options, not universal rules, new gates or authority to redesign. External products, model weights and licences need current verification before use; none is installed by reading this page. Use the same brief and private project records; do not modify installed learning files.

---
title: ai-default-tells
summary: Purple gradients, Inter, pure black dark mode, Lucide icons, lorem ipsum. The full list.
tags: [anti-patterns, ai-defaults]
---

# AI-default tells

The frame: *could this UI have been generated in 30 seconds with a prompt?* That alone is not a defect; identify actual user harm or an unresolved design goal before proposing a change. These patterns can prompt inspection of actual hierarchy, readability and fit; they do not establish authorship, a defect or permission to redesign.

## Visual alternatives, not mandatory replacements

| Pattern to inspect | Possible alternative when relevant | Linked node |
|---|---|---|
| Purple-indigo-fuchsia gradient on hero | Monochrome with one true accent | [color-monochromatic](../surface/color-monochromatic.md) |
| Inter or SF Pro on a marketing page | Pangram, Geist, Displaay, or similar | [typography-humanity](../typography/typography-humanity.md) |
| Pure `#000` dark mode background | `#18181b` with subtle hue | [dark-mode](../surface/dark-mode.md) |
| Pure `#ffffff` text on dark | rgba(255,255,255,0.92) | [dark-mode](../surface/dark-mode.md) |
| Bootstrap-default shadow `0 2px 8px rgba(0,0,0,0.1)` | Layered shadows at 4–6% opacity, `#111` base | [shadows-whisper](../surface/shadows-whisper.md) |
| Lucide icons (the popular ones — `chevron-down`, `arrow-right`) | Phosphor, Hugeicons, Tabler | [icon-systems](../components/icon-systems.md) |
| Gradient button backgrounds with no reason | Solid color + subtle shadow | [hover-states-subtle](../components/hover-states-subtle.md) |
| Same border-radius everywhere | Intentional scale | [border-radius](../surface/border-radius.md) |
| Asymmetric grid on a *product* page | Use an asymmetric or regular layout according to the actual product task and approved design | [marketing-vs-product-ui](../philosophy/marketing-vs-product-ui.md) |

## Layout

| Pattern to inspect | Possible alternative when relevant |
|---|---|
| Hero + 3 feature cards + FAQ section | Custom layout that matches your story |
| Centered single column from top to bottom | Vary section width based on content type |
| Identical card pattern for unrelated content | Different layouts for different content |
| "Trusted by" with 6 grayscale logos | Optional, or skip entirely |
| Every page is the same template scaled | Per-page custom design |

## Content: examples must be synthetic or source-supported

| Pattern to inspect | Possible alternative when relevant |
|---|---|
| Lorem ipsum or "Coming soon" | Real copy or remove the section |
| "100+ customers" | Use only a sourced accurate figure; never invent a precise count |
| Generated marketing copy ("Unleash your potential") | Hand-written, specific |
| Stock photography | Real screenshots or no images |
| Empty placeholder names ("John Doe", "Acme Inc") | Real-sounding examples or actual data |

## Animation

| Pattern to inspect | Possible alternative when relevant | Linked node |
|---|---|---|
| Crossfading icons (a plain opacity swap that double-exposes) | Rotate one icon when the change is angular; otherwise a deep-scale blur swap (0.3 → 1, `blur(3px)`, bounce-0 spring) is fine | [fly-not-teleport](../motion/fly-not-teleport.md), [morphing-icons](../motion/morphing-icons.md) |
| Same-easing animations everywhere | Custom cubic-bezier scale | [easing-curves](../motion/easing-curves.md) |
| Loading spinner with no eta | Skeleton, progress bar, or nothing | [empty-loading-states](../components/empty-loading-states.md) |
| Scroll-driven hero parallax on product UI | Evaluate readability, performance and purpose on the intended surface rather than banning a product-UI effect | [marketing-vs-product-ui](../philosophy/marketing-vs-product-ui.md) |
| Bouncy spring on a daily-use button | Subtle, fast easing | [delight-impact-curve](../philosophy/delight-impact-curve.md) |
| Animation on `:hover` for touch devices | Gate with `@media (hover: hover)` | [hover-states-subtle](../components/hover-states-subtle.md) |

## Sound

| Pattern to inspect | Possible alternative when relevant | Linked node |
|---|---|---|
| A click on every button, a whoosh on every transition | Assess useful, permitted audio for the actual task and repetition pattern | [sound-decision-framework](../sound/sound-decision-framework.md) |
| Recognizable stock-pack sounds (Kenney raw, the Discord ping) | One material, one generated or re-pitched family | [sound-palette](../sound/sound-palette.md) |
| "Futuristic UI blip" with reverb tail | Dry, short, a physical material | [sound-spec](../sound/sound-spec.md) |
| Sound on by default, no toggle | Follow the approved audio experience, browser requirements and existing user control; do not invent a toggle or default change | [sound-playback-web](../sound/sound-playback-web.md) |
| Unstructured bed in a launch video (from 0 s, flat level, no drop on the reveal, library blips on top) | Trim the head so the drop lands on the reveal and break down under reading, or a one-key bed with derived clicks, or none | [launch-video-music](../sound/launch-video-music.md) |

## Microcopy

| Pattern to inspect | Possible alternative when relevant |
|---|---|
| "Get started" as primary CTA | Specific to action: "Create project", "Try it" |
| "Awesome!" success message | Quieter: "Saved.", "Done." |
| "Oops!" error message | Plain: "Couldn't save. Try again." |
| AI-generated tooltip phrasing ("Click here to view...") | Imperative, short: "View details" |

## What the prevalence data says

taste-skill measured 246 gallery sites and split them by a model panel's scores into top and weak. These devices are at least twice as common on weak sites (top / weak): icon-topped feature cards 1 % / 28 %, tiny tracked caps 16 % / 57 % (three or more on a page: 6 % / 43 %), gradient text 2 % / 13 %, pill labels above a heading 5 % / 26 %, five or more resting shadows 10 % / 30 %, emoji 10 % / 26 %, gradient fills 22 % / 52 %. One site in 246 has a terracotta button and none has a violet one. Some devices are *not* tells: backdrop blur (32 % / 39 %), the italic-serif accent word (4 % / 7 %) and thin rules (61 % / 52 %) show no real difference, and monospace labels are more common on top sites (44 % / 24 %). Delete the first group on sight. The second group is a choice, not a defect. Most of these can be found with a grep: [review-checklist](../meta/review-checklist.md) rows 14–22.

## When to apply

Use these as investigation prompts when appearance is in scope. Preserve an approved style and identify the actual defect before changing it; neither a pattern count nor removal alone establishes improved quality.

## Gotcha

This list is not anti-AI — it's anti-default. Many AI-generated UIs are excellent because the prompter knew to specify these things. The tells appear when no one specified anything. The fix is opinion, not avoidance of generation.

## Sources

- guidelines.sh — the bulk of this list.
- Benji Taylor — content authenticity, real data.
- Emil Kowalski — animation tells.
- Leonxlnx, taste-skill v2.1.1 (MIT, HEAD a9c73c3): `skills/taste-skill/references/research.md` §6–7, device prevalence measured in the page on 246 One Page Love and Awwwards sites collected 2026-10-05. "Top" is a model-panel score of 7.5 or more (82 sites) and "weak" under 6.5 (23 sites): model judgements of screenshots, one capture per site, fashion as much as quality.
