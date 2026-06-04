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
