# Apple-bento card type expansion — design

Date: 2026-06-04
Status: approved

## Motivation

We compared 21 real Apple summary slides (downloaded to `examples/`: 7 Mac, 6 iPhone,
4 Developers, 4 AirPods) against our six card types. Five recurring patterns are not
expressible today. This spec adds them, in the user-approved priority order:

1. `iconRow` card — multiple icons in one card (ports, app strips, lens badges). Seen on ~14/21 slides.
2. `icon` card optional caption — second muted text line ("Spatial audio / *with dynamic head tracking*").
3. `statGroup` card — several stat rows in one card; also the side-by-side `6.9" | 6.3"` pattern. ~8/21 slides.
4. `code` card — syntax-highlighted snippet (Developers slides: Foundation Models, `#Playground`).
5. `image` overlay `bottom` placement — bottom-center photo label ("Game Overlay", "New design").

## Constraints

- **All schema changes are additive** (new union members + optional fields). `version: z.literal(1)`
  stays; existing localStorage and D1 docs keep parsing.
- **Single render path** (CLAUDE.md): every new card renders through `SlideRenderer`/`CardView`
  only. No editor forks; inline editing stays context-injected via `RichText`.
- **Export readiness**: the headless export waits for `data-render-ready` (fonts + images).
  Nothing here may introduce async rendering. This is why syntax highlighting uses **Prism**
  (synchronous `Prism.tokenize`) rather than Shiki (async `codeToHtml`, would race the gate
  and Quick PNG capture).

## Schema changes (`src/schema/slide.ts`)

Extract the existing icon source union (currently inline in the `icon` card) into a shared
`iconSourceSchema`:

```ts
export const iconSourceSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("emoji"), value: z.string() }),
  z.object({ kind: z.literal("image"), src: z.string() }),
]);
```

### 1. `iconRow` (new union member)

```ts
z.object({ ...cardBase, type: z.literal("iconRow"), content: z.object({
  items: z.array(z.object({
    icon: iconSourceSchema,
    label: richTextSchema.optional(),
  })).min(1),
  caption: richTextSchema.optional(),   // group caption under the row
}) })
```

Rendering: centered horizontal row, icons ~48px (emoji fontSize 48 / image 48×48 contain),
optional mini-label (fontSize 20, muted) under each icon, optional group caption
(fontSize 24, muted) below the row. Text badges like "0.5x" use the `emoji` kind — it is
just a string.

### 2. `icon` caption (extend existing member)

`content.caption?: richTextSchema` — rendered after the label, fontSize 22, muted color.
For `layout: "left" | "right"`, label+caption stack in a column next to the icon.

### 3. `statGroup` (new union member)

```ts
z.object({ ...cardBase, type: z.literal("statGroup"), content: z.object({
  stats: z.array(z.object({
    prefix: richTextSchema.optional(),
    value: richTextSchema,
    caption: richTextSchema.optional(),
  })).min(1),
  layout: z.enum(["column", "row"]),
}) })
```

Rendering: each stat mirrors `StatCard`'s hierarchy at reduced scale (prefix 22 muted /
value 48 weight 700 / caption 22 muted), centered.
- `column`: stats stacked vertically, evenly spaced.
- `row`: stats side by side, separated by a 1px muted vertical divider (the `6.9" | 6.3"` card).

### 4. `code` (new union member)

```ts
z.object({ ...cardBase, type: z.literal("code"), content: z.object({
  code: z.string(),
  language: z.enum(["swift", "typescript", "javascript", "python", "json", "bash"]),
  title: richTextSchema.optional(),
}) })
```

- New helper `src/render/codeHighlight.tsx`: `Prism.tokenize(code, grammar)` → React `<span>`s
  with **inline colors** from a small token-type→color map, theme-aware (dark/light variants).
  No Prism CSS file — inline styles keep Quick PNG (html-to-image) and headless export
  pixel-identical and respect the single render path.
- Monospace stack defined alongside `SLIDE_FONT_FAMILY` in `styleResolve.ts`
  (e.g. `"SF Mono", ui-monospace, Menlo, monospace`) — slide content fonts live there only.
- Empty `code` renders an "Add code" placeholder (parity with ImageCard's "Add an image").
- Code is edited via an Inspector `<textarea>`, not inline editing (plain string, not richText).
- Dependency: `prismjs` (runtime) + `@types/prismjs` (dev). Grammars imported explicitly
  per supported language.

### 5. `image` overlay `bottom` (extend enum)

`overlay.placement: "corner" | "center-pill" | "bottom"` — absolutely positioned
bottom-center, white text with the same text-shadow as `corner`.

## Editor integration (per new type — CLAUDE.md checklist)

- Component in `src/render/cards/` → `CardView` dispatch arm.
- `newCard.ts` defaults:
  - `iconRow`: two emoji items with labels, no caption.
  - `statGroup`: two stats (`value`/`caption`), `layout: "column"`.
  - `code`: short Swift snippet, `language: "swift"`.
- `defaultSpan()`: `iconRow` 4×1, `statGroup` 3×2, `code` 5×2.
- Palette tile each.
- Inspector sections: item add/remove/edit mirroring the existing list-items UI;
  Inspector prevents removing the last item (schema `min(1)`).
- `CardView.test` case per type; zod schema tests for new members; codeHighlight unit test
  (deterministic token output for a fixed snippet).

## Error handling

- `iconRow`/`statGroup`: `min(1)` items enforced by zod; Inspector hides the remove
  button on the last item.
- `code`: empty string → placeholder; unknown language impossible (closed enum).
- Stale inline-edit paths remain no-ops via the existing defensive `commitText()`.

## Testing

TDD per feature: schema test → render test → editor default/inspector test → implement.
All three suites (`npm test`, `npm run test:worker`, `npm run e2e`) green before each commit.

## Implementation order

One commit per feature: `iconRow` → `icon` caption → `statGroup` → `code` → overlay `bottom`.

## Out of scope

- Per-icon size controls on `iconRow` (richText `size` on labels suffices for now).
- Additional code languages / line highlighting / line numbers.
- Template authoring using the new types (follow-up).
