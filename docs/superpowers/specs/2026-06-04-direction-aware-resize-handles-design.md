# Direction-aware resize handles — design

## Problem

Editor cards show resize arrows hardcoded to `["se", "e", "s"]` regardless of
whether there is room to grow. Cards can't be expanded leftward/upward at all,
and arrows appear even when expansion in that direction is impossible.

## Decision

Show edge resize handles (`n`/`s`/`e`/`w`) only in directions with empty grid
space to expand into. Corner handles are removed entirely.

- A direction is **expandable** when the 1-cell strip adjacent to that full
  card edge is inside the 12×6 grid and overlaps no other card.
- **Per-axis shrink fallback:** if neither horizontal direction is expandable
  but the card has `w > 1`, still show `e`; if neither vertical direction is
  expandable but `h > 1`, still show `s`. This keeps boxed-in cards shrinkable.
- A boxed-in 1×1 card shows no handles (nothing to resize anyway).

## Implementation

1. `src/editor/gridUtils.ts` — new pure helper
   `availableResizeHandles(rect: GridRect, others: GridRect[]): ResizeHandle[]`,
   reusing `rectsOverlap`.
2. `src/editor/EditorCanvas.tsx` — the `layout` memo sets per-item
   `resizeHandles` (overrides RGL's global prop, which is removed). Handles
   recompute on every move/resize because the memo keys off `doc.cards`.
3. No new CSS: stock react-resizable styles already ship arrows for all axes.
   Resizing from `w`/`n` shifts `x`/`y` natively; `preventCollision` +
   `isBounded` already constrain it.

## Tests

`gridUtils.test.ts` (helper-first, TDD): open space → all four; grid-edge
clipping; neighbor blocking one side; boxed-in wide/tall card → fallback
`e`/`s`; boxed-in 1×1 → none; full 12×6 card → `e` + `s`.

## Out of scope

Corner/diagonal resizing, custom handle visuals, RGL behavior changes.
