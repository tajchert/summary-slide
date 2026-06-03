# Summary Slide Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build summary-slide.mtajchert.com — an anonymous, Cloudflare-hosted editor for Apple-keynote-style bento-grid slides with pixel-perfect PNG export.

**Architecture:** Vite + React SPA and a Hono Worker deployed as a single Cloudflare Worker (static assets binding). Slides are JSON documents (zod schema shared by frontend and Worker). One static `<SlideRenderer>` renders a doc everywhere — share preview, export route, template thumbnails, and the hidden node snapshotted by client-side export — while the editor wraps the same per-card `CardView` components in react-grid-layout. Backend: D1 (share links), R2 (uploads + exports), Browser Rendering (HQ export).

**Tech Stack:** React 18.3, Vite 6, TypeScript, Tailwind CSS v4, react-grid-layout 1.5, zustand 5, zod 4, html-to-image, react-router 7 (library mode), Hono 4, wrangler 4, @cloudflare/puppeteer, Vitest 3 + Testing Library + @cloudflare/vitest-pool-workers, Playwright.

**Spec:** `docs/superpowers/specs/2026-06-03-summary-slide-design.md`

---

## File structure

Single npm package. The Worker imports the schema from `src/schema/` (types + validation shared).

```
summary-slide/
├── package.json, tsconfig.json, vite.config.ts, vitest.config.ts
├── wrangler.jsonc
├── index.html
├── migrations/0001_create_slides.sql
├── src/
│   ├── main.tsx                      # React entry, router
│   ├── index.css                     # Tailwind v4 import + fonts + editor chrome vars
│   ├── schema/
│   │   ├── slide.ts                  # zod schemas + TS types + GRID_COLS/ROWS + blankDocument()
│   │   └── slide.test.ts
│   ├── render/
│   │   ├── styleResolve.ts           # theme→card→field style cascade helpers
│   │   ├── styleResolve.test.ts
│   │   ├── RichText.tsx              # styled text span (incl. gradient text)
│   │   ├── CardView.tsx              # dispatch card.type → card component
│   │   ├── cards/                    # StatCard, HeadlineCard, ImageCard, IconCard, HeroCard, ListCard
│   │   ├── SlideRenderer.tsx         # static CSS-grid renderer (share/export/thumbs)
│   │   └── SlideRenderer.test.tsx
│   ├── editor/
│   │   ├── EditorPage.tsx            # 3-pane layout
│   │   ├── EditorCanvas.tsx          # react-grid-layout wrapper
│   │   ├── Palette.tsx               # left sidebar: add-card tiles
│   │   ├── Inspector.tsx             # right sidebar: selected-card controls
│   │   ├── inspector-fields.tsx      # RichTextControls, BackgroundControls, shared inputs
│   │   ├── TopBar.tsx                # title, theme toggle, export/share buttons
│   │   ├── EditableText.tsx          # dbl-click inline text editing
│   │   ├── store.ts                  # zustand store: doc, selection, undo/redo, autosave
│   │   ├── store.test.ts
│   │   ├── gridUtils.ts              # collision, firstFreeCell, defaultSpan
│   │   ├── gridUtils.test.ts
│   │   ├── newCard.ts                # default content per card type
│   │   └── quickExport.ts            # html-to-image PNG download
│   ├── pages/
│   │   ├── StartPage.tsx             # template gallery + start blank + recents
│   │   ├── SharePage.tsx             # /s/:id read-only + "Open in editor"
│   │   ├── RenderPage.tsx            # /render/:id chrome-less (export target)
│   │   └── NotFoundPage.tsx
│   ├── templates/index.ts            # 4 built-in template docs
│   └── lib/
│       ├── storage.ts                # localStorage docs + recents
│       └── api.ts                    # fetch wrappers for /api/*
├── worker/
│   ├── index.ts                      # Hono app, bindings type
│   ├── slides.ts                     # POST/GET /api/slides
│   ├── upload.ts                     # POST /api/upload + GET /i/:key
│   ├── exportRoute.ts                # POST /api/export (Browser Rendering)
│   ├── vitest.config.ts              # workers pool config
│   ├── test-env.d.ts
│   └── worker.test.ts
├── e2e/slide.spec.ts + playwright.config.ts
└── .github/workflows/deploy.yml
```

**Conventions for all tasks:**
- Run all commands from the repo root.
- Frontend tests: `npx vitest run <path>` (jsdom). Worker tests: `npx vitest run -c worker/vitest.config.ts`.
- Commit after every green test step; messages use `feat:`/`test:`/`chore:` prefixes.
- React 18.3 (not 19) — react-grid-layout 1.5 declares React ≤18 peer support; do not upgrade React without checking RGL.

---

### Task 1: Project scaffold

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `vitest.config.ts`, `index.html`, `src/main.tsx`, `src/index.css`, `src/test-setup.ts`

- [ ] **Step 1: Scaffold Vite app and install dependencies**

```bash
npm create vite@latest . -- --template react-ts
npm install react@18.3.1 react-dom@18.3.1 react-router@^7 zustand@^5 zod@^4 \
  react-grid-layout@^1.5 html-to-image@^1.11 nanoid@^5 hono@^4 @fontsource-variable/inter
npm install -D @types/react@^18 @types/react-dom@^18 @types/react-grid-layout \
  tailwindcss@^4 @tailwindcss/vite vitest@^3 jsdom @testing-library/react \
  @testing-library/jest-dom @testing-library/user-event wrangler@^4
```

If `npm create vite` refuses because the directory is non-empty (it contains `docs/`, `examples/`, `.git`), scaffold into `/tmp/ss-scaffold` and copy `src/`, `index.html`, `tsconfig*.json`, `vite.config.ts`, `package.json`, `.gitignore` entries over, then run the installs.

- [ ] **Step 2: Configure Vite + Tailwind v4**

`vite.config.ts`:

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
});
```

`src/index.css` (replace scaffold CSS entirely; delete `src/App.css`):

```css
@import "tailwindcss";
@import "@fontsource-variable/inter";

:root {
  font-family: "Inter Variable", system-ui, -apple-system, sans-serif;
}

/* react-grid-layout structural CSS (imported in EditorCanvas later) */
```

`index.html`: set `<title>Summary Slide</title>` and `<html lang="en" class="bg-neutral-950">`.

- [ ] **Step 3: Minimal entry to verify the toolchain**

Replace `src/App.tsx` content and `src/main.tsx`:

```tsx
// src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <div className="p-8 text-white">summary-slide scaffold OK</div>
  </React.StrictMode>
);
```

Delete `src/App.tsx`, `src/assets/` (router lands in Task 8).

- [ ] **Step 4: Configure Vitest (frontend)**

`vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test-setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
```

`src/test-setup.ts`:

```ts
import "@testing-library/jest-dom/vitest";
```

Add scripts to `package.json`:

```json
"scripts": {
  "dev": "vite",
  "build": "tsc -b && vite build",
  "test": "vitest run",
  "test:worker": "vitest run -c worker/vitest.config.ts",
  "e2e": "playwright test"
}
```

- [ ] **Step 5: Verify dev server and build**

Run: `npm run build`
Expected: `vite build` completes, `dist/` created.

Run: `npm run dev &` then `curl -s http://localhost:5173 | grep -o "summary-slide"` and kill the dev server.
Expected: prints `summary-slide`.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "chore: scaffold Vite + React + Tailwind v4 + Vitest"
```

---

### Task 2: Slide JSON schema

**Files:**
- Create: `src/schema/slide.ts`
- Test: `src/schema/slide.test.ts`

- [ ] **Step 1: Write failing tests**

`src/schema/slide.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { slideDocumentSchema, blankDocument, GRID_COLS, GRID_ROWS } from "./slide";

describe("slideDocumentSchema", () => {
  it("accepts a blank document", () => {
    expect(slideDocumentSchema.safeParse(blankDocument()).success).toBe(true);
  });

  it("accepts every card type", () => {
    const doc = blankDocument();
    doc.cards = [
      { id: "a", type: "stat", grid: { x: 0, y: 0, w: 2, h: 1 },
        content: { value: { text: "48MP" }, caption: { text: "Fusion camera" } } },
      { id: "b", type: "headline", grid: { x: 2, y: 0, w: 4, h: 1 },
        content: { text: { text: "Spotlight actions" } } },
      { id: "c", type: "image", grid: { x: 6, y: 0, w: 3, h: 2 },
        content: { src: "/i/x.png", fit: "cover" } },
      { id: "d", type: "icon", grid: { x: 9, y: 0, w: 1, h: 1 },
        content: { icon: { kind: "emoji", value: "📞" }, label: { text: "Phone" }, layout: "top" } },
      { id: "e", type: "hero", grid: { x: 0, y: 2, w: 6, h: 3 },
        content: { title: { text: "macOS" } } },
      { id: "f", type: "list", grid: { x: 6, y: 2, w: 3, h: 2 },
        content: { title: { text: "More" }, items: [{ text: "Wi-Fi 7" }], marker: "bullet" } },
    ];
    const res = slideDocumentSchema.safeParse(doc);
    expect(res.success).toBe(true);
  });

  it("rejects out-of-bounds grid placement", () => {
    const doc = blankDocument();
    doc.cards = [{ id: "a", type: "headline", grid: { x: 12, y: 0, w: 1, h: 1 },
      content: { text: { text: "x" } } } as never];
    expect(slideDocumentSchema.safeParse(doc).success).toBe(false);
  });

  it("rejects unknown card types", () => {
    const doc = blankDocument();
    doc.cards = [{ id: "a", type: "video", grid: { x: 0, y: 0, w: 1, h: 1 }, content: {} } as never];
    expect(slideDocumentSchema.safeParse(doc).success).toBe(false);
  });

  it("blankDocument has 16:9 canvas and constants match", () => {
    const doc = blankDocument();
    expect(doc.canvas).toEqual({ format: "16:9", width: 1920, height: 1080 });
    expect(GRID_COLS).toBe(12);
    expect(GRID_ROWS).toBe(6);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/schema/slide.test.ts`
Expected: FAIL — `Cannot find module './slide'`.

- [ ] **Step 3: Implement the schema**

`src/schema/slide.ts`:

```ts
import { z } from "zod";

export const GRID_COLS = 12;
export const GRID_ROWS = 6;

export const richTextSchema = z.object({
  text: z.string(),
  size: z.number().positive().optional(),       // px at 1920x1080 canvas scale
  weight: z.number().min(100).max(900).optional(),
  letterSpacing: z.number().optional(),          // px
  align: z.enum(["left", "center", "right"]).optional(),
  color: z.string().optional(),                  // hex / css color
  gradient: z.object({ from: z.string(), to: z.string(), angle: z.number() }).optional(),
});
export type RichText = z.infer<typeof richTextSchema>;

export const backgroundSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("solid"), color: z.string() }),
  z.object({ type: z.literal("gradient"), from: z.string(), to: z.string(), angle: z.number() }),
  z.object({ type: z.literal("image"), src: z.string() }),
]);
export type Background = z.infer<typeof backgroundSchema>;

export const gridSchema = z.object({
  x: z.number().int().min(0).max(GRID_COLS - 1),
  y: z.number().int().min(0).max(GRID_ROWS - 1),
  w: z.number().int().min(1).max(GRID_COLS),
  h: z.number().int().min(1).max(GRID_ROWS),
});
export type GridRect = z.infer<typeof gridSchema>;

const cardBase = {
  id: z.string().min(1),
  grid: gridSchema,
  style: z.object({
    background: backgroundSchema.optional(),
    textColor: z.string().optional(),
  }).optional(),
};

export const cardSchema = z.discriminatedUnion("type", [
  z.object({ ...cardBase, type: z.literal("stat"), content: z.object({
    value: richTextSchema,
    caption: richTextSchema,
    prefix: richTextSchema.optional(),
  }) }),
  z.object({ ...cardBase, type: z.literal("headline"), content: z.object({
    text: richTextSchema,
  }) }),
  z.object({ ...cardBase, type: z.literal("image"), content: z.object({
    src: z.string(),
    fit: z.enum(["cover", "contain"]),
    position: z.string().optional(),             // CSS object-position, default "center"
    overlay: z.object({
      text: richTextSchema,
      placement: z.enum(["corner", "center-pill"]),
    }).optional(),
  }) }),
  z.object({ ...cardBase, type: z.literal("icon"), content: z.object({
    icon: z.discriminatedUnion("kind", [
      z.object({ kind: z.literal("emoji"), value: z.string() }),
      z.object({ kind: z.literal("image"), src: z.string() }),
    ]),
    label: richTextSchema,
    layout: z.enum(["top", "left", "right"]),
  }) }),
  z.object({ ...cardBase, type: z.literal("hero"), content: z.object({
    title: richTextSchema,
    image: z.string().optional(),
    imagePlacement: z.enum(["behind", "above", "below"]).optional(),
  }) }),
  z.object({ ...cardBase, type: z.literal("list"), content: z.object({
    title: richTextSchema,
    items: z.array(richTextSchema),
    marker: z.enum(["bullet", "none"]),
  }) }),
]);
export type Card = z.infer<typeof cardSchema>;
export type CardType = Card["type"];

export const slideDocumentSchema = z.object({
  version: z.literal(1),
  title: z.string(),
  canvas: z.object({
    format: z.literal("16:9"),
    width: z.number(),
    height: z.number(),
  }),
  theme: z.object({
    mode: z.enum(["light", "dark"]),
    accent: z.string(),
    background: backgroundSchema,
    cardStyle: z.object({ radius: z.number(), gap: z.number() }),
  }),
  cards: z.array(cardSchema),
});
export type SlideDocument = z.infer<typeof slideDocumentSchema>;

