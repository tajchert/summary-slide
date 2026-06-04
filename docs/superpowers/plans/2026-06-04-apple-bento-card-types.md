# Apple-Bento Card Types Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add five capabilities observed in real Apple bento slides (`examples/`): an `iconRow` card, an optional caption on the `icon` card, a `statGroup` card, a Prism-highlighted `code` card, and a `bottom` image-overlay placement.

**Architecture:** All schema changes are additive union members / optional fields on `src/schema/slide.ts` (`version: 1` unchanged; old docs keep parsing). Each new card renders through the single render path: component in `src/render/cards/` dispatched by `CardView`. Editor integration follows the CLAUDE.md checklist: `newCard.ts` default → `defaultSpan()` → Palette tile → Inspector section. Syntax highlighting uses **Prism** (synchronous `tokenize` → React spans with inline colors) — Shiki is async and would race the export's `data-render-ready` gate and Quick PNG capture.

**Tech Stack:** React 18, zod 4, zustand, Vitest + Testing Library (jsdom), prismjs 1.30 (+ `@types/prismjs`).

**Spec:** `docs/superpowers/specs/2026-06-04-apple-bento-card-types-design.md`

**Commit policy (CLAUDE.md):** run all three suites before every commit, in CI order:
```bash
npm test && npm run build && npm run test:worker && npm run typecheck:worker && npm run e2e
```
(`test:worker` requires `dist/` from the build step. `e2e` builds + serves itself.)

---

## Task 1: `iconRow` schema

**Files:**
- Modify: `src/schema/slide.ts`
- Test: `src/schema/slide.test.ts`

- [ ] **Step 1: Write the failing tests**

In `src/schema/slide.test.ts`, add to the `doc.cards` array inside the existing `"accepts every card type"` test (after the `list` entry):

```ts
      { id: "g", type: "iconRow", grid: { x: 9, y: 1, w: 3, h: 1 },
        content: { items: [
          { icon: { kind: "emoji", value: "📷" }, label: { text: "0.5x" } },
          { icon: { kind: "image", src: "/i/port.png" } },
        ], caption: { text: "Four lenses in your pocket" } } },
```

And add a new test after `"rejects unknown card types"`:

```ts
  it("rejects an iconRow with zero items", () => {
    const doc = blankDocument();
    doc.cards = [{ id: "a", type: "iconRow", grid: { x: 0, y: 0, w: 3, h: 1 },
      content: { items: [] } } as never];
    expect(slideDocumentSchema.safeParse(doc).success).toBe(false);
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/schema/slide.test.ts`
Expected: FAIL — `"accepts every card type"` fails (`type: "iconRow"` is not a valid discriminator value).

- [ ] **Step 3: Implement the schema**

In `src/schema/slide.ts`:

(a) Above `cardBase`, extract the icon source union (currently inline in the `icon` member):

```ts
export const iconSourceSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("emoji"), value: z.string() }),
  z.object({ kind: z.literal("image"), src: z.string() }),
]);
export type IconSource = z.infer<typeof iconSourceSchema>;
```

(b) In the `icon` card member, replace the inline `icon: z.discriminatedUnion(...)` with:

```ts
    icon: iconSourceSchema,
```

(c) Add a new union member to `cardSchema` (after the `list` member, before the closing `]`):

```ts
  z.object({ ...cardBase, type: z.literal("iconRow"), content: z.object({
    items: z.array(z.object({
      icon: iconSourceSchema,
      label: richTextSchema.optional(),
    })).min(1),
    caption: richTextSchema.optional(),
  }) }),
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/schema/slide.test.ts`
Expected: PASS (all tests).

Note: `npx tsc -b` will fail until Task 3 completes — `newCard.ts`, `defaultSpan()`, and `CardView` switch over `CardType` and are now non-exhaustive. That is expected mid-feature; Tasks 2–3 fix it.

## Task 2: `IconRowCard` component + CardView dispatch

**Files:**
- Create: `src/render/cards/IconRowCard.tsx`
- Modify: `src/render/CardView.tsx`
- Test: `src/render/CardView.test.tsx`

- [ ] **Step 1: Write the failing tests**

Add to `src/render/CardView.test.tsx` (inside the `describe` block):

```tsx
  it("iconRow renders all items with labels and a group caption", () => {
    renderCard({ ...base, type: "iconRow", content: {
      items: [
        { icon: { kind: "emoji", value: "🔌" }, label: { text: "MagSafe 3" } },
        { icon: { kind: "image", src: "/i/hdmi.png" }, label: { text: "HDMI" } },
        { icon: { kind: "emoji", value: "💾" } },
      ],
      caption: { text: "Connect everything" } } });
    expect(screen.getByText("🔌")).toBeInTheDocument();
    expect(screen.getByText("MagSafe 3")).toBeInTheDocument();
    expect(screen.getByRole("img")).toHaveAttribute("src", "/i/hdmi.png");
    expect(screen.getByText("HDMI")).toBeInTheDocument();
    expect(screen.getByText("💾")).toBeInTheDocument();
    expect(screen.getByText("Connect everything")).toBeInTheDocument();
  });

  it("iconRow without labels or caption renders only icons", () => {
    renderCard({ ...base, type: "iconRow", content: {
      items: [{ icon: { kind: "emoji", value: "⚡" } }] } });
    expect(screen.getByText("⚡")).toBeInTheDocument();
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/render/CardView.test.tsx`
Expected: FAIL — TypeScript/render error: `CardView` switch has no `iconRow` arm (renders `undefined`), `getByText("🔌")` not found.

