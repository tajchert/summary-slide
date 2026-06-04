import type { Card, SlideDocument } from "../../schema/slide";
import { RichText } from "../RichText";

type IconCardType = Extract<Card, { type: "icon" }>;

export function IconCard({ card }: { card: IconCardType; theme: SlideDocument["theme"] }) {
  const { icon, label, layout } = card.content;
  const flexDirection = layout === "top" ? "column" : layout === "left" ? "row" : "row-reverse";
  return (
    <div style={{ display: "flex", flexDirection, alignItems: "center", justifyContent: "center",
      height: "100%", gap: 16, padding: 24, textAlign: layout === "top" ? "center" : "left" }}>
      {icon.kind === "emoji" ? (
        <div style={{ fontSize: 64, lineHeight: 1 }}>{icon.value}</div>
      ) : (
        <img src={icon.src} alt="" role="img" style={{ width: 72, height: 72, objectFit: "contain" }} />
      )}
      <RichText value={label} editPath="content.label"
        baseStyle={{ fontSize: 28, fontWeight: 600 }} />
    </div>
  );
}
