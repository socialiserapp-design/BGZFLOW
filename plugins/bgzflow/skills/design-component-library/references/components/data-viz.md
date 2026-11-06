# Data-Visualization Components

Adapted component specification: use only the component and states required by the current task. Dimensions, variants and token names below are examples, not product defaults or mandatory new features. Recover approved tokens and prefer existing accessible components; web ARIA examples do not replace native platform semantics. A listed loading, error or selected state is a case to consider when applicable, not a required eight-state schema. No new workflow gate or manual record is introduced.

Charts and graphs. Color comes from the project’s data-visualisation tokens (color-blind-aware categorical + sequential/diverging scales), using approved brand colours where their role and contrast support the data. Charts are **graphical objects**: UI/contrast rules apply (3:1 for meaningful strokes) and **information must never depend on color alone**. Render via the [platform and token mapping](../platform-mapping.md).

---

**Anatomy (shared):** `[plot area] + [axes + tick labels] + [gridlines] + [series (bars/lines/points)] + [legend] + [tooltip on hover] + [optional title/caption]`. Every chart composes from these regions; color/axis/grid styling comes from the project’s data-visualisation tokens.

## Universal chart rules

1. **Token-driven series color**: map series to `dataviz.categorical.*`; sequences to `dataviz.sequential.*`; +/− to `dataviz.diverging.*` / `dataviz.semantic.*`. For crowded categorical series, compare direct labels, grouping, filtering or another encoding; do not hide required data to meet a fixed series count.
2. **Never color-alone**: pair series with **direct labels**, distinct markers/dash patterns, or texture. Provide a legend *and* on-hover labels.
3. **Axes & grid**: use `dataviz.axis.*` / `dataviz.grid.*` (low-contrast gridlines `~1.4:1` are acceptable as they are non-essential; axis text meets 4.5:1).
4. **Motion**: entrance/transition from the project’s motion tokens (a short ease-out is one option); animate value changes, not on every re-render. Honor `prefers-reduced-motion` (render final frame).
5. **Accessible alternative**: every chart ships a text/table equivalent (visually-hidden `<table>` or `<figcaption>` summary) and a descriptive `aria-label`/`aria-labelledby`.

---

## 1. Bar / Column

Compare discrete categories.

**Variants:** vertical (column), horizontal (bar), grouped, stacked, 100%-stacked.
**States:** default, hover (bar emphasis + tooltip), focus (keyboardable bar `shadow.focus-ring`), selected/filtered, empty, loading (skeleton bars).
**Accessibility:** bars in a `role="list"`/`figure` with per-bar `aria-label="Category: value"`; or expose the backing table. Order bars meaningfully (value or category), label axes.

## 2. Line / Area

Trends over a continuous dimension (usually time).

**Variants:** single line, multi-series, area, stacked area, stepped, with threshold band.
**States:** default, hover (crosshair + nearest-point tooltip), focus (point navigation), zoomed/brushed, empty, loading.
**Accessibility:** distinguish series by **dash pattern + marker shape**, not only hue. Provide point-by-point keyboard traversal or the table fallback. Label units on the axis.

## 3. Pie / Donut

Part-to-whole where segment differences can be read; five or six is an illustrative small set, not a cap. Compare bars for similar values or many categories.

**Variants:** pie, donut (with center metric), with leader-line labels.
**States:** default, hover (segment lift + value), focus, selected, empty.
**Accessibility:** **direct-label each segment with name + %**, because legends alone fail. Prefer a bar chart when segments are many or similar in size. Order by magnitude.

## 4. Sparkline

Inline micro-trend (in a table cell or KPI card). No axes.

**Variants:** line, bar, win/loss; with end-dot or min/max markers.
**States:** default, hover (reveal value), positive/negative tint (`dataviz.semantic.positive`/`negative`).
**Accessibility:** decorative if the numeric value is adjacent (`aria-hidden`); otherwise give an `aria-label` with the trend summary ("Up 12% over 7 days").

## 5. Scatter / Bubble

Correlation across two (or three, via size) measures.

**Variants:** scatter, bubble (size = 3rd measure), with trend line, categorized by color+shape.
**States:** default, hover (point tooltip), focus, selected/lassoed, empty.
**Accessibility:** encode category by **shape and** color; label axes with units; provide the data table. Don't rely on size alone for the third measure; include it in the tooltip.
