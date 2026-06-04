# CLAUDE.md — developer onboarding

Apple-keynote-style bento-slide builder. SPA + Cloudflare Worker in one repo, one deploy.
Live: https://summary-slide.mtajchert.com

## Commands

```bash
npm run dev               # Vite dev server :5173 (proxies /api + /i to :8787)
npm run build             # tsc -b && vite build → dist/
npm test                  # frontend tests (Vitest, jsdom)
npm run test:worker       # worker tests (vitest-pool-workers/miniflare) — REQUIRES dist/ to exist (run build first)
npm run typecheck:worker  # worker/ is OUTSIDE the tsc -b build graph; this is its only typecheck
npm run e2e               # Playwright (builds + serves vite preview on :4173 itself)
npx wrangler dev          # full stack locally on :8787 (after build)
npx wrangler deploy       # manual deploy; CI also deploys on push to master
```

Run all three suites before committing. CI order matters: build → test:worker (worker pool validates `assets.directory: ./dist`).

## Architecture — the one idea that matters

A slide is a JSON document (`SlideDocument`): 12×6 grid, theme, array of typed cards. **One component — `src/render/SlideRenderer.tsx` — turns that JSON into pixels everywhere**: editor canvas content, share preview (`/s/:id`), the headless-Chromium export target (`/render/:id`), template thumbnails, and the off-screen node captured by Quick PNG. Pixel fidelity between editor and export depends on this single render path. **Never fork the rendering logic**; if the editor needs different behavior, inject it via context (see inline editing below), not by branching inside card components.

The editor (`src/editor/EditorCanvas.tsx`) is the one place with a second layout engine: react-grid-layout in fixed-canvas mode (`compactType:null, preventCollision, maxRows:6`). Its spacing math (`margin = containerPadding = gap×scale`, rowHeight formula) intentionally produces the **same geometry** as SlideRenderer's CSS grid (`1fr` tracks + gap + padding). If you touch either, keep them in lockstep.

## Key files

```
src/schema/slide.ts          THE contract: zod schema + types, shared verbatim by SPA and worker.
                             gridSchema refines x+w≤12, y+h≤6. blankDocument() defaults.
src/render/styleResolve.ts   theme→card→field style cascade; SLIDE_FONT_FAMILY (see invariants)
src/render/CardView.tsx      dispatch card.type → six components in src/render/cards/
src/render/SlideRenderer.tsx the single render path (CSS grid, data-slide-root)
src/editor/store.ts          zustand vanilla store factory: commit() = snapshot to past[] +
                             structuredClone + 300ms-debounced localStorage persist; undo/redo
                             drop stale selections
src/editor/EditorCanvas.tsx  RGL wrapper; commitText() walks "content.items.2"-style dot-paths
                             (defensively — stale paths are no-ops)
src/editor/Inspector.tsx     per-type content controls; no-selection = slide settings
src/editor/quickExport.ts    html-to-image capture (see gotcha #1)
src/templates/index.ts       built-in templates = plain SlideDocuments
src/lib/{storage,api}.ts     localStorage docs/recents; fetch wrappers
worker/index.ts              Hono app + Env bindings + per-IP rate limit on /api/* POSTs
worker/{slides,upload,exportRoute}.ts  D1 share storage / R2 uploads / Browser Rendering export
wrangler.jsonc               bindings (DB, BUCKET, BROWSER, ASSETS, RATE_LIMITER);
                             run_worker_first: /api/*, /i/* — everything else = SPA fallback
```

## Invariants & hard-won gotchas

1. **Quick PNG capture node must be style-clean.** html-to-image clones the target node *with* its inline styles; capturing a node that carries `position:fixed;left:-100000px` renders everything outside the canvas → black PNG. The off-screen positioning lives on an outer wrapper; `toPng` gets the clean inner node. The e2e guards this by decoding the download and counting bright pixels.
2. **`SLIDE_FONT_FAMILY` (styleResolve.ts) is the only font stack** for slide content, and emoji families come **before** `system-ui` — Linux/headless Chromium's DejaVu owns a monochrome U+26A1 (⚡) that shadows Noto Color Emoji otherwise.
3. **Card `style.background` overrides must ship a `textColor`.** Theme switching keeps overrides; a dark override without explicit text color becomes unreadable in light mode. Template authoring rule, enforced by review not schema.
4. **Default `gap` is 24 because (1920−13g)/12 must be an integer** — fractional grid tracks break pixel-identical exports across engines.
5. **Inline editing is context-injected, not forked.** `RichText` renders plain text unless `InlineEditContext` + `InlineEditCardContext` + `editPath` are all present (only the editor provides them). The display span carries class `editable-text` = RGL's `draggableCancel`, so dblclick isn't swallowed by drag. Tradeoff: drags start from card padding, not text.
6. **Share-link docs are immutable** — every Share/HQ-export click POSTs a fresh nanoid(8) id. The HQ export cache key `exports/{id}-{scale}x.png` is safe *because* of this. Don't add doc mutation without rethinking the cache.
7. **Version pins that look wrong but aren't:** React 18 (react-grid-layout 1.5 peer limit), `@cloudflare/vitest-pool-workers@0.12.21 exact` (last vitest-3-compatible line; newer requires vitest 4), `react() as never` in vitest.config.ts (vite 8 vs vitest-bundled-vite type skew).
8. **Worker quirks:** `@cloudflare/puppeteer` is dynamically imported inside the export handler (module-scope import breaks the test pool). R2 image serving buffers via `arrayBuffer()` (test pool can't stream R2 bodies; objects are ≤10MB anyway). `slides.ts` size cap counts bytes via TextEncoder, not string length.
9. **Test environment:** jsdom lacks `isContentEditable` (polyfilled in `src/test-setup.ts`) and `ResizeObserver` (guarded at use sites). `afterEach(cleanup)` is explicit — auto-cleanup didn't fire.

## Practices

- TDD: failing test first, then implementation (worker routes and pure helpers especially).
- Schema changes: bump carefully — `version: z.literal(1)` is the migration hook; localStorage docs failing zod show "started fresh", shared D1 docs are validated on POST.
- New card type checklist: schema union member → component in `src/render/cards/` → CardView dispatch → `newCard.ts` default → `defaultSpan()` → palette tile → Inspector section → CardView.test case.
- Adding POST endpoints: they're automatically rate-limited by the `/api/*` middleware; keep zod validation at the boundary like `slides.ts`.
- Deploy: push to master (CI: test → build → test:worker → typecheck → wrangler deploy) or `npx wrangler deploy`.

## Out of scope (v1, deliberate)

Accounts/auth, non-16:9 canvases (schema's `canvas` field is the extension point), background removal, freeform/rotated placement, D1 pruning of old anonymous slides, HQ-export dedup for unchanged docs.