- [ ] **Step 3: Implement the component**

Create `src/render/cards/IconRowCard.tsx`:

```tsx
import type { Card, SlideDocument } from "../../schema/slide";
import { themeTokens } from "../styleResolve";
import { RichText } from "../RichText";

type IconRowCardType = Extract<Card, { type: "iconRow" }>;

export function IconRowCard({ card, theme }: { card: IconRowCardType; theme: SlideDocument["theme"] }) {
  const tokens = themeTokens(theme.mode);
  const { items, caption } = card.content;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", height: "100%", gap: 14, padding: 24 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "center", gap: 32 }}>
        {items.map((item, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column",
            alignItems: "center", gap: 8 }}>
            {item.icon.kind === "emoji" ? (
              <div style={{ fontSize: 48, lineHeight: 1 }}>{item.icon.value}</div>
            ) : (
              <img src={item.icon.src} alt="" role="img"
                style={{ width: 48, height: 48, objectFit: "contain" }} />
            )}
            {item.label && <RichText value={item.label} editPath={`content.items.${i}.label`}
              baseStyle={{ fontSize: 20, color: tokens.muted, textAlign: "center" }} />}
          </div>
        ))}
      </div>
      {caption && <RichText value={caption} editPath="content.caption"
        baseStyle={{ fontSize: 24, color: tokens.muted, textAlign: "center" }} />}
    </div>
  );
}
```

(`commitText` in `EditorCanvas.tsx` walks dot-paths generically, so the nested
`content.items.0.label` path works without changes.)

In `src/render/CardView.tsx`, add the import and dispatch arm:

```tsx
import { IconRowCard } from "./cards/IconRowCard";
```

```tsx
      case "iconRow": return <IconRowCard card={card} theme={theme} />;
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/render/CardView.test.tsx`
Expected: PASS.

## Task 3: `iconRow` editor integration + commit

**Files:**
- Modify: `src/editor/gridUtils.ts`, `src/editor/newCard.ts`, `src/editor/Palette.tsx`, `src/editor/Inspector.tsx`
- Test: `src/editor/gridUtils.test.ts`, `src/editor/Palette.test.tsx`, `src/editor/Inspector.test.tsx`

- [ ] **Step 1: Write the failing tests**

(a) `src/editor/gridUtils.test.ts` — add inside the `defaultSpan` describe's existing test:

```ts
    expect(defaultSpan("iconRow")).toEqual({ w: 4, h: 1 });
```

(b) `src/editor/Palette.test.tsx` — the first test hardcodes 6 tiles and uses regex names that
will become ambiguous ("Stat" vs "Stat group", "Icon" vs "Icon row"). Update it now for this and
the upcoming types (Tasks 7/11 bump the count again — set it per task). Replace the two
assertions/clicks:

```tsx
    expect(screen.getAllByRole("button")).toHaveLength(7);
    await userEvent.click(screen.getByRole("button", { name: "Stat" }));
```

and in the `"shows a message when the grid is full"` test replace the click line with:

```tsx
    await userEvent.click(screen.getByRole("button", { name: "Icon" }));
```

Add a new test:

```tsx
  it("adds an iconRow card", async () => {
    const store = createEditorStore(blankDocument(), "t3");
    render(
      <EditorStoreContext.Provider value={store}>
        <Palette />
      </EditorStoreContext.Provider>
    );
    await userEvent.click(screen.getByRole("button", { name: "Icon row" }));
    expect(store.getState().doc.cards[0].type).toBe("iconRow");
  });
```

(c) `src/editor/Inspector.test.tsx` — widen the setup type and add tests. Change the setup
signature to:

```tsx
import type { CardType } from "../schema/slide";

function setup(addType?: CardType) {
```

Add:

```tsx
  it("iconRow: edits item label, adds and removes items", async () => {
    const store = setup("iconRow");
    const input = screen.getByLabelText(/label \(optional\) 1/i);
    await userEvent.clear(input);
    await userEvent.type(input, "MagSafe");
    let card = store.getState().doc.cards[0];
    expect(card.type === "iconRow" && card.content.items[0].label?.text).toBe("MagSafe");

    await userEvent.click(screen.getByRole("button", { name: /\+ add item/i }));
    card = store.getState().doc.cards[0];
    expect(card.type === "iconRow" && card.content.items).toHaveLength(3);

    await userEvent.click(screen.getByRole("button", { name: /remove item 1/i }));
    card = store.getState().doc.cards[0];
    expect(card.type === "iconRow" && card.content.items).toHaveLength(2);
  });

  it("iconRow: hides remove button on the last item", async () => {
    const store = setup("iconRow");
    // default card has 2 items: remove one, then the remove button disappears
    await userEvent.click(screen.getByRole("button", { name: /remove item 2/i }));
    const card = store.getState().doc.cards[0];
    expect(card.type === "iconRow" && card.content.items).toHaveLength(1);
    expect(screen.queryByRole("button", { name: /remove item/i })).not.toBeInTheDocument();
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/editor`
Expected: FAIL — `defaultSpan("iconRow")` returns `undefined`; Palette has no "Icon row" tile; Inspector has no iconRow section.

