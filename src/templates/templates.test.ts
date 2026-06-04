import { describe, it, expect } from "vitest";
import { templates } from "./index";
import { slideDocumentSchema, GRID_COLS, GRID_ROWS } from "../schema/slide";
import { rectsOverlap } from "../editor/gridUtils";

describe("built-in templates", () => {
  it("there are at least 4, all schema-valid", () => {
    expect(templates.length).toBeGreaterThanOrEqual(4);
    for (const t of templates) {
      expect(t.name.length).toBeGreaterThan(0);
      const res = slideDocumentSchema.safeParse(t.doc);
      expect(res.success, `${t.name}: ${!res.success ? res.error.message : ""}`).toBe(true);
    }
  });

  it("no template has overlapping or out-of-bounds cards", () => {
    for (const t of templates) {
      const rects = t.doc.cards.map((c) => c.grid);
      for (const r of rects) {
        expect(r.x + r.w).toBeLessThanOrEqual(GRID_COLS);
        expect(r.y + r.h).toBeLessThanOrEqual(GRID_ROWS);
      }
      for (let i = 0; i < rects.length; i++)
        for (let j = i + 1; j < rects.length; j++)
          expect(rectsOverlap(rects[i], rects[j]),
            `${t.name}: cards ${i} and ${j} overlap`).toBe(false);
    }
  });

  it("covers both light and dark themes", () => {
    const modes = new Set(templates.map((t) => t.doc.theme.mode));
    expect(modes.has("light")).toBe(true);
    expect(modes.has("dark")).toBe(true);
  });
});
