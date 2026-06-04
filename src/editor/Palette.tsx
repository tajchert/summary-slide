import { useState } from "react";
import type { CardType } from "../schema/slide";
import { useEditor } from "./EditorContext";

const TILES: { type: CardType; label: string; glyph: string }[] = [
  { type: "stat", label: "Stat", glyph: "48MP" },
  { type: "headline", label: "Headline", glyph: "Aa" },
  { type: "image", label: "Image", glyph: "🖼" },
  { type: "icon", label: "Icon", glyph: "📞" },
  { type: "hero", label: "Hero", glyph: "★" },
  { type: "list", label: "List", glyph: "≡" },
];

export function Palette() {
  const addCard = useEditor((s) => s.addCard);
  const [fullMsg, setFullMsg] = useState(false);

  return (
    <div className="p-3">
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
        Add card
      </h2>
      <div className="grid grid-cols-2 gap-2">
        {TILES.map((tile) => (
          <button
            key={tile.type}
            onClick={() => setFullMsg(!addCard(tile.type))}
            className="flex flex-col items-center gap-1 rounded-lg border border-neutral-800
              bg-neutral-900 py-3 text-neutral-300 hover:border-neutral-600 hover:bg-neutral-800"
          >
            <span className="text-lg leading-none">{tile.glyph}</span>
            <span className="text-xs">{tile.label}</span>
          </button>
        ))}
      </div>
      {fullMsg && <p className="mt-2 text-xs text-amber-400">Grid is full — remove or shrink a card first.</p>}
    </div>
  );
}