- [ ] **Step 3: Implement**

(a) `src/editor/gridUtils.ts` — add to the `defaultSpan` switch:

```ts
    case "iconRow": return { w: 4, h: 1 };
```

(b) `src/editor/newCard.ts` — add to the switch:

```ts
    case "iconRow": return { id, type, grid, content: {
      items: [
        { icon: { kind: "emoji", value: "📷" }, label: { text: "0.5x" } },
        { icon: { kind: "emoji", value: "📷" }, label: { text: "2x" } },
      ] } };
```

(c) `src/editor/Palette.tsx` — add to `TILES`:

```ts
  { type: "iconRow", label: "Icon row", glyph: "🔌🎧" },
```

(d) `src/editor/Inspector.tsx` — add a section after the `card.type === "icon"` block.
Labels include the item index so `getByLabelText` is unambiguous:

```tsx
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
          <button onClick={() => updateCard(card.id, (c) => {
            if (c.type === "iconRow") c.content.items.push({ icon: { kind: "emoji", value: "✨" } });
          })} className="mb-2 rounded border border-neutral-700 px-2 py-1 text-xs hover:bg-neutral-800">
            + Add item
          </button>
          {rt("Group caption (optional)", card.content.caption ?? { text: "" },
            (c, v) => { if (c.type === "iconRow") c.content.caption = v.text ? v : undefined; })}
        </>
      )}
```

- [ ] **Step 4: Run the full frontend suite and typecheck**

Run: `npx tsc -b && npm test`
Expected: PASS — switches over `CardType` are exhaustive again.

- [ ] **Step 5: Run remaining suites and commit**

```bash
npm run build && npm run test:worker && npm run typecheck:worker && npm run e2e
git add -A src docs
git commit -m "feat: iconRow card — multiple icons with per-item labels and group caption"
```

## Task 4: `icon` card optional caption (schema + render + inspector) + commit

**Files:**
- Modify: `src/schema/slide.ts`, `src/render/cards/IconCard.tsx`, `src/editor/Inspector.tsx`
- Test: `src/render/CardView.test.tsx`, `src/editor/Inspector.test.tsx`

- [ ] **Step 1: Write the failing tests**

(a) `src/render/CardView.test.tsx`:

```tsx
  it("icon renders an optional muted caption under the label", () => {
    renderCard({ ...base, type: "icon", content: {
      icon: { kind: "emoji", value: "🎧" }, label: { text: "Spatial audio" },
      caption: { text: "with dynamic head tracking" }, layout: "top" } });
    expect(screen.getByText("Spatial audio")).toBeInTheDocument();
    expect(screen.getByText("with dynamic head tracking")).toBeInTheDocument();
  });
```

(b) `src/editor/Inspector.test.tsx`:

```tsx
  it("icon: setting caption text stores it; clearing removes it", async () => {
    const store = setup("icon");
    const input = screen.getByLabelText(/caption \(optional\)/i);
    await userEvent.type(input, "sound system");
    let card = store.getState().doc.cards[0];
    expect(card.type === "icon" && card.content.caption?.text).toBe("sound system");

    await userEvent.clear(input);
    card = store.getState().doc.cards[0];
    expect(card.type === "icon" && card.content.caption).toBeUndefined();
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/render/CardView.test.tsx src/editor/Inspector.test.tsx`
Expected: FAIL — caption not rendered (schema strips unknown key), no caption input in Inspector.

- [ ] **Step 3: Implement**

(a) `src/schema/slide.ts` — in the `icon` member's `content`, after `label`:

```ts
    caption: richTextSchema.optional(),
```

(b) `src/render/cards/IconCard.tsx` — replace the whole file:

```tsx
import type { Card, SlideDocument } from "../../schema/slide";
import { themeTokens } from "../styleResolve";
import { RichText } from "../RichText";

type IconCardType = Extract<Card, { type: "icon" }>;

export function IconCard({ card, theme }: { card: IconCardType; theme: SlideDocument["theme"] }) {
  const tokens = themeTokens(theme.mode);
  const { icon, label, caption, layout } = card.content;
  const flexDirection = layout === "top" ? "column" : layout === "left" ? "row" : "row-reverse";
  return (
    <div style={{ display: "flex", flexDirection, alignItems: "center", justifyContent: "center",
      height: "100%", gap: 16, padding: 24, textAlign: layout === "top" ? "center" : "left" }}>
      {icon.kind === "emoji" ? (
        <div style={{ fontSize: 64, lineHeight: 1 }}>{icon.value}</div>
      ) : (
        <img src={icon.src} alt="" role="img" style={{ width: 72, height: 72, objectFit: "contain" }} />
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 4,
        alignItems: layout === "top" ? "center" : "flex-start" }}>
        <RichText value={label} editPath="content.label"
          baseStyle={{ fontSize: 28, fontWeight: 600 }} />
        {caption && <RichText value={caption} editPath="content.caption"
          baseStyle={{ fontSize: 22, color: tokens.muted }} />}
      </div>
    </div>
  );
}
```

(The existing `"layout=left renders a row"` test asserts `flexDirection` on the outer flex
container, which is unchanged — it keeps passing.)

(c) `src/editor/Inspector.tsx` — in the `card.type === "icon"` block, after the Label control:

```tsx
          {rt("Caption (optional)", card.content.caption ?? { text: "" },
            (c, v) => { if (c.type === "icon") c.content.caption = v.text ? v : undefined; })}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx tsc -b && npm test`
