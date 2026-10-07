import type { ReactNode } from "react";
import type { Card, CardType, IconSource, RichText } from "../schema/slide";
import { useEditor } from "./EditorContext";
import { RichTextControls, BackgroundControls, TextInput, SelectInput, ColorInput, NumberInput, TextAreaInput }
  from "./inspector-fields";
import { ImageUploadField } from "./ImageUploadField";

type CardOf<T extends CardType> = Extract<Card, { type: T }>;
type ContentOf<T extends CardType> = CardOf<T>["content"];

const EMPTY_TEXT: RichText = { text: "" };
/** Optional RichText fields: cleared text removes the field. */
const optional = (v: RichText) => (v.text ? v : undefined);

const sectionTitle = "mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500";
const smallButton = "mb-2 rounded border border-neutral-700 px-2 py-1 text-xs hover:bg-neutral-800 "
  + "disabled:opacity-40 disabled:cursor-not-allowed";

/**
 * Typed content edits for one card. `update(mutate)` is a discrete action (add/remove/
 * toggle/select) with its own undo step. `update(mutate, key)` is for continuous inputs:
 * a burst on the same key (the field label, unique per card) coalesces into one undo step.
 */
function useCardEditor<T extends CardType>(card: CardOf<T>) {
  const updateCard = useEditor((s) => s.updateCard);
  // A card's type never changes, so the fresh copy has the same content shape.
  const update = (mutate: (content: ContentOf<T>) => void, key?: string) =>
    updateCard(card.id, (c) => mutate(c.content as ContentOf<T>), key && `${card.id}:${key}`);
  const rt = (label: string, value: RichText | undefined, write: (content: ContentOf<T>, v: RichText) => void) => (
    <RichTextControls label={label} value={value ?? EMPTY_TEXT}
      onChange={(v) => update((content) => write(content, v), label)} />
  );
  return { update, rt };
}

export function Inspector() {
  const doc = useEditor((s) => s.doc);
  const selectedCardId = useEditor((s) => s.selectedCardId);
  const card = doc.cards.find((c) => c.id === selectedCardId);
  if (!card) return <SlideSettings />;

  return (
    <div className="p-3">
      <h2 className={sectionTitle}>{card.type} card</h2>
      <CardFields card={card} />
      <CardStyleFields card={card} />
    </div>
  );
}

function SlideSettings() {
  const theme = useEditor((s) => s.doc.theme);
  const setTheme = useEditor((s) => s.setTheme);
  return (
    <div className="p-3">
      <h2 className={sectionTitle}>Slide settings</h2>
      <ColorInput label="Accent" value={theme.accent}
        onChange={(accent) => setTheme({ accent }, "accent")} />
      <BackgroundControls label="Canvas background" value={theme.background} allowImage
        onChange={(bg) => bg && setTheme({ background: bg }, "background")} />
      <NumberInput label="Card radius" value={theme.cardStyle.radius}
        onChange={(radius) => setTheme({ cardStyle: { ...theme.cardStyle, radius: radius ?? 24 } }, "radius")} />
      <NumberInput label="Card gap" value={theme.cardStyle.gap}
        onChange={(gap) => setTheme({ cardStyle: { ...theme.cardStyle, gap: gap ?? 24 } }, "gap")} />
    </div>
  );
}

function CardFields({ card }: { card: Card }) {
  switch (card.type) {
    case "stat": return <StatFields card={card} />;
    case "headline": return <HeadlineFields card={card} />;
    case "image": return <ImageFields card={card} />;
    case "icon": return <IconCardFields card={card} />;
    case "hero": return <HeroFields card={card} />;
    case "list": return <ListFields card={card} />;
    case "iconRow": return <IconRowFields card={card} />;
    case "statGroup": return <StatGroupFields card={card} />;
    case "code": return <CodeFields card={card} />;
  }
}

function StatFields({ card }: { card: CardOf<"stat"> }) {
  const { rt } = useCardEditor(card);
  const { value, caption, prefix } = card.content;
  return (
    <>
      {rt("Value", value, (c, v) => { c.value = v; })}
      {rt("Caption", caption, (c, v) => { c.caption = v; })}
      {rt("Prefix", prefix, (c, v) => { c.prefix = optional(v); })}
    </>
  );
}

function HeadlineFields({ card }: { card: CardOf<"headline"> }) {
  const { rt } = useCardEditor(card);
  return rt("Text", card.content.text, (c, v) => { c.text = v; });
}

