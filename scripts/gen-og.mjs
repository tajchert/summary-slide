// Generates public/og.png — the social-share card for the homepage.
// A genuine dark keynote bento slide (the product itself) with a clickbait
// headline overlaid. Reuses the real Inter Variable font + dark-theme colors
// so the card reads as the actual app. Capture is done with Playwright
// (already a dev dependency).
//
//   node scripts/gen-og.mjs
//
// Output: public/og.png at 1200×630.

import { readFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { chromium } from "playwright";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// Embed the same Inter Variable woff2 the app ships, so headless capture has
// the exact font (no system-font fallback drift).
const fontPath = resolve(
  root,
  "node_modules/@fontsource-variable/inter/files/inter-latin-standard-normal.woff2",
);
const fontB64 = readFileSync(fontPath).toString("base64");

// Mirror src/render/styleResolve.ts dark-theme tokens.
const CARD_BG = "#1c1c1e";
const TEXT = "#ffffff";
const MUTED = "rgba(255,255,255,0.65)";
const FONT =
  '"Inter Variable", "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", system-ui, -apple-system, sans-serif';

const html = /* html */ `<!doctype html>
<html><head><meta charset="utf-8"><style>
  @font-face {
    font-family: "Inter Variable";
    font-style: normal;
    font-weight: 100 900;
    font-display: block;
    src: url(data:font/woff2;base64,${fontB64}) format("woff2");
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 1200px; height: 630px; }
  body {
    font-family: ${FONT};
    /* keynote-dark stage */
    background: radial-gradient(120% 130% at 78% 18%, #2a2a2e 0%, #0a0a0b 60%, #000 100%);
    color: ${TEXT};
    overflow: hidden;
    position: relative;
  }

  /* the bento slide, full-bleed as the hero — dense, Apple-keynote-style */
  .grid {
    position: absolute;
    inset: 0;
    display: grid;
    grid-template-columns: repeat(12, 1fr);
    grid-template-rows: repeat(6, 1fr);
    gap: 12px;
    padding: 44px;
  }
  .card {
    background: ${CARD_BG};
    border-radius: 18px;
    padding: 18px 22px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    box-shadow: 0 12px 36px rgba(0,0,0,0.4);
    overflow: hidden;
  }
  .card.center { align-items: center; text-align: center; }
  .label { font-size: 15px; font-weight: 600; color: ${MUTED}; letter-spacing: .01em; line-height: 1.2; }
  .pre { font-size: 14px; font-weight: 600; color: ${MUTED}; }
  .stat-value { font-size: 58px; font-weight: 800; line-height: .92; letter-spacing: -0.03em; }
  .stat-sm { font-size: 40px; font-weight: 800; line-height: .92; letter-spacing: -0.02em; }
  .accent { background: linear-gradient(135deg, #6ea8ff, #b07cff); -webkit-background-clip: text; background-clip: text; color: transparent; }
  .icon { font-size: 56px; line-height: 1; }
  .pill { align-self: flex-start; background: linear-gradient(135deg,#34d27b,#1fb35e); color:#062b16; font-weight:800; font-size:26px; padding:6px 16px; border-radius:14px; }
  .sg { display:flex; gap:26px; }
  .sg .v { font-size: 40px; font-weight: 800; letter-spacing:-0.02em; }
  .sg .k { font-size: 13px; color:${MUTED}; margin-top:2px; }
  /* gradient hero tile (product glow) */
  .hero { background: radial-gradient(120% 140% at 70% 35%, #3a2a5e 0%, #1a1430 55%, #0f0c1e 100%); align-items:flex-end; justify-content:center; text-align:right; padding-right: 26px; }
  .hero .glow {
    font-size: 44px; font-weight: 800; letter-spacing: -0.02em;
    background: linear-gradient(95deg,#4aa3ff,#a070ff 45%,#ff7ea8 80%,#ffb877);
    -webkit-background-clip: text; background-clip: text; color: transparent;
    filter: drop-shadow(0 0 26px rgba(150,110,255,.55));
  }
  .chips { display:flex; gap:8px; }
  .chip { flex:1; border-radius:12px; padding:12px 4px; text-align:center; font-weight:800; font-size:17px; color:#fff; }
  .chip.c1 { background: linear-gradient(135deg,#2aa9a0,#1d7d8f); }
  .chip.c2 { background: linear-gradient(135deg,#3b6bd6,#5a3fb0); }
  .chip.c3 { background: linear-gradient(135deg,#7a3fc0,#b03f86); }
  .badge { background: radial-gradient(120% 120% at 30% 20%, #2f3a66, #141826); align-items:center; justify-content:center; }
  .badge .b { font-size: 30px; font-weight: 800; letter-spacing:-0.02em; }

  /* headline overlay + left-anchored scrim for legibility */
  .scrim {
    position: absolute;
    inset: 0;
    background: linear-gradient(95deg, rgba(0,0,0,0.94) 0%, rgba(0,0,0,0.9) 26%, rgba(0,0,0,0.6) 42%, rgba(0,0,0,0.15) 56%, rgba(0,0,0,0) 70%);
  }
  .overlay {
    position: absolute;
    left: 64px;
    top: 0;
    height: 100%;
    width: 540px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 24px;
  }
  .headline {
    font-size: 92px;
    font-weight: 800;
    line-height: 1.0;
    letter-spacing: -0.04em;
  }
  .headline .pop {
    background: linear-gradient(120deg, #6ea8ff, #b07cff 60%, #ff8fb0);
    -webkit-background-clip: text; background-clip: text; color: transparent;
  }
  .subline { font-size: 27px; font-weight: 500; color: rgba(255,255,255,0.85); line-height: 1.35; }
</style></head>
<body>
  <div class="grid">
    <!-- LEFT band (sits under the scrim — adds real-slide depth) -->
    <div class="card" style="grid-column: 1 / 4; grid-row: 1 / 3;">
      <div class="pre">Up to</div>
      <div class="stat-sm accent">20×</div>
      <div class="label">faster workflow</div>
    </div>
    <div class="card" style="grid-column: 1 / 4; grid-row: 3 / 5;">
      <div class="pill">24h</div>
      <div class="label" style="margin-top:10px;">to ship a deck</div>
    </div>
    <div class="card badge" style="grid-column: 1 / 4; grid-row: 5 / 7;">
      <div class="b accent">v2.0</div>
    </div>

    <!-- CENTER hero — pure product glow (no text to collide with headline) -->
    <div class="card hero" style="grid-column: 4 / 8; grid-row: 1 / 5;"></div>
    <div class="card" style="grid-column: 4 / 8; grid-row: 5 / 7;">
      <div class="sg">
        <div><div class="v">9</div><div class="k">card types</div></div>
        <div><div class="v accent">1</div><div class="k">click export</div></div>
        <div><div class="v">12×6</div><div class="k">bento grid</div></div>
      </div>
    </div>

    <!-- THIRD band -->
    <div class="card" style="grid-column: 8 / 11; grid-row: 1 / 3;">
      <div class="pre">Up to</div>
      <div class="stat-sm">8TB</div>
      <div class="label">themes & layouts</div>
    </div>
    <div class="card" style="grid-column: 8 / 11; grid-row: 3 / 5;">
      <div class="pre">Up to</div>
      <div class="stat-sm">128GB</div>
      <div class="label">of pure focus</div>
    </div>
    <div class="card" style="grid-column: 8 / 11; grid-row: 5 / 7;">
      <div class="chips">
        <div class="chip c1">Pro</div>
        <div class="chip c2">Max</div>
        <div class="chip c3">Ultra</div>
      </div>
    </div>

    <!-- RIGHT band -->
    <div class="card center" style="grid-column: 11 / 13; grid-row: 1 / 3;">
      <div class="icon">⚡</div>
      <div class="label" style="margin-top:10px;">instant export</div>
    </div>
    <div class="card" style="grid-column: 11 / 13; grid-row: 3 / 5;">
      <div class="stat-sm accent">3×</div>
      <div class="label">sharper visuals</div>
    </div>
    <div class="card center" style="grid-column: 11 / 13; grid-row: 5 / 7;">
      <div class="stat-sm">4.9★</div>
      <div class="label">looks designed</div>
    </div>
  </div>

  <div class="scrim"></div>

  <div class="overlay">
    <div class="headline">Summary <span class="pop">Slide</span></div>
    <div class="subline">Apple-style single slide with key features.<br>Free, in your browser.</div>
  </div>
</body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1200, height: 630 },
  deviceScaleFactor: 2,
});
await page.setContent(html, { waitUntil: "networkidle" });
await page.evaluate(() => document.fonts.ready);
mkdirSync(resolve(root, "public"), { recursive: true });
await page.screenshot({
  path: resolve(root, "public/og.png"),
  clip: { x: 0, y: 0, width: 1200, height: 630 },
});
await browser.close();
console.log("wrote public/og.png (1200×630 @2x)");