Expected: PASS.

- [ ] **Step 5: Run remaining suites and commit**

```bash
npm run build && npm run test:worker && npm run typecheck:worker && npm run e2e
git add -A src
git commit -m "feat: optional caption on icon card"
```

## Task 5: `statGroup` schema

**Files:**
- Modify: `src/schema/slide.ts`
- Test: `src/schema/slide.test.ts`

- [ ] **Step 1: Write the failing tests**

Add to the `doc.cards` array in `"accepts every card type"`:

```ts
      { id: "h", type: "statGroup", grid: { x: 0, y: 5, w: 3, h: 1 },
        content: { layout: "row", stats: [
          { value: { text: '6.9"' }, caption: { text: "Pro Max" } },
          { prefix: { text: "Up to" }, value: { text: '6.3"' } },
        ] } },
```

Add a new test:

```ts
  it("rejects a statGroup with zero stats", () => {
    const doc = blankDocument();
    doc.cards = [{ id: "a", type: "statGroup", grid: { x: 0, y: 0, w: 3, h: 2 },
      content: { stats: [], layout: "column" } } as never];
    expect(slideDocumentSchema.safeParse(doc).success).toBe(false);
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/schema/slide.test.ts`
Expected: FAIL — `"statGroup"` is not a valid discriminator value.

- [ ] **Step 3: Implement the schema**

Add to `cardSchema` (after the `iconRow` member):

```ts
  z.object({ ...cardBase, type: z.literal("statGroup"), content: z.object({
    stats: z.array(z.object({
      prefix: richTextSchema.optional(),
      value: richTextSchema,
      caption: richTextSchema.optional(),
    })).min(1),
    layout: z.enum(["column", "row"]),
  }) }),
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/schema/slide.test.ts`
Expected: PASS. (`tsc -b` non-exhaustive again until Task 7 — expected.)

## Task 6: `StatGroupCard` component + CardView dispatch

**Files:**
- Create: `src/render/cards/StatGroupCard.tsx`
- Modify: `src/render/CardView.tsx`
- Test: `src/render/CardView.test.tsx`

- [ ] **Step 1: Write the failing tests**

```tsx
  it("statGroup column renders stacked stats with prefix/value/caption", () => {
    const { container } = renderCard({ ...base, type: "statGroup", content: {
      layout: "column", stats: [
        { prefix: { text: "Up to" }, value: { text: "16-core" }, caption: { text: "CPU" } },
        { prefix: { text: "Up to" }, value: { text: "40-core" }, caption: { text: "GPU" } },
      ] } });
    expect(screen.getAllByText("Up to")).toHaveLength(2);
    expect(screen.getByText("16-core")).toBeInTheDocument();
    expect(screen.getByText("40-core")).toBeInTheDocument();
    expect((container.firstChild!.firstChild as HTMLElement).style.flexDirection).toBe("column");
    expect(container.querySelectorAll("[data-divider]")).toHaveLength(0);
  });

  it("statGroup row renders side-by-side stats with dividers between them", () => {
    const { container } = renderCard({ ...base, type: "statGroup", content: {
      layout: "row", stats: [
        { value: { text: '6.9"' } }, { value: { text: '6.3"' } },
      ] } });
    expect((container.firstChild!.firstChild as HTMLElement).style.flexDirection).toBe("row");
    expect(container.querySelectorAll("[data-divider]")).toHaveLength(1);
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/render/CardView.test.tsx`
Expected: FAIL — no `statGroup` dispatch arm.

- [ ] **Step 3: Implement the component**

Create `src/render/cards/StatGroupCard.tsx`:

```tsx
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
```

In `src/render/CardView.tsx`:

```tsx
import { StatGroupCard } from "./cards/StatGroupCard";
```

```tsx
      case "statGroup": return <StatGroupCard card={card} theme={theme} />;
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/render/CardView.test.tsx`
Expected: PASS.

## Task 7: `statGroup` editor integration + commit

**Files:**
- Modify: `src/editor/gridUtils.ts`, `src/editor/newCard.ts`, `src/editor/Palette.tsx`, `src/editor/Inspector.tsx`
- Test: `src/editor/gridUtils.test.ts`, `src/editor/Palette.test.tsx`, `src/editor/Inspector.test.tsx`

- [ ] **Step 1: Write the failing tests**

(a) `src/editor/gridUtils.test.ts`:

```ts
    expect(defaultSpan("statGroup")).toEqual({ w: 3, h: 2 });
```

(b) `src/editor/Palette.test.tsx` — bump the tile count assertion from 7 to 8, and add:

```tsx
  it("adds a statGroup card", async () => {
    const store = createEditorStore(blankDocument(), "t4");
    render(
      <EditorStoreContext.Provider value={store}>
        <Palette />
      </EditorStoreContext.Provider>
    );
    await userEvent.click(screen.getByRole("button", { name: "Stat group" }));
    expect(store.getState().doc.cards[0].type).toBe("statGroup");
  });
```

(c) `src/editor/Inspector.test.tsx`:

