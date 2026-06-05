import { describe, it, expect } from "vitest";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { templates } from "./index";
import { slideDocumentSchema, GRID_COLS, GRID_ROWS } from "../schema/slide";
import { rectsOverlap } from "../editor/gridUtils";

const expectedTemplateImages = [
  ["apple-bento-dark", "t1-img1", "/template-images/apple-bento-dark-t1-img1-four-colors.png"],
  ["apple-bento-dark", "t1-img2", "/template-images/apple-bento-dark-t1-img2-center-stage-camera.png"],
  ["pixel-light", "t2-img1", "/template-images/pixel-light-t2-img1-video-boost.png"],
  ["pixel-light", "t2-img2", "/template-images/pixel-light-t2-img2-matte-finish.png"],
  ["pixel-light", "t2-img3", "/template-images/pixel-light-t2-img3-pro-controls.png"],
  ["developer-keynote-light", "t6-img1", "/template-images/developer-keynote-light-t6-img1-visionos.png"],
  ["airpods-light", "t7-img1", "/template-images/airpods-light-t7-img1-best-fitting.png"],
] as const;

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

  // The new card types shipped 2026-06: the showcase templates must exercise them.
  it("showcase templates cover every new card capability", () => {
    const showcase = templates.filter((t) => t.id !== "everything");
    const all = showcase.flatMap((t) => t.doc.cards);
    expect(all.some((c) => c.type === "iconRow")).toBe(true);
    expect(all.some((c) => c.type === "statGroup")).toBe(true);
    expect(all.some((c) => c.type === "code")).toBe(true);
    expect(all.some((c) => c.type === "image" && c.content.overlay?.placement === "bottom")).toBe(true);
    expect(all.some((c) => c.type === "icon" && c.content.caption !== undefined)).toBe(true);
  });

  it("uses generated image assets for showcase image cards", () => {
    for (const [templateId, cardId, src] of expectedTemplateImages) {
      const template = templates.find((t) => t.id === templateId)!;
      const card = template.doc.cards.find((c) => c.id === cardId);

      expect(card?.type, `${templateId}: ${cardId}`).toBe("image");
      if (card?.type !== "image") continue;
      expect(card.content.src).toBe(src);
      expect(existsSync(join(process.cwd(), "public", src))).toBe(true);
    }
  });
});
