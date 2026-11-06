> BGZFLOW adaptation: use this technical reference only for the current requested outcome. Existing user decisions, actual project architecture and host permissions govern. Numeric examples and aesthetic opinions below are options, not universal rules, new gates or authority to redesign. External products, model weights and licences need current verification before use; none is installed by reading this page. Use the same brief and private project records; do not modify installed learning files.

---
title: presence-signals
summary: Showing that another person is here, half here, or gone in a real-time product — an arrival that fills a ring, partial attention as a dashed outline, a leaving beat, live typing that resizes its bubble, reactions pinned where they were tapped in relative coordinates, shared activities that pause when one person leaves, and one colour per person everywhere. From Benji Taylor's Honk.
tags: [components, presence, real-time, collaboration, chat, multiplayer]
---

# Presence signals

Most real-time products show presence as one green dot and a "typing…" line. Honk made presence the axis every feature was designed around, and the patterns transfer to any shared surface: chat, docs, canvases, live games.

## States, each with its own signal

| State | Signal | Honk's version |
|---|---|---|
| Arriving | A transition with a moment to it, not a dot switching colour | A ring around the friend's avatar fills, with a sound ([sound-motion-sync](../sound/sound-motion-sync.md)) |
| Fully here | Live activity, not a label | Every character appears on the other screen as it is typed, typos and edits included |
| Half here | A weaker version of "here", not "away" | The avatar becomes a dashed outline while the friend looks elsewhere in the app |
| Leaving | A short goodbye beat, then gone | A brief burst of waving emoji (in the user's skin tone) with a sound |

Three states read better than two. "Here but looking elsewhere" is the one most products drop, and it is the one that explains a slow reply.

## Rules

- **Activity resizes its container live.** The typing bubble grows as you type and shrinks back when you pause; when both people type at once the screen splits 50/50. The layout tells the conversation's rhythm.
- **A reaction is pinned to what it reacts to.** An authorised reaction may appear at the indicated content point. Rings, audio and haptics are optional existing product behaviours, not permission to add feedback on another person’s device. Store the position in relative coordinates (10% x, 20% y), so it lands on the same spot across screen sizes.
- **Choose absence behaviour by the actual activity.** A synchronous game may pause; an asynchronous collaboration may continue. Do not introduce a new pause or participation gate without user authority.
- **A notification shows its own lifetime.** An in-app banner whose border counts down how long it will stay tells the user how urgent it is and when it will go.
- **One colour per person, everywhere:** cursor, selection, avatar ring, name label. A collaborator recoloured between surfaces reads as two people.
- **Colour carries meaning outside the content too.** Honk turned a tray's background red for destructive actions such as deleting an account ([destructive-actions](destructive-actions.md)).
- **Historical deliberate friction is not permission to add it.** Honk used reveals and signatures for its own interaction goals. Preserve the actual product flow; do not import waiting or signature gates as a design improvement.

## Accessibility

Make consequential presence changes available to assistive technology without flooding the announcement queue. Use appropriate batching, settings and urgency; animated rings and dashed outlines may need equivalent textual meaning.

## When to apply

Designing chat, multiplayer docs and canvases, live cursors, shared games, or any surface where two people are in it at once. In a faux-UI demo of collaboration, each person keeps one colour and their name rides their cursor ([MOC-faux-ui](../faux-ui/MOC-faux-ui.md)).

## Gotcha

Presence animation is frequent. An arrival ring with sound is a delight once an hour and noise in a busy channel; scale the signal down as frequency goes up ([delight-impact-curve](../philosophy/delight-impact-curve.md)), and never fire it for your own presence.

## Sources

- Benji Taylor, *Honkish*, [benji.org/honkish](https://benji.org/honkish) (read 2026-11-01): presence, reactions, mini games, in-app notifications, tray colours, friction moments. Paraphrased.
- Related: [interaction-personality](interaction-personality.md), [avatar-systems](avatar-systems.md), [optimistic-updates](optimistic-updates.md).
