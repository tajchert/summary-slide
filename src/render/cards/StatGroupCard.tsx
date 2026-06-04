import { Fragment } from "react";
import type { Card, SlideDocument } from "../../schema/slide";
import { themeTokens } from "../styleResolve";
import { RichText } from "../RichText";

type StatGroupCardType = Extract<Card, { type: "statGroup" }>;

export function StatGroupCard({ card, theme }: { card: StatGroupCardType; theme: SlideDocument["theme"] }) {
  const tokens = themeTokens(theme.mode);
  const { stats, layout } = card.content;
  const row = layout === "row";
  return (
    <div style={{ display: "flex", flexDirection: row ? "row" : "column", alignItems: "center",
      justifyContent: row ? "center" : "space-evenly", height: "100%", padding: 24,
      gap: row ? 0 : 12 }}>
      {stats.map((stat, i) => (
        <Fragment key={i}>
          {row && i > 0 && <div data-divider style={{ alignSelf: "stretch", width: 1,
            background: tokens.muted, opacity: 0.35, margin: "12px 32px" }} />}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center",
            gap: 4, textAlign: "center" }}>
            {stat.prefix && <RichText value={stat.prefix} editPath={`content.stats.${i}.prefix`}
              baseStyle={{ fontSize: 22, color: tokens.muted }} />}
            <RichText value={stat.value} editPath={`content.stats.${i}.value`}
              baseStyle={{ fontSize: 48, fontWeight: 700, letterSpacing: -1, lineHeight: 1.1 }} />
            {stat.caption && <RichText value={stat.caption} editPath={`content.stats.${i}.caption`}
              baseStyle={{ fontSize: 22, color: tokens.muted }} />}
          </div>
        </Fragment>
      ))}
    </div>
  );
}
