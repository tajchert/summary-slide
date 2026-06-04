import type { Card, SlideDocument } from "../../schema/slide";
import { RichText } from "../RichText";

type HeadlineCardType = Extract<Card, { type: "headline" }>;

export function HeadlineCard({ card }: { card: HeadlineCardType; theme: SlideDocument["theme"] }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center",
      height: "100%", padding: 32, textAlign: "center" }}>
      <RichText value={card.content.text} editPath="content.text"
        baseStyle={{ fontSize: 44, fontWeight: 700, letterSpacing: -1, lineHeight: 1.15 }} />
    </div>
  );
}
