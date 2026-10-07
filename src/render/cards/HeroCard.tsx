import type { Card, SlideDocument } from "../../schema/slide";
import { themeTokens } from "../styleResolve";
import { RichText } from "../RichText";

type HeroCardType = Extract<Card, { type: "hero" }>;

export function HeroCard({ card, theme }: { card: HeroCardType; theme: SlideDocument["theme"] }) {
  const tokens = themeTokens(theme.mode);
  const { title, caption, image, imagePlacement = "behind" } = card.content;
  const side = imagePlacement === "left" || imagePlacement === "right";
  const img = image && (
    <img src={image} alt="" role="img" style={imagePlacement === "behind"
      ? { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }
      : side
        ? { maxWidth: "45%", maxHeight: "100%", minWidth: 0, objectFit: "contain" }
        : { maxWidth: "80%", maxHeight: "55%", objectFit: "contain" }} />
  );
  const titleEl = <RichText value={title} editPath="content.title"
    baseStyle={{ fontSize: 110, fontWeight: 700, letterSpacing: -3, lineHeight: 1,
      position: "relative", textAlign: "center" }} />;
  // caption always comes last, so with "below" it sits under the image
  const captionEl = caption && <RichText value={caption} editPath="content.caption"
    baseStyle={{ fontSize: 22, color: tokens.muted, lineHeight: 1.3,
      position: "relative", textAlign: "center" }} />;
  if (side) {
    return (
      <div style={{ display: "flex", flexDirection: imagePlacement === "left" ? "row" : "row-reverse",
        alignItems: "center", justifyContent: "center", height: "100%", gap: 32, padding: 32 }}>
        {img}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center",
          gap: 16, flex: 1, minWidth: 0 }}>{titleEl}{captionEl}</div>
      </div>
    );
  }
  return (
    <div style={{ position: "relative", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", height: "100%", gap: 20, padding: 32 }}>
      {imagePlacement === "behind" && img}
      {imagePlacement === "above" && img}
      {titleEl}
      {imagePlacement === "below" && img}
      {captionEl}
    </div>
  );
}
