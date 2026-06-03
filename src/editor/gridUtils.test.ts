import { describe, it, expect } from "vitest";
import { rectsOverlap, firstFreeCell, defaultSpan } from "./gridUtils";
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
  it("fits tall cards", () => {
    expect(firstFreeCell([r(0, 0, 12, 5)], 1, 2)).toBeNull(); // only one row left
    expect(firstFreeCell([r(0, 0, 12, 4)], 1, 2)).toEqual({ x: 0, y: 4, w: 1, h: 2 });
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
  });
});
