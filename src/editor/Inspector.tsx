import type { Card, RichText as RichTextValue } from "../schema/slide";
import { useEditor } from "./EditorContext";
import { RichTextControls, BackgroundControls, TextInput, SelectInput, ColorInput, NumberInput }
  from "./inspector-fields";
import { ImageUploadField } from "./ImageUploadField"; // Task 17; until then see Step 5

export function Inspector() {
  const doc = useEditor((s) => s.doc);
  const selectedCardId = useEditor((s) => s.selectedCardId);
  const updateCard = useEditor((s) => s.updateCard);
  const removeCard = useEditor((s) => s.removeCard);
  const setTheme = useEditor((s) => s.setTheme);

  const card = doc.cards.find((c) => c.id === selectedCardId);

  if (!card) {
    return (
      <div className="p-3">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
          Slide settings
        </h2>
        <ColorInput label="Accent" value={doc.theme.accent}
          onChange={(accent) => setTheme({ accent })} />
        <BackgroundControls label="Canvas background" value={doc.theme.background} allowImage
          onChange={(bg) => bg && setTheme({ background: bg })} />
        <NumberInput label="Card radius" value={doc.theme.cardStyle.radius}
          onChange={(radius) => setTheme({ cardStyle: { ...doc.theme.cardStyle, radius: radius ?? 24 } })} />
        <NumberInput label="Card gap" value={doc.theme.cardStyle.gap}
          onChange={(gap) => setTheme({ cardStyle: { ...doc.theme.cardStyle, gap: gap ?? 24 } })} />
      </div>
    );
  }

  // helper: update one RichText field on the selected card
  const rt = (label: string, value: RichTextValue, write: (c: Card, v: RichTextValue) => void) => (
    <RichTextControls label={label} value={value}
      onChange={(v) => updateCard(card.id, (c) => write(c, v))} />
  );

  return (
    <div className="p-3">
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
        {card.type} card
      </h2>

      {card.type === "stat" && (
        <>
          {rt("Value", card.content.value, (c, v) => { if (c.type === "stat") c.content.value = v; })}
          {rt("Caption", card.content.caption, (c, v) => { if (c.type === "stat") c.content.caption = v; })}
          {rt("Prefix", card.content.prefix ?? { text: "" },
            (c, v) => { if (c.type === "stat") c.content.prefix = v.text ? v : undefined; })}
        </>
      )}

      {card.type === "headline" &&
        rt("Text", card.content.text, (c, v) => { if (c.type === "headline") c.content.text = v; })}

      {card.type === "image" && (
        <>
          <ImageUploadField label="Image" value={card.content.src}
            onChange={(src) => updateCard(card.id, (c) => { if (c.type === "image") c.content.src = src; })} />
          <SelectInput label="Fit" value={card.content.fit} options={["cover", "contain"] as const}
            onChange={(fit) => updateCard(card.id, (c) => { if (c.type === "image") c.content.fit = fit; })} />
          <TextInput label="Position (CSS object-position)" value={card.content.position ?? "center"}
            onChange={(position) => updateCard(card.id, (c) => { if (c.type === "image") c.content.position = position; })} />
          <label className="mb-2 flex items-center gap-2 text-xs text-neutral-400">
            <input type="checkbox" checked={!!card.content.overlay}
              onChange={(e) => updateCard(card.id, (c) => {
                if (c.type === "image") c.content.overlay = e.target.checked
                  ? { text: { text: "Label" }, placement: "corner" } : undefined;
              })} />
            Text overlay
          </label>
          {card.content.overlay && (
            <>
              {rt("Overlay text", card.content.overlay.text,
                (c, v) => { if (c.type === "image" && c.content.overlay) c.content.overlay.text = v; })}
              <SelectInput label="Placement" value={card.content.overlay.placement}
                options={["corner", "center-pill"] as const}
                onChange={(placement) => updateCard(card.id, (c) => {
                  if (c.type === "image" && c.content.overlay) c.content.overlay.placement = placement;
                })} />
            </>
          )}
        </>
      )}

      {card.type === "icon" && (
        <>
          <SelectInput label="Icon kind" value={card.content.icon.kind}
            options={["emoji", "image"] as const}
            onChange={(kind) => updateCard(card.id, (c) => {
              if (c.type === "icon") c.content.icon = kind === "emoji"
                ? { kind: "emoji", value: "✨" } : { kind: "image", src: "" };
            })} />
          {card.content.icon.kind === "emoji" ? (
            <TextInput label="Emoji" value={card.content.icon.value}
              onChange={(value) => updateCard(card.id, (c) => {
                if (c.type === "icon" && c.content.icon.kind === "emoji") c.content.icon.value = value;
              })} />
          ) : (
            <ImageUploadField label="Graphic" value={card.content.icon.src}
              onChange={(src) => updateCard(card.id, (c) => {
                if (c.type === "icon" && c.content.icon.kind === "image") c.content.icon.src = src;
              })} />
          )}
          {rt("Label", card.content.label, (c, v) => { if (c.type === "icon") c.content.label = v; })}
          <SelectInput label="Layout" value={card.content.layout}
            options={["top", "left", "right"] as const}
            onChange={(layout) => updateCard(card.id, (c) => { if (c.type === "icon") c.content.layout = layout; })} />
        </>
      )}

      {card.type === "hero" && (
        <>
          {rt("Title", card.content.title, (c, v) => { if (c.type === "hero") c.content.title = v; })}
          <ImageUploadField label="Image (optional)" value={card.content.image ?? ""}
            onChange={(src) => updateCard(card.id, (c) => {
              if (c.type === "hero") c.content.image = src || undefined;
            })} />
          <SelectInput label="Image placement" value={card.content.imagePlacement ?? "behind"}
            options={["behind", "above", "below"] as const}
            onChange={(p) => updateCard(card.id, (c) => { if (c.type === "hero") c.content.imagePlacement = p; })} />
        </>
      )}

      {card.type === "iconRow" && (
        <>
          {card.content.items.map((item, i) => (
            <div key={i} className="mb-2 rounded border border-neutral-800 p-2">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-xs text-neutral-400">Item {i + 1}</span>
                {card.content.items.length > 1 && (
                  <button aria-label={`Remove item ${i + 1}`}
                    onClick={() => updateCard(card.id, (c) => {
                      if (c.type === "iconRow") c.content.items.splice(i, 1);
                    })}
                    className="text-neutral-500 hover:text-red-400">✕</button>
                )}
              </div>
              <SelectInput label={`Icon kind ${i + 1}`} value={item.icon.kind}
                options={["emoji", "image"] as const}
                onChange={(kind) => updateCard(card.id, (c) => {
                  if (c.type === "iconRow" && c.content.items[i]) c.content.items[i].icon =
                    kind === "emoji" ? { kind: "emoji", value: "✨" } : { kind: "image", src: "" };
                })} />
              {item.icon.kind === "emoji" ? (
                <TextInput label={`Emoji / text ${i + 1}`} value={item.icon.value}
                  onChange={(value) => updateCard(card.id, (c) => {
                    const icon = c.type === "iconRow" ? c.content.items[i]?.icon : undefined;
                    if (icon?.kind === "emoji") icon.value = value;
                  })} />
              ) : (
                <ImageUploadField label={`Graphic ${i + 1}`} value={item.icon.src}
                  onChange={(src) => updateCard(card.id, (c) => {
                    const icon = c.type === "iconRow" ? c.content.items[i]?.icon : undefined;
                    if (icon?.kind === "image") icon.src = src;
                  })} />
              )}
              {rt(`Label (optional) ${i + 1}`, item.label ?? { text: "" }, (c, v) => {
                if (c.type === "iconRow" && c.content.items[i])
                  c.content.items[i].label = v.text ? v : undefined;
              })}
            </div>
          ))}
          <button disabled={card.content.items.length >= 12} onClick={() => updateCard(card.id, (c) => {
            if (c.type === "iconRow") c.content.items.push({ icon: { kind: "emoji", value: "✨" } });
          })} className="mb-2 rounded border border-neutral-700 px-2 py-1 text-xs hover:bg-neutral-800 disabled:opacity-40 disabled:cursor-not-allowed">
            + Add item
          </button>
          {rt("Group caption (optional)", card.content.caption ?? { text: "" },
            (c, v) => { if (c.type === "iconRow") c.content.caption = v.text ? v : undefined; })}
        </>
      )}

      {card.type === "list" && (
        <>
          {rt("Title", card.content.title, (c, v) => { if (c.type === "list") c.content.title = v; })}
          {card.content.items.map((item, i) =>
            <div key={i} className="flex items-start gap-1">
              <div className="flex-1">
                {rt(`Item ${i + 1}`, item, (c, v) => { if (c.type === "list") c.content.items[i] = v; })}
              </div>
              <button aria-label={`Remove item ${i + 1}`}
                onClick={() => updateCard(card.id, (c) => {
                  if (c.type === "list") c.content.items.splice(i, 1);
                })}
                className="mt-3 text-neutral-500 hover:text-red-400">✕</button>
            </div>
          )}
          <button onClick={() => updateCard(card.id, (c) => {
            if (c.type === "list") c.content.items.push({ text: "New item" });
          })} className="mb-2 rounded border border-neutral-700 px-2 py-1 text-xs hover:bg-neutral-800">
            + Add item
          </button>
          <SelectInput label="Marker" value={card.content.marker} options={["bullet", "none"] as const}
            onChange={(marker) => updateCard(card.id, (c) => { if (c.type === "list") c.content.marker = marker; })} />
        </>
      )}

      <h2 className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-neutral-500">
        Card style
      </h2>
      <BackgroundControls label="Background" value={card.style?.background}
        onChange={(background) => updateCard(card.id, (c) => {
          c.style = { ...c.style, background };
        })} />
      <ColorInput label="Text color" value={card.style?.textColor}
        onChange={(textColor) => updateCard(card.id, (c) => {
          c.style = { ...c.style, textColor };
        })} />

      <button onClick={() => removeCard(card.id)}
        className="mt-4 w-full rounded border border-red-900 py-1.5 text-sm text-red-400 hover:bg-red-950">
        Delete card
      </button>
    </div>
  );
}
