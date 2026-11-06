> BGZFLOW adaptation: use this technical reference only for the current requested outcome. Existing user decisions, actual project architecture and host permissions govern. Numeric examples and aesthetic opinions below are options, not universal rules, new gates or authority to redesign. External products, model weights and licences need current verification before use; none is installed by reading this page. Use the same brief and private project records; do not modify installed learning files.

---
title: cards-design
summary: Design card grouping, hierarchy, actions and feedback around the actual content and approved visual language.
tags: [components, cards]
---

# Cards design

Cards are easy to over-use and easier to over-nest. A well-designed card is a self-contained unit of content with intentional interior structure. Nested cards can clarify independent groups or can add redundant chrome; assess the actual information hierarchy.

## When nesting helps or obscures hierarchy

```
Bad:  card > card > card (three borders, three shadows, three radii)
Good: card > content with internal hierarchy (one border, one shadow)
```

If you find yourself reaching for a card-inside-a-card, the inner card is probably:
- A list item (use a `<li>` with hover state, not a card).
- A heading + content block (use typography hierarchy, not a wrapped container).
- A status indicator (use a badge or chip inline, not a card).

A nested call-out, interactive subpanel or independent group can be appropriate. The number of levels alone is not a defect.

## Designing card interiors

A card is a small layout problem. Its interior deserves the same care as a screen:

- **Whitespace beats borders for separating sections.** A 24px gap between header and body reads cleaner than a 1px divider.
- **Secondary actions** may reveal on hover if they also remain discoverable and operable on keyboard focus, touch and assistive input. Keep core actions directly available.
- **Subtle icons** to anchor information types — but don't add an icon to every line. Choose the number needed for meaningful distinction, not a fixed icon budget.
- **Variable density inside.** A list of recent activity inside the card can be tighter than the card's outer padding.

Example card structure:

```tsx
<Card>
  <CardHeader>
    <CardTitle>Project Atlas</CardTitle>
    <CardActions show-on-hover>{/* Edit, Archive, Share */}</CardActions>
  </CardHeader>
  <CardMeta>
    <Icon name="folder" /> 12 files · Updated 2h ago
  </CardMeta>
  <CardBody>
    <p>Brief description that fits on 2–3 lines max.</p>
  </CardBody>
  <CardFooter>
    <AvatarStack avatars={collaborators} />
    <Badge>Active</Badge>
  </CardFooter>
</Card>
```

## Card hover states

Most cards in a grid should have a hover state. See [hover-states-subtle](hover-states-subtle.md) — the right answer is usually:

- 1px lift (`transform: translateY(-1px)`).
- Slight background-color shift on the card body.
- Secondary action buttons may fade in on hover and focus, with an equivalent touch route.

A lift or shadow change can be intentional. Check whether it communicates interactivity, remains comfortable and fits the approved design.

## Cards as the wrong choice

Cards aren't always the right container. Alternatives:

| Content | Better than card |
|---|---|
| A list of items the user reads top-to-bottom | Use a list with hover rows |
| A single highlighted piece of content | Use typography hierarchy + whitespace |
| Status that updates frequently | Inline badge or pill |
| Tabular comparison data | Use a real table ([data-is-content](../philosophy/data-is-content.md)) |
| Long-form content | Use sections with headers, not cards |

If your screen is *all* cards, it probably has no hierarchy. Some content earns a card; most doesn't.

## When to apply

- Grid of equally-weighted items (projects, products, users).
- Bento layouts on landing pages.
- Dashboards with discrete widgets.
- Anywhere the content is self-contained and benefits from a clear boundary.

## When NOT to apply

- Long-form reading.
- Single-focus screens (each card competes with the focus).
- Lists where every row is just text + metadata (use rows, not cards).
- Inside an already-cardified container.

## Gotcha

The nested-radius rule from [border-radius](../surface/border-radius.md) applies: if a card has `border-radius: 12px` and contains a media (image, video) that fills the top, the media needs `border-radius: 12px 12px 0 0` to match. Most "this card looks off" complaints trace to a mismatched nested radius.

## Sources

- guidelines.sh — "Don't nest cards" + "Design card interiors intentionally."
- Linear, Notion, Vercel — bento and grid card patterns in production.
- Related: [hover-states-subtle](hover-states-subtle.md), [border-radius](../surface/border-radius.md), [ai-default-tells](../anti-patterns/ai-default-tells.md), [shadows-whisper](../surface/shadows-whisper.md).