export function blankDocument(): SlideDocument {
  return {
    version: 1,
    title: "Untitled slide",
    canvas: { format: "16:9", width: 1920, height: 1080 },
    theme: {
      mode: "dark",
      accent: "#0a84ff",
      background: { type: "solid", color: "#000000" },
      cardStyle: { radius: 24, gap: 16 },
    },
    cards: [],
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/schema/slide.test.ts`
Expected: 5 passed.

- [ ] **Step 5: Commit**

```bash
git add src/schema && git commit -m "feat: slide JSON schema (zod) with all six card types"
```

---

### Task 3: Style resolution cascade

**Files:**
- Create: `src/render/styleResolve.ts`
- Test: `src/render/styleResolve.test.ts`

- [ ] **Step 1: Write failing tests**

`src/render/styleResolve.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { themeTokens, backgroundToCss, resolveCardStyle, richTextToCss } from "./styleResolve";
import { blankDocument } from "../schema/slide";
import type { Card } from "../schema/slide";

const card = (style?: Card["style"]): Card => ({
  id: "a", type: "headline", grid: { x: 0, y: 0, w: 2, h: 1 },
  style, content: { text: { text: "hi" } },
});

describe("themeTokens", () => {
  it("dark mode yields dark card backgrounds and light text", () => {
    const t = themeTokens("dark");
    expect(t.cardBg).toBe("#1c1c1e");
    expect(t.text).toBe("#ffffff");
  });
  it("light mode yields light card backgrounds and dark text", () => {
    const t = themeTokens("light");
    expect(t.cardBg).toBe("#f2f2f7");
    expect(t.text).toBe("#111111");
  });
});

describe("backgroundToCss", () => {
  it("solid", () => {
    expect(backgroundToCss({ type: "solid", color: "#123456" })).toEqual({ background: "#123456" });
  });
  it("gradient", () => {
    expect(backgroundToCss({ type: "gradient", from: "#000", to: "#fff", angle: 135 }))
      .toEqual({ background: "linear-gradient(135deg, #000, #fff)" });
  });
  it("image", () => {
    expect(backgroundToCss({ type: "image", src: "/i/x.png" })).toEqual({
      backgroundImage: "url(/i/x.png)", backgroundSize: "cover", backgroundPosition: "center",
    });
  });
});

describe("resolveCardStyle (theme → card override)", () => {
  const theme = blankDocument().theme; // dark
  it("uses theme defaults when card has no style", () => {
    const s = resolveCardStyle(theme, card());
    expect(s.background).toBe("#1c1c1e");
    expect(s.color).toBe("#ffffff");
    expect(s.borderRadius).toBe(24);
  });
  it("card overrides win", () => {
    const s = resolveCardStyle(theme, card({
      background: { type: "gradient", from: "#1a2980", to: "#26d0ce", angle: 135 },
      textColor: "#ffeeaa",
    }));
    expect(s.background).toBe("linear-gradient(135deg, #1a2980, #26d0ce)");
    expect(s.color).toBe("#ffeeaa");
  });
});

describe("richTextToCss (field-level overrides)", () => {
  it("returns only defined properties", () => {
    expect(richTextToCss({ text: "x" })).toEqual({});
  });
  it("maps size/weight/spacing/align/color", () => {
    expect(richTextToCss({ text: "x", size: 96, weight: 700, letterSpacing: -2, align: "center", color: "#f55" }))
      .toEqual({ fontSize: 96, fontWeight: 700, letterSpacing: -2, textAlign: "center", color: "#f55" });
  });
  it("gradient text uses background-clip and overrides color", () => {
    const css = richTextToCss({ text: "x", color: "#fff", gradient: { from: "#f55", to: "#5af", angle: 90 } });
    expect(css.backgroundImage).toBe("linear-gradient(90deg, #f55, #5af)");
    expect(css.WebkitBackgroundClip).toBe("text");
    expect(css.color).toBe("transparent");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/render/styleResolve.test.ts`
Expected: FAIL — `Cannot find module './styleResolve'`.

- [ ] **Step 3: Implement**

`src/render/styleResolve.ts`:

```ts
import type { CSSProperties } from "react";
import type { Background, Card, RichText, SlideDocument } from "../schema/slide";

export interface ThemeTokens {
  cardBg: string;
  text: string;
  muted: string;
}

export function themeTokens(mode: "light" | "dark"): ThemeTokens {
  return mode === "dark"
    ? { cardBg: "#1c1c1e", text: "#ffffff", muted: "rgba(255,255,255,0.65)" }
    : { cardBg: "#f2f2f7", text: "#111111", muted: "rgba(0,0,0,0.55)" };
}

export function backgroundToCss(bg: Background): CSSProperties {
  switch (bg.type) {
    case "solid":
      return { background: bg.color };
    case "gradient":
      return { background: `linear-gradient(${bg.angle}deg, ${bg.from}, ${bg.to})` };
    case "image":
      return { backgroundImage: `url(${bg.src})`, backgroundSize: "cover", backgroundPosition: "center" };
  }
}

export function resolveCardStyle(theme: SlideDocument["theme"], card: Card): CSSProperties {
  const tokens = themeTokens(theme.mode);
  const bg = card.style?.background
    ? backgroundToCss(card.style.background)
    : { background: tokens.cardBg };
  return {
    ...bg,
    color: card.style?.textColor ?? tokens.text,
    borderRadius: theme.cardStyle.radius,
    overflow: "hidden",
  };
}

export function richTextToCss(rt: RichText): CSSProperties {
  const css: CSSProperties = {};
  if (rt.size !== undefined) css.fontSize = rt.size;
  if (rt.weight !== undefined) css.fontWeight = rt.weight;
  if (rt.letterSpacing !== undefined) css.letterSpacing = rt.letterSpacing;
  if (rt.align !== undefined) css.textAlign = rt.align;
  if (rt.color !== undefined) css.color = rt.color;
  if (rt.gradient) {
    css.backgroundImage = `linear-gradient(${rt.gradient.angle}deg, ${rt.gradient.from}, ${rt.gradient.to})`;
    css.WebkitBackgroundClip = "text";
    css.backgroundClip = "text";
    css.color = "transparent";
  }
  return css;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/render/styleResolve.test.ts`
Expected: 8 passed.

- [ ] **Step 5: Commit**

```bash
git add src/render && git commit -m "feat: style resolution cascade (theme -> card -> field)"
```

---

### Task 4: Grid placement utilities

**Files:**
- Create: `src/editor/gridUtils.ts`
- Test: `src/editor/gridUtils.test.ts`

- [ ] **Step 1: Write failing tests**

`src/editor/gridUtils.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { rectsOverlap, firstFreeCell, defaultSpan } from "./gridUtils";
import type { GridRect } from "../schema/slide";

const r = (x: number, y: number, w: number, h: number): GridRect => ({ x, y, w, h });

describe("rectsOverlap", () => {
  it("detects overlap", () => {
    expect(rectsOverlap(r(0, 0, 2, 2), r(1, 1, 2, 2))).toBe(true);
  });
  it("touching edges do not overlap", () => {
    expect(rectsOverlap(r(0, 0, 2, 2), r(2, 0, 2, 2))).toBe(false);
    expect(rectsOverlap(r(0, 0, 2, 2), r(0, 2, 2, 2))).toBe(false);
  });
});

describe("firstFreeCell", () => {
  it("returns origin on empty grid", () => {
    expect(firstFreeCell([], 2, 1)).toEqual({ x: 0, y: 0, w: 2, h: 1 });
  });
  it("scans rows left-to-right, top-to-bottom", () => {
    expect(firstFreeCell([r(0, 0, 12, 1)], 2, 1)).toEqual({ x: 0, y: 1, w: 2, h: 1 });
    expect(firstFreeCell([r(0, 0, 3, 1)], 2, 1)).toEqual({ x: 3, y: 0, w: 2, h: 1 });
  });
  it("returns null when nothing fits", () => {
    expect(firstFreeCell([r(0, 0, 12, 6)], 1, 1)).toBeNull();
  });
  it("fits tall cards", () => {
    expect(firstFreeCell([r(0, 0, 12, 5)], 1, 2)).toBeNull(); // only one row left
    expect(firstFreeCell([r(0, 0, 12, 4)], 1, 2)).toEqual({ x: 0, y: 4, w: 1, h: 2 });
  });
});

describe("defaultSpan", () => {
  it("gives a sensible default per card type", () => {
    expect(defaultSpan("stat")).toEqual({ w: 2, h: 2 });
    expect(defaultSpan("hero")).toEqual({ w: 4, h: 4 });
    expect(defaultSpan("icon")).toEqual({ w: 2, h: 2 });
    expect(defaultSpan("headline")).toEqual({ w: 4, h: 2 });
    expect(defaultSpan("image")).toEqual({ w: 4, h: 2 });
    expect(defaultSpan("list")).toEqual({ w: 3, h: 3 });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/editor/gridUtils.test.ts`
Expected: FAIL — `Cannot find module './gridUtils'`.

- [ ] **Step 3: Implement**

`src/editor/gridUtils.ts`:

```ts
import { GRID_COLS, GRID_ROWS } from "../schema/slide";
import type { CardType, GridRect } from "../schema/slide";

export function rectsOverlap(a: GridRect, b: GridRect): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

/** First top-left position where a w×h card fits without colliding; null if full. */
export function firstFreeCell(occupied: GridRect[], w: number, h: number): GridRect | null {
  for (let y = 0; y <= GRID_ROWS - h; y++) {
    for (let x = 0; x <= GRID_COLS - w; x++) {
      const candidate = { x, y, w, h };
      if (!occupied.some((o) => rectsOverlap(candidate, o))) return candidate;
    }
  }
  return null;
}

export function defaultSpan(type: CardType): { w: number; h: number } {
  switch (type) {
    case "stat": return { w: 2, h: 2 };
    case "headline": return { w: 4, h: 2 };
    case "image": return { w: 4, h: 2 };
    case "icon": return { w: 2, h: 2 };
    case "hero": return { w: 4, h: 4 };
    case "list": return { w: 3, h: 3 };
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/editor/gridUtils.test.ts`
Expected: 7 passed.

- [ ] **Step 5: Commit**

```bash
git add src/editor && git commit -m "feat: grid collision and placement utilities"
```

---

### Task 5: Card components (`RichText`, six cards, `CardView`)

**Files:**
- Create: `src/render/RichText.tsx`, `src/render/CardView.tsx`, `src/render/cards/StatCard.tsx`, `src/render/cards/HeadlineCard.tsx`, `src/render/cards/ImageCard.tsx`, `src/render/cards/IconCard.tsx`, `src/render/cards/HeroCard.tsx`, `src/render/cards/ListCard.tsx`
- Test: `src/render/CardView.test.tsx`

All cards receive `{ card, theme }` and render their **content only** — the positioned/styled wrapper is applied by `CardView`. Default font sizes are tuned for the 1920×1080 logical canvas (previews shrink via CSS `transform: scale`).

`EditableText` integration comes in Task 12 — for now `RichText` renders a plain element. Give it an optional `editPath` prop now (ignored until Task 12) so card components don't change later.

- [ ] **Step 1: Write failing tests**

`src/render/CardView.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CardView } from "./CardView";
import { blankDocument } from "../schema/slide";
import type { Card } from "../schema/slide";

const theme = blankDocument().theme;
const base = { id: "c1", grid: { x: 0, y: 0, w: 2, h: 2 } };

const renderCard = (card: Card) => render(<CardView card={card} theme={theme} />);

describe("CardView", () => {
  it("stat renders prefix, value and caption", () => {
    renderCard({ ...base, type: "stat", content: {
      prefix: { text: "Up to" }, value: { text: "48MP" }, caption: { text: "Fusion camera" } } });
    expect(screen.getByText("Up to")).toBeInTheDocument();
    expect(screen.getByText("48MP")).toBeInTheDocument();
    expect(screen.getByText("Fusion camera")).toBeInTheDocument();
  });

  it("headline renders text with gradient style", () => {
    renderCard({ ...base, type: "headline", content: {
      text: { text: "Spotlight actions", gradient: { from: "#f55", to: "#5af", angle: 90 } } } });
    const el = screen.getByText("Spotlight actions");
    expect(el).toHaveStyle({ backgroundImage: "linear-gradient(90deg, #f55, #5af)" });
  });

  it("image renders img with object-fit and overlay text", () => {
    renderCard({ ...base, type: "image", content: {
      src: "/i/x.png", fit: "contain", overlay: { text: { text: "Video Boost" }, placement: "center-pill" } } });
    const img = screen.getByRole("img");
    expect(img).toHaveAttribute("src", "/i/x.png");
    expect(img).toHaveStyle({ objectFit: "contain" });
    expect(screen.getByText("Video Boost")).toBeInTheDocument();
  });

  it("icon renders emoji and label; layout=left renders a row", () => {
    const { container } = renderCard({ ...base, type: "icon", content: {
      icon: { kind: "emoji", value: "📞" }, label: { text: "Phone" }, layout: "left" } });
    expect(screen.getByText("📞")).toBeInTheDocument();
    expect(screen.getByText("Phone")).toBeInTheDocument();
    expect((container.firstChild as HTMLElement).style.flexDirection).toBe("row");
  });

  it("icon renders uploaded graphic instead of emoji", () => {
    renderCard({ ...base, type: "icon", content: {
      icon: { kind: "image", src: "/i/logo.png" }, label: { text: "Brand" }, layout: "top" } });
    expect(screen.getByRole("img")).toHaveAttribute("src", "/i/logo.png");
  });

  it("hero renders title over optional image", () => {
    renderCard({ ...base, type: "hero", content: {
      title: { text: "macOS" }, image: "/i/bg.png", imagePlacement: "behind" } });
    expect(screen.getByText("macOS")).toBeInTheDocument();
    expect(screen.getByRole("img")).toHaveAttribute("src", "/i/bg.png");
  });

  it("list renders title and items with bullets", () => {
    renderCard({ ...base, type: "list", content: {
      title: { text: "Smart experiences" }, marker: "bullet",
      items: [{ text: "Wi-Fi 7" }, { text: "Lossless audio" }] } });
    expect(screen.getByText("Smart experiences")).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });

  it("applies card style override on the wrapper", () => {
    const { container } = renderCard({ ...base, type: "headline",
      style: { background: { type: "solid", color: "#ff0000" }, textColor: "#00ff00" },
      content: { text: { text: "x" } } });
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.style.background).toContain("rgb(255, 0, 0)");
    expect(wrapper.style.color).toBe("rgb(0, 255, 0)");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/render/CardView.test.tsx`
Expected: FAIL — `Cannot find module './CardView'`.

- [ ] **Step 3: Implement `RichText`**

`src/render/RichText.tsx`:

```tsx
import type { CSSProperties } from "react";
import type { RichText as RichTextValue } from "../schema/slide";
import { richTextToCss } from "./styleResolve";

interface Props {
  value: RichTextValue;
  baseStyle?: CSSProperties;
  /** Dot-path to this field in the card content, e.g. "content.value". Used by inline editing (Task 12). */
  editPath?: string;
  as?: "div" | "span";
}

export function RichText({ value, baseStyle, as: Tag = "div" }: Props) {
  return <Tag style={{ ...baseStyle, ...richTextToCss(value) }}>{value.text}</Tag>;
}
```

- [ ] **Step 4: Implement the six card components**

`src/render/cards/StatCard.tsx`:

```tsx
import type { Card, SlideDocument } from "../../schema/slide";
import { themeTokens } from "../styleResolve";
import { RichText } from "../RichText";

type StatCardType = Extract<Card, { type: "stat" }>;

export function StatCard({ card, theme }: { card: StatCardType; theme: SlideDocument["theme"] }) {
  const tokens = themeTokens(theme.mode);
  const { prefix, value, caption } = card.content;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", height: "100%", gap: 8, textAlign: "center", padding: 24 }}>
      {prefix && <RichText value={prefix} editPath="content.prefix"
        baseStyle={{ fontSize: 28, color: tokens.muted }} />}
      <RichText value={value} editPath="content.value"
        baseStyle={{ fontSize: 96, fontWeight: 700, letterSpacing: -2, lineHeight: 1 }} />
      <RichText value={caption} editPath="content.caption"
        baseStyle={{ fontSize: 28, color: tokens.muted }} />
    </div>
  );
}
```

`src/render/cards/HeadlineCard.tsx`:

```tsx
import type { Card, SlideDocument } from "../../schema/slide";
import { RichText } from "../RichText";

type HeadlineCardType = Extract<Card, { type: "headline" }>;

export function HeadlineCard({ card }: { card: HeadlineCardType; theme: SlideDocument["theme"] }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center",
      height: "100%", padding: 32, textAlign: "center" }}>
      <RichText value={card.content.text} editPath="content.text"
        baseStyle={{ fontSize: 44, fontWeight: 700, letterSpacing: -1, lineHeight: 1.15 }} />
    </div>
  );
}
```

`src/render/cards/ImageCard.tsx`:

```tsx
import type { Card, SlideDocument } from "../../schema/slide";
import { RichText } from "../RichText";

type ImageCardType = Extract<Card, { type: "image" }>;

export function ImageCard({ card }: { card: ImageCardType; theme: SlideDocument["theme"] }) {
  const { src, fit, position, overlay } = card.content;
  return (
    <div style={{ position: "relative", height: "100%" }}>
      {src ? (
        <img src={src} alt="" style={{ width: "100%", height: "100%",
          objectFit: fit, objectPosition: position ?? "center", display: "block" }} />
      ) : (
        <div style={{ height: "100%", display: "flex", alignItems: "center",
          justifyContent: "center", fontSize: 28, opacity: 0.4 }}>Add an image</div>
      )}
      {overlay && (overlay.placement === "center-pill" ? (
        <div style={{ position: "absolute", inset: 0, display: "flex",
          alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "rgba(0,0,0,0.45)", border: "1.5px solid rgba(255,255,255,0.8)",
            borderRadius: 999, padding: "10px 28px", color: "#fff" }}>
            <RichText value={overlay.text} editPath="content.overlay.text"
              baseStyle={{ fontSize: 30, fontWeight: 600 }} />
          </div>
        </div>
      ) : (
        <div style={{ position: "absolute", left: 24, bottom: 20, color: "#fff" }}>
          <RichText value={overlay.text} editPath="content.overlay.text"
            baseStyle={{ fontSize: 30, fontWeight: 600, textShadow: "0 1px 8px rgba(0,0,0,0.5)" }} />
        </div>
      ))}
    </div>
  );
}
```

`src/render/cards/IconCard.tsx`:

```tsx
import type { Card, SlideDocument } from "../../schema/slide";
import { RichText } from "../RichText";

type IconCardType = Extract<Card, { type: "icon" }>;

export function IconCard({ card }: { card: IconCardType; theme: SlideDocument["theme"] }) {
  const { icon, label, layout } = card.content;
  const flexDirection = layout === "top" ? "column" : layout === "left" ? "row" : "row-reverse";
  return (
    <div style={{ display: "flex", flexDirection, alignItems: "center", justifyContent: "center",
      height: "100%", gap: 16, padding: 24, textAlign: layout === "top" ? "center" : "left" }}>
      {icon.kind === "emoji" ? (
        <div style={{ fontSize: 64, lineHeight: 1 }}>{icon.value}</div>
      ) : (
        <img src={icon.src} alt="" style={{ width: 72, height: 72, objectFit: "contain" }} />
      )}
      <RichText value={label} editPath="content.label"
        baseStyle={{ fontSize: 28, fontWeight: 600 }} />
    </div>
  );
}
```

`src/render/cards/HeroCard.tsx`:

```tsx
import type { Card, SlideDocument } from "../../schema/slide";
import { RichText } from "../RichText";

type HeroCardType = Extract<Card, { type: "hero" }>;

export function HeroCard({ card }: { card: HeroCardType; theme: SlideDocument["theme"] }) {
  const { title, image, imagePlacement = "behind" } = card.content;
  const img = image && (
    <img src={image} alt="" style={imagePlacement === "behind"
      ? { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }
      : { maxWidth: "80%", maxHeight: "55%", objectFit: "contain" }} />
  );
  return (
    <div style={{ position: "relative", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", height: "100%", gap: 20, padding: 32 }}>
      {imagePlacement === "behind" && img}
      {imagePlacement === "above" && img}
      <RichText value={title} editPath="content.title"
        baseStyle={{ fontSize: 110, fontWeight: 700, letterSpacing: -3, lineHeight: 1,
          position: "relative", textAlign: "center" }} />
      {imagePlacement === "below" && img}
    </div>
  );
}
```

`src/render/cards/ListCard.tsx`:

```tsx
import type { Card, SlideDocument } from "../../schema/slide";
import { themeTokens } from "../styleResolve";
import { RichText } from "../RichText";

type ListCardType = Extract<Card, { type: "list" }>;

export function ListCard({ card, theme }: { card: ListCardType; theme: SlideDocument["theme"] }) {
  const tokens = themeTokens(theme.mode);
  const { title, items, marker } = card.content;
  return (
    <div style={{ display: "flex", flexDirection: "column", justifyContent: "center",
      height: "100%", gap: 14, padding: 32 }}>
      <RichText value={title} editPath="content.title"
        baseStyle={{ fontSize: 32, fontWeight: 700, color: theme.accent }} />
      <ul style={{ listStyle: marker === "bullet" ? "disc" : "none",
        paddingLeft: marker === "bullet" ? 28 : 0, display: "flex", flexDirection: "column", gap: 10 }}>
        {items.map((item, i) => (
          <li key={i} style={{ color: tokens.muted }}>
            <RichText as="span" value={item} editPath={`content.items.${i}`}
              baseStyle={{ fontSize: 26 }} />
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 5: Implement `CardView`**

`src/render/CardView.tsx`:

```tsx
import type { Card, SlideDocument } from "../schema/slide";
import { resolveCardStyle } from "./styleResolve";
import { StatCard } from "./cards/StatCard";
import { HeadlineCard } from "./cards/HeadlineCard";
import { ImageCard } from "./cards/ImageCard";
import { IconCard } from "./cards/IconCard";
import { HeroCard } from "./cards/HeroCard";
import { ListCard } from "./cards/ListCard";

export function CardView({ card, theme }: { card: Card; theme: SlideDocument["theme"] }) {
  const inner = (() => {
    switch (card.type) {
      case "stat": return <StatCard card={card} theme={theme} />;
      case "headline": return <HeadlineCard card={card} theme={theme} />;
      case "image": return <ImageCard card={card} theme={theme} />;
      case "icon": return <IconCard card={card} theme={theme} />;
      case "hero": return <HeroCard card={card} theme={theme} />;
      case "list": return <ListCard card={card} theme={theme} />;
    }
  })();
  return <div style={{ height: "100%", ...resolveCardStyle(theme, card) }}>{inner}</div>;
}
```

Note for the icon-layout test: the test asserts `flexDirection` on `container.firstChild`'s **inner** node — `CardView`'s wrapper is the first child, so update the assertion if it fails: it should read `(container.firstChild!.firstChild as HTMLElement).style.flexDirection`. Verify which node carries the style and keep the test honest (asserting the rendered row direction), not the implementation detail.

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx vitest run src/render/CardView.test.tsx`
Expected: 9 passed.

- [ ] **Step 7: Commit**

```bash
git add src/render && git commit -m "feat: six card components with shared CardView wrapper"
```

---

### Task 6: Static `SlideRenderer` + kitchen-sink fixture

**Files:**
- Create: `src/render/SlideRenderer.tsx`, `src/render/fixtures.ts`
- Test: `src/render/SlideRenderer.test.tsx`

The static renderer lays cards out with CSS Grid (12×6, gap and padding = `theme.cardStyle.gap`). The editor (Task 9) uses react-grid-layout with **identical spacing math**, so positions match: RGL `colWidth = (W − margin·(cols−1) − 2·containerPadding) / cols` equals CSS Grid `1fr` with `gap` and `padding`.

- [ ] **Step 1: Write failing tests**

`src/render/SlideRenderer.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SlideRenderer } from "./SlideRenderer";
import { kitchenSinkDocument } from "./fixtures";

describe("SlideRenderer", () => {
  it("renders all cards of the kitchen-sink doc", () => {
    const doc = kitchenSinkDocument();
    const { container } = render(<SlideRenderer doc={doc} />);
    const slide = container.firstChild as HTMLElement;
    expect(slide.style.width).toBe("1920px");
    expect(slide.style.height).toBe("1080px");
    // one positioned wrapper per card
    expect(slide.children).toHaveLength(doc.cards.length);
    expect(screen.getByText("48MP")).toBeInTheDocument();   // stat
    expect(screen.getByText("macOS")).toBeInTheDocument();  // hero
  });

  it("places cards via grid-area", () => {
    const doc = kitchenSinkDocument();
    const { container } = render(<SlideRenderer doc={doc} />);
    const first = (container.firstChild as HTMLElement).children[0] as HTMLElement;
    const g = doc.cards[0].grid;
    expect(first.style.gridArea).toBe(`${g.y + 1} / ${g.x + 1} / span ${g.h} / span ${g.w}`);
  });

  it("applies theme background and scale transform", () => {
    const doc = kitchenSinkDocument();
    doc.theme.background = { type: "solid", color: "#101012" };
    const { container } = render(<SlideRenderer doc={doc} scale={0.5} />);
    const slide = container.firstChild as HTMLElement;
    expect(slide.style.background).toContain("rgb(16, 16, 18)");
    expect(slide.style.transform).toBe("scale(0.5)");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/render/SlideRenderer.test.tsx`
Expected: FAIL — `Cannot find module './SlideRenderer'`.

- [ ] **Step 3: Implement fixture**

`src/render/fixtures.ts` — exercises every card type and styling feature; doubles as the manual-QA template:

```ts
import type { SlideDocument } from "../schema/slide";
import { blankDocument } from "../schema/slide";

export function kitchenSinkDocument(): SlideDocument {
  const doc = blankDocument();
  doc.title = "Kitchen sink";
  doc.cards = [
    { id: "stat1", type: "stat", grid: { x: 0, y: 0, w: 2, h: 2 },
      content: { prefix: { text: "Up to" }, value: { text: "48MP" }, caption: { text: "Fusion camera" } } },
    { id: "head1", type: "headline", grid: { x: 2, y: 0, w: 4, h: 1 },
      content: { text: { text: "Spotlight actions and quick keys",
        gradient: { from: "#ff5555", to: "#55aaff", angle: 90 } } } },
    { id: "img1", type: "image", grid: { x: 6, y: 0, w: 3, h: 2 },
      content: { src: "", fit: "cover",
        overlay: { text: { text: "Video Boost" }, placement: "center-pill" } } },
    { id: "icon1", type: "icon", grid: { x: 9, y: 0, w: 3, h: 2 },
      style: { background: { type: "solid", color: "#2c2c2e" } },
      content: { icon: { kind: "emoji", value: "📞" }, label: { text: "Phone" }, layout: "left" } },
    { id: "hero1", type: "hero", grid: { x: 2, y: 1, w: 4, h: 4 },
      style: { background: { type: "gradient", from: "#1a2980", to: "#26d0ce", angle: 135 } },
      content: { title: { text: "macOS" } } },
    { id: "list1", type: "list", grid: { x: 6, y: 2, w: 3, h: 3 },
      content: { title: { text: "Smart experiences" }, marker: "bullet",
        items: [{ text: "Wi-Fi 7" }, { text: "Lossless audio" }, { text: "Advanced ISP" }] } },
    { id: "stat2", type: "stat", grid: { x: 0, y: 2, w: 2, h: 2 },
      style: { textColor: "#ffd60a" },
      content: { value: { text: "2x", size: 120 }, caption: { text: "faster CPU" } } },
    { id: "head2", type: "headline", grid: { x: 9, y: 2, w: 3, h: 2 },
      content: { text: { text: "All-day battery life", align: "center" } } },
    { id: "icon2", type: "icon", grid: { x: 0, y: 4, w: 2, h: 2 },
      content: { icon: { kind: "emoji", value: "🚀" }, label: { text: "Games" }, layout: "top" } },
    { id: "img2", type: "image", grid: { x: 6, y: 5, w: 6, h: 1 },
      content: { src: "", fit: "cover" } },
  ];
  return doc;
}
```

- [ ] **Step 4: Implement `SlideRenderer`**

`src/render/SlideRenderer.tsx`:

```tsx
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
        width, height,
        ...backgroundToCss(doc.theme.background),
        display: "grid",
        gridTemplateColumns: `repeat(${GRID_COLS}, 1fr)`,
        gridTemplateRows: `repeat(${GRID_ROWS}, 1fr)`,
        gap, padding: gap,
        boxSizing: "border-box",
        fontFamily: '"Inter Variable", system-ui, -apple-system, sans-serif',
        ...(scale !== undefined ? { transform: `scale(${scale})`, transformOrigin: "top left" } : {}),
      }}
    >
      {doc.cards.map((card) => (
        <div key={card.id} style={{
          gridArea: `${card.grid.y + 1} / ${card.grid.x + 1} / span ${card.grid.h} / span ${card.grid.w}`,
          minWidth: 0, minHeight: 0,
        }}>
          <CardView card={card} theme={doc.theme} />
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/render/SlideRenderer.test.tsx`
Expected: 3 passed.

- [ ] **Step 6: Run the full frontend suite**

Run: `npx vitest run`
Expected: all tests pass (schema, styleResolve, gridUtils, CardView, SlideRenderer).

- [ ] **Step 7: Commit**

```bash
git add src/render && git commit -m "feat: static SlideRenderer with kitchen-sink fixture"
```

---

### Task 7: Editor store (zustand: doc, selection, undo/redo, autosave)

**Files:**
- Create: `src/editor/store.ts`, `src/editor/newCard.ts`, `src/lib/storage.ts`
- Test: `src/editor/store.test.ts`

- [ ] **Step 1: Write failing tests**

`src/editor/store.test.ts`:

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { createEditorStore } from "./store";
import { blankDocument } from "../schema/slide";

describe("editor store", () => {
  let store: ReturnType<typeof createEditorStore>;
  beforeEach(() => {
    store = createEditorStore(blankDocument(), "test-local-id");
  });

  it("addCard places card at first free cell and selects it", () => {
    store.getState().addCard("stat");
    const s = store.getState();
    expect(s.doc.cards).toHaveLength(1);
    expect(s.doc.cards[0].type).toBe("stat");
    expect(s.doc.cards[0].grid).toEqual({ x: 0, y: 0, w: 2, h: 2 });
    expect(s.selectedCardId).toBe(s.doc.cards[0].id);
  });

  it("updateCard patches content immutably", () => {
    store.getState().addCard("headline");
    const id = store.getState().doc.cards[0].id;
    store.getState().updateCard(id, (card) => {
      if (card.type === "headline") card.content.text.text = "Hello";
    });
    const card = store.getState().doc.cards[0];
    expect(card.type === "headline" && card.content.text.text).toBe("Hello");
  });

  it("moveResizeCard updates grid", () => {
    store.getState().addCard("stat");
    const id = store.getState().doc.cards[0].id;
    store.getState().moveResizeCard(id, { x: 4, y: 2, w: 3, h: 2 });
    expect(store.getState().doc.cards[0].grid).toEqual({ x: 4, y: 2, w: 3, h: 2 });
  });

  it("removeCard deletes and clears selection", () => {
    store.getState().addCard("icon");
    const id = store.getState().doc.cards[0].id;
    store.getState().removeCard(id);
    expect(store.getState().doc.cards).toHaveLength(0);
    expect(store.getState().selectedCardId).toBeNull();
  });

  it("undo/redo restores document snapshots", () => {
    store.getState().addCard("stat");
    store.getState().addCard("icon");
    expect(store.getState().doc.cards).toHaveLength(2);
    store.getState().undo();
    expect(store.getState().doc.cards).toHaveLength(1);
    store.getState().undo();
    expect(store.getState().doc.cards).toHaveLength(0);
    store.getState().redo();
    expect(store.getState().doc.cards).toHaveLength(1);
  });

  it("undo with empty history is a no-op", () => {
    expect(() => store.getState().undo()).not.toThrow();
    expect(store.getState().doc.cards).toHaveLength(0);
  });

  it("setTheme records history", () => {
    store.getState().setTheme({ mode: "light" });
    expect(store.getState().doc.theme.mode).toBe("light");
    store.getState().undo();
    expect(store.getState().doc.theme.mode).toBe("dark");
  });

  it("addCard on a full grid is a no-op (returns false)", () => {
    const full = blankDocument();
    full.cards = [{ id: "big", type: "headline", grid: { x: 0, y: 0, w: 12, h: 6 },
      content: { text: { text: "x" } } }];
    const s2 = createEditorStore(full, "test-2");
    expect(s2.getState().addCard("stat")).toBe(false);
    expect(s2.getState().doc.cards).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/editor/store.test.ts`
Expected: FAIL — `Cannot find module './store'`.

- [ ] **Step 3: Implement `newCard` defaults**

`src/editor/newCard.ts`:

```ts
import { nanoid } from "nanoid";
import type { Card, CardType, GridRect } from "../schema/slide";

export function newCard(type: CardType, grid: GridRect): Card {
  const id = nanoid(8);
  switch (type) {
    case "stat": return { id, type, grid, content: {
      value: { text: "2x" }, caption: { text: "faster" } } };
    case "headline": return { id, type, grid, content: {
      text: { text: "New headline" } } };
    case "image": return { id, type, grid, content: { src: "", fit: "cover" } };
    case "icon": return { id, type, grid, content: {
      icon: { kind: "emoji", value: "✨" }, label: { text: "Feature" }, layout: "top" } };
    case "hero": return { id, type, grid, content: { title: { text: "Product" } } };
    case "list": return { id, type, grid, content: {
      title: { text: "Highlights" }, items: [{ text: "First" }, { text: "Second" }], marker: "bullet" } };
  }
}
```

- [ ] **Step 4: Implement localStorage helpers**

`src/lib/storage.ts`:

```ts
import { slideDocumentSchema } from "../schema/slide";
import type { SlideDocument } from "../schema/slide";

const DOC_PREFIX = "summary-slide:doc:";
const RECENTS_KEY = "summary-slide:recents";

export interface RecentEntry { localId: string; title: string; updatedAt: number }

export function saveDoc(localId: string, doc: SlideDocument): void {
  localStorage.setItem(DOC_PREFIX + localId, JSON.stringify(doc));
  const recents = listRecents().filter((r) => r.localId !== localId);
  recents.unshift({ localId, title: doc.title, updatedAt: Date.now() });
  localStorage.setItem(RECENTS_KEY, JSON.stringify(recents.slice(0, 20)));
}

/** Returns null for missing or corrupt/outdated docs (caller offers "start fresh"). */
export function loadDoc(localId: string): SlideDocument | null {
  const raw = localStorage.getItem(DOC_PREFIX + localId);
  if (!raw) return null;
  try {
    const parsed = slideDocumentSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function listRecents(): RecentEntry[] {
  try {
    return JSON.parse(localStorage.getItem(RECENTS_KEY) ?? "[]") as RecentEntry[];
  } catch {
    return [];
  }
}
```

- [ ] **Step 5: Implement the store**

`src/editor/store.ts` — vanilla zustand store created per editing session (factory makes it testable); React binding via `useStore` in components:

```ts
import { createStore } from "zustand/vanilla";
import type { Card, CardType, GridRect, SlideDocument } from "../schema/slide";
import { firstFreeCell, defaultSpan } from "./gridUtils";
import { newCard } from "./newCard";
import { saveDoc } from "../lib/storage";

const MAX_HISTORY = 100;

export interface EditorState {
  doc: SlideDocument;
  localId: string;
  selectedCardId: string | null;
  past: SlideDocument[];
  future: SlideDocument[];
  selectCard: (id: string | null) => void;
  addCard: (type: CardType) => boolean;
  updateCard: (id: string, mutate: (card: Card) => void) => void;
  moveResizeCard: (id: string, grid: GridRect) => void;
  removeCard: (id: string) => void;
  setTheme: (patch: Partial<SlideDocument["theme"]>) => void;
  setTitle: (title: string) => void;
  setDoc: (doc: SlideDocument) => void;
  undo: () => void;
  redo: () => void;
}

let saveTimer: ReturnType<typeof setTimeout> | undefined;
function persistDebounced(localId: string, doc: SlideDocument) {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => saveDoc(localId, doc), 300);
}

export function createEditorStore(initial: SlideDocument, localId: string) {
  return createStore<EditorState>()((set, get) => {
    /** Record current doc into history, then apply producer to a deep copy. */
    const commit = (produce: (doc: SlideDocument) => void) => {
      const prev = get().doc;
      const next = structuredClone(prev);
      produce(next);
      set({ doc: next, past: [...get().past, prev].slice(-MAX_HISTORY), future: [] });
      persistDebounced(get().localId, next);
    };

    return {
      doc: initial,
      localId,
      selectedCardId: null,
      past: [],
      future: [],

      selectCard: (id) => set({ selectedCardId: id }),

      addCard: (type) => {
        const span = defaultSpan(type);
        const cell = firstFreeCell(get().doc.cards.map((c) => c.grid), span.w, span.h)
          ?? firstFreeCell(get().doc.cards.map((c) => c.grid), 1, 1);
        if (!cell) return false;
        const card = newCard(type, cell);
        commit((doc) => { doc.cards.push(card); });
        set({ selectedCardId: card.id });
        return true;
      },

      updateCard: (id, mutate) => commit((doc) => {
        const card = doc.cards.find((c) => c.id === id);
        if (card) mutate(card);
      }),

      moveResizeCard: (id, grid) => commit((doc) => {
        const card = doc.cards.find((c) => c.id === id);
        if (card) card.grid = grid;
      }),

      removeCard: (id) => {
        commit((doc) => { doc.cards = doc.cards.filter((c) => c.id !== id); });
        if (get().selectedCardId === id) set({ selectedCardId: null });
      },

      setTheme: (patch) => commit((doc) => { Object.assign(doc.theme, patch); }),
      setTitle: (title) => commit((doc) => { doc.title = title; }),
      setDoc: (doc) => commit((d) => { Object.assign(d, structuredClone(doc)); }),

      undo: () => {
        const { past, doc, future } = get();
        if (past.length === 0) return;
        const prev = past[past.length - 1];
        set({ doc: prev, past: past.slice(0, -1), future: [doc, ...future] });
        persistDebounced(get().localId, prev);
      },

      redo: () => {
        const { past, doc, future } = get();
        if (future.length === 0) return;
        const next = future[0];
        set({ doc: next, past: [...past, doc], future: future.slice(1) });
        persistDebounced(get().localId, next);
      },
    };
  });
}

export type EditorStore = ReturnType<typeof createEditorStore>;
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx vitest run src/editor/store.test.ts`
Expected: 8 passed. (jsdom provides `localStorage`; the debounced save is harmless in tests.)

- [ ] **Step 7: Commit**

```bash
git add src/editor src/lib && git commit -m "feat: editor store with undo/redo and localStorage autosave"
```

---

### Task 8: App skeleton — router, StartPage shell, EditorPage shell

**Files:**
- Create: `src/App.tsx`, `src/pages/StartPage.tsx`, `src/pages/NotFoundPage.tsx`, `src/editor/EditorPage.tsx`, `src/editor/EditorContext.tsx`
- Modify: `src/main.tsx`

No new tests in this task (it's wiring); the dev-server smoke check is the verification. Template gallery content arrives in Task 14, canvas/palette/inspector in Tasks 9–11.

- [ ] **Step 1: Editor context (store provider)**

`src/editor/EditorContext.tsx`:

```tsx
import { createContext, useContext } from "react";
import { useStore } from "zustand";
import type { EditorState } from "./store";
import type { EditorStore } from "./store";

export const EditorStoreContext = createContext<EditorStore | null>(null);

export function useEditor<T>(selector: (s: EditorState) => T): T {
  const store = useContext(EditorStoreContext);
  if (!store) throw new Error("useEditor outside EditorStoreContext");
  return useStore(store, selector);
}

export function useEditorStore(): EditorStore {
  const store = useContext(EditorStoreContext);
  if (!store) throw new Error("useEditorStore outside EditorStoreContext");
  return store;
}
```

- [ ] **Step 2: EditorPage shell**

`src/editor/EditorPage.tsx` — creates the store from the `?d=<localId>` query param (or a fresh blank doc), renders the 3-pane layout with placeholders:

```tsx
import { useMemo } from "react";
import { useSearchParams } from "react-router";
import { nanoid } from "nanoid";
import { blankDocument } from "../schema/slide";
import { loadDoc } from "../lib/storage";
import { createEditorStore } from "./store";
import { EditorStoreContext } from "./EditorContext";

export function EditorPage() {
  const [params] = useSearchParams();
  const requestedId = params.get("d");

  const { store, corrupt } = useMemo(() => {
    if (requestedId) {
      const doc = loadDoc(requestedId);
      if (doc) return { store: createEditorStore(doc, requestedId), corrupt: false };
      return { store: createEditorStore(blankDocument(), requestedId), corrupt: true };
    }
    return { store: createEditorStore(blankDocument(), nanoid(8)), corrupt: false };
  }, [requestedId]);

  return (
    <EditorStoreContext.Provider value={store}>
      <div className="flex h-screen flex-col bg-neutral-950 text-neutral-100">
        {corrupt && (
          <div className="bg-amber-600 px-4 py-1 text-sm">
            Couldn't load that slide (corrupt or outdated) — started fresh.
          </div>
        )}
        <div className="h-12 shrink-0 border-b border-neutral-800" data-pane="topbar" />
        <div className="flex min-h-0 flex-1">
          <aside className="w-44 shrink-0 overflow-y-auto border-r border-neutral-800" data-pane="palette" />
          <main className="flex min-w-0 flex-1 items-center justify-center bg-neutral-900" data-pane="canvas" />
          <aside className="w-80 shrink-0 overflow-y-auto border-l border-neutral-800" data-pane="inspector" />
        </div>
      </div>
    </EditorStoreContext.Provider>
  );
}
```

- [ ] **Step 3: StartPage and NotFoundPage shells**

`src/pages/StartPage.tsx`:

```tsx
import { Link } from "react-router";
import { listRecents } from "../lib/storage";

export function StartPage() {
  const recents = listRecents();
  return (
    <div className="min-h-screen bg-neutral-950 px-8 py-12 text-neutral-100">
      <h1 className="text-3xl font-bold tracking-tight">Summary Slide</h1>
      <p className="mt-1 text-neutral-400">Keynote-style feature summaries, exportable as crisp PNGs.</p>
      <div className="mt-8">
        <Link to="/edit" className="rounded-lg bg-blue-600 px-5 py-2.5 font-medium hover:bg-blue-500">
          Start blank
        </Link>
      </div>
      <h2 className="mt-12 text-lg font-semibold">Templates</h2>
      <div className="mt-4 grid grid-cols-2 gap-6 lg:grid-cols-3" data-section="templates" />
      {recents.length > 0 && (
        <>
          <h2 className="mt-12 text-lg font-semibold">Recent slides</h2>
          <ul className="mt-4 space-y-2">
            {recents.map((r) => (
              <li key={r.localId}>
                <Link to={`/edit?d=${r.localId}`} className="text-blue-400 hover:underline">
                  {r.title}
                </Link>
                <span className="ml-2 text-sm text-neutral-500">
                  {new Date(r.updatedAt).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
```

`src/pages/NotFoundPage.tsx`:

```tsx
import { Link } from "react-router";

export function NotFoundPage({ message = "Page not found" }: { message?: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-neutral-950 text-neutral-100">
      <p className="text-xl">{message}</p>
      <Link to="/" className="mt-4 text-blue-400 hover:underline">Back to start</Link>
    </div>
  );
}
```

- [ ] **Step 4: Router**

`src/App.tsx` (SharePage/RenderPage routes are added in Task 18 — keep the file free of dead imports for now):

```tsx
import { BrowserRouter, Routes, Route } from "react-router";
import { StartPage } from "./pages/StartPage";
import { EditorPage } from "./editor/EditorPage";
import { NotFoundPage } from "./pages/NotFoundPage";

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<StartPage />} />
        <Route path="/edit" element={<EditorPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}
```

`src/main.tsx`:

```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import { App } from "./App";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

- [ ] **Step 5: Verify**

Run: `npm run build`
Expected: clean TypeScript build.

Run: `npm run dev &`, open `http://localhost:5173/` and `http://localhost:5173/edit`, then kill the server.
Expected: start page with "Start blank"; editor shows empty three-pane layout.

- [ ] **Step 6: Commit**

```bash
git add src && git commit -m "feat: app skeleton - router, start page, editor layout shells"
```

---

### Task 9: Editor canvas (react-grid-layout)

**Files:**
- Create: `src/editor/EditorCanvas.tsx`
- Modify: `src/editor/EditorPage.tsx` (mount canvas in the `data-pane="canvas"` main), `src/index.css` (RGL css imports)

RGL is configured into fixed-canvas mode: `compactType={null}`, `preventCollision`, `maxRows={6}`, no auto-height. The canvas renders at a display width that fits the viewport; card content is authored at 1920-canvas font sizes, so the card layer is wrapped in a `transform: scale(displayWidth/1920)` inner div sized at full resolution. RGL drag/resize math runs in display pixels; content renders identically to export.

jsdom can't meaningfully test drag interactions — RGL behavior is covered by the Playwright e2e (Task 21). This task's verification is the dev-server smoke check plus the type-checked build.

- [ ] **Step 1: Import RGL styles**

Append to `src/index.css`:

```css
@import "react-grid-layout/css/styles.css";
@import "react-resizable/css/styles.css";

/* Editor-only affordances */
.react-grid-item > .react-resizable-handle { z-index: 20; }
.slide-card-selected { outline: 2px solid #0a84ff; outline-offset: 2px; border-radius: 24px; }
```

- [ ] **Step 2: Implement `EditorCanvas`**

`src/editor/EditorCanvas.tsx`:

```tsx
import { useMemo, useRef } from "react";
import GridLayout from "react-grid-layout";
import type { Layout } from "react-grid-layout";
import { GRID_COLS, GRID_ROWS } from "../schema/slide";
import { backgroundToCss } from "../render/styleResolve";
import { CardView } from "../render/CardView";
import { useEditor } from "./EditorContext";

const DISPLAY_WIDTH = 960; // px; canvas is scaled-down 1920x1080

export function EditorCanvas() {
  const doc = useEditor((s) => s.doc);
  const selectedCardId = useEditor((s) => s.selectedCardId);
  const selectCard = useEditor((s) => s.selectCard);
  const moveResizeCard = useEditor((s) => s.moveResizeCard);
  const removeCard = useEditor((s) => s.removeCard);

  const scale = DISPLAY_WIDTH / doc.canvas.width;
  const displayHeight = doc.canvas.height * scale;
  const gap = doc.theme.cardStyle.gap * scale;
  // rowHeight so that 6 rows + margins + padding fill the canvas exactly:
  // H = 2*pad + rows*rh + (rows-1)*margin  =>  rh = (H - 2*gap - (rows-1)*gap) / rows
  const rowHeight = (displayHeight - 2 * gap - (GRID_ROWS - 1) * gap) / GRID_ROWS;

  const layout: Layout[] = useMemo(
    () => doc.cards.map((c) => ({ i: c.id, x: c.grid.x, y: c.grid.y, w: c.grid.w, h: c.grid.h })),
    [doc.cards]
  );

  // RGL fires onLayoutChange for re-renders too; only commit real moves.
  const onLayoutChange = (next: Layout[]) => {
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
              <CardView card={card} theme={doc.theme} />
            </div>
          </div>
        ))}
      </GridLayout>
    </div>
  );
}
```

- [ ] **Step 3: Mount in `EditorPage`**

In `src/editor/EditorPage.tsx`, replace the empty canvas `<main>`:

```tsx
import { EditorCanvas } from "./EditorCanvas";
// ...
<main className="flex min-w-0 flex-1 items-center justify-center overflow-auto bg-neutral-900 p-6"
  data-pane="canvas">
  <EditorCanvas />
</main>
```

- [ ] **Step 4: Verify with a seeded document**

Temporarily seed the blank editor to inspect rendering: in the browser console on `/edit`, nothing is needed — instead verify via Step 5 in Task 10 (palette adds). For now:

Run: `npm run build`
Expected: clean build.

Run: `npm run dev &`, open `http://localhost:5173/edit`, kill server after checking.
Expected: dark empty canvas, no console errors.

- [ ] **Step 5: Commit**

```bash
git add src && git commit -m "feat: react-grid-layout editor canvas in fixed 12x6 mode"
```

---

### Task 10: Card palette

**Files:**
- Create: `src/editor/Palette.tsx`
- Modify: `src/editor/EditorPage.tsx` (mount in left aside)
- Test: `src/editor/Palette.test.tsx`

The spec describes "drag from palette → drops into first free cell". v1 implements **click-to-add** with the same first-free-cell placement — identical outcome, far less drag-coordination code with RGL. (Drag-from-palette can be layered on later via RGL's `droppingItem`.)

- [ ] **Step 1: Write failing test**

`src/editor/Palette.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Palette } from "./Palette";
import { EditorStoreContext } from "./EditorContext";
import { createEditorStore } from "./store";
import { blankDocument } from "../schema/slide";

describe("Palette", () => {
  it("renders six card tiles and adds a card on click", async () => {
    const store = createEditorStore(blankDocument(), "t");
    render(
      <EditorStoreContext.Provider value={store}>
        <Palette />
      </EditorStoreContext.Provider>
    );
    expect(screen.getAllByRole("button")).toHaveLength(6);
    await userEvent.click(screen.getByRole("button", { name: /stat/i }));
    expect(store.getState().doc.cards).toHaveLength(1);
    expect(store.getState().doc.cards[0].type).toBe("stat");
  });

  it("shows a message when the grid is full", async () => {
    const doc = blankDocument();
    doc.cards = [{ id: "big", type: "headline", grid: { x: 0, y: 0, w: 12, h: 6 },
      content: { text: { text: "x" } } }];
    const store = createEditorStore(doc, "t2");
    render(
      <EditorStoreContext.Provider value={store}>
        <Palette />
      </EditorStoreContext.Provider>
    );
    await userEvent.click(screen.getByRole("button", { name: /icon/i }));
    expect(store.getState().doc.cards).toHaveLength(1);
    expect(screen.getByText(/grid is full/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/editor/Palette.test.tsx`
Expected: FAIL — `Cannot find module './Palette'`.

- [ ] **Step 3: Implement**

`src/editor/Palette.tsx`:

```tsx
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
```

Mount in `EditorPage.tsx` left aside:

```tsx
import { Palette } from "./Palette";
// ...
<aside className="w-44 shrink-0 overflow-y-auto border-r border-neutral-800" data-pane="palette">
  <Palette />
</aside>
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/editor/Palette.test.tsx`
Expected: 2 passed.

- [ ] **Step 5: Manual smoke check**

Run: `npm run dev &`, open `/edit`, click each palette tile, drag cards around, resize via SE handle, press Delete on a selected card. Kill server.
Expected: cards appear at first free cell, drag/resize snaps to grid, no overlap allowed, delete works.

- [ ] **Step 6: Commit**

```bash
git add src && git commit -m "feat: card palette with first-free-cell placement"
```

---

### Task 11: Inspector (content, text styling, backgrounds)

**Files:**
- Create: `src/editor/inspector-fields.tsx`, `src/editor/Inspector.tsx`
- Modify: `src/editor/EditorPage.tsx` (mount in right aside)
- Test: `src/editor/Inspector.test.tsx`

The inspector has two modes: **card selected** → content fields + text styling + card background override; **nothing selected** → slide settings (accent, canvas background, radius/gap). Text styling edits whichever `RichText` field the user expands ("extensive text customization": size, weight, letter-spacing, align, color, gradient).

- [ ] **Step 1: Write failing tests**

`src/editor/Inspector.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Inspector } from "./Inspector";
import { EditorStoreContext } from "./EditorContext";
import { createEditorStore } from "./store";
import { blankDocument } from "../schema/slide";

function setup(addType?: "stat" | "headline") {
  const store = createEditorStore(blankDocument(), "t");
  if (addType) store.getState().addCard(addType);
  render(
    <EditorStoreContext.Provider value={store}>
      <Inspector />
    </EditorStoreContext.Provider>
  );
  return store;
}

describe("Inspector", () => {
  it("shows slide settings when nothing is selected", () => {
    setup();
    expect(screen.getByText(/slide settings/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/accent/i)).toBeInTheDocument();
  });

  it("edits stat value text", async () => {
    const store = setup("stat");
    const input = screen.getByLabelText(/^value$/i);
    await userEvent.clear(input);
    await userEvent.type(input, "120Hz");
    const card = store.getState().doc.cards[0];
    expect(card.type === "stat" && card.content.value.text).toBe("120Hz");
  });

  it("applies text styling (size) to a field", async () => {
    const store = setup("stat");
    await userEvent.click(screen.getAllByRole("button", { name: /style/i })[0]);
    const size = screen.getByLabelText(/size/i);
    await userEvent.clear(size);
    await userEvent.type(size, "120");
    const card = store.getState().doc.cards[0];
    expect(card.type === "stat" && card.content.value.size).toBe(120);
  });

  it("sets a card background override", async () => {
    const store = setup("headline");
    await userEvent.selectOptions(screen.getByLabelText(/background/i), "solid");
    const card = store.getState().doc.cards[0];
    expect(card.style?.background?.type).toBe("solid");
  });

  it("delete button removes the card", async () => {
    const store = setup("headline");
    await userEvent.click(screen.getByRole("button", { name: /delete card/i }));
    expect(store.getState().doc.cards).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/editor/Inspector.test.tsx`
Expected: FAIL — `Cannot find module './Inspector'`.

- [ ] **Step 3: Implement shared field components**

`src/editor/inspector-fields.tsx`:

```tsx
import { useId, useState } from "react";
import type { Background, RichText } from "../schema/slide";

export function TextInput({ label, value, onChange }: {
  label: string; value: string; onChange: (v: string) => void;
}) {
  const id = useId();
  return (
    <div className="mb-2">
      <label htmlFor={id} className="block text-xs text-neutral-400">{label}</label>
      <input id={id} value={value} onChange={(e) => onChange(e.target.value)}
        className="mt-0.5 w-full rounded border border-neutral-700 bg-neutral-900 px-2 py-1 text-sm" />
    </div>
  );
}

export function NumberInput({ label, value, onChange, placeholder }: {
  label: string; value: number | undefined; onChange: (v: number | undefined) => void;
  placeholder?: string;
}) {
  const id = useId();
  return (
    <div className="mb-2">
      <label htmlFor={id} className="block text-xs text-neutral-400">{label}</label>
      <input id={id} type="number" value={value ?? ""} placeholder={placeholder}
        onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))}
        className="mt-0.5 w-full rounded border border-neutral-700 bg-neutral-900 px-2 py-1 text-sm" />
    </div>
  );
}

export function ColorInput({ label, value, onChange }: {
  label: string; value: string | undefined; onChange: (v: string) => void;
}) {
  const id = useId();
  return (
    <div className="mb-2 flex items-center gap-2">
      <label htmlFor={id} className="flex-1 text-xs text-neutral-400">{label}</label>
      <input id={id} type="color" value={value ?? "#ffffff"}
        onChange={(e) => onChange(e.target.value)} className="h-7 w-10 cursor-pointer bg-transparent" />
    </div>
  );
}

export function SelectInput<T extends string>({ label, value, options, onChange }: {
  label: string; value: T; options: readonly T[]; onChange: (v: T) => void;
}) {
  const id = useId();
  return (
    <div className="mb-2">
      <label htmlFor={id} className="block text-xs text-neutral-400">{label}</label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value as T)}
        className="mt-0.5 w-full rounded border border-neutral-700 bg-neutral-900 px-2 py-1 text-sm">
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

/** Text content + collapsible full styling controls for one RichText field. */
export function RichTextControls({ label, value, onChange }: {
  label: string; value: RichText; onChange: (v: RichText) => void;
}) {
  const [open, setOpen] = useState(false);
  const patch = (p: Partial<RichText>) => onChange({ ...value, ...p });
  return (
    <div className="mb-3 rounded border border-neutral-800 p-2">
      <div className="flex items-end gap-2">
        <div className="flex-1"><TextInput label={label} value={value.text}
          onChange={(text) => patch({ text })} /></div>
        <button onClick={() => setOpen(!open)}
          className="mb-2 rounded border border-neutral-700 px-2 py-1 text-xs text-neutral-400 hover:bg-neutral-800">
          Style
        </button>
      </div>
      {open && (
        <div className="mt-1 grid grid-cols-2 gap-x-3">
          <NumberInput label="Size" value={value.size}
            onChange={(size) => patch({ size })} placeholder="auto" />
          <NumberInput label="Weight" value={value.weight}
            onChange={(weight) => patch({ weight })} placeholder="auto" />
          <NumberInput label="Letter spacing" value={value.letterSpacing}
            onChange={(letterSpacing) => patch({ letterSpacing })} placeholder="0" />
          <SelectInput label="Align" value={value.align ?? "center"}
            options={["left", "center", "right"] as const}
            onChange={(align) => patch({ align })} />
          <ColorInput label="Color" value={value.color}
            onChange={(color) => patch({ color, gradient: undefined })} />
          <div className="col-span-2">
            <label className="flex items-center gap-2 text-xs text-neutral-400">
              <input type="checkbox" checked={!!value.gradient}
                onChange={(e) => patch({ gradient: e.target.checked
                  ? { from: "#ff5555", to: "#55aaff", angle: 90 } : undefined })} />
              Gradient text
            </label>
            {value.gradient && (
              <div className="mt-1 grid grid-cols-3 gap-2">
                <ColorInput label="From" value={value.gradient.from}
                  onChange={(from) => patch({ gradient: { ...value.gradient!, from } })} />
                <ColorInput label="To" value={value.gradient.to}
                  onChange={(to) => patch({ gradient: { ...value.gradient!, to } })} />
                <NumberInput label="Angle" value={value.gradient.angle}
                  onChange={(angle) => patch({ gradient: { ...value.gradient!, angle: angle ?? 90 } })} />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/** Background editor used for both card overrides and the slide canvas. */
export function BackgroundControls({ label, value, allowImage, onChange }: {
  label: string; value: Background | undefined; allowImage?: boolean;
  onChange: (v: Background | undefined) => void;
}) {
  const kind = value?.type ?? "theme";
  const kinds = allowImage ? ["theme", "solid", "gradient", "image"] : ["theme", "solid", "gradient"];
  return (
    <div className="mb-3">
      <SelectInput label={label} value={kind} options={kinds as never}
        onChange={(k) => {
          if (k === "theme") onChange(undefined);
          else if (k === "solid") onChange({ type: "solid", color: "#1c1c1e" });
          else if (k === "gradient") onChange({ type: "gradient", from: "#1a2980", to: "#26d0ce", angle: 135 });
          else onChange({ type: "image", src: "" });
        }} />
      {value?.type === "solid" && (
        <ColorInput label="Color" value={value.color}
          onChange={(color) => onChange({ type: "solid", color })} />
      )}
      {value?.type === "gradient" && (
        <div className="grid grid-cols-3 gap-2">
          <ColorInput label="From" value={value.from}
            onChange={(from) => onChange({ ...value, from })} />
          <ColorInput label="To" value={value.to}
            onChange={(to) => onChange({ ...value, to })} />
          <NumberInput label="Angle" value={value.angle}
            onChange={(angle) => onChange({ ...value, angle: angle ?? 135 })} />
        </div>
      )}
      {value?.type === "image" && (
        <TextInput label="Image URL" value={value.src}
          onChange={(src) => onChange({ type: "image", src })} />
      )}
    </div>
  );
}
```

- [ ] **Step 4: Implement `Inspector`**

`src/editor/Inspector.tsx`:

```tsx
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
          onChange={(gap) => setTheme({ cardStyle: { ...doc.theme.cardStyle, gap: gap ?? 16 } })} />
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
          {rt("Prefix", card.content.prefix ?? { text: "" },
            (c, v) => { if (c.type === "stat") c.content.prefix = v.text ? v : undefined; })}
          {rt("Value", card.content.value, (c, v) => { if (c.type === "stat") c.content.value = v; })}
          {rt("Caption", card.content.caption, (c, v) => { if (c.type === "stat") c.content.caption = v; })}
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
```

- [ ] **Step 5: Temporary `ImageUploadField` stub**

Real upload arrives with the backend (Task 17). Create `src/editor/ImageUploadField.tsx` now with a URL input so the Inspector compiles and works offline:

```tsx
import { TextInput } from "./inspector-fields";

/** URL input now; upgraded to real R2 upload in Task 17. */
export function ImageUploadField({ label, value, onChange }: {
  label: string; value: string; onChange: (src: string) => void;
}) {
  return <TextInput label={label} value={value} onChange={onChange} />;
}
```

- [ ] **Step 6: Mount in `EditorPage`**

```tsx
import { Inspector } from "./Inspector";
// ...
<aside className="w-80 shrink-0 overflow-y-auto border-l border-neutral-800" data-pane="inspector">
  <Inspector />
</aside>
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `npx vitest run src/editor/Inspector.test.tsx`
Expected: 5 passed.

- [ ] **Step 8: Manual smoke check**

Run: `npm run dev &`, open `/edit`: add one card of each type, edit every field type (text, style expansion, gradient toggle, background override, list add/remove). Kill server.
Expected: canvas updates live on every change; no console errors.

- [ ] **Step 9: Commit**

```bash
git add src && git commit -m "feat: inspector with per-type content fields and full text styling"
```

---

### Task 12: TopBar, keyboard shortcuts, inline text editing

**Files:**
- Create: `src/editor/TopBar.tsx`, `src/editor/EditableText.tsx`
- Modify: `src/editor/EditorPage.tsx` (mount TopBar, global key handler), `src/render/RichText.tsx` (use EditableText in editor mode), `src/render/CardView.test.tsx` only if selectors break

Inline editing works through React context: `SlideRenderer`/`CardView` stay editor-agnostic; `RichText` checks an `InlineEditContext` — if present (editor only) and the field has an `editPath`, double-click swaps in a contentEditable span. The static renderer never provides the context, so share/export render plain text.

- [ ] **Step 1: Write failing test for EditableText**

`src/editor/EditableText.test.tsx` (create):

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { EditableText } from "./EditableText";

describe("EditableText", () => {
  it("renders plain text until double-clicked, then commits on blur", () => {
    const onCommit = vi.fn();
    render(<EditableText text="48MP" onCommit={onCommit} />);
    const el = screen.getByText("48MP");
    expect(el.isContentEditable).toBe(false);
    fireEvent.doubleClick(el);
    const editable = screen.getByText("48MP");
    expect(editable).toHaveAttribute("contenteditable", "true");
    editable.textContent = "50MP";
    fireEvent.blur(editable);
    expect(onCommit).toHaveBeenCalledWith("50MP");
  });

  it("Escape cancels without committing", () => {
    const onCommit = vi.fn();
    render(<EditableText text="48MP" onCommit={onCommit} />);
    fireEvent.doubleClick(screen.getByText("48MP"));
    const editable = screen.getByText("48MP");
    editable.textContent = "junk";
    fireEvent.keyDown(editable, { key: "Escape" });
    expect(onCommit).not.toHaveBeenCalled();
    expect(screen.getByText("48MP").isContentEditable).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/editor/EditableText.test.tsx`
Expected: FAIL — `Cannot find module './EditableText'`.

- [ ] **Step 3: Implement `EditableText`**

`src/editor/EditableText.tsx`:

```tsx
import { useRef, useState } from "react";
import type { CSSProperties } from "react";

interface Props {
  text: string;
  style?: CSSProperties;
  onCommit: (text: string) => void;
}

/** Double-click to edit in place. className "editable-text" is RGL's draggableCancel. */
export function EditableText({ text, style, onCommit }: Props) {
  const [editing, setEditing] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  if (!editing) {
    return (
      <span style={style} onDoubleClick={() => setEditing(true)}>{text}</span>
    );
  }
  return (
    <span
      ref={ref}
      className="editable-text"
      contentEditable
      suppressContentEditableWarning
      style={{ ...style, outline: "1px dashed rgba(255,255,255,0.5)", cursor: "text" }}
      onBlur={() => { setEditing(false); onCommit(ref.current?.textContent ?? ""); }}
      onKeyDown={(e) => {
        if (e.key === "Escape") { e.preventDefault(); setEditing(false); }
        if (e.key === "Enter") { e.preventDefault(); (e.target as HTMLElement).blur(); }
      }}
    >
      {text}
    </span>
  );
}
```

- [ ] **Step 4: Wire inline editing through `RichText`**

Create the context in `src/editor/EditorContext.tsx` (append):

```tsx
/** Provided only inside the editor canvas. Maps a card-relative dot-path to a commit fn. */
export const InlineEditContext = createContext<
  ((cardId: string, path: string, text: string) => void) | null
>(null);
export const InlineEditCardContext = createContext<string | null>(null);
```

Modify `src/render/RichText.tsx`:

```tsx
import { useContext } from "react";
import type { CSSProperties } from "react";
import type { RichText as RichTextValue } from "../schema/slide";
import { richTextToCss } from "./styleResolve";
import { InlineEditContext, InlineEditCardContext } from "../editor/EditorContext";
import { EditableText } from "../editor/EditableText";

interface Props {
  value: RichTextValue;
  baseStyle?: CSSProperties;
  editPath?: string;
  as?: "div" | "span";
}

export function RichText({ value, baseStyle, editPath, as: Tag = "div" }: Props) {
  const commit = useContext(InlineEditContext);
  const cardId = useContext(InlineEditCardContext);
  const style = { ...baseStyle, ...richTextToCss(value) };
  if (commit && cardId && editPath) {
    return (
      <Tag style={style}>
        <EditableText text={value.text} onCommit={(text) => commit(cardId, editPath, text)} />
      </Tag>
    );
  }
  return <Tag style={style}>{value.text}</Tag>;
}
```

In `src/editor/EditorCanvas.tsx`, provide both contexts around each card and implement the path commit:

```tsx
import { InlineEditContext, InlineEditCardContext } from "./EditorContext";
import { useEditor } from "./EditorContext";
// inside EditorCanvas component:
const updateCard = useEditor((s) => s.updateCard);
const commitText = (cardId: string, path: string, text: string) => {
  updateCard(cardId, (card) => {
    // path like "content.value" or "content.items.2" — walk to parent, set .text
    const segs = path.split(".");
    let node: unknown = card;
    for (const seg of segs) node = (node as Record<string, unknown>)[seg];
    (node as { text: string }).text = text;
  });
};
// wrap the per-card inner div:
<InlineEditContext.Provider value={commitText}>
  <InlineEditCardContext.Provider value={card.id}>
    <CardView card={card} theme={doc.theme} />
  </InlineEditCardContext.Provider>
</InlineEditContext.Provider>
```

- [ ] **Step 5: Implement `TopBar`**

`src/editor/TopBar.tsx` (export/share buttons are disabled placeholders; wired in Tasks 13/18/19):

```tsx
import { useEditor } from "./EditorContext";

export function TopBar() {
  const title = useEditor((s) => s.doc.title);
  const mode = useEditor((s) => s.doc.theme.mode);
  const setTitle = useEditor((s) => s.setTitle);
  const setTheme = useEditor((s) => s.setTheme);
  const undo = useEditor((s) => s.undo);
  const redo = useEditor((s) => s.redo);
  const canUndo = useEditor((s) => s.past.length > 0);
  const canRedo = useEditor((s) => s.future.length > 0);

  const btn = "rounded-md border border-neutral-700 px-3 py-1 text-sm hover:bg-neutral-800 disabled:opacity-40";

  return (
    <div className="flex h-12 shrink-0 items-center gap-2 border-b border-neutral-800 px-3">
      <a href="/" className="text-sm text-neutral-400 hover:text-white">←</a>
      <input value={title} onChange={(e) => setTitle(e.target.value)} aria-label="Slide title"
        className="w-56 rounded bg-transparent px-2 py-1 text-sm font-medium hover:bg-neutral-900 focus:bg-neutral-900" />
      <div className="flex-1" />
      <button className={btn} onClick={undo} disabled={!canUndo} aria-label="Undo">↩</button>
      <button className={btn} onClick={redo} disabled={!canRedo} aria-label="Redo">↪</button>
      <button className={btn} aria-label="Toggle theme"
        onClick={() => setTheme({ mode: mode === "dark" ? "light" : "dark" })}>
        {mode === "dark" ? "☀️ Light" : "🌙 Dark"}
      </button>
      <button className={btn} disabled data-action="quick-export">Quick PNG</button>
      <button className={`${btn} border-blue-700 bg-blue-600 hover:bg-blue-500`} disabled data-action="hq-export">
        HQ Export
      </button>
      <button className={btn} disabled data-action="share">Share</button>
    </div>
  );
}
```

Mount in `EditorPage.tsx` (replace the topbar placeholder div) and add global undo/redo keys:

```tsx
import { useEffect } from "react";
import { TopBar } from "./TopBar";
// inside EditorPage, after store creation:
useEffect(() => {
  const onKey = (e: KeyboardEvent) => {
    const mod = e.metaKey || e.ctrlKey;
    if (!mod || (e.target as HTMLElement).isContentEditable) return;
    const tag = (e.target as HTMLElement).tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
    if (e.key === "z" && !e.shiftKey) { e.preventDefault(); store.getState().undo(); }
    if ((e.key === "z" && e.shiftKey) || e.key === "y") { e.preventDefault(); store.getState().redo(); }
  };
  window.addEventListener("keydown", onKey);
  return () => window.removeEventListener("keydown", onKey);
}, [store]);
// in JSX, replace the placeholder:
<TopBar />
```

- [ ] **Step 6: Run all frontend tests**

Run: `npx vitest run`
Expected: all pass, including the unchanged CardView/SlideRenderer suites (plain-text rendering still works because the static renderer provides no InlineEditContext).

- [ ] **Step 7: Manual smoke check**

Run: `npm run dev &`, open `/edit`: rename the title, toggle theme, add a stat card, double-click its value, type, blur; `⌘Z` then `⌘⇧Z`. Kill server.
Expected: inline edit commits, undo/redo work, dragging is NOT triggered while editing text.

- [ ] **Step 8: Commit**

```bash
git add src && git commit -m "feat: top bar, undo/redo shortcuts, inline text editing"
```

---

### Task 13: Quick export (client-side PNG)

**Files:**
- Create: `src/editor/quickExport.ts`, `src/editor/ExportMount.tsx`
- Modify: `src/editor/TopBar.tsx` (enable Quick PNG button)
- Test: `src/editor/quickExport.test.ts`

Export never snapshots the RGL canvas — it renders a fresh static `SlideRenderer` at full 1920×1080 into an off-screen container, waits for fonts/images, calls `html-to-image`'s `toPng` with `pixelRatio`, and triggers a download. This is the same render path as the server export.

- [ ] **Step 1: Write failing test**

`src/editor/quickExport.test.ts`:

```ts
import { describe, it, expect, vi } from "vitest";

vi.mock("html-to-image", () => ({
  toPng: vi.fn(async () => "data:image/png;base64,AAAA"),
}));

import { toPng } from "html-to-image";
import { quickExport } from "./quickExport";
import { kitchenSinkDocument } from "../render/fixtures";

describe("quickExport", () => {
  it("renders off-screen at full size, calls toPng with pixelRatio, downloads, cleans up", async () => {
    const doc = kitchenSinkDocument();
    const clicks: string[] = [];
    const origClick = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function () { clicks.push(this.download); };

    await quickExport(doc, 2);

    HTMLAnchorElement.prototype.click = origClick;
    expect(toPng).toHaveBeenCalledOnce();
    const [node, opts] = vi.mocked(toPng).mock.calls[0];
    expect((node as HTMLElement).querySelector("[data-slide-root]")).toBeTruthy();
    expect(opts).toMatchObject({ pixelRatio: 2, width: 1920, height: 1080 });
    expect(clicks[0]).toBe("Kitchen sink.png");
    expect(document.querySelector("[data-export-mount]")).toBeNull(); // cleaned up
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/editor/quickExport.test.ts`
Expected: FAIL — `Cannot find module './quickExport'`.

- [ ] **Step 3: Implement**

`src/editor/quickExport.ts`:

```ts
import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { toPng } from "html-to-image";
import type { SlideDocument } from "../schema/slide";
import { SlideRenderer } from "../render/SlideRenderer";

/** Render doc off-screen at full canvas size and download a PNG at the given pixelRatio. */
export async function quickExport(doc: SlideDocument, pixelRatio: 2 | 3 = 2): Promise<void> {
  const mount = document.createElement("div");
  mount.setAttribute("data-export-mount", "");
  // off-screen but rendered (display:none breaks html-to-image)
  mount.style.cssText = "position:fixed;left:-100000px;top:0;";
  document.body.appendChild(mount);
  const root = createRoot(mount);
  try {
    flushSync(() => {
      root.render(createElement(SlideRenderer, { doc }));
    });
    await document.fonts.ready;
    await waitForImages(mount);
    const dataUrl = await toPng(mount, {
      pixelRatio,
      width: doc.canvas.width,
      height: doc.canvas.height,
      backgroundColor: "#000000",
    });
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `${doc.title || "slide"}.png`;
    a.click();
  } finally {
    root.unmount();
    mount.remove();
  }
}

async function waitForImages(node: HTMLElement): Promise<void> {
  const imgs = Array.from(node.querySelectorAll("img"));
  await Promise.all(imgs.map((img) =>
    img.complete ? Promise.resolve() :
      new Promise<void>((res) => { img.onload = () => res(); img.onerror = () => res(); })
  ));
}
```

Note: jsdom lacks `document.fonts` — guard it: `await (document.fonts?.ready ?? Promise.resolve());`. Use that exact guard in the implementation.

- [ ] **Step 4: Enable the TopBar button**

In `src/editor/TopBar.tsx`:

```tsx
import { useState } from "react";
import { quickExport } from "./quickExport";
import { useEditorStore } from "./EditorContext";
// inside component:
const store = useEditorStore();
const [exporting, setExporting] = useState(false);
// replace the disabled Quick PNG button:
<button className={btn} data-action="quick-export" disabled={exporting}
  onClick={async () => {
    setExporting(true);
    try { await quickExport(store.getState().doc, 2); }
    finally { setExporting(false); }
  }}>
  {exporting ? "Exporting…" : "Quick PNG"}
</button>
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/editor/quickExport.test.ts`
Expected: 1 passed.

- [ ] **Step 6: Manual smoke check**

Run: `npm run dev &`, open `/edit`, build a few cards, click Quick PNG. Open the downloaded file. Kill server.
Expected: a 3840×2160 PNG matching the canvas (2x of 1920×1080), correct fonts/gradients.

- [ ] **Step 7: Commit**

```bash
git add src && git commit -m "feat: client-side quick PNG export via html-to-image"
```

---

### Task 14: Built-in templates + start page gallery

**Files:**
- Create: `src/templates/index.ts`
- Modify: `src/pages/StartPage.tsx` (gallery), `src/editor/EditorPage.tsx` (load template via `?t=` param)
- Test: `src/templates/templates.test.ts`

Four templates modeled on `examples/`: **Apple Bento Dark** (apple_iphone17air), **Pixel Light** (google_pixel8), **Spec Sheet Dark** (qualcomm), **Launch Light** (apple_mac_mini_m4). Plus the kitchen-sink fixture exposed as a fifth "Everything" template for QA. Templates ship without binary images — image cards use gradient card backgrounds or empty `src` placeholders the user replaces.

- [ ] **Step 1: Write failing test**

`src/templates/templates.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { templates } from "./index";
import { slideDocumentSchema, GRID_COLS, GRID_ROWS } from "../schema/slide";
import { rectsOverlap } from "../editor/gridUtils";

describe("built-in templates", () => {
  it("there are at least 4, all schema-valid", () => {
    expect(templates.length).toBeGreaterThanOrEqual(4);
    for (const t of templates) {
      expect(t.name.length).toBeGreaterThan(0);
      const res = slideDocumentSchema.safeParse(t.doc);
      expect(res.success, `${t.name}: ${!res.success ? res.error.message : ""}`).toBe(true);
    }
  });

  it("no template has overlapping or out-of-bounds cards", () => {
    for (const t of templates) {
      const rects = t.doc.cards.map((c) => c.grid);
      for (const r of rects) {
        expect(r.x + r.w).toBeLessThanOrEqual(GRID_COLS);
        expect(r.y + r.h).toBeLessThanOrEqual(GRID_ROWS);
      }
      for (let i = 0; i < rects.length; i++)
        for (let j = i + 1; j < rects.length; j++)
          expect(rectsOverlap(rects[i], rects[j]),
            `${t.name}: cards ${i} and ${j} overlap`).toBe(false);
    }
  });

  it("covers both light and dark themes", () => {
    const modes = new Set(templates.map((t) => t.doc.theme.mode));
    expect(modes.has("light")).toBe(true);
    expect(modes.has("dark")).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/templates/templates.test.ts`
Expected: FAIL — `Cannot find module './index'`.

- [ ] **Step 3: Implement templates**

`src/templates/index.ts` — full card lists; representative excerpt shown for the first template, the implementer writes all four following the example screenshots (open the files in `examples/` for reference; aim for 8–11 cards each, varied types and spans):

```ts
import type { SlideDocument } from "../schema/slide";
import { kitchenSinkDocument } from "../render/fixtures";

export interface Template { id: string; name: string; doc: SlideDocument }

const appleBentoDark: SlideDocument = {
  version: 1,
  title: "Apple Bento Dark",
  canvas: { format: "16:9", width: 1920, height: 1080 },
  theme: {
    mode: "dark", accent: "#0a84ff",
    background: { type: "solid", color: "#000000" },
    cardStyle: { radius: 28, gap: 14 },
  },
  cards: [
    { id: "t1-hero", type: "hero", grid: { x: 4, y: 0, w: 4, h: 6 },
      style: { background: { type: "solid", color: "#000000" } },
      content: { title: { text: "iPhone", size: 130 } } },
    { id: "t1-img1", type: "image", grid: { x: 0, y: 0, w: 2, h: 2 },
      content: { src: "", fit: "cover", overlay: { text: { text: "Four colors" }, placement: "corner" } } },
    { id: "t1-stat1", type: "stat", grid: { x: 2, y: 0, w: 2, h: 2 },
      style: { background: { type: "solid", color: "#1c1c1e" } },
      content: { value: { text: "A19", gradient: { from: "#5af", to: "#a5f", angle: 90 } },
        caption: { text: "Pro chip" } } },
    { id: "t1-stat2", type: "stat", grid: { x: 0, y: 2, w: 2, h: 2 },
      content: { value: { text: "48MP" }, caption: { text: "Fusion camera system" } } },
    { id: "t1-stat3", type: "stat", grid: { x: 2, y: 2, w: 2, h: 2 },
      content: { prefix: { text: "Up to" }, value: { text: "3x" }, caption: { text: "better scratch resistance" } } },
    { id: "t1-icon1", type: "icon", grid: { x: 0, y: 4, w: 4, h: 2 },
      content: { icon: { kind: "emoji", value: "🔋" }, label: { text: "All-day battery life" }, layout: "left" } },
    { id: "t1-img2", type: "image", grid: { x: 8, y: 0, w: 4, h: 2 },
      content: { src: "", fit: "cover", overlay: { text: { text: "Center Stage camera" }, placement: "corner" } } },
    { id: "t1-stat4", type: "stat", grid: { x: 8, y: 2, w: 2, h: 2 },
      content: { value: { text: "80%" }, caption: { text: "recycled titanium" } } },
    { id: "t1-stat5", type: "stat", grid: { x: 10, y: 2, w: 2, h: 2 },
      content: { value: { text: "120Hz" }, caption: { text: "ProMotion" } } },
    { id: "t1-head1", type: "headline", grid: { x: 8, y: 4, w: 4, h: 2 },
      content: { text: { text: "6.5″ Super Retina XDR display", size: 38 } } },
  ],
};

const pixelLight: SlideDocument = {
  version: 1,
  title: "Pixel Light",
  canvas: { format: "16:9", width: 1920, height: 1080 },
  theme: {
    mode: "light", accent: "#1a73e8",
    background: { type: "solid", color: "#d7e3f1" },
    cardStyle: { radius: 24, gap: 16 },
  },
  cards: [
    { id: "t2-hero", type: "hero", grid: { x: 4, y: 2, w: 4, h: 2 },
      style: { background: { type: "solid", color: "#eef4fa" } },
      content: { title: { text: "Pixel 8 Pro", size: 84, weight: 500 } } },
    { id: "t2-img1", type: "image", grid: { x: 0, y: 0, w: 4, h: 2 },
      content: { src: "", fit: "cover",
        overlay: { text: { text: "Video Boost" }, placement: "center-pill" } } },
    { id: "t2-stat1", type: "stat", grid: { x: 4, y: 0, w: 3, h: 2 },
      style: { background: { type: "solid", color: "#2b2b2e" }, textColor: "#ffffff" },
      content: { value: { text: "New", size: 64 }, caption: { text: "temperature sensor" } } },
    { id: "t2-img2", type: "image", grid: { x: 7, y: 0, w: 5, h: 2 },
      content: { src: "", fit: "cover",
        overlay: { text: { text: "Soft-touch matte finish" }, placement: "corner" } } },
    { id: "t2-stat2", type: "stat", grid: { x: 0, y: 2, w: 2, h: 2 },
      style: { background: { type: "solid", color: "#eef4fa" } },
      content: { value: { text: "G3" }, caption: { text: "Google Tensor" } } },
    { id: "t2-stat3", type: "stat", grid: { x: 2, y: 2, w: 2, h: 2 },
      style: { background: { type: "solid", color: "#eef4fa" } },
      content: { value: { text: "2400", size: 76 }, caption: { text: "nits peak brightness" } } },
    { id: "t2-icon1", type: "icon", grid: { x: 8, y: 2, w: 2, h: 2 },
      style: { background: { type: "solid", color: "#eef4fa" } },
      content: { icon: { kind: "emoji", value: "📶" }, label: { text: "Wi-Fi 7" }, layout: "top" } },
    { id: "t2-icon2", type: "icon", grid: { x: 10, y: 2, w: 2, h: 2 },
      style: { background: { type: "solid", color: "#eef4fa" } },
      content: { icon: { kind: "emoji", value: "⚡" }, label: { text: "30W Fast Charging" }, layout: "top" } },
    { id: "t2-head1", type: "headline", grid: { x: 0, y: 4, w: 4, h: 2 },
      style: { background: { type: "solid", color: "#2b2b2e" }, textColor: "#ffffff" },
      content: { text: { text: "Fully upgraded pro-camera system", align: "left", size: 40 } } },
    { id: "t2-head2", type: "headline", grid: { x: 4, y: 4, w: 4, h: 2 },
      style: { background: { type: "solid", color: "#eef4fa" } },
      content: { text: { text: "Built for generative AI", size: 40 } } },
    { id: "t2-img3", type: "image", grid: { x: 8, y: 4, w: 4, h: 2 },
      content: { src: "", fit: "cover",
        overlay: { text: { text: "Pro Controls" }, placement: "center-pill" } } },
  ],
};

const specSheetDark: SlideDocument = {
  version: 1,
  title: "Spec Sheet Dark",
  canvas: { format: "16:9", width: 1920, height: 1080 },
  theme: {
    mode: "dark", accent: "#e8483f",
    background: { type: "gradient", from: "#1a0a0e", to: "#2b0f14", angle: 160 },
    cardStyle: { radius: 18, gap: 14 },
  },
  cards: [
    { id: "t3-hero", type: "hero", grid: { x: 0, y: 0, w: 3, h: 2 },
      style: { background: { type: "gradient", from: "#3a1015", to: "#1a0a0e", angle: 135 } },
      content: { title: { text: "Performance Reborn", size: 56,
        gradient: { from: "#ff6a5e", to: "#ffd2cd", angle: 90 } } } },
    { id: "t3-stat1", type: "stat", grid: { x: 3, y: 0, w: 3, h: 2 },
      content: { prefix: { text: "Up to" }, value: { text: "2x", color: "#e8483f" },
        caption: { text: "faster CPU vs x86" } } },
    { id: "t3-stat2", type: "stat", grid: { x: 6, y: 0, w: 3, h: 2 },
      content: { prefix: { text: "Up to" }, value: { text: "2x", color: "#e8483f" },
        caption: { text: "faster GPU" } } },
    { id: "t3-stat3", type: "stat", grid: { x: 9, y: 0, w: 3, h: 2 },
      content: { value: { text: "4nm" }, caption: { text: "process node" } } },
    { id: "t3-stat4", type: "stat", grid: { x: 0, y: 2, w: 3, h: 2 },
      content: { value: { text: "13B+", color: "#e8483f" }, caption: { text: "on-device AI parameters" } } },
    { id: "t3-stat5", type: "stat", grid: { x: 3, y: 2, w: 3, h: 2 },
      content: { value: { text: "75 TOPS" }, caption: { text: "total AI performance" } } },
    { id: "t3-stat6", type: "stat", grid: { x: 6, y: 2, w: 3, h: 2 },
      content: { value: { text: "136GB/s" }, caption: { text: "memory bandwidth" } } },
    { id: "t3-stat7", type: "stat", grid: { x: 9, y: 2, w: 3, h: 2 },
      content: { value: { text: "68%", color: "#e8483f" }, caption: { text: "less power vs competition" } } },
    { id: "t3-list1", type: "list", grid: { x: 0, y: 4, w: 4, h: 2 },
      content: { title: { text: "Smart user experiences" }, marker: "bullet",
        items: [{ text: "Lightning-fast 5G | Wi-Fi 7" }, { text: "Immersive lossless audio" },
          { text: "Advanced camera ISP" }] } },
    { id: "t3-list2", type: "list", grid: { x: 4, y: 4, w: 4, h: 2 },
      content: { title: { text: "Built for AI" }, marker: "bullet",
        items: [{ text: "30 tokens/sec on-device" }, { text: "Micro NPU sensing hub" },
          { text: "Chip-to-cloud security" }] } },
    { id: "t3-head1", type: "headline", grid: { x: 8, y: 4, w: 4, h: 2 },
      content: { text: { text: "Leading PC performance per watt", size: 42 } } },
  ],
};

const launchLight: SlideDocument = {
  version: 1,
  title: "Launch Light",
  canvas: { format: "16:9", width: 1920, height: 1080 },
  theme: {
    mode: "light", accent: "#0a84ff",
    background: { type: "solid", color: "#ffffff" },
    cardStyle: { radius: 26, gap: 16 },
  },
  cards: [
    { id: "t4-hero", type: "hero", grid: { x: 4, y: 1, w: 4, h: 4 },
      content: { title: { text: "Mac mini", size: 110 } } },
    { id: "t4-stat1", type: "stat", grid: { x: 0, y: 0, w: 2, h: 2 },
      content: { value: { text: "5″", size: 88 }, caption: { text: "new compact design" } } },
    { id: "t4-head1", type: "headline", grid: { x: 2, y: 0, w: 2, h: 1 },
      content: { text: { text: "macOS Sequoia", size: 32,
        gradient: { from: "#0a84ff", to: "#a55eea", angle: 90 } } } },
    { id: "t4-head2", type: "headline", grid: { x: 8, y: 0, w: 4, h: 1 },
      content: { text: { text: "Apple Intelligence", size: 36,
        gradient: { from: "#f55", to: "#5af", angle: 90 } } } },
    { id: "t4-stat2", type: "stat", grid: { x: 2, y: 1, w: 2, h: 1 },
      content: { value: { text: "⚡ TB5", size: 40 }, caption: { text: "Thunderbolt 5" } } },
    { id: "t4-stat3", type: "stat", grid: { x: 0, y: 2, w: 2, h: 2 },
      content: { prefix: { text: "Up to" }, value: { text: "64GB" }, caption: { text: "unified memory" } } },
    { id: "t4-stat4", type: "stat", grid: { x: 2, y: 2, w: 2, h: 2 },
      content: { prefix: { text: "Up to" }, value: { text: "8TB" }, caption: { text: "SSD storage" } } },
    { id: "t4-stat5", type: "stat", grid: { x: 8, y: 1, w: 2, h: 2 },
      content: { prefix: { text: "Up to" }, value: { text: "14-core" }, caption: { text: "CPU" } } },
    { id: "t4-stat6", type: "stat", grid: { x: 10, y: 1, w: 2, h: 2 },
      content: { prefix: { text: "Up to" }, value: { text: "20-core" }, caption: { text: "GPU" } } },
    { id: "t4-head3", type: "headline", grid: { x: 0, y: 4, w: 4, h: 2 },
      content: { text: { text: "First carbon neutral Mac", size: 44 } } },
    { id: "t4-icon1", type: "icon", grid: { x: 8, y: 3, w: 4, h: 2 },
      content: { icon: { kind: "emoji", value: "🖥" }, label: { text: "Up to three 6K displays" }, layout: "left" } },
    { id: "t4-icon2", type: "icon", grid: { x: 8, y: 5, w: 4, h: 1 },
      content: { icon: { kind: "emoji", value: "🔌" }, label: { text: "Ethernet · HDMI · 3x Thunderbolt" }, layout: "left" } },
  ],
};

export const templates: Template[] = [
  { id: "apple-bento-dark", name: "Apple Bento Dark", doc: appleBentoDark },
  { id: "pixel-light", name: "Pixel Light", doc: pixelLight },
  { id: "spec-sheet-dark", name: "Spec Sheet Dark", doc: specSheetDark },
  { id: "launch-light", name: "Launch Light", doc: launchLight },
  { id: "everything", name: "Everything (QA)", doc: kitchenSinkDocument() },
];
```

- [ ] **Step 4: Gallery on StartPage**

In `src/pages/StartPage.tsx`, fill the templates section with scaled `SlideRenderer` thumbnails:

```tsx
import { templates } from "../templates";
import { SlideRenderer } from "../render/SlideRenderer";
// replace the empty templates grid:
<div className="mt-4 grid grid-cols-2 gap-6 lg:grid-cols-3" data-section="templates">
  {templates.map((t) => (
    <Link key={t.id} to={`/edit?t=${t.id}`}
      className="group overflow-hidden rounded-xl border border-neutral-800 hover:border-neutral-500">
      <div className="relative aspect-video overflow-hidden">
        <div style={{ position: "absolute", width: 1920, height: 1080 }}>
          <SlideRenderer doc={t.doc} scale={0.18} />
        </div>
        {/* scale .18 fits a ~345px-wide cell; the wrapper clips overflow */}
      </div>
      <div className="border-t border-neutral-800 px-3 py-2 text-sm text-neutral-300
        group-hover:text-white">{t.name}</div>
    </Link>
  ))}
</div>
```

The thumbnail container must scale responsively: set the inner div's scale from the cell width with a small `useLayoutEffect` + `ResizeObserver` if the fixed 0.18 looks wrong at common window sizes; verify visually and keep the simplest version that looks right.

- [ ] **Step 5: Template loading in EditorPage**

In `src/editor/EditorPage.tsx`, extend the store memo — `?t=<templateId>` seeds a **copy** with a fresh localId:

```tsx
import { templates } from "../templates";
// inside useMemo, before the requestedId branch:
const templateId = params.get("t");
if (templateId) {
  const tpl = templates.find((t) => t.id === templateId);
  if (tpl) {
    const doc = structuredClone(tpl.doc);
    doc.title = tpl.name;
    return { store: createEditorStore(doc, nanoid(8)), corrupt: false };
  }
}
```

Update the `useMemo` dependency array from `[requestedId]` to `[requestedId, templateId]` (both derived from `params` before the memo).

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx vitest run src/templates/templates.test.ts`
Expected: 3 passed.

- [ ] **Step 7: Manual smoke check**

Run: `npm run dev &`, open `/`: five template thumbnails render; click each → editor opens seeded; edit + Quick PNG one of them. Kill server.
Expected: thumbnails look like miniature slides; templates load as copies (recents grow per visit).

- [ ] **Step 8: Commit**

```bash
git add src && git commit -m "feat: built-in templates with start page gallery"
```

**Phase 1 complete** — the app is fully usable offline: templates → edit → quick export.

---

### Task 15: Worker scaffold (wrangler, Hono, workers test pool)

**Files:**
- Create: `wrangler.jsonc`, `worker/index.ts`, `worker/vitest.config.ts`, `worker/test-env.d.ts`, `worker/worker.test.ts`, `migrations/0001_create_slides.sql`
- Modify: `package.json` (worker deps), `tsconfig.json` (exclude worker from SPA build if needed)

- [ ] **Step 1: Install worker dev dependencies**

```bash
npm install -D @cloudflare/vitest-pool-workers @cloudflare/workers-types @cloudflare/puppeteer
```

- [ ] **Step 2: Create D1 migration**

`migrations/0001_create_slides.sql`:

```sql
CREATE TABLE IF NOT EXISTS slides (
  id TEXT PRIMARY KEY,
  doc TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
```

- [ ] **Step 3: Create `wrangler.jsonc`**

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "summary-slide",
  "main": "worker/index.ts",
  "compatibility_date": "2026-05-01",
  "compatibility_flags": ["nodejs_compat"],
  "assets": {
    "directory": "./dist",
    "binding": "ASSETS",
    "not_found_handling": "single-page-application",
    "run_worker_first": ["/api/*", "/i/*"]
  },
  "d1_databases": [{
    "binding": "DB",
    "database_name": "summary-slide",
    "database_id": "REPLACE-AFTER-D1-CREATE",
    "migrations_dir": "migrations"
  }],
  "r2_buckets": [{ "binding": "BUCKET", "bucket_name": "summary-slide" }],
  "browser": { "binding": "BROWSER" },
  "observability": { "enabled": true }
}
```

`database_id` is filled in Task 22 (`wrangler d1 create`) — local dev and the test pool don't need a real ID.

- [ ] **Step 4: Write failing worker test**

`worker/vitest.config.ts`:

```ts
import path from "node:path";
import { defineWorkersConfig, readD1Migrations } from "@cloudflare/vitest-pool-workers/config";

export default defineWorkersConfig(async () => {
  const migrations = await readD1Migrations(path.join(__dirname, "../migrations"));
  return {
    test: {
      include: ["worker/**/*.test.ts"],
      setupFiles: ["./worker/apply-migrations.ts"],
      poolOptions: {
        workers: {
          wrangler: { configPath: "../wrangler.jsonc" },
          miniflare: {
            bindings: { TEST_MIGRATIONS: migrations },
          },
        },
      },
    },
  };
});
```

`worker/apply-migrations.ts`:

```ts
import { applyD1Migrations, env } from "cloudflare:test";

await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
```

`worker/test-env.d.ts`:

```ts
import type { D1Migration } from "@cloudflare/vitest-pool-workers/config";
import type { Env } from "./index";

declare module "cloudflare:test" {
  interface ProvidedEnv extends Env {
    TEST_MIGRATIONS: D1Migration[];
  }
}
```

`worker/worker.test.ts` (first test — health route):

```ts
import { describe, it, expect } from "vitest";
import { env, createExecutionContext, waitOnExecutionContext } from "cloudflare:test";
import app from "./index";

export async function request(path: string, init?: RequestInit) {
  const ctx = createExecutionContext();
  const res = await app.fetch(new Request(`http://test.local${path}`, init), env, ctx);
  await waitOnExecutionContext(ctx);
  return res;
}

describe("worker", () => {
  it("GET /api/health returns ok", async () => {
    const res = await request("/api/health");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });
});
```

- [ ] **Step 5: Run worker test to verify it fails**

Run: `npx vitest run -c worker/vitest.config.ts`
Expected: FAIL — `Cannot find module './index'`.

- [ ] **Step 6: Implement worker entry**

`worker/index.ts`:

```ts
import { Hono } from "hono";

export interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  BUCKET: R2Bucket;
  BROWSER: Fetcher;
}

const app = new Hono<{ Bindings: Env }>();

app.get("/api/health", (c) => c.json({ ok: true }));

export default app;
```

Add `"types": ["@cloudflare/workers-types/experimental"]` to a `worker/tsconfig.json`:

```json
{
  "extends": "../tsconfig.json",
  "compilerOptions": {
    "types": ["@cloudflare/workers-types/experimental", "@cloudflare/vitest-pool-workers"],
    "lib": ["ESNext"],
    "jsx": "react-jsx",
    "noEmit": true
  },
  "include": ["./**/*.ts", "../src/schema/slide.ts"]
}
```

Also exclude `worker/` from the SPA typecheck: in the root `tsconfig.app.json` (Vite scaffold) ensure `include` is `["src"]`.

- [ ] **Step 7: Run worker test to verify it passes**

Run: `npx vitest run -c worker/vitest.config.ts`
Expected: 1 passed. (If `readD1Migrations`/`applyD1Migrations` import paths differ in the installed version, check `node_modules/@cloudflare/vitest-pool-workers/dist` exports and the official docs page "Write your first test" — the pattern is documented there.)

- [ ] **Step 8: Verify local dev serves SPA + API together**

```bash
npm run build
npx wrangler dev --local &
curl -s http://localhost:8787/api/health   # {"ok":true}
curl -s http://localhost:8787/ | grep -o '<div id="root">'
kill %1
```

Expected: both succeed — Worker handles `/api/*`, assets serve the SPA.

- [ ] **Step 9: Commit**

```bash
git add -A && git commit -m "feat: worker scaffold with Hono, D1 migration, workers test pool"
```

---

### Task 16: Slides API (share-link storage)

**Files:**
- Create: `worker/slides.ts`
- Modify: `worker/index.ts`, `worker/worker.test.ts`

- [ ] **Step 1: Write failing tests**

Append to `worker/worker.test.ts`:

```ts
import { blankDocument } from "../src/schema/slide";

describe("slides API", () => {
  const validDoc = () => {
    const doc = blankDocument();
    doc.cards = [{ id: "a", type: "headline", grid: { x: 0, y: 0, w: 4, h: 2 },
      content: { text: { text: "hi" } } }];
    return doc;
  };

  it("POST then GET round-trips a slide", async () => {
    const post = await request("/api/slides", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(validDoc()),
    });
    expect(post.status).toBe(201);
    const { id } = await post.json() as { id: string };
    expect(id).toMatch(/^[A-Za-z0-9_-]{8}$/);

    const get = await request(`/api/slides/${id}`);
    expect(get.status).toBe(200);
    const doc = await get.json();
    expect(doc).toEqual(validDoc());
  });

  it("rejects invalid documents with 400", async () => {
    const res = await request("/api/slides", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ version: 99 }),
    });
    expect(res.status).toBe(400);
  });

  it("rejects oversized documents with 413", async () => {
    const doc = validDoc();
    (doc as { title: string }).title = "x".repeat(250_000);
    const res = await request("/api/slides", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(doc),
    });
    expect(res.status).toBe(413);
  });

  it("404s for unknown slide id", async () => {
    const res = await request("/api/slides/nope1234");
    expect(res.status).toBe(404);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run -c worker/vitest.config.ts`
Expected: slides API tests FAIL with 404s (routes don't exist).

- [ ] **Step 3: Implement**

`worker/slides.ts`:

```ts
import { Hono } from "hono";
import { nanoid } from "nanoid";
import { slideDocumentSchema } from "../src/schema/slide";
import type { Env } from "./index";

const MAX_DOC_BYTES = 200_000;

export const slides = new Hono<{ Bindings: Env }>();

slides.post("/", async (c) => {
  const raw = await c.req.text();
  if (raw.length > MAX_DOC_BYTES) {
    return c.json({ error: "Document too large" }, 413);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return c.json({ error: "Invalid JSON" }, 400);
  }
  const result = slideDocumentSchema.safeParse(parsed);
  if (!result.success) {
    return c.json({ error: "Invalid slide document" }, 400);
  }
  const id = nanoid(8);
  await c.env.DB.prepare(
    "INSERT INTO slides (id, doc, created_at) VALUES (?, ?, ?)"
  ).bind(id, JSON.stringify(result.data), Date.now()).run();
  return c.json({ id }, 201);
});

slides.get("/:id", async (c) => {
  const row = await c.env.DB.prepare("SELECT doc FROM slides WHERE id = ?")
    .bind(c.req.param("id")).first<{ doc: string }>();
  if (!row) return c.json({ error: "Not found" }, 404);
  return c.body(row.doc, 200, { "content-type": "application/json" });
});
```

In `worker/index.ts`:

```ts
import { slides } from "./slides";
// after the health route:
app.route("/api/slides", slides);
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run -c worker/vitest.config.ts`
Expected: 5 passed.

- [ ] **Step 5: Commit**

```bash
git add worker && git commit -m "feat: slides API - validated D1 storage for share links"
```

---

### Task 17: Image upload + serving

**Files:**
- Create: `worker/upload.ts`
- Modify: `worker/index.ts`, `worker/worker.test.ts`, `src/editor/ImageUploadField.tsx` (real upload), `src/lib/api.ts` (create)

- [ ] **Step 1: Write failing tests**

Append to `worker/worker.test.ts`:

```ts
describe("upload API", () => {
  const png = () => {
    // minimal PNG magic bytes + padding
    const bytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
    return new Blob([bytes], { type: "image/png" });
  };

  it("uploads a PNG and serves it back via /i/:key", async () => {
    const form = new FormData();
    form.append("file", png(), "photo.png");
    const up = await request("/api/upload", { method: "POST", body: form });
    expect(up.status).toBe(201);
    const { url } = await up.json() as { url: string };
    expect(url).toMatch(/^\/i\/images\/[a-f0-9]{16}\.png$/);

    const img = await request(url);
    expect(img.status).toBe(200);
    expect(img.headers.get("content-type")).toBe("image/png");
    expect(img.headers.get("cache-control")).toContain("immutable");
  });

  it("rejects disallowed content types", async () => {
    const form = new FormData();
    form.append("file", new Blob([new Uint8Array(4)], { type: "image/svg+xml" }), "x.svg");
    const res = await request("/api/upload", { method: "POST", body: form });
    expect(res.status).toBe(415);
  });

  it("rejects files over 10MB", async () => {
    const form = new FormData();
    form.append("file", new Blob([new Uint8Array(10 * 1024 * 1024 + 1)], { type: "image/png" }), "big.png");
    const res = await request("/api/upload", { method: "POST", body: form });
    expect(res.status).toBe(413);
  });

  it("404s for missing image keys", async () => {
    const res = await request("/i/images/0000000000000000.png");
    expect(res.status).toBe(404);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run -c worker/vitest.config.ts`
Expected: upload tests FAIL with 404.

- [ ] **Step 3: Implement**

`worker/upload.ts`:

```ts
import { Hono } from "hono";
import type { Env } from "./index";

const MAX_BYTES = 10 * 1024 * 1024;
const TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

export const upload = new Hono<{ Bindings: Env }>();

upload.post("/", async (c) => {
  const form = await c.req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return c.json({ error: "No file" }, 400);
  const ext = TYPES[file.type];
  if (!ext) return c.json({ error: "Only PNG, JPEG, WebP allowed" }, 415);
  if (file.size > MAX_BYTES) return c.json({ error: "Max 10MB" }, 413);

  const buf = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buf);
  const hash = [...new Uint8Array(digest)].slice(0, 8)
    .map((b) => b.toString(16).padStart(2, "0")).join("");
  const key = `images/${hash}.${ext}`;
  await c.env.BUCKET.put(key, buf, { httpMetadata: { contentType: file.type } });
  return c.json({ url: `/i/${key}` }, 201);
});

export const images = new Hono<{ Bindings: Env }>();

images.get("/*", async (c) => {
  const key = c.req.path.replace(/^\/i\//, "");
  const obj = await c.env.BUCKET.get(key);
  if (!obj) return c.json({ error: "Not found" }, 404);
  return c.body(obj.body, 200, {
    "content-type": obj.httpMetadata?.contentType ?? "application/octet-stream",
    "cache-control": "public, max-age=31536000, immutable",
  });
});
```

In `worker/index.ts`:

```ts
import { upload, images } from "./upload";
app.route("/api/upload", upload);
app.route("/i", images);
```

- [ ] **Step 4: Run worker tests to verify they pass**

Run: `npx vitest run -c worker/vitest.config.ts`
Expected: 9 passed.

- [ ] **Step 5: Frontend api helper + real upload field**

`src/lib/api.ts`:

```ts
import type { SlideDocument } from "../schema/slide";

export async function uploadImage(file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("/api/upload", { method: "POST", body: form });
  if (!res.ok) throw new Error((await res.json().catch(() => null) as { error?: string })?.error ?? "Upload failed");
  return ((await res.json()) as { url: string }).url;
}

export async function saveSlide(doc: SlideDocument): Promise<string> {
  const res = await fetch("/api/slides", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(doc),
  });
  if (!res.ok) throw new Error("Save failed");
  return ((await res.json()) as { id: string }).id;
}

export async function fetchSlide(id: string): Promise<SlideDocument | null> {
  const res = await fetch(`/api/slides/${id}`);
  if (!res.ok) return null;
  return (await res.json()) as SlideDocument;
}

export async function requestHqExport(id: string, scale: number): Promise<string> {
  const res = await fetch("/api/export", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ id, scale }),
  });
  if (!res.ok) throw new Error("Export failed");
  return ((await res.json()) as { url: string }).url;
}
```

Replace `src/editor/ImageUploadField.tsx`:

```tsx
import { useRef, useState } from "react";
import { uploadImage } from "../lib/api";
import { TextInput } from "./inspector-fields";

export function ImageUploadField({ label, value, onChange }: {
  label: string; value: string; onChange: (src: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<"idle" | "uploading" | "error">("idle");
  const [error, setError] = useState("");

  return (
    <div className="mb-2">
      <TextInput label={label} value={value} onChange={onChange} />
      <div className="flex items-center gap-2">
        <button onClick={() => fileRef.current?.click()} disabled={state === "uploading"}
          className="rounded border border-neutral-700 px-2 py-1 text-xs hover:bg-neutral-800 disabled:opacity-40">
          {state === "uploading" ? "Uploading…" : "Upload image"}
        </button>
        {state === "error" && <span className="text-xs text-red-400">{error}</span>}
      </div>
      <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" hidden
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          setState("uploading");
          try {
            onChange(await uploadImage(file));
            setState("idle");
          } catch (err) {
            setError(err instanceof Error ? err.message : "Upload failed");
            setState("error");
          }
          e.target.value = "";
        }} />
    </div>
  );
}
```

For local dev with uploads, run the SPA through wrangler (`npm run build && npx wrangler dev`) or add a Vite proxy — add to `vite.config.ts` so `npm run dev` keeps working against a wrangler instance:

```ts
server: { proxy: { "/api": "http://localhost:8787", "/i": "http://localhost:8787" } },
```

- [ ] **Step 6: Run all tests**

Run: `npx vitest run && npx vitest run -c worker/vitest.config.ts`
Expected: all pass.

- [ ] **Step 7: Manual smoke check**

```bash
npm run build && npx wrangler dev --local &
```
Open `http://localhost:8787/edit`, add an image card, upload a real photo (use one of the files in `examples/`), check it renders with cover/contain, Quick PNG includes it. Kill wrangler.

- [ ] **Step 8: Commit**

```bash
git add -A && git commit -m "feat: image upload to R2 with content-addressed keys"
```

---

### Task 18: Share links — SharePage, RenderPage, Share button

**Files:**
- Create: `src/pages/SharePage.tsx`, `src/pages/RenderPage.tsx`
- Modify: `src/App.tsx` (routes), `src/editor/TopBar.tsx` (Share button)
- Test: `src/pages/SharePage.test.tsx`

- [ ] **Step 1: Write failing tests**

`src/pages/SharePage.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router";
import { SharePage } from "./SharePage";
import { kitchenSinkDocument } from "../render/fixtures";

const renderAt = (path: string) => render(
  <MemoryRouter initialEntries={[path]}>
    <Routes>
      <Route path="/s/:id" element={<SharePage />} />
    </Routes>
  </MemoryRouter>
);

describe("SharePage", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("fetches and renders the shared slide with an open-in-editor link", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(kitchenSinkDocument()), { status: 200 }) as never
    );
    renderAt("/s/abc12345");
    expect(await screen.findByText("48MP")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /open in editor/i })).toBeInTheDocument();
  });

  it("shows not-found for missing slides", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("{}", { status: 404 }) as never
    );
    renderAt("/s/missing1");
    expect(await screen.findByText(/slide not found/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/pages/SharePage.test.tsx`
Expected: FAIL — `Cannot find module './SharePage'`.

- [ ] **Step 3: Implement SharePage**

`src/pages/SharePage.tsx` — fetches the doc, shows a scaled preview, "Open in editor" clones into localStorage:

```tsx
import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router";
import { nanoid } from "nanoid";
import type { SlideDocument } from "../schema/slide";
import { slideDocumentSchema } from "../schema/slide";
import { fetchSlide } from "../lib/api";
import { saveDoc } from "../lib/storage";
import { SlideRenderer } from "../render/SlideRenderer";
import { NotFoundPage } from "./NotFoundPage";

export function SharePage() {
  const { id } = useParams<{ id: string }>();
  const [doc, setDoc] = useState<SlideDocument | null | "loading">("loading");
  const wrapRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.45);

  useEffect(() => {
    if (!id) return;
    fetchSlide(id).then((d) => {
      const parsed = d ? slideDocumentSchema.safeParse(d) : null;
      setDoc(parsed?.success ? parsed.data : null);
    });
  }, [id]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el || doc === "loading" || !doc) return;
    const ro = new ResizeObserver(() => setScale(el.clientWidth / doc.canvas.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, [doc]);

  if (doc === "loading") {
    return <div className="flex min-h-screen items-center justify-center bg-neutral-950 text-neutral-400">Loading…</div>;
  }
  if (!doc) return <NotFoundPage message="Slide not found" />;

  const openInEditor = () => {
    const localId = nanoid(8);
    saveDoc(localId, structuredClone(doc));
    return `/edit?d=${localId}`;
  };

  return (
    <div className="min-h-screen bg-neutral-950 px-8 py-10 text-neutral-100">
      <div className="mx-auto max-w-5xl">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold">{doc.title}</h1>
          <Link to={openInEditor()} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium hover:bg-blue-500">
            Open in editor
          </Link>
        </div>
        <div ref={wrapRef} className="overflow-hidden rounded-xl"
          style={{ aspectRatio: "16 / 9" }}>
          <SlideRenderer doc={doc} scale={scale} />
        </div>
      </div>
    </div>
  );
}
```

Note: `openInEditor()` writes to localStorage during render via the Link href — that's a side effect in render. Implement it properly: compute `localId` once with `useMemo(() => nanoid(8), [])` and write in the Link's `onClick` instead. The test only asserts the link exists, so either passes — write the clean version.

- [ ] **Step 4: Implement RenderPage (export target)**

`src/pages/RenderPage.tsx` — no chrome, exact 1920×1080, signals readiness for the screenshotter:

```tsx
import { useEffect, useState } from "react";
import { useParams } from "react-router";
import type { SlideDocument } from "../schema/slide";
import { fetchSlide } from "../lib/api";
import { SlideRenderer } from "../render/SlideRenderer";

export function RenderPage() {
  const { id } = useParams<{ id: string }>();
  const [doc, setDoc] = useState<SlideDocument | null>(null);

  useEffect(() => {
    if (id) fetchSlide(id).then(setDoc);
  }, [id]);

  useEffect(() => {
    if (!doc) return;
    (async () => {
      await document.fonts?.ready;
      const imgs = Array.from(document.images);
      await Promise.all(imgs.map((img) => img.complete ? Promise.resolve()
        : new Promise<void>((res) => { img.onload = () => res(); img.onerror = () => res(); })));
      document.body.setAttribute("data-render-ready", "true"); // puppeteer waits for this
    })();
  }, [doc]);

  if (!doc) return null;
  return (
    <div style={{ width: doc.canvas.width, height: doc.canvas.height, overflow: "hidden" }}>
      <SlideRenderer doc={doc} />
    </div>
  );
}
```

- [ ] **Step 5: Routes + Share button**

`src/App.tsx` — add:

```tsx
import { SharePage } from "./pages/SharePage";
import { RenderPage } from "./pages/RenderPage";
// inside <Routes>:
<Route path="/s/:id" element={<SharePage />} />
<Route path="/render/:id" element={<RenderPage />} />
```

`src/editor/TopBar.tsx` — enable Share:

```tsx
import { saveSlide } from "../lib/api";
// inside component:
const [shareState, setShareState] = useState<"idle" | "saving" | "copied" | "error">("idle");
// replace the disabled Share button:
<button className={btn} data-action="share" disabled={shareState === "saving"}
  onClick={async () => {
    setShareState("saving");
    try {
      const id = await saveSlide(store.getState().doc);
      await navigator.clipboard.writeText(`${location.origin}/s/${id}`);
      setShareState("copied");
      setTimeout(() => setShareState("idle"), 2000);
    } catch {
      setShareState("error");
      setTimeout(() => setShareState("idle"), 3000);
    }
  }}>
  {shareState === "copied" ? "Link copied!" : shareState === "error" ? "Failed — retry" : "Share"}
</button>
```

- [ ] **Step 6: Run tests**

Run: `npx vitest run`
Expected: all pass.

- [ ] **Step 7: Manual smoke check**

```bash
npm run build && npx wrangler dev --local &
```
Open `http://localhost:8787/edit`, build a slide, click Share, open the copied `/s/...` URL in a new tab, click "Open in editor", verify it's an editable copy. Also open `/render/<id>` and check the bare 1920×1080 render and `data-render-ready` attribute in devtools. Kill wrangler.

- [ ] **Step 8: Commit**

```bash
git add src && git commit -m "feat: share links with read-only preview and render route"
```

---

### Task 19: HQ export (Browser Rendering)

**Files:**
- Create: `worker/exportRoute.ts`
- Modify: `worker/index.ts`, `worker/worker.test.ts` (validation-only tests), `src/editor/TopBar.tsx` (HQ button)

Browser Rendering doesn't run in miniflare — unit tests cover request validation only; the rendering path is verified against a deployed dev environment (`wrangler dev --remote` or post-deploy in Task 22).

- [ ] **Step 1: Write failing validation tests**

Append to `worker/worker.test.ts`:

```ts
describe("export API validation", () => {
  it("rejects missing id", async () => {
    const res = await request("/api/export", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ scale: 2 }),
    });
    expect(res.status).toBe(400);
  });

  it("rejects out-of-range scale", async () => {
    const res = await request("/api/export", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: "abc12345", scale: 9 }),
    });
    expect(res.status).toBe(400);
  });

  it("404s for unknown slide id before launching a browser", async () => {
    const res = await request("/api/export", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: "missing1", scale: 2 }),
    });
    expect(res.status).toBe(404);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run -c worker/vitest.config.ts`
Expected: export tests FAIL with 404 (route missing).

- [ ] **Step 3: Implement**

`worker/exportRoute.ts`:

```ts
import { Hono } from "hono";
import { z } from "zod";
import puppeteer from "@cloudflare/puppeteer";
import type { Env } from "./index";

const exportRequestSchema = z.object({
  id: z.string().min(1),
  scale: z.number().int().min(2).max(4),
});

export const exportRoute = new Hono<{ Bindings: Env }>();

exportRoute.post("/", async (c) => {
  const parsed = exportRequestSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: "Invalid request" }, 400);
  const { id, scale } = parsed.data;

  const slide = await c.env.DB.prepare("SELECT id FROM slides WHERE id = ?").bind(id).first();
  if (!slide) return c.json({ error: "Slide not found" }, 404);

  const key = `exports/${id}-${scale}x.png`;
  const cached = await c.env.BUCKET.head(key);
  if (cached) return c.json({ url: `/i/${key}` });

  const browser = await puppeteer.launch(c.env.BROWSER);
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: scale });
    const origin = new URL(c.req.url).origin;
    await page.goto(`${origin}/render/${id}`, { waitUntil: "networkidle0", timeout: 30_000 });
    await page.waitForSelector("body[data-render-ready='true']", { timeout: 15_000 });
    const png = await page.screenshot({ type: "png" }) as Buffer;
    await c.env.BUCKET.put(key, png, { httpMetadata: { contentType: "image/png" } });
    return c.json({ url: `/i/${key}` });
  } catch (err) {
    console.error("export failed", err);
    return c.json({ error: "Export failed — try the quick export" }, 502);
  } finally {
    await browser.close();
  }
});
```

In `worker/index.ts`:

```ts
import { exportRoute } from "./exportRoute";
app.route("/api/export", exportRoute);
```

Note: exports are content-addressed per `(id, scale)` — share-link docs are immutable (each Share creates a new id), so caching is safe.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run -c worker/vitest.config.ts`
Expected: 12 passed. If `puppeteer.launch` at module scope breaks the test pool, move the import to a dynamic `await import("@cloudflare/puppeteer")` inside the handler — validation tests never reach it.

- [ ] **Step 5: Enable the HQ Export button**

`src/editor/TopBar.tsx`:

```tsx
import { saveSlide, requestHqExport } from "../lib/api";
// inside component:
const [hqState, setHqState] = useState<"idle" | "working" | "error">("idle");
// replace the disabled HQ Export button:
<button className={`${btn} border-blue-700 bg-blue-600 hover:bg-blue-500`} data-action="hq-export"
  disabled={hqState === "working"}
  onClick={async () => {
    setHqState("working");
    try {
      const id = await saveSlide(store.getState().doc);
      const url = await requestHqExport(id, 3);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${store.getState().doc.title || "slide"}@3x.png`;
      a.click();
      setHqState("idle");
    } catch {
      setHqState("error");
      setTimeout(() => setHqState("idle"), 4000);
    }
  }}>
  {hqState === "working" ? "Rendering…" : hqState === "error" ? "Failed — use Quick PNG" : "HQ Export"}
</button>
```

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: HQ export via Browser Rendering with R2-cached results"
```

Verification of the actual rendering happens in Task 22 Step 5 (deployed smoke test).

---

### Task 20: Rate limiting on POST routes

**Files:**
- Modify: `wrangler.jsonc`, `worker/index.ts`, `worker/worker.test.ts`

- [ ] **Step 1: Add the rate-limiting binding**

In `wrangler.jsonc`:

```jsonc
"unsafe": {
  "bindings": [{
    "name": "RATE_LIMITER",
    "type": "ratelimit",
    "namespace_id": "1001",
    "simple": { "limit": 30, "period": 60 }
  }]
}
```

- [ ] **Step 2: Write failing test**

Append to `worker/worker.test.ts`:

```ts
describe("rate limiting", () => {
  it("returns 429 when the limiter denies", async () => {
    const orig = env.RATE_LIMITER;
    (env as { RATE_LIMITER: unknown }).RATE_LIMITER = { limit: async () => ({ success: false }) };
    const res = await request("/api/slides", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    });
    (env as { RATE_LIMITER: unknown }).RATE_LIMITER = orig;
    expect(res.status).toBe(429);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run -c worker/vitest.config.ts`
Expected: rate-limit test FAILS (gets 400, not 429).

- [ ] **Step 4: Implement middleware**

In `worker/index.ts`:

```ts
export interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  BUCKET: R2Bucket;
  BROWSER: Fetcher;
  RATE_LIMITER: { limit: (opts: { key: string }) => Promise<{ success: boolean }> };
}

// before the routes:
app.use("/api/*", async (c, next) => {
  if (c.req.method !== "POST") return next();
  const ip = c.req.header("cf-connecting-ip") ?? "unknown";
  const { success } = await c.env.RATE_LIMITER.limit({ key: ip });
  if (!success) return c.json({ error: "Too many requests — slow down" }, 429);
  return next();
});
```

If miniflare's test env doesn't provide the unsafe binding, add a passthrough in `worker/vitest.config.ts` miniflare bindings:

```ts
bindings: { TEST_MIGRATIONS: migrations },
// plus, if needed (check first — newer miniflare versions support ratelimit bindings natively):
// workers pool option `miniflare: { ratelimits: { RATE_LIMITER: { simple: { limit: 30, period: 60 } } } }`
```

Consult the @cloudflare/vitest-pool-workers docs for the current ratelimit emulation option; if unavailable, inject a stub binding `{ limit: async () => ({ success: true }) }` via `miniflare.bindings` and keep the 429 test overriding it as written.

- [ ] **Step 5: Run all worker tests to verify they pass**

Run: `npx vitest run -c worker/vitest.config.ts`
Expected: 13 passed.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: per-IP rate limiting on POST API routes"
```

---

### Task 21: End-to-end test (Playwright)

**Files:**
- Create: `playwright.config.ts`, `e2e/slide.spec.ts`
- Modify: `package.json` (e2e script exists from Task 1)

- [ ] **Step 1: Install Playwright**

```bash
npm install -D @playwright/test
npx playwright install chromium
```

- [ ] **Step 2: Configure**

`playwright.config.ts`:

```ts
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  use: { baseURL: "http://localhost:4173" },
  webServer: {
    command: "npm run build && npx vite preview --port 4173",
    port: 4173,
    reuseExistingServer: !process.env.CI,
  },
});
```

(Vite preview serves the SPA without the Worker — the e2e covers the offline core loop: template → edit → quick export. Backend flows are covered by worker tests + the deployed smoke test in Task 22.)

Add to `vite.config.ts` preview proxy nothing — `/api` calls aren't exercised in this test.

- [ ] **Step 3: Write the e2e test**

`e2e/slide.spec.ts`:

```ts
import { test, expect } from "@playwright/test";

test("create from template, edit text, quick-export a PNG", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Summary Slide")).toBeVisible();

  // open a template
  await page.getByRole("link", { name: "Apple Bento Dark" }).click();
  await expect(page).toHaveURL(/\/edit\?t=apple-bento-dark/);

  // canvas has cards
  await expect(page.locator(".react-grid-item").first()).toBeVisible();

  // inline-edit the hero title
  const hero = page.getByText("iPhone", { exact: true });
  await hero.dblclick();
  await page.keyboard.press("ControlOrMeta+a");
  await page.keyboard.type("Phone X");
  await page.keyboard.press("Enter");
  await expect(page.getByText("Phone X")).toBeVisible();

  // add a card from the palette
  await page.getByRole("button", { name: /^Stat$/ }).click();

  // quick export downloads a PNG
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Quick PNG" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.png$/);
  const path = await download.path();
  expect(path).toBeTruthy();
});

test("undo reverses an edit", async ({ page }) => {
  await page.goto("/edit");
  await page.getByRole("button", { name: /^Headline$/ }).click();
  await expect(page.getByText("New headline")).toBeVisible();
  await page.keyboard.press("ControlOrMeta+z");
  await expect(page.getByText("New headline")).not.toBeVisible();
});
```

- [ ] **Step 4: Run the e2e suite**

Run: `npx playwright test`
Expected: 2 passed. Iterate on selectors if the accessible names differ — fix the app's a11y attributes (e.g., missing `aria-label`) rather than reaching for brittle CSS selectors.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "test: e2e flow - template, edit, quick export"
```

---

### Task 22: Provisioning, CI deploy, custom domain, deployed smoke test

**Files:**
- Create: `.github/workflows/deploy.yml`
- Modify: `wrangler.jsonc` (real `database_id`, routes)

- [ ] **Step 1: Provision Cloudflare resources** (requires `wrangler login` — ask the user to run `! npx wrangler login` if not authenticated)

```bash
npx wrangler d1 create summary-slide        # copy database_id into wrangler.jsonc
npx wrangler r2 bucket create summary-slide
npx wrangler d1 migrations apply summary-slide --remote
```

Replace `"database_id": "REPLACE-AFTER-D1-CREATE"` in `wrangler.jsonc` with the real ID.

- [ ] **Step 2: Add the custom domain to wrangler.jsonc**

```jsonc
"routes": [{ "pattern": "summary-slide.mtajchert.com", "custom_domain": true }]
```

(`mtajchert.com` must be a zone on the same Cloudflare account; the custom domain creates the DNS record automatically on deploy.)

- [ ] **Step 3: First manual deploy**

```bash
npm run build
npx wrangler deploy
```

Expected: deployment URL printed; `https://summary-slide.mtajchert.com` serves the start page (DNS may take a minute).

- [ ] **Step 4: CI workflow**

`.github/workflows/deploy.yml`:

```yaml
name: Deploy
on:
  push:
    branches: [master]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: npm }
      - run: npm ci
      - run: npm test
      - run: npm run test:worker
      - run: npm run build
      - uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
```

Create the GitHub repo, add `CLOUDFLARE_API_TOKEN` (Workers Scripts:Edit, D1:Edit, Workers R2 Storage:Edit permissions) and `CLOUDFLARE_ACCOUNT_ID` secrets, push.

- [ ] **Step 5: Deployed smoke test (the full loop, including HQ export)**

On `https://summary-slide.mtajchert.com`:
1. Open a template, edit text, upload an image from `examples/`.
2. Quick PNG → verify download.
3. Share → open the link in a private window → "Open in editor".
4. HQ Export at 3x → verify the downloaded PNG is 5760×3240 and matches the editor preview (fonts, gradients, shadows, uploaded image).
5. Check `wrangler tail` shows no errors during the above.

Expected: every step passes. If HQ export fonts differ from preview, confirm Inter is loaded via the bundled `@fontsource-variable/inter` CSS on `/render/:id` (it is part of the SPA bundle — `document.fonts.ready` + `data-render-ready` gate the screenshot).

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "chore: CI deploy workflow and Cloudflare provisioning"
git push
```

---

## Deferred (explicitly out of v1)

Accounts/auth, public gallery, non-16:9 canvas formats, background removal (Workers AI), freeform/rotation canvas, export queueing (Cloudflare Queues), D1 pruning of old anonymous slides (revisit when storage grows; a scheduled Worker deleting `created_at < now() - 180d` rows is the likely shape).
