import { describe, it, expect } from "vitest";
import { themeTokens, backgroundToCss, resolveCardStyle, richTextToCss } from "./styleResolve";
import { blankDocument } from "../schema/slide";
import type { Card } from "../schema/slide";

const card = (style?: Card["style"]): Card => ({
  id: "a", type: "headline", grid: { x: 0, y: 0, w: 2, h: 1 },
  style, content: { text: { text: "hi" } },
});

describe("themeTokens", () => {
  it("dark mode yields dark card backgrounds and light text", () => {
    const t = themeTokens("dark");
    expect(t.cardBg).toBe("#1c1c1e");
    expect(t.text).toBe("#ffffff");
  });
  it("light mode yields light card backgrounds and dark text", () => {
    const t = themeTokens("light");
    expect(t.cardBg).toBe("#f2f2f7");
    expect(t.text).toBe("#111111");
  });
});

describe("backgroundToCss", () => {
  it("solid", () => {
    expect(backgroundToCss({ type: "solid", color: "#123456" })).toEqual({ background: "#123456" });
  });
  it("gradient", () => {
    expect(backgroundToCss({ type: "gradient", from: "#000", to: "#fff", angle: 135 }))
      .toEqual({ background: "linear-gradient(135deg, #000, #fff)" });
  });
  it("image", () => {
    expect(backgroundToCss({ type: "image", src: "/i/x.png" })).toEqual({
      backgroundImage: "url(/i/x.png)", backgroundSize: "cover", backgroundPosition: "center",
    });
  });
});

describe("resolveCardStyle (theme → card override)", () => {
  const theme = blankDocument().theme; // dark
  it("uses theme defaults when card has no style", () => {
    const s = resolveCardStyle(theme, card());
    expect(s.background).toBe("#1c1c1e");
    expect(s.color).toBe("#ffffff");
    expect(s.borderRadius).toBe(24);
  });
  it("card overrides win", () => {
    const s = resolveCardStyle(theme, card({
      background: { type: "gradient", from: "#1a2980", to: "#26d0ce", angle: 135 },
      textColor: "#ffeeaa",
    }));
    expect(s.background).toBe("linear-gradient(135deg, #1a2980, #26d0ce)");
    expect(s.color).toBe("#ffeeaa");
  });
});

describe("richTextToCss (field-level overrides)", () => {
  it("returns only defined properties", () => {
    expect(richTextToCss({ text: "x" })).toEqual({});
  });
  it("maps size/weight/spacing/align/color", () => {
    expect(richTextToCss({ text: "x", size: 96, weight: 700, letterSpacing: -2, align: "center", color: "#f55" }))
      .toEqual({ fontSize: 96, fontWeight: 700, letterSpacing: -2, textAlign: "center", color: "#f55" });
  });
  it("gradient text uses background-clip and overrides color", () => {
    const css = richTextToCss({ text: "x", color: "#fff", gradient: { from: "#f55", to: "#5af", angle: 90 } });
    expect(css.backgroundImage).toBe("linear-gradient(90deg, #f55, #5af)");
    expect(css.WebkitBackgroundClip).toBe("text");
    expect(css.color).toBe("transparent");
  });
});
