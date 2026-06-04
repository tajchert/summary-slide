import type { Card, SlideDocument } from "../../schema/slide";
import { themeTokens } from "../styleResolve";
import { RichText } from "../RichText";

type IconRowCardType = Extract<Card, { type: "iconRow" }>;

export function IconRowCard({ card, theme }: { card: IconRowCardType; theme: SlideDocument["theme"] }) {
  const tokens = themeTokens(theme.mode);
  const { items, caption } = card.content;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", height: "100%", gap: 14, padding: 24 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "center", gap: 32 }}>
        {items.map((item, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column",
            alignItems: "center", gap: 8 }}>
            {item.icon.kind === "emoji" ? (
              <div style={{ fontSize: 48, lineHeight: 1 }}>{item.icon.value}</div>
            ) : (
              <img src={item.icon.src} alt="" role="img"
                style={{ width: 48, height: 48, objectFit: "contain" }} />
            )}
            {item.label && <RichText value={item.label} editPath={`content.items.${i}.label`}
              baseStyle={{ fontSize: 20, color: tokens.muted, textAlign: "center" }} />}
          </div>
        ))}
      </div>
      {caption && <RichText value={caption} editPath="content.caption"
        baseStyle={{ fontSize: 24, color: tokens.muted, textAlign: "center" }} />}
    </div>
  );
}
