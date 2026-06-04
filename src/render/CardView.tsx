import type { Card, SlideDocument } from "../schema/slide";
import { resolveCardStyle } from "./styleResolve";
import { StatCard } from "./cards/StatCard";
import { HeadlineCard } from "./cards/HeadlineCard";
import { ImageCard } from "./cards/ImageCard";
import { IconCard } from "./cards/IconCard";
import { HeroCard } from "./cards/HeroCard";
import { ListCard } from "./cards/ListCard";
import { IconRowCard } from "./cards/IconRowCard";
import { StatGroupCard } from "./cards/StatGroupCard";
import { CodeCard } from "./cards/CodeCard";

export function CardView({ card, theme }: { card: Card; theme: SlideDocument["theme"] }) {
  const inner = (() => {
    switch (card.type) {
      case "stat": return <StatCard card={card} theme={theme} />;
      case "headline": return <HeadlineCard card={card} theme={theme} />;
      case "image": return <ImageCard card={card} theme={theme} />;
      case "icon": return <IconCard card={card} theme={theme} />;
      case "hero": return <HeroCard card={card} theme={theme} />;
      case "list": return <ListCard card={card} theme={theme} />;
      case "iconRow": return <IconRowCard card={card} theme={theme} />;
      case "statGroup": return <StatGroupCard card={card} theme={theme} />;
      case "code": return <CodeCard card={card} theme={theme} />;
    }
  })();
  return <div style={{ height: "100%", ...resolveCardStyle(theme, card) }}>{inner}</div>;
}
