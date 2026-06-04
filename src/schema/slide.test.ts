import { describe, it, expect } from "vitest";
import { slideDocumentSchema, blankDocument, GRID_COLS, GRID_ROWS } from "./slide";

describe("slideDocumentSchema", () => {
  it("accepts a blank document", () => {
    expect(slideDocumentSchema.safeParse(blankDocument()).success).toBe(true);
  });

  it("accepts every card type", () => {
    const doc = blankDocument();
    doc.cards = [
      { id: "a", type: "stat", grid: { x: 0, y: 0, w: 2, h: 1 },
        content: { value: { text: "48MP" }, caption: { text: "Fusion camera" } } },
      { id: "b", type: "headline", grid: { x: 2, y: 0, w: 4, h: 1 },
        content: { text: { text: "Spotlight actions" } } },
      { id: "c", type: "image", grid: { x: 6, y: 0, w: 3, h: 2 },
        content: { src: "/i/x.png", fit: "cover" } },
      { id: "d", type: "icon", grid: { x: 9, y: 0, w: 1, h: 1 },
        content: { icon: { kind: "emoji", value: "📞" }, label: { text: "Phone" }, layout: "top" } },
      { id: "e", type: "hero", grid: { x: 0, y: 2, w: 6, h: 3 },
        content: { title: { text: "macOS" } } },
      { id: "f", type: "list", grid: { x: 6, y: 2, w: 3, h: 2 },
        content: { title: { text: "More" }, items: [{ text: "Wi-Fi 7" }], marker: "bullet" } },
      { id: "g", type: "iconRow", grid: { x: 9, y: 1, w: 3, h: 1 },
        content: { items: [
          { icon: { kind: "emoji", value: "📷" }, label: { text: "0.5x" } },
          { icon: { kind: "image", src: "/i/port.png" } },
        ], caption: { text: "Four lenses in your pocket" } } },
      { id: "h", type: "statGroup", grid: { x: 0, y: 5, w: 3, h: 1 },
        content: { layout: "row", stats: [
          { value: { text: '6.9"' }, caption: { text: "Pro Max" } },
          { prefix: { text: "Up to" }, value: { text: '6.3"' } },
        ] } },
    ];
    const res = slideDocumentSchema.safeParse(doc);
    expect(res.success).toBe(true);
  });

  it("rejects out-of-bounds grid placement", () => {
    const doc = blankDocument();
    doc.cards = [{ id: "a", type: "headline", grid: { x: 12, y: 0, w: 1, h: 1 },
      content: { text: { text: "x" } } } as never];
    expect(slideDocumentSchema.safeParse(doc).success).toBe(false);

    const overflowCols = blankDocument();
    overflowCols.cards = [{ id: "a", type: "headline", grid: { x: 11, y: 0, w: 2, h: 1 },
      content: { text: { text: "x" } } } as never];
    expect(slideDocumentSchema.safeParse(overflowCols).success).toBe(false);

    const overflowRows = blankDocument();
    overflowRows.cards = [{ id: "a", type: "headline", grid: { x: 0, y: 5, w: 1, h: 2 },
      content: { text: { text: "x" } } } as never];
    expect(slideDocumentSchema.safeParse(overflowRows).success).toBe(false);
  });

  it("rejects unknown card types", () => {
    const doc = blankDocument();
    doc.cards = [{ id: "a", type: "video", grid: { x: 0, y: 0, w: 1, h: 1 }, content: {} } as never];
    expect(slideDocumentSchema.safeParse(doc).success).toBe(false);
  });

  it("rejects a statGroup with zero stats", () => {
    const doc = blankDocument();
    doc.cards = [{ id: "a", type: "statGroup", grid: { x: 0, y: 0, w: 3, h: 2 },
      content: { stats: [], layout: "column" } } as never];
    expect(slideDocumentSchema.safeParse(doc).success).toBe(false);
  });

  it("rejects a statGroup with more than 6 stats", () => {
    const doc = blankDocument();
    doc.cards = [{ id: "a", type: "statGroup", grid: { x: 0, y: 0, w: 3, h: 2 },
      content: { stats: Array.from({ length: 7 }, () => ({ value: { text: "2x" } })),
        layout: "column" } } as never];
    expect(slideDocumentSchema.safeParse(doc).success).toBe(false);
  });

  it("rejects an iconRow with zero items", () => {
    const doc = blankDocument();
    doc.cards = [{ id: "a", type: "iconRow", grid: { x: 0, y: 0, w: 3, h: 1 },
      content: { items: [] } } as never];
    expect(slideDocumentSchema.safeParse(doc).success).toBe(false);
  });

  it("rejects an iconRow with more than 12 items", () => {
    const doc = blankDocument();
    doc.cards = [{ id: "a", type: "iconRow", grid: { x: 0, y: 0, w: 3, h: 1 },
      content: { items: Array.from({ length: 13 }, () => ({ icon: { kind: "emoji", value: "📷" } })) } } as never];
    expect(slideDocumentSchema.safeParse(doc).success).toBe(false);
  });

  it("blankDocument has 16:9 canvas and constants match", () => {
    const doc = blankDocument();
    expect(doc.canvas).toEqual({ format: "16:9", width: 1920, height: 1080 });
    expect(GRID_COLS).toBe(12);
    expect(GRID_ROWS).toBe(6);
  });
});
