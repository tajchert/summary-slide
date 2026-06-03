# Summary Slide — Design

**Date:** 2026-06-03
**Product:** summary-slide.mtajchert.com — a web app for building Apple-keynote-style single-slide feature summaries (bento grids) of product/software releases, exporting them as high-resolution PNGs.
**Reference material:** `examples/` — screenshots of Apple, Google, Qualcomm, Realme keynote summary slides defining the target aesthetic.

## Goals

- Anyone (no account) can build a designed-looking bento-grid slide and export a crisp 2–4x PNG.
- Output quality is the product: exports must match the editor preview pixel-for-pixel.
- Everything runs on Cloudflare (Workers, D1, R2, Browser Rendering).

## Decisions (settled during brainstorming)

| Topic | Decision |
|---|---|
| Accounts | None in v1. Anonymous use; localStorage persistence; share links via D1. Schema keeps an easy path to add `owner_id` later. |
| Creation flow | Template gallery (4–6 layouts modeled on the examples) **plus** "start blank". Templates are slide-JSON documents shipped with the frontend. |
| Card types (all in v1) | stat, headline, image, icon+label, hero, list. |
| Card sizing | Free grid spans on a 12 col × 6 row grid (1×1, 2×1, 3×1, 1×2, 1×3, 3×3, …). |
| Canvas | Fixed 16:9 (1920×1080 logical) in v1; `canvas` field in the schema from day one so other formats are a follow-up, not a rework. |
| Theming | Theme-driven with per-card overrides: light/dark mode + accent set defaults; cards may override background (solid/gradient) and text color. Canvas background: solid, gradient, or image. |
| Text styling | Extensive controls on every text field: size, weight, letter-spacing, alignment, color, gradient text. |
| Export | Both paths. Client-side "Quick export" (`html-to-image`, pixelRatio 2–3) ships first; server-side "HQ export" (Cloudflare Browser Rendering, deviceScaleFactor 2–4 → R2) is the quality tier. |
| Saving/sharing | localStorage autosave + "Copy link": POST slide JSON to D1, get `/s/:id`. Opening a share link loads a **copy** into the recipient's editor. |
| Images | Uploaded to R2 via Worker (10MB cap, png/jpeg/webp), referenced by URL in slide JSON. Object-fit/position controls per image card. |
| Background removal | Out of scope for v1 (Workers AI candidate later). |
| Editor layer | `react-grid-layout` in fixed-canvas mode (`compactType: null`, `preventCollision: true`, `maxRows: 6`). Slide JSON stores pure grid coords so the editor library is swappable (fallback plan: custom CSS-grid + dnd-kit) without schema/renderer changes. |
| Editor UI | Two sidebars (Figma-style): card palette left, inspector for selected card right, top bar with title / light-dark toggle / Quick export / HQ export / Share. |

## Architecture

```
┌─────────────────────────── Cloudflare Worker ───────────────────────────┐
│  Static assets (Vite-built React SPA)        API routes (Hono)          │
│  summary-slide.mtajchert.com                 /api/slides    → D1        │
│                                              /api/upload    → R2        │
│                                              /api/export    → Browser   │
│                                              /s/:id (share)   Rendering │
│                                              /i/:key (images from R2)   │
└──────────────────────────────────────────────────────────────────────────┘
```

One Worker serves both the SPA (static assets binding) and the API — no CORS, one deploy, one `wrangler.jsonc`.

**Frontend stack:** Vite + React SPA, Tailwind, CSS variables for theme tokens, `react-grid-layout` for the editor canvas, `html-to-image` for quick export, zod for schema validation (shared package with the Worker).

**SPA routes:**
- `/` — start screen: template gallery, "start blank", recent slides (from localStorage).
- `/edit` — the editor.
- `/s/:id` — shared slide: read-only preview with "Open in editor" (clones the doc into localStorage).
- `/render/:id` — chrome-less route rendering only `<SlideRenderer>` at 1920×1080; used by the export worker.

### The single-renderer principle

One `<SlideRenderer doc={...} />` React component turns a `SlideDocument` into the slide. It is used by:
1. the editor canvas (wrapped in react-grid-layout for interaction),
2. the share preview (`/s/:id`),
3. the export route (`/render/:id`) screenshotted by Browser Rendering,
4. template gallery thumbnails (scaled down).

This single render path is what guarantees export ≡ preview.

## Slide JSON schema

```ts
SlideDocument {
  version: 1,
  canvas: { format: "16:9", width: 1920, height: 1080 },
  theme: {
    mode: "light" | "dark",
    accent: string,                                  // hex
    background: { type: "solid" | "gradient" | "image", ... },
    cardStyle: { radius: number, gap: number }
  },
  cards: Card[]
}

Card {
  id: string,
  type: "stat" | "headline" | "image" | "icon" | "hero" | "list",
  grid: { x: number, y: number, w: number, h: number },   // grid units, 12 cols × 6 rows
  style?: {                                                // overrides; theme supplies defaults
    background?: Solid | Gradient,
    textColor?: string
  },
  content: <per-type, below>
}

RichText {                                                 // every text field
  text: string,
  size?: number, weight?: number, letterSpacing?: number,
  align?: "left" | "center" | "right",
  color?: string,
  gradient?: { from: string, to: string, angle: number }   // gradient text
}
```

