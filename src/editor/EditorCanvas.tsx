import { useMemo, useRef } from "react";
import GridLayout from "react-grid-layout";
import type ReactGridLayout from "react-grid-layout";
import { GRID_COLS, GRID_ROWS } from "../schema/slide";
import { backgroundToCss } from "../render/styleResolve";
import { CardView } from "../render/CardView";
import { useEditor, InlineEditContext, InlineEditCardContext } from "./EditorContext";

const DISPLAY_WIDTH = 960; // px; canvas is scaled-down 1920x1080

export function EditorCanvas() {
  const doc = useEditor((s) => s.doc);
  const selectedCardId = useEditor((s) => s.selectedCardId);
  const selectCard = useEditor((s) => s.selectCard);
  const moveResizeCard = useEditor((s) => s.moveResizeCard);
  const removeCard = useEditor((s) => s.removeCard);
  const updateCard = useEditor((s) => s.updateCard);

  const commitText = (cardId: string, path: string, text: string) => {
    updateCard(cardId, (card) => {
      // path like "content.value" or "content.items.2" — walk to the RichText node, set .text.
      // Defensive: a stale path (e.g. overlay removed mid-edit) is a no-op, not a throw.
      const segs = path.split(".");
      let node: unknown = card;
      for (const seg of segs) {
        if (node == null || typeof node !== "object") return;
        node = (node as Record<string, unknown>)[seg];
      }
      if (node != null && typeof node === "object") {
        (node as { text: string }).text = text;
      }
    });
  };

  const scale = DISPLAY_WIDTH / doc.canvas.width;
  const displayHeight = doc.canvas.height * scale;
  const gap = doc.theme.cardStyle.gap * scale;
  // rowHeight so that 6 rows + margins + padding fill the canvas exactly:
  // H = 2*pad + rows*rh + (rows-1)*margin  =>  rh = (H - 2*gap - (rows-1)*gap) / rows
  const rowHeight = (displayHeight - 2 * gap - (GRID_ROWS - 1) * gap) / GRID_ROWS;

  const layout: ReactGridLayout.Layout[] = useMemo(
    () => doc.cards.map((c) => ({ i: c.id, x: c.grid.x, y: c.grid.y, w: c.grid.w, h: c.grid.h })),
    [doc.cards]
  );

  // RGL fires onLayoutChange for re-renders too; only commit real moves.
  const onLayoutChange = (next: ReactGridLayout.Layout[]) => {
    for (const item of next) {
      const card = doc.cards.find((c) => c.id === item.i);
      if (!card) continue;
      const { x, y, w, h } = item;
      if (card.grid.x !== x || card.grid.y !== y || card.grid.w !== w || card.grid.h !== h) {
        moveResizeCard(card.id, { x, y, w, h });
      }
    }
  };

  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      onKeyDown={(e) => {
        if ((e.key === "Delete" || e.key === "Backspace") && selectedCardId
            && (e.target as HTMLElement).isContentEditable === false) {
          removeCard(selectedCardId);
        }
      }}
      onMouseDown={(e) => { if (e.target === containerRef.current) selectCard(null); }}
      style={{
        width: DISPLAY_WIDTH, height: displayHeight,
        ...backgroundToCss(doc.theme.background),
        borderRadius: 8, position: "relative", outline: "none",
        boxShadow: "0 10px 40px rgba(0,0,0,0.5)",
      }}
    >
      <GridLayout
        width={DISPLAY_WIDTH}
        cols={GRID_COLS}
        maxRows={GRID_ROWS}
        rowHeight={rowHeight}
        margin={[gap, gap]}
        containerPadding={[gap, gap]}
        compactType={null}
        preventCollision
        isBounded
        layout={layout}
        onLayoutChange={onLayoutChange}
        draggableCancel=".editable-text"
        resizeHandles={["se", "e", "s"]}
        style={{ height: displayHeight }}
      >
        {doc.cards.map((card) => (
          <div
            key={card.id}
            className={card.id === selectedCardId ? "slide-card-selected" : undefined}
            onMouseDownCapture={() => selectCard(card.id)}
          >
            {/* Render content at full 1920-canvas scale, shrink visually */}
            <div style={{
              width: `calc(100% / ${scale})`,
              height: `calc(100% / ${scale})`,
              transform: `scale(${scale})`, transformOrigin: "top left",
              fontFamily: '"Inter Variable", system-ui, sans-serif',
            }}>
              <InlineEditContext.Provider value={commitText}>
                <InlineEditCardContext.Provider value={card.id}>
                  <CardView card={card} theme={doc.theme} />
                </InlineEditCardContext.Provider>
              </InlineEditContext.Provider>
            </div>
          </div>
        ))}
      </GridLayout>
    </div>
  );
}
