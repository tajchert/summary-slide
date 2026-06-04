import { GRID_COLS, GRID_ROWS } from "../schema/slide";
import type { CardType, GridRect } from "../schema/slide";

export function rectsOverlap(a: GridRect, b: GridRect): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

/** First top-left position where a w×h card fits without colliding; null if full. */
export function firstFreeCell(occupied: GridRect[], w: number, h: number): GridRect | null {
  if (w <= 0 || h <= 0 || w > GRID_COLS || h > GRID_ROWS) return null;
  for (let y = 0; y <= GRID_ROWS - h; y++) {
    for (let x = 0; x <= GRID_COLS - w; x++) {
      const candidate = { x, y, w, h };
      if (!occupied.some((o) => rectsOverlap(candidate, o))) return candidate;
    }
  }
  return null;
}

export type ResizeHandle = "n" | "s" | "e" | "w";

/**
 * Edge resize handles to show on a card: only directions with free space to
 * expand into. Per-axis fallback keeps boxed-in cards shrinkable (e for
 * horizontal, s for vertical).
 */
export function availableResizeHandles(rect: GridRect, others: GridRect[]): ResizeHandle[] {
  // The 1-cell strip adjacent to each edge; in-bounds + collision-free ⇒ expandable.
  const strips: Record<ResizeHandle, GridRect> = {
    n: { x: rect.x, y: rect.y - 1, w: rect.w, h: 1 },
    s: { x: rect.x, y: rect.y + rect.h, w: rect.w, h: 1 },
    e: { x: rect.x + rect.w, y: rect.y, w: 1, h: rect.h },
    w: { x: rect.x - 1, y: rect.y, w: 1, h: rect.h },
  };
  const expandable = (dir: ResizeHandle) => {
    const s = strips[dir];
    return s.x >= 0 && s.y >= 0 && s.x + s.w <= GRID_COLS && s.y + s.h <= GRID_ROWS
      && !others.some((o) => rectsOverlap(s, o));
  };

  const handles: ResizeHandle[] = (["n", "s", "e", "w"] as const).filter(expandable);
  if (!handles.includes("e") && !handles.includes("w") && rect.w > 1) handles.push("e");
  if (!handles.includes("n") && !handles.includes("s") && rect.h > 1) handles.push("s");
  return handles;
}

export function defaultSpan(type: CardType): { w: number; h: number } {
  switch (type) {
    case "stat": return { w: 2, h: 2 };
    case "headline": return { w: 4, h: 2 };
    case "image": return { w: 4, h: 2 };
    case "icon": return { w: 2, h: 2 };
    case "hero": return { w: 4, h: 4 };
    case "list": return { w: 3, h: 3 };
    case "iconRow": return { w: 4, h: 1 };
    case "statGroup": return { w: 3, h: 2 };
    case "code": return { w: 5, h: 2 };
  }
}
