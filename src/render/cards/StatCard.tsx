import type { Card, SlideDocument } from "../../schema/slide";
import { themeTokens } from "../styleResolve";
import { RichText } from "../RichText";

type StatCardType = Extract<Card, { type: "stat" }>;

export function StatCard({ card, theme }: { card: StatCardType; theme: SlideDocument["theme"] }) {
  const tokens = themeTokens(theme.mode);
  const { prefix, value, caption } = card.content;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", height: "100%", gap: 8, textAlign: "center", padding: 24 }}>
      {prefix && <RichText value={prefix} editPath="content.prefix"
        baseStyle={{ fontSize: 28, color: tokens.muted }} />}
      <RichText value={value} editPath="content.value"
        baseStyle={{ fontSize: 96, fontWeight: 700, letterSpacing: -2, lineHeight: 1 }} />
      <RichText value={caption} editPath="content.caption"
        baseStyle={{ fontSize: 28, color: tokens.muted }} />
    </div>
  );
}
