import type { CSSProperties } from "react";
import type { Background, Card, RichText, SlideDocument } from "../schema/slide";

/**
 * Single font stack for everything slide-rendered (editor canvas, share preview,
 * both export paths) — keeping these identical is part of the pixel-fidelity
 * guarantee. Emoji families come right after Inter (they contain no Latin glyphs,
 * so text never hits them) and BEFORE system-ui: on Linux/headless Chromium,
 * system-ui resolves to DejaVu Sans which owns a monochrome U+26A1 (⚡) glyph
 * that would otherwise shadow the color emoji font.
 */
export const SLIDE_FONT_FAMILY =
  '"Inter Variable", "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", system-ui, -apple-system, sans-serif';

/**
 * Mono stack for code cards — same everywhere for the same pixel-fidelity reason.
 * Emoji families come BEFORE the generic `monospace` fallback (e.g. a `// 🚀`
 * comment): on Linux/headless Chromium, generic monospace resolves to DejaVu Sans
 * Mono, which owns monochrome emoji glyphs that would otherwise shadow the color
 * emoji fonts and export an emoji as flat black-and-white.
 */
export const SLIDE_MONO_FONT_FAMILY =
  'ui-monospace, "SF Mono", Menlo, Consolas, "Liberation Mono", "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", monospace';

export interface ThemeTokens {
  cardBg: string;
  text: string;
  muted: string;
}

export function themeTokens(mode: "light" | "dark"): ThemeTokens {
  return mode === "dark"
    ? { cardBg: "#1c1c1e", text: "#ffffff", muted: "rgba(255,255,255,0.65)" }
    : { cardBg: "#f2f2f7", text: "#111111", muted: "rgba(0,0,0,0.55)" };
}

export function backgroundToCss(bg: Background): CSSProperties {
  switch (bg.type) {
    case "solid":
      return { background: bg.color };
    case "gradient":
      return { background: `linear-gradient(${bg.angle}deg, ${bg.from}, ${bg.to})` };
    case "image":
      return { backgroundImage: `url("${bg.src}")`, backgroundSize: "cover", backgroundPosition: "center" };
  }
}

export function resolveCardStyle(theme: SlideDocument["theme"], card: Card): CSSProperties {
  const tokens = themeTokens(theme.mode);
  const bg = card.style?.background
    ? backgroundToCss(card.style.background)
    : { background: tokens.cardBg };
  return {
    ...bg,
    color: card.style?.textColor ?? tokens.text,
    borderRadius: theme.cardStyle.radius,
    overflow: "hidden",
  };
}

export function richTextToCss(rt: RichText): CSSProperties {
  const css: CSSProperties = {};
  if (rt.size !== undefined) css.fontSize = rt.size;
  if (rt.weight !== undefined) css.fontWeight = rt.weight;
  if (rt.letterSpacing !== undefined) css.letterSpacing = rt.letterSpacing;
  if (rt.align !== undefined) css.textAlign = rt.align;
  if (rt.color !== undefined) css.color = rt.color;
  if (rt.gradient) {
    css.backgroundImage = `linear-gradient(${rt.gradient.angle}deg, ${rt.gradient.from}, ${rt.gradient.to})`;
    css.WebkitBackgroundClip = "text";
    css.backgroundClip = "text";
    css.color = "transparent";
    css.WebkitTextFillColor = "transparent";
  }
  return css;
}