```tsx
  it("statGroup: edits a stat value, toggles layout, adds and removes stats", async () => {
    const store = setup("statGroup");
    const input = screen.getByLabelText(/value 1/i);
    await userEvent.clear(input);
    await userEvent.type(input, "40-core");
    let card = store.getState().doc.cards[0];
    expect(card.type === "statGroup" && card.content.stats[0].value.text).toBe("40-core");

    await userEvent.selectOptions(screen.getByLabelText(/layout/i), "row");
    card = store.getState().doc.cards[0];
    expect(card.type === "statGroup" && card.content.layout).toBe("row");

    await userEvent.click(screen.getByRole("button", { name: /\+ add stat/i }));
    card = store.getState().doc.cards[0];
    expect(card.type === "statGroup" && card.content.stats).toHaveLength(3);

    await userEvent.click(screen.getByRole("button", { name: /remove stat 3/i }));
    await userEvent.click(screen.getByRole("button", { name: /remove stat 2/i }));
    card = store.getState().doc.cards[0];
    expect(card.type === "statGroup" && card.content.stats).toHaveLength(1);
    expect(screen.queryByRole("button", { name: /remove stat/i })).not.toBeInTheDocument();
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/editor`
Expected: FAIL — `defaultSpan("statGroup")` undefined, no Palette tile, no Inspector section.

- [ ] **Step 3: Implement**

(a) `src/editor/gridUtils.ts`:

```ts
    case "statGroup": return { w: 3, h: 2 };
```

(b) `src/editor/newCard.ts`:

```ts
    case "statGroup": return { id, type, grid, content: {
      stats: [
        { prefix: { text: "Up to" }, value: { text: "16-core" }, caption: { text: "CPU" } },
        { prefix: { text: "Up to" }, value: { text: "40-core" }, caption: { text: "GPU" } },
      ], layout: "column" } };
```

(c) `src/editor/Palette.tsx`:

```ts
  { type: "statGroup", label: "Stat group", glyph: "2×|4×" },
```

(d) `src/editor/Inspector.tsx` — add after the `iconRow` section:

```tsx
      {card.type === "statGroup" && (
        <>
          {card.content.stats.map((stat, i) => (
            <div key={i} className="mb-2 rounded border border-neutral-800 p-2">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-xs text-neutral-400">Stat {i + 1}</span>
                {card.content.stats.length > 1 && (
                  <button aria-label={`Remove stat ${i + 1}`}
                    onClick={() => updateCard(card.id, (c) => {
                      if (c.type === "statGroup") c.content.stats.splice(i, 1);
                    })}
                    className="text-neutral-500 hover:text-red-400">✕</button>
                )}
              </div>
              {rt(`Prefix (optional) ${i + 1}`, stat.prefix ?? { text: "" }, (c, v) => {
                if (c.type === "statGroup" && c.content.stats[i])
                  c.content.stats[i].prefix = v.text ? v : undefined;
              })}
              {rt(`Value ${i + 1}`, stat.value, (c, v) => {
                if (c.type === "statGroup" && c.content.stats[i]) c.content.stats[i].value = v;
              })}
              {rt(`Caption (optional) ${i + 1}`, stat.caption ?? { text: "" }, (c, v) => {
                if (c.type === "statGroup" && c.content.stats[i])
                  c.content.stats[i].caption = v.text ? v : undefined;
              })}
            </div>
          ))}
          <button onClick={() => updateCard(card.id, (c) => {
            if (c.type === "statGroup") c.content.stats.push({ value: { text: "2x" } });
          })} className="mb-2 rounded border border-neutral-700 px-2 py-1 text-xs hover:bg-neutral-800">
            + Add stat
          </button>
          <SelectInput label="Layout" value={card.content.layout}
            options={["column", "row"] as const}
            onChange={(layout) => updateCard(card.id, (c) => {
              if (c.type === "statGroup") c.content.layout = layout;
            })} />
        </>
      )}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx tsc -b && npm test`
Expected: PASS.

- [ ] **Step 5: Run remaining suites and commit**

```bash
npm run build && npm run test:worker && npm run typecheck:worker && npm run e2e
git add -A src
git commit -m "feat: statGroup card — stacked or side-by-side stat rows"
```

## Task 8: `code` card schema + prismjs dependency

**Files:**
- Modify: `package.json` (via npm), `src/schema/slide.ts`
- Test: `src/schema/slide.test.ts`

- [ ] **Step 1: Install prismjs**

```bash
npm install prismjs && npm install -D @types/prismjs
```

- [ ] **Step 2: Write the failing test**

Add to the `doc.cards` array in `"accepts every card type"`:

```ts
      { id: "i", type: "code", grid: { x: 3, y: 5, w: 5, h: 1 },
        content: { code: "let x = 1", language: "swift", title: { text: "Foundation Models" } } },
```

And a new test:

```ts
  it("rejects a code card with an unsupported language", () => {
    const doc = blankDocument();
    doc.cards = [{ id: "a", type: "code", grid: { x: 0, y: 0, w: 5, h: 2 },
      content: { code: "x", language: "cobol" } } as never];
    expect(slideDocumentSchema.safeParse(doc).success).toBe(false);
  });
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run src/schema/slide.test.ts`
Expected: FAIL — `"code"` is not a valid discriminator value.

- [ ] **Step 4: Implement the schema**

Add to `cardSchema` (after the `statGroup` member):

```ts
  z.object({ ...cardBase, type: z.literal("code"), content: z.object({
    code: z.string(),
    language: z.enum(["swift", "typescript", "javascript", "python", "json", "bash"]),
    title: richTextSchema.optional(),
  }) }),
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/schema/slide.test.ts`
Expected: PASS. (`tsc -b` non-exhaustive until Task 11 — expected.)

