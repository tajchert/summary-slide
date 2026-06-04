import { describe, it, expect } from "vitest";
import { rectsOverlap, firstFreeCell, defaultSpan, availableResizeHandles } from "./gridUtils";
import type { GridRect } from "../schema/slide";

const r = (x: number, y: number, w: number, h: number): GridRect => ({ x, y, w, h });

describe("rectsOverlap", () => {
  it("detects overlap", () => {
    expect(rectsOverlap(r(0, 0, 2, 2), r(1, 1, 2, 2))).toBe(true);
  });
  it("touching edges do not overlap", () => {
    expect(rectsOverlap(r(0, 0, 2, 2), r(2, 0, 2, 2))).toBe(false);
    expect(rectsOverlap(r(0, 0, 2, 2), r(0, 2, 2, 2))).toBe(false);
  });
});

describe("firstFreeCell", () => {
  it("returns origin on empty grid", () => {
    expect(firstFreeCell([], 2, 1)).toEqual({ x: 0, y: 0, w: 2, h: 1 });
  });
  it("scans rows left-to-right, top-to-bottom", () => {
    expect(firstFreeCell([r(0, 0, 12, 1)], 2, 1)).toEqual({ x: 0, y: 1, w: 2, h: 1 });
    expect(firstFreeCell([r(0, 0, 3, 1)], 2, 1)).toEqual({ x: 3, y: 0, w: 2, h: 1 });
  });
  it("returns null when nothing fits", () => {
    expect(firstFreeCell([r(0, 0, 12, 6)], 1, 1)).toBeNull();
  });
  it("returns null for degenerate spans", () => {
    expect(firstFreeCell([], 13, 1)).toBeNull();
    expect(firstFreeCell([], 0, 1)).toBeNull();
  });
  it("fits tall cards", () => {
    expect(firstFreeCell([r(0, 0, 12, 5)], 1, 2)).toBeNull(); // only one row left
    expect(firstFreeCell([r(0, 0, 12, 4)], 1, 2)).toEqual({ x: 0, y: 4, w: 1, h: 2 });
  });
});

describe("availableResizeHandles", () => {
  const sorted = (rect: GridRect, others: GridRect[]) =>
    [...availableResizeHandles(rect, others)].sort();

  it("shows all four edges for a card with open space around it", () => {
    expect(sorted(r(4, 2, 2, 2), [])).toEqual(["e", "n", "s", "w"]);
  });

  it("drops directions clipped by the grid boundary", () => {
    expect(sorted(r(0, 0, 2, 2), [])).toEqual(["e", "s"]); // top-left corner
    expect(sorted(r(10, 4, 2, 2), [])).toEqual(["n", "w"]); // bottom-right corner
  });

  it("drops a direction blocked by a neighbor", () => {
    // neighbor immediately right of the card, covering its full edge
    expect(sorted(r(4, 2, 2, 2), [r(6, 2, 2, 2)])).toEqual(["n", "s", "w"]);
  });

  it("partial neighbor overlap on the adjacent strip still blocks expansion", () => {
    // neighbor only covers one of the two rows next to the card's right edge
    expect(sorted(r(4, 2, 2, 2), [r(6, 3, 2, 1)])).toEqual(["n", "s", "w"]);
  });

  it("falls back to e when boxed in horizontally but shrinkable", () => {
    // full-width row card: no space left or right, but w > 1
    expect(sorted(r(0, 2, 12, 2), [])).toEqual(["e", "n", "s"]);
  });

  it("falls back to s when boxed in vertically but shrinkable", () => {
    // full-height column card: no space above or below, but h > 1
    expect(sorted(r(4, 0, 2, 6), [])).toEqual(["e", "s", "w"]);
  });

  it("full-canvas card keeps only the shrink fallbacks", () => {
    expect(sorted(r(0, 0, 12, 6), [])).toEqual(["e", "s"]);
  });

  it("boxed-in 1x1 card has no handles", () => {
    const neighbors = [r(0, 0, 1, 1), r(2, 0, 1, 1), r(1, 1, 1, 1)];
    expect(sorted(r(1, 0, 1, 1), neighbors)).toEqual([]);
  });
});

describe("defaultSpan", () => {
  it("gives a sensible default per card type", () => {
    expect(defaultSpan("stat")).toEqual({ w: 2, h: 2 });
    expect(defaultSpan("hero")).toEqual({ w: 4, h: 4 });
    expect(defaultSpan("icon")).toEqual({ w: 2, h: 2 });
    expect(defaultSpan("headline")).toEqual({ w: 4, h: 2 });
    expect(defaultSpan("image")).toEqual({ w: 4, h: 2 });
    expect(defaultSpan("list")).toEqual({ w: 3, h: 3 });
    expect(defaultSpan("iconRow")).toEqual({ w: 4, h: 1 });
    expect(defaultSpan("statGroup")).toEqual({ w: 3, h: 2 });
    expect(defaultSpan("code")).toEqual({ w: 5, h: 2 });
  });
});
