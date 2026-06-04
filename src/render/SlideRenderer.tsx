import type { SlideDocument } from "../schema/slide";
import { GRID_COLS, GRID_ROWS } from "../schema/slide";
import { backgroundToCss } from "./styleResolve";
import { CardView } from "./CardView";

interface Props {
  doc: SlideDocument;
  /** Visual scale for previews/thumbnails. Layout always computes at full canvas size. */
  scale?: number;
}

export function SlideRenderer({ doc, scale }: Props) {
  const { width, height } = doc.canvas;
  const { gap } = doc.theme.cardStyle;
  return (
    <div
      data-slide-root
      style={{
        width,
        height,
        ...backgroundToCss(doc.theme.background),
        display: "grid",
        gridTemplateColumns: `repeat(${GRID_COLS}, 1fr)`,
        gridTemplateRows: `repeat(${GRID_ROWS}, 1fr)`,
        gap,
        padding: gap,
        boxSizing: "border-box",
        fontFamily: '"Inter Variable", system-ui, -apple-system, sans-serif',
        ...(scale !== undefined ? { transform: `scale(${scale})`, transformOrigin: "top left" } : {}),
      }}
    >
      {doc.cards.map((card) => (
        <div
          key={card.id}
          style={{
            gridArea: `${card.grid.y + 1} / ${card.grid.x + 1} / span ${card.grid.h} / span ${card.grid.w}`,
            minWidth: 0,
            minHeight: 0,
          }}
        >
          <CardView card={card} theme={doc.theme} />
        </div>
      ))}
    </div>
  );
}