## Task 9: Prism highlight helper + mono font stack

**Files:**
- Create: `src/render/codeHighlight.tsx`
- Modify: `src/render/styleResolve.ts`
- Test: `src/render/codeHighlight.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/render/codeHighlight.test.tsx`:

```tsx
import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { highlightCode } from "./codeHighlight";

afterEach(cleanup);

describe("highlightCode", () => {
  it("preserves the exact source text", () => {
    const code = 'let session = LanguageModelSession()\nlet x = 42 // answer';
    const { container } = render(<pre>{highlightCode(code, "swift", "dark")}</pre>);
    expect(container.textContent).toBe(code);
  });

  it("colors keywords differently from plain text", () => {
    const { container } = render(<pre>{highlightCode("let x = 42", "swift", "dark")}</pre>);
    const spans = Array.from(container.querySelectorAll("span"));
    const keyword = spans.find((s) => s.textContent === "let");
    expect(keyword).toBeDefined();
    expect(keyword!.style.color).not.toBe("");
  });

  it("uses different palettes for light and dark mode", () => {
    const pick = (mode: "light" | "dark") => {
      const { container } = render(<pre>{highlightCode("let x = 1", "swift", mode)}</pre>);
      const kw = Array.from(container.querySelectorAll("span")).find((s) => s.textContent === "let");
      const color = kw!.style.color;
      cleanup();
      return color;
    };
    expect(pick("dark")).not.toBe(pick("light"));
  });

  it("highlights every supported language without throwing", () => {
    const samples = {
      swift: 'func greet() { print("hi") }',
      typescript: "const n: number = 1;",
      javascript: "const n = 1;",
      python: "def greet():\n    return 1",
      json: '{ "a": [1, 2] }',
      bash: "echo hello | wc -l",
    } as const;
    for (const [lang, code] of Object.entries(samples)) {
      const { container } = render(
        <pre>{highlightCode(code, lang as keyof typeof samples, "dark")}</pre>);
      expect(container.textContent).toBe(code);
      cleanup();
    }
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/render/codeHighlight.test.tsx`
Expected: FAIL — module `./codeHighlight` does not exist.

- [ ] **Step 3: Implement**

(a) In `src/render/styleResolve.ts`, after `SLIDE_FONT_FAMILY`:

```ts
/** Mono stack for code cards — same everywhere for the same pixel-fidelity reason. */
export const SLIDE_MONO_FONT_FAMILY =
  'ui-monospace, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace';
```

(b) Create `src/render/codeHighlight.tsx`:

```tsx
import type { ReactNode } from "react";
import Prism from "prismjs";
// Grammar side-effect imports. Core already ships markup/css/clike/javascript;
// swift + typescript extend clike/javascript respectively.
import "prismjs/components/prism-swift";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-python";
import "prismjs/components/prism-json";
import "prismjs/components/prism-bash";

// Prevent Prism from auto-highlighting the document on load (we only tokenize).
Prism.manual = true;

export type CodeLanguage = "swift" | "typescript" | "javascript" | "python" | "json" | "bash";

/**
 * Token-type → inline color, per theme mode (Xcode-inspired). Inline styles — never a
 * Prism CSS theme — so the editor canvas, share preview, headless export and Quick PNG
 * capture all render identically through the single render path.
 */
const TOKEN_COLORS: Record<"light" | "dark", Record<string, string>> = {
  dark: {
    keyword: "#ff7ab2", string: "#ff8170", number: "#d0bf69", boolean: "#ff7ab2",
    comment: "#7f8c98", function: "#67b7a4", "class-name": "#d0a8ff", builtin: "#d0a8ff",
    operator: "#a8b3c0", punctuation: "#a8b3c0", property: "#6bdfff", constant: "#6bdfff",
  },
  light: {
    keyword: "#ad3da4", string: "#d12f1b", number: "#272ad8", boolean: "#ad3da4",
    comment: "#707f8c", function: "#3e8087", "class-name": "#703daa", builtin: "#703daa",
    operator: "#56636f", punctuation: "#56636f", property: "#0f68a0", constant: "#0f68a0",
  },
};

type PrismToken = string | Prism.Token;

function tokenColor(token: Prism.Token, colors: Record<string, string>): string | undefined {
  if (colors[token.type]) return colors[token.type];
  const aliases = Array.isArray(token.alias) ? token.alias : token.alias ? [token.alias] : [];
  for (const a of aliases) if (colors[a]) return colors[a];
  return undefined;
}

function renderTokens(tokens: PrismToken[], colors: Record<string, string>, keyPrefix = ""): ReactNode[] {
  return tokens.map((tok, i) => {
    if (typeof tok === "string") return tok;
    const color = tokenColor(tok, colors);
    const inner: PrismToken[] = Array.isArray(tok.content)
      ? (tok.content as PrismToken[])
      : [tok.content as PrismToken];
    return (
      <span key={`${keyPrefix}${i}`} style={color ? { color } : undefined}>
        {renderTokens(inner, colors, `${keyPrefix}${i}-`)}
      </span>
    );
  });
}

/** Synchronous Prism tokenize → inline-styled React spans. Falls back to plain text. */
export function highlightCode(code: string, language: CodeLanguage, mode: "light" | "dark"): ReactNode {
  const grammar = Prism.languages[language];
  if (!grammar) return code;
  return renderTokens(Prism.tokenize(code, grammar), TOKEN_COLORS[mode]);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/render/codeHighlight.test.tsx`
