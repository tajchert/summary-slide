import type { CSSProperties } from "react";
import type { Background, Card, RichText, SlideDocument } from "../schema/slide";

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
      return { backgroundImage: `url(${bg.src})`, backgroundSize: "cover", backgroundPosition: "center" };
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
  }
  return css;
}
