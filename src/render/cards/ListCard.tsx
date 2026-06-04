import type { Card, SlideDocument } from "../../schema/slide";
import { themeTokens } from "../styleResolve";
import { RichText } from "../RichText";

type ListCardType = Extract<Card, { type: "list" }>;

export function ListCard({ card, theme }: { card: ListCardType; theme: SlideDocument["theme"] }) {
  const tokens = themeTokens(theme.mode);
  const { title, items, marker } = card.content;
  return (
    <div style={{ display: "flex", flexDirection: "column", justifyContent: "center",
      height: "100%", gap: 14, padding: 32 }}>
      <RichText value={title} editPath="content.title"
        baseStyle={{ fontSize: 32, fontWeight: 700, color: theme.accent }} />
      <ul style={{ listStyle: marker === "bullet" ? "disc" : "none",
        paddingLeft: marker === "bullet" ? 28 : 0, display: "flex", flexDirection: "column", gap: 10 }}>
        {items.map((item, i) => (
          <li key={i} style={{ color: tokens.muted }}>
            <RichText as="span" value={item} editPath={`content.items.${i}`}
              baseStyle={{ fontSize: 26 }} />
          </li>
        ))}
      </ul>
    </div>
  );
}
