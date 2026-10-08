# Looks: platform-native

Part of the [looks library](../looks-library.md). These looks borrow the platform's own design language as the direction itself. They are options, not a requirement: a product with an approved custom look keeps it, and a platform's preferred controls never override that look. Motion equivalents are in [motion by platform](../motion-by-platform.md).

### P1 iOS Native Premium
**Suits:** iPhone and iPad apps that should feel at home and trustworthy. **Avoid for:** products whose identity depends on a custom world.
- **Type:** SF Pro with Dynamic Type text styles (large title, headline, body, footnote); SF Mono for numbers when helpful.
- **Colour:** system background and grouped background, label hierarchy (primary to quaternary), one tint colour; automatic dark mode with semantic colours.
- **Space and shape:** inset grouped lists, 16-20 pt margins, continuous-corner (squircle) radii, sheets with detents.
- **Material:** system materials (thin to thick) and, on iOS 26 and later, Liquid Glass for bars and floating controls.
- **Motion:** system springs, navigation push, matched geometry for hero transitions, symbol effects on SF Symbols.
- **Signature:** large-title navigation collapsing on scroll, context menus with previews, SF Symbols in hierarchical or palette rendering.

### P2 Material 3 Expressive
**Suits:** Android, Wear OS and Pixel-aligned products. **Avoid for:** iPhone-first products that want platform feel.
- **Type:** Roboto Flex or the brand font mapped to the Material type roles (display, headline, title, body, label).
- **Colour:** dynamic colour from wallpaper or a brand seed, tonal palettes, roles such as primary, secondary container and surface container; tonal elevation instead of strong shadows.
- **Space and shape:** expressive shape scale (from 4 to full), pill buttons and chips, shape morphing on press.
- **Material:** state layers (pressed overlays 10-15% opacity), surface containers.
- **Motion:** emphasized easing `cubic-bezier(0.2,0,0,1)`, spring-based expressive motion, predictive back.
- **Signature:** big expressive FAB and toolbar, shapes that morph between states.

### P3 Cross-Platform Neutral Premium
**Suits:** apps shipping on iOS and Android with one codebase and a modest custom identity. **Avoid for:** when one platform dominates the audience.
- **Type:** one brand sans that scales with system text size.
- **Colour:** brand neutrals plus one accent; semantic status colours with labels.
- **Space and shape:** universal bottom tabs, sheets, cards; radius 12-20.
- **Material:** light elevation; no platform-specific glass unless guarded.
- **Motion:** shared springs; native-feeling navigation per platform.
- **Signature:** a consistent brand layer over each platform's navigation patterns.

### P4 Fluent Desktop
**Suits:** Windows apps, enterprise tools, productivity suites. **Avoid for:** consumer mobile.
- **Type:** Segoe UI Variable with its optical sizes.
- **Colour:** neutral layers with an accent from the system or brand.
- **Space and shape:** compact or standard density, radius 4-8.
- **Material:** Mica and Acrylic backdrops for windows and flyouts.
- **Motion:** connected animations, short entrance slides.
- **Signature:** navigation view with collapsible pane, command bar, reveal highlight.

### P5 macOS Desktop
**Suits:** Mac utilities, creative and pro tools. **Avoid for:** touch-first.
- **Type:** SF Pro at desktop sizes (13 pt body), monospaced digits for data.
- **Colour:** system colours, vibrancy in sidebars, accent from user setting.
- **Space and shape:** sidebar plus content plus inspector, toolbar with unified title.
- **Material:** sidebar and window materials, Liquid Glass toolbars on current releases.
- **Motion:** subtle, system-driven.
- **Signature:** keyboard shortcuts everywhere, menu bar completeness, drag and drop between apps.

### P6 Host-Ecosystem Admin (Polaris, Spectrum and similar)
**Suits:** apps that live inside another product's admin or creative suite, where matching the host builds trust. **Avoid for:** standalone brands.
- **Type, colour, shape, motion:** use the host's official package and tokens; do not imitate it by eye.
- **Signature:** the app feels like part of the host; brand appears only in content and illustrations.
