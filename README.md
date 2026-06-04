# Summary Slide

**Build Apple-keynote-style feature summaries — in your browser, exportable as crisp 4K PNGs.**

🔗 **Live: [summary-slide.mtajchert.com](https://summary-slide.mtajchert.com)**

You know that one slide at the end of every Apple or Google keynote — the bento grid that crams an entire product launch into a single, beautiful image? Specs in big bold numbers, feature photos, icon rows, one hero in the middle. Summary Slide lets anyone build that slide in minutes. No account, no design tool, no fiddling with alignment.

## How it works

Every slide is a **JSON document**: a 12×6 grid of typed cards plus a theme. One React component turns that JSON into pixels — and that *same* component renders the editor canvas, the share preview, and both export paths. That single render path is the core trick: **what you see in the editor is pixel-for-pixel what you get in the PNG.**

```
        ┌──────────────┐
        │  Slide JSON   │   cards: [{type:"stat", grid:{x,y,w,h}, content...}]
        └──────┬───────┘
               ▼
        <SlideRenderer/>  ──►  editor canvas (drag & resize)
                          ──►  share preview (/s/:id)
                          ──►  Quick PNG (in-browser, instant)
                          ──►  HQ Export (headless Chromium → 5760×3240 PNG)
```

## Features

- 🧱 **Six card types** — big-number stats, headlines, photos, icon+label tiles, hero, bullet lists
- 🖱️ **Snapping grid editor** — drag, resize, rearrange; collision-free 12×6 grid keeps everything looking *designed*
- ✏️ **Double-click to edit text in place**, with full typography control (size, weight, spacing, color, gradient text)
- 🌗 **Light/dark themes** with per-card overrides, accent colors, solid/gradient/image backgrounds
- 📋 **Templates** modeled on real keynote slides (Apple bento, Pixel grid, spec sheet…) — or start blank
- ⚡ **Quick PNG** — instant 2x export, no server round-trip
- 💎 **HQ Export** — server-side headless-Chromium render at 3x (5760×3240), identical to your preview
- 🔗 **Share links** — one click copies a URL; recipients see a read-only preview and can clone it into their own editor
- 💾 **No accounts** — work autosaves locally; nothing to sign up for
- ↩️ **Undo/redo**, image uploads, keyboard shortcuts

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | React 18 + Vite + Tailwind CSS v4, react-grid-layout for the editor, zustand for state |
| Slide model | zod-validated JSON schema, shared verbatim between browser and server |
| Backend | A single Cloudflare Worker (Hono) serving both the SPA and the API |
| Storage | Cloudflare D1 (shared slides) + R2 (uploaded images, rendered exports) |
| HQ rendering | Cloudflare Browser Rendering (headless Chromium) screenshotting the app's own `/render/:id` route |
| Quick export | html-to-image on the client |
| Tests | Vitest (jsdom + workers pool) and Playwright e2e |

## Run it locally

```bash
npm install
npm run dev            # SPA only (editor, templates, quick export) at :5173

# full stack (share links, uploads — API at :8787, proxied from the dev server):
npm run build && npx wrangler dev
```

Tests:

```bash
npm test               # frontend unit/component tests
npm run test:worker    # worker API tests (build first: assets dir must exist)
npm run e2e            # Playwright end-to-end
```

## Deploying your own

You'll need a Cloudflare account (Workers paid plan for Browser Rendering). Create the resources, then deploy:

```bash
npx wrangler d1 create summary-slide       # put the database_id into wrangler.jsonc
npx wrangler r2 bucket create summary-slide
npx wrangler d1 migrations apply summary-slide --remote
npm run build && npx wrangler deploy
```

CI deploys on every push to `master` via GitHub Actions (needs `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` repo secrets).
