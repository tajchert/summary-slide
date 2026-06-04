import type { Card, SlideDocument } from "../../schema/slide";
import { RichText } from "../RichText";

type HeroCardType = Extract<Card, { type: "hero" }>;

export function HeroCard({ card }: { card: HeroCardType; theme: SlideDocument["theme"] }) {
  const { title, image, imagePlacement = "behind" } = card.content;
  const img = image && (
    <img src={image} alt="" role="img" style={imagePlacement === "behind"
      ? { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }
      : { maxWidth: "80%", maxHeight: "55%", objectFit: "contain" }} />
  );
  return (
    <div style={{ position: "relative", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", height: "100%", gap: 20, padding: 32 }}>
      {imagePlacement === "behind" && img}
      {imagePlacement === "above" && img}
      <RichText value={title} editPath="content.title"
        baseStyle={{ fontSize: 110, fontWeight: 700, letterSpacing: -3, lineHeight: 1,
          position: "relative", textAlign: "center" }} />
      {imagePlacement === "below" && img}
    </div>
  );
}
