import type { Card, SlideDocument } from "../../schema/slide";
import { themeTokens } from "../styleResolve";
import { RichText } from "../RichText";

type IconCardType = Extract<Card, { type: "icon" }>;

export function IconCard({ card, theme }: { card: IconCardType; theme: SlideDocument["theme"] }) {
  const tokens = themeTokens(theme.mode);
  const { icon, label, caption, layout } = card.content;
  const flexDirection = layout === "top" ? "column" : layout === "left" ? "row" : "row-reverse";
  return (
    <div style={{ display: "flex", flexDirection, alignItems: "center", justifyContent: "center",
      height: "100%", gap: 16, padding: 24, textAlign: layout === "top" ? "center" : "left" }}>
      {icon.kind === "emoji" ? (
        <div style={{ fontSize: 64, lineHeight: 1 }}>{icon.value}</div>
      ) : (
        <img src={icon.src} alt="" role="img" style={{ width: 72, height: 72, objectFit: "contain" }} />
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 4,
        alignItems: layout === "top" ? "center" : "flex-start" }}>
        <RichText value={label} editPath="content.label"
          baseStyle={{ fontSize: 28, fontWeight: 600 }} />
        {caption && <RichText value={caption} editPath="content.caption"
          baseStyle={{ fontSize: 22, color: tokens.muted, textAlign: layout === "top" ? "center" : "left" }} />}
      </div>
    </div>
  );
}