Expected: PASS.

## Task 10: `CodeCard` component + CardView dispatch

**Files:**
- Create: `src/render/cards/CodeCard.tsx`
- Modify: `src/render/CardView.tsx`
- Test: `src/render/CardView.test.tsx`

- [ ] **Step 1: Write the failing tests**

```tsx
  it("code renders highlighted source in a monospace pre with title", () => {
    const { container } = renderCard({ ...base, type: "code", content: {
      code: 'let x = "hi"', language: "swift", title: { text: "Foundation Models" } } });
    const pre = container.querySelector("pre")!;
    expect(pre.textContent).toBe('let x = "hi"');
    expect(pre.style.fontFamily).toContain("monospace");
    expect(screen.getByText("Foundation Models")).toBeInTheDocument();
  });

  it("code renders a placeholder when empty", () => {
    renderCard({ ...base, type: "code", content: { code: "", language: "swift" } });
    expect(screen.getByText(/add code/i)).toBeInTheDocument();
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/render/CardView.test.tsx`
Expected: FAIL — no `code` dispatch arm.

- [ ] **Step 3: Implement the component**

Create `src/render/cards/CodeCard.tsx`:

```tsx
import type { Card, SlideDocument } from "../../schema/slide";
import { SLIDE_MONO_FONT_FAMILY } from "../styleResolve";
import { RichText } from "../RichText";
import { highlightCode } from "../codeHighlight";

type CodeCardType = Extract<Card, { type: "code" }>;

export function CodeCard({ card, theme }: { card: CodeCardType; theme: SlideDocument["theme"] }) {
  const { code, language, title } = card.content;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", height: "100%", gap: 16, padding: 32 }}>
      {code ? (
        <pre style={{ margin: 0, fontFamily: SLIDE_MONO_FONT_FAMILY, fontSize: 24,
          lineHeight: 1.5, whiteSpace: "pre-wrap", overflow: "hidden", maxWidth: "100%" }}>
          {highlightCode(code, language, theme.mode)}
        </pre>
      ) : (
        <div style={{ fontSize: 28, opacity: 0.4 }}>Add code</div>
      )}
      {title && <RichText value={title} editPath="content.title"
        baseStyle={{ fontSize: 28, fontWeight: 600, textAlign: "center" }} />}
    </div>
  );
}
```

In `src/render/CardView.tsx`:

```tsx
import { CodeCard } from "./cards/CodeCard";
```

```tsx
      case "code": return <CodeCard card={card} theme={theme} />;
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/render/CardView.test.tsx`
Expected: PASS.

## Task 11: `code` editor integration + commit

**Files:**
- Modify: `src/editor/inspector-fields.tsx`, `src/editor/gridUtils.ts`, `src/editor/newCard.ts`, `src/editor/Palette.tsx`, `src/editor/Inspector.tsx`
- Test: `src/editor/gridUtils.test.ts`, `src/editor/Palette.test.tsx`, `src/editor/Inspector.test.tsx`

- [ ] **Step 1: Write the failing tests**

(a) `src/editor/gridUtils.test.ts`:

```ts
    expect(defaultSpan("code")).toEqual({ w: 5, h: 2 });
```

(b) `src/editor/Palette.test.tsx` — bump the tile count assertion from 8 to 9, and add:

```tsx
  it("adds a code card", async () => {
    const store = createEditorStore(blankDocument(), "t5");
    render(
      <EditorStoreContext.Provider value={store}>
        <Palette />
      </EditorStoreContext.Provider>
    );
    await userEvent.click(screen.getByRole("button", { name: "Code" }));
    expect(store.getState().doc.cards[0].type).toBe("code");
  });
```

(c) `src/editor/Inspector.test.tsx`:

```tsx
  it("code: edits source via textarea and switches language", async () => {
    const store = setup("code");
    const textarea = screen.getByLabelText(/^code$/i);
    await userEvent.clear(textarea);
    await userEvent.type(textarea, "print(1)");
    let card = store.getState().doc.cards[0];
    expect(card.type === "code" && card.content.code).toBe("print(1)");

    await userEvent.selectOptions(screen.getByLabelText(/language/i), "python");
    card = store.getState().doc.cards[0];
    expect(card.type === "code" && card.content.language).toBe("python");
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/editor`
Expected: FAIL — `defaultSpan("code")` undefined, no "Code" tile, no Inspector section.

- [ ] **Step 3: Implement**

(a) `src/editor/inspector-fields.tsx` — add a textarea field (after `TextInput`):

```tsx
export function TextAreaInput({ label, value, onChange, rows = 6 }: {
  label: string; value: string; onChange: (v: string) => void; rows?: number;
}) {
  const id = useId();
  return (
    <div className="mb-2">
      <label htmlFor={id} className="block text-xs text-neutral-400">{label}</label>
      <textarea id={id} value={value} rows={rows} spellCheck={false}
        onChange={(e) => onChange(e.target.value)}
        className="mt-0.5 w-full rounded border border-neutral-700 bg-neutral-900 px-2 py-1
          font-mono text-xs" />
    </div>
  );
}
```

