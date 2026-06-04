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

  // Gotcha #3: theme switching keeps card overrides, so a background override
  // without an explicit textColor becomes unreadable in the opposite mode.
  it("every card background override ships a textColor", () => {
    for (const t of templates)
      for (const c of t.doc.cards)
        if (c.style?.background)
          expect(c.style.textColor,
            `${t.name}: card ${c.id} overrides background without textColor`).toBeDefined();
  });

  // Pixel Light's cards must follow the theme tokens so the light/dark toggle
  // restyles the whole slide (background overrides would pin cards to one mode).
  it("pixel-light cards carry no background overrides", () => {
    const t = templates.find((t) => t.id === "pixel-light")!;
    for (const c of t.doc.cards)
      expect(c.style?.background, `card ${c.id} has a background override`).toBeUndefined();
  });

  it("covers both light and dark themes", () => {
    const modes = new Set(templates.map((t) => t.doc.theme.mode));
    expect(modes.has("light")).toBe(true);
    expect(modes.has("dark")).toBe(true);
  });
});
