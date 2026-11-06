> BGZFLOW adaptation: use this technical reference only for the current requested outcome. Existing user decisions, actual project architecture and host permissions govern. Numeric examples and aesthetic opinions below are options, not universal rules, new gates or authority to redesign. External products, model weights and licences need current verification before use; none is installed by reading this page. Use the same brief and private project records; do not modify installed learning files.

---
title: information-architecture
summary: Structure follows the actual user task and mental model. Group related views, keep actions reachable, preserve context and explain recovery; no universal menu-depth or sticky-action rule.
tags: [layout, information-architecture, navigation, settings, onboarding]
---

# Information architecture

Information architecture decides what a user can find before any pixel is styled. The rule under every item here: arrange and name things the way the user already thinks about them, not the way the codebase or the org chart is split. A flat structure buries everything equally; hierarchy is something you build on purpose. Visual hierarchy inside one screen is [grouping-by-space](grouping-by-space.md); this node is the structure across screens.

## Grouping

- **Long settings get sections, not a scroll.** Past about a dozen options, split them under a side nav with named groups (Account, Billing, Notifications), each a short page. Forty toggles on one page have no hierarchy.
- **Progressive disclosure.** Show what most users need; put the rare options behind an "Advanced" section or a detail page. Better still, let a feature appear when it becomes relevant (a swap control once the wallet holds two tokens): Family kept the fundamentals at hand and revealed the rest by context, so a product with hundreds of paths stayed simple for newcomers without hiding depth from experts.
- **Name by the user's model.** "Send messages in the background", not "Enable async relay mode". Internal jargon on a label is a bug report waiting to happen.

## Navigation depth

- **Tabs are views of one thing**: this week / month / year, or one record's Overview / Activity / Settings. Unrelated destinations are navigation, not tabs ([component-confusables](../components/component-confusables.md)).
- **Navigation depth:** check whether users can find and retain location in the actual task. Flattening, pages, breadcrumbs and nested menus are alternatives; do not impose a two-level cap.
- **Search logs are rename requests.** If people keep searching "invoices" while the nav says "Billing", rename the item. Heavy search for browsable things means the IA failed.

## Keeping the next step visible

- **Keep primary actions reachable in context.** A sticky bar or header can help a long task; an end-of-form action may be the appropriate intentional sequence. Do not add sticky chrome automatically.
- **Destructive actions live apart from confirm**: separate them by space and a visual break, never side by side as equals ([destructive-actions](../components/destructive-actions.md)).
- **Onboarding delivers value first.** Creating the user's first project in one step beats an eight-stop tour. A tour explains the product; the shortcut proves it.

## Dead ends

- **Empty views explain and act**: why it's empty, plus the button that fills it ([empty-loading-states](../components/empty-loading-states.md)).
- **Error pages name the failure and a specific recovery**: "That link expired. Request a new one", not "Something went wrong" with a back button.

## When to apply

Planning a new section, settings page, or nav; reviewing a product where users "can't find" things; any time a third menu level or a twelfth tab is proposed.

## Gotcha

Renaming beats restructuring. Before redrawing the sitemap, check whether the labels are the problem: a mislabeled item in the right place fails the same way as a well-labeled one in the wrong place, and the label is a one-line fix.

## Sources

- Emil Kowalski's design-engineering practice, distilled by HKTITAN.
- Benji Taylor, *Family Values* §Simplicity, [benji.org/family-values](https://benji.org/family-values).
- Related: [grouping-by-space](grouping-by-space.md), [url-as-state](url-as-state.md), [destructive-actions](../components/destructive-actions.md), [empty-loading-states](../components/empty-loading-states.md), [design-vocabulary](../meta/design-vocabulary.md).