(b) `src/editor/gridUtils.ts`:

```ts
    case "code": return { w: 5, h: 2 };
```

(c) `src/editor/newCard.ts`:

```ts
    case "code": return { id, type, grid, content: {
      code: 'let session = LanguageModelSession()\nlet response = try await\n  session.respond(to: "Tell a joke")',
      language: "swift" } };
```

(d) `src/editor/Palette.tsx`:

```ts
  { type: "code", label: "Code", glyph: "</>" },
```

(e) `src/editor/Inspector.tsx` — import `TextAreaInput` from `./inspector-fields`, then add
after the `statGroup` section:

```tsx
      {card.type === "code" && (
        <>
          <TextAreaInput label="Code" value={card.content.code}
            onChange={(code) => updateCard(card.id, (c) => {
              if (c.type === "code") c.content.code = code;
            })} />
          <SelectInput label="Language" value={card.content.language}
            options={["swift", "typescript", "javascript", "python", "json", "bash"] as const}
            onChange={(language) => updateCard(card.id, (c) => {
              if (c.type === "code") c.content.language = language;
            })} />
          {rt("Title (optional)", card.content.title ?? { text: "" },
            (c, v) => { if (c.type === "code") c.content.title = v.text ? v : undefined; })}
        </>
      )}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx tsc -b && npm test`
Expected: PASS — `CardType` switches exhaustive again.

- [ ] **Step 5: Run remaining suites and commit**

```bash
npm run build && npm run test:worker && npm run typecheck:worker && npm run e2e
git add -A src package.json package-lock.json
git commit -m "feat: code card with synchronous Prism highlighting"
```

## Task 12: image overlay `bottom` placement + commit

**Files:**
- Modify: `src/schema/slide.ts`, `src/render/cards/ImageCard.tsx`, `src/editor/Inspector.tsx`
- Test: `src/render/CardView.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
  it("image overlay placement=bottom renders a bottom-centered label", () => {
    const { container } = renderCard({ ...base, type: "image", content: {
      src: "/i/x.png", fit: "cover",
      overlay: { text: { text: "Game Overlay" }, placement: "bottom" } } });
    expect(screen.getByText("Game Overlay")).toBeInTheDocument();
    const label = container.querySelector("[data-overlay-bottom]") as HTMLElement;
    expect(label.style.bottom).toBe("20px");
    expect(label.style.textAlign).toBe("center");
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/render/CardView.test.tsx`
Expected: FAIL — zod is not involved here (component test), but the overlay falls through to the
`corner` branch: no `[data-overlay-bottom]` element.

- [ ] **Step 3: Implement**

(a) `src/schema/slide.ts` — in the `image` member's overlay:

```ts
      placement: z.enum(["corner", "center-pill", "bottom"]),
```

(b) `src/render/cards/ImageCard.tsx` — replace the overlay conditional with a three-way branch:

```tsx
      {overlay && (overlay.placement === "center-pill" ? (
        <div style={{ position: "absolute", inset: 0, display: "flex",
          alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "rgba(0,0,0,0.45)", border: "1.5px solid rgba(255,255,255,0.8)",
            borderRadius: 999, padding: "10px 28px", color: "#fff" }}>
            <RichText value={overlay.text} editPath="content.overlay.text"
              baseStyle={{ fontSize: 30, fontWeight: 600 }} />
          </div>
        </div>
      ) : overlay.placement === "bottom" ? (
        <div data-overlay-bottom style={{ position: "absolute", left: 0, right: 0, bottom: 20,
          textAlign: "center", color: "#fff" }}>
          <RichText value={overlay.text} editPath="content.overlay.text"
            baseStyle={{ fontSize: 30, fontWeight: 600, textShadow: "0 1px 8px rgba(0,0,0,0.5)" }} />
        </div>
      ) : (
        <div style={{ position: "absolute", left: 24, bottom: 20, color: "#fff" }}>
          <RichText value={overlay.text} editPath="content.overlay.text"
            baseStyle={{ fontSize: 30, fontWeight: 600, textShadow: "0 1px 8px rgba(0,0,0,0.5)" }} />
        </div>
      ))}
```

(c) `src/editor/Inspector.tsx` — in the image overlay `SelectInput`, extend the options:

```tsx
                options={["corner", "center-pill", "bottom"] as const}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx tsc -b && npm test`
Expected: PASS.

- [ ] **Step 5: Run remaining suites and commit**

```bash
npm run build && npm run test:worker && npm run typecheck:worker && npm run e2e
git add -A src
git commit -m "feat: bottom placement for image overlay labels"
```

## Task 13: Final verification

- [ ] **Step 1: Full clean run of all suites in CI order**

```bash
npm test && npm run build && npm run test:worker && npm run typecheck:worker && npm run e2e
```
Expected: all PASS.

- [ ] **Step 2: Visual smoke check**

Run `npm run dev`, open http://localhost:5173, and verify on the canvas:
- Add one of each new card from the palette (Icon row, Stat group, Code).
- Code card shows colored Swift tokens in dark mode; toggle theme to light — palette changes.
- Add an Image card, enable overlay, set placement to `bottom`.
- Icon card with a caption set shows the muted second line.
- Quick PNG export still produces a non-black image containing the new cards.

- [ ] **Step 3: Check off plan + report**

Mark remaining checkboxes, report any deviations from the plan.