**Per-type content:**

| Type | Content |
|---|---|
| `stat` | `value: RichText`, `caption: RichText`, `prefix?: RichText` (e.g. "Up to") |
| `headline` | `text: RichText` |
| `image` | `src: string` (R2 URL), `fit: "cover" \| "contain"`, `position: string` (CSS `object-position`, default `"center"`), `overlay?: { text: RichText, placement: "corner" \| "center-pill" }` |
| `icon` | `icon: { kind: "emoji", value: string } \| { kind: "image", src: string }`, `label: RichText`, `layout: "top" \| "left" \| "right"` |
| `hero` | `title: RichText`, `image?: string`, `imagePlacement?: "behind" \| "above" \| "below"` |
| `list` | `title: RichText`, `items: RichText[]`, `marker: "bullet" \| "none"` |

Style resolution cascade: theme defaults → card `style` override → field-level `RichText` override.

## Editor UX

- **Layout:** left sidebar = card palette (6 tiles) + template switcher; center = 16:9 canvas; right sidebar = inspector for the selected card (content fields, text styling, background, image upload); top bar = slide title, light/dark toggle, Quick export, HQ export, Share.
- **Interactions:** drag palette tile → card drops into first free cell; drag cards to rearrange (collision prevented); resize via handles snapping to grid units; double-click text to edit inline; full styling in inspector; `⌘Z`/`⌘⇧Z` undo/redo via slide-JSON snapshots; delete key removes selected card.
- **Autosave:** every change persists the doc to localStorage (debounced). The editor never blocks on network; server writes happen only on Share / HQ export.

## Backend

**Worker** (Hono) with bindings: `ASSETS` (SPA), `DB` (D1), `BUCKET` (R2), `BROWSER` (Browser Rendering).

| Route | Method | Behavior |
|---|---|---|
| `/api/slides` | POST | Validate doc (zod, ~200KB cap) → insert → `{id}` (nanoid, 8 chars). |
| `/api/slides/:id` | GET | Return slide JSON. |
| `/api/upload` | POST | 10MB cap, content-type allowlist (png/jpeg/webp) → R2 `images/<hash>.<ext>` → `{url: "/i/<key>"}`. |
| `/i/:key` | GET | Stream R2 object, immutable cache headers. |
| `/api/export` | POST | `{id, scale}` → Browser Rendering opens `/render/:id` at 1920×1080, `deviceScaleFactor: scale`, waits for `networkidle0` + `document.fonts.ready` → screenshot → R2 `exports/` → `{url}`. |

**D1 schema:** `slides(id TEXT PRIMARY KEY, doc TEXT NOT NULL, created_at INTEGER NOT NULL)`. Adding accounts later = add nullable `owner_id`.

**Abuse guardrails:** per-IP rate limits (Workers rate-limiting binding) on all POST routes. Nothing more for v1.

## Error handling

- Upload too large / wrong type → inline inspector error; card keeps placeholder.
- HQ export failure (Browser Rendering limit/timeout) → toast suggesting Quick export; client path always works as fallback.
- Share link not found → friendly "slide not found" page → start screen.
- Corrupt/old localStorage doc → zod parse failure → "start fresh" offer instead of a crash; `version` field enables future migrations.

## Testing

- **Unit (Vitest):** zod schema; grid helpers (collision, first-free-cell); style-resolution cascade.
- **Component (Vitest + Testing Library):** `SlideRenderer` renders every card type from fixture docs; a "kitchen-sink" fixture doubles as a manual-QA template.
- **Worker (vitest-pool-workers/miniflare):** all API routes against in-memory D1/R2.
- **E2E (Playwright, thin):** create from template → edit text → quick export yields a PNG.

## Deployment

- `wrangler deploy` via GitHub Actions on push to `main`.
- Custom domain `summary-slide.mtajchert.com` as a Workers route.
- D1 migrations via `wrangler d1 migrations`.

## Build order

1. **Core loop, zero backend:** schema package + `SlideRenderer` + editor (RGL, inspector, undo, localStorage autosave) + quick export. Fully usable app.
2. **Designed out of the box:** 4–6 templates recreating the example aesthetics; theming polish (light/dark, gradients).
3. **Backend:** Worker with share links (`/api/slides`, `/s/:id`) and image uploads (R2).
4. **Quality tier:** HQ export via Browser Rendering → R2.

## Out of scope (v1)

- Accounts/auth, public gallery.
- Canvas formats other than 16:9 (schema-ready).
- Background removal (Workers AI candidate).
- Freeform/rotated positioning (grid constraint is the aesthetic).
- Export queueing via Cloudflare Queues (revisit if HQ-export bursts become real).