function ImageFields({ card }: { card: CardOf<"image"> }) {
  const { update, rt } = useCardEditor(card);
  const { src, fit, position, overlay } = card.content;
  return (
    <>
      <ImageUploadField label="Image" value={src}
        onChange={(src) => update((c) => { c.src = src; }, "Image")} />
      <SelectInput label="Fit" value={fit} options={["cover", "contain"] as const}
        onChange={(fit) => update((c) => { c.fit = fit; })} />
      <TextInput label="Position (CSS object-position)" value={position ?? "center"}
        onChange={(position) => update((c) => { c.position = position; }, "Position")} />
      <label className="mb-2 flex items-center gap-2 text-xs text-neutral-400">
        <input type="checkbox" checked={!!overlay}
          onChange={(e) => update((c) => {
            c.overlay = e.target.checked ? { text: { text: "Label" }, placement: "corner" } : undefined;
          })} />
        Text overlay
      </label>
      {overlay && (
        <>
          {rt("Overlay text", overlay.text, (c, v) => { if (c.overlay) c.overlay.text = v; })}
          <SelectInput label="Placement" value={overlay.placement}
            options={["corner", "center-pill", "bottom"] as const}
            onChange={(placement) => update((c) => { if (c.overlay) c.overlay.placement = placement; })} />
        </>
      )}
    </>
  );
}

/** Emoji-or-image picker shared by icon and iconRow cards. `n` suffixes labels for array items. */
function IconSourceFields({ icon, n, emojiLabel, onChange }: {
  icon: IconSource; n?: number; emojiLabel: string;
  /** `key` set = continuous input (coalesced); unset = discrete kind switch. */
  onChange: (icon: IconSource, key?: string) => void;
}) {
  const sfx = n === undefined ? "" : ` ${n}`;
  return (
    <>
      <SelectInput label={`Icon kind${sfx}`} value={icon.kind} options={["emoji", "image"] as const}
        onChange={(kind) => onChange(kind === "emoji" ? { kind: "emoji", value: "✨" } : { kind: "image", src: "" })} />
      {icon.kind === "emoji" ? (
        <TextInput label={`${emojiLabel}${sfx}`} value={icon.value}
          onChange={(value) => onChange({ kind: "emoji", value }, `${emojiLabel}${sfx}`)} />
      ) : (
        <ImageUploadField label={`Graphic${sfx}`} value={icon.src}
          onChange={(src) => onChange({ kind: "image", src }, `Graphic${sfx}`)} />
      )}
    </>
  );
}

function IconCardFields({ card }: { card: CardOf<"icon"> }) {
  const { update, rt } = useCardEditor(card);
  const { icon, label, caption, layout } = card.content;
  return (
    <>
      <IconSourceFields icon={icon} emojiLabel="Emoji"
        onChange={(icon, key) => update((c) => { c.icon = icon; }, key)} />
      {rt("Label", label, (c, v) => { c.label = v; })}
      {rt("Caption (optional)", caption, (c, v) => { c.caption = optional(v); })}
      <SelectInput label="Layout" value={layout} options={["top", "left", "right"] as const}
        onChange={(layout) => update((c) => { c.layout = layout; })} />
    </>
  );
}

function HeroFields({ card }: { card: CardOf<"hero"> }) {
  const { update, rt } = useCardEditor(card);
  const { title, caption, image, imagePlacement } = card.content;
  return (
    <>
      {rt("Title", title, (c, v) => { c.title = v; })}
      {rt("Caption", caption, (c, v) => { c.caption = optional(v); })}
      <ImageUploadField label="Image (optional)" value={image ?? ""}
        onChange={(src) => update((c) => { c.image = src || undefined; }, "Image")} />
      <SelectInput label="Image placement" value={imagePlacement ?? "behind"}
        options={["behind", "above", "below", "left", "right"] as const}
        onChange={(p) => update((c) => { c.imagePlacement = p; })} />
    </>
  );
}

function ListFields({ card }: { card: CardOf<"list"> }) {
  const { update, rt } = useCardEditor(card);
  const { title, items, marker } = card.content;
  return (
    <>
      {rt("Title", title, (c, v) => { c.title = v; })}
      {items.map((item, i) => (
        <div key={i} className="flex items-start gap-1">
          <div className="flex-1">
            {rt(`Item ${i + 1}`, item, (c, v) => { c.items[i] = v; })}
          </div>
          <button aria-label={`Remove item ${i + 1}`}
            onClick={() => update((c) => { c.items.splice(i, 1); })}
            className="mt-3 text-neutral-500 hover:text-red-400">✕</button>
        </div>
      ))}
      <button onClick={() => update((c) => { c.items.push({ text: "New item" }); })} className={smallButton}>
        + Add item
      </button>
      <SelectInput label="Marker" value={marker} options={["bullet", "none"] as const}
        onChange={(marker) => update((c) => { c.marker = marker; })} />
    </>
  );
}

/** Bordered box for one array item, with a remove button unless it's the last one. */
function ItemBox({ title, canRemove, onRemove, children }: {
  title: string; canRemove: boolean; onRemove: () => void; children: ReactNode;
}) {
  return (
    <div className="mb-2 rounded border border-neutral-800 p-2">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs text-neutral-400">{title}</span>
        {canRemove && (
          <button aria-label={`Remove ${title.toLowerCase()}`} onClick={onRemove}
            className="text-neutral-500 hover:text-red-400">✕</button>
        )}
      </div>
      {children}
    </div>
  );
}

function IconRowFields({ card }: { card: CardOf<"iconRow"> }) {
  const { update, rt } = useCardEditor(card);
  const { items, caption } = card.content;
  return (
    <>
      {items.map((item, i) => (
        <ItemBox key={i} title={`Item ${i + 1}`} canRemove={items.length > 1}
          onRemove={() => update((c) => { c.items.splice(i, 1); })}>
          <IconSourceFields icon={item.icon} n={i + 1} emojiLabel="Emoji / text"
            onChange={(icon, key) => update((c) => { if (c.items[i]) c.items[i].icon = icon; }, key)} />
          {rt(`Label (optional) ${i + 1}`, item.label, (c, v) => {
            if (c.items[i]) c.items[i].label = optional(v);
          })}
        </ItemBox>
      ))}
      <button disabled={items.length >= 12} className={smallButton}
        onClick={() => update((c) => { c.items.push({ icon: { kind: "emoji", value: "✨" } }); })}>
        + Add item
      </button>
      {rt("Group caption (optional)", caption, (c, v) => { c.caption = optional(v); })}
    </>
  );
}

function StatGroupFields({ card }: { card: CardOf<"statGroup"> }) {
  const { update, rt } = useCardEditor(card);
  const { stats, layout } = card.content;
  return (
    <>
      {stats.map((stat, i) => (
        <ItemBox key={i} title={`Stat ${i + 1}`} canRemove={stats.length > 1}
          onRemove={() => update((c) => { c.stats.splice(i, 1); })}>
          {rt(`Prefix (optional) ${i + 1}`, stat.prefix, (c, v) => {
            if (c.stats[i]) c.stats[i].prefix = optional(v);
          })}
          {rt(`Value ${i + 1}`, stat.value, (c, v) => { if (c.stats[i]) c.stats[i].value = v; })}
          {rt(`Caption (optional) ${i + 1}`, stat.caption, (c, v) => {
            if (c.stats[i]) c.stats[i].caption = optional(v);
          })}
        </ItemBox>
      ))}
      <button disabled={stats.length >= 6} className={smallButton}
        onClick={() => update((c) => { c.stats.push({ value: { text: "2x" } }); })}>
        + Add stat
      </button>
      <SelectInput label="Layout" value={layout} options={["column", "row"] as const}
        onChange={(layout) => update((c) => { c.layout = layout; })} />
    </>
  );
}

function CodeFields({ card }: { card: CardOf<"code"> }) {
  const { update, rt } = useCardEditor(card);
  const { code, language, title } = card.content;
  return (
    <>
      <TextAreaInput label="Code" value={code}
        onChange={(code) => update((c) => { c.code = code; }, "Code")} />
      <SelectInput label="Language" value={language}
        options={["swift", "typescript", "javascript", "python", "json", "bash"] as const}
        onChange={(language) => update((c) => { c.language = language; })} />
      {rt("Title (optional)", title, (c, v) => { c.title = optional(v); })}
    </>
  );
}

function CardStyleFields({ card }: { card: Card }) {
  const updateCard = useEditor((s) => s.updateCard);
  const removeCard = useEditor((s) => s.removeCard);
  return (
    <>
      <h2 className={`${sectionTitle} mt-4`}>Card style</h2>
      <BackgroundControls label="Background" value={card.style?.background}
        onChange={(background) => updateCard(card.id, (c) => {
          c.style = { ...c.style, background };
        }, `${card.id}:style.background`)} />
      <ColorInput label="Text color" value={card.style?.textColor}
        onChange={(textColor) => updateCard(card.id, (c) => {
          c.style = { ...c.style, textColor };
        }, `${card.id}:style.textColor`)} />
      <button onClick={() => removeCard(card.id)}
        className="mt-4 w-full rounded border border-red-900 py-1.5 text-sm text-red-400 hover:bg-red-950">
        Delete card
      </button>
    </>
  );
}
