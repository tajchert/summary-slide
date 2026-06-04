# Showcase Templates Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add three built-in templates (Chip Spec Dark, Developer Keynote Light, AirPods Light) that showcase the five new card capabilities, modeled on the Apple slides in `examples/`.

**Architecture:** Pure-data change: three `SlideDocument` consts appended to `src/templates/index.ts` (existing pattern), registered in the `templates` array before "Everything (QA)". One new "showcase coverage" test in `src/templates/templates.test.ts`; the file's existing invariant tests (schema, overlap, override⇒textColor, modes) cover the new entries automatically. A visual editor check tunes text sizes.

**Tech Stack:** TypeScript (data only), Vitest.

**Spec:** `docs/superpowers/specs/2026-06-04-showcase-templates-design.md`

---

## Task 1: Showcase coverage test + three templates

**Files:**
- Modify: `src/templates/index.ts` (append consts; extend the `templates` array)
- Test: `src/templates/templates.test.ts`

- [ ] **Step 1: Write the failing test**

Add to the `describe("built-in templates")` block in `src/templates/templates.test.ts`:

```ts
  // The new card types shipped 2026-06: built-in templates must showcase them.
  it("showcases every new card capability across the template set", () => {
    const all = templates.flatMap((t) => t.doc.cards);
    expect(all.some((c) => c.type === "iconRow")).toBe(true);
    expect(all.some((c) => c.type === "statGroup")).toBe(true);
    expect(all.some((c) => c.type === "code")).toBe(true);
    expect(all.some((c) => c.type === "image" && c.content.overlay?.placement === "bottom")).toBe(true);
    expect(all.some((c) => c.type === "icon" && c.content.caption !== undefined)).toBe(true);
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/templates/templates.test.ts`
Expected: FAIL — the new test's first assertion (`iconRow`) is false. (Note: the "Everything (QA)" template comes from `kitchenSinkDocument()` in `src/render/fixtures.ts`; if it already contains some new types the corresponding assertions may pass — the test must still fail on at least one assertion. If it unexpectedly passes entirely, check what fixtures.ts contains and report it; do not weaken the test.)

- [ ] **Step 3: Add the three template consts**

In `src/templates/index.ts`, after the `launchLight` const, add:

```ts
// Inspired by examples/mac-m3-family-2023.webp + examples/mac-pro-2023.webp:
// chip spec sheet — statGroup columns, port iconRow, dual-bandwidth statGroup row.
const chipSpecDark: SlideDocument = {
  version: 1,
  title: "Chip Spec Dark",
  canvas: { format: "16:9", width: 1920, height: 1080 },
  theme: {
    mode: "dark", accent: "#30d158",
    background: { type: "solid", color: "#000000" },
    cardStyle: { radius: 24, gap: 14 },
  },
  cards: [
    // No background overrides: cards follow the theme (see Apple Bento note above).
    { id: "t5-sg1", type: "statGroup", grid: { x: 0, y: 0, w: 2, h: 3 },
      content: { layout: "column", stats: [
        { prefix: { text: "Up to" }, value: { text: "16-core", size: 40 }, caption: { text: "CPU" } },
        { prefix: { text: "Up to" }, value: { text: "40-core", size: 40 }, caption: { text: "GPU" } },
      ] } },
    { id: "t5-sg2", type: "statGroup", grid: { x: 0, y: 3, w: 2, h: 3 },
      content: { layout: "column", stats: [
        { prefix: { text: "Up to" }, value: { text: "128GB", size: 40 }, caption: { text: "unified memory" } },
        { prefix: { text: "Up to" }, value: { text: "8TB", size: 40 }, caption: { text: "SSD storage" } },
      ] } },
    { id: "t5-hero", type: "hero", grid: { x: 2, y: 0, w: 6, h: 4 },
      content: { title: { text: "M4 Pro", size: 120,
        gradient: { from: "#30d158", to: "#55aaff", angle: 90 } } } },
    { id: "t5-ports", type: "iconRow", grid: { x: 2, y: 4, w: 6, h: 1 },
      content: { items: [
        { icon: { kind: "emoji", value: "⚡" }, label: { text: "Thunderbolt 5" } },
        { icon: { kind: "emoji", value: "🔌" }, label: { text: "MagSafe 3" } },
        { icon: { kind: "emoji", value: "🖥" }, label: { text: "HDMI" } },
      ] } },
    { id: "t5-npu", type: "icon", grid: { x: 2, y: 5, w: 6, h: 1 },
      content: { icon: { kind: "emoji", value: "🧠" }, label: { text: "Neural Engine", size: 24 },
        caption: { text: "38 trillion operations per second", size: 18 }, layout: "left" } },
    { id: "t5-head1", type: "headline", grid: { x: 8, y: 0, w: 4, h: 1 },
      content: { text: { text: "3-nanometer technology", size: 36 } } },
    { id: "t5-stat1", type: "stat", grid: { x: 8, y: 1, w: 2, h: 2 },
      content: { prefix: { text: "Up to" }, value: { text: "2.5x", color: "#30d158" },
        caption: { text: "faster GPU rendering" } } },
    { id: "t5-stat2", type: "stat", grid: { x: 10, y: 1, w: 2, h: 2 },
      content: { value: { text: "92B" }, caption: { text: "transistors" } } },
    { id: "t5-sg3", type: "statGroup", grid: { x: 8, y: 3, w: 4, h: 2 },
      content: { layout: "row", stats: [
        { value: { text: "120GB/s", size: 40 }, caption: { text: "M4" } },
        { value: { text: "273GB/s", size: 40 }, caption: { text: "M4 Pro" } },
      ] } },
    { id: "t5-head2", type: "headline", grid: { x: 8, y: 5, w: 4, h: 1 },
      content: { text: { text: "Faster 16-core Neural Engine", size: 32 } } },
  ],
};

// Inspired by examples/developers-sotu-wwdc2025.webp (a light slide):
// code card front and center, icon captions, dev-tool iconRow, bottom overlay.
const developerKeynoteLight: SlideDocument = {
  version: 1,
  title: "Developer Keynote Light",
  canvas: { format: "16:9", width: 1920, height: 1080 },
  theme: {
    mode: "light", accent: "#ff9500",
    background: { type: "solid", color: "#ececf0" },
    cardStyle: { radius: 24, gap: 14 },
  },
  cards: [
    { id: "t6-hero", type: "hero", grid: { x: 0, y: 0, w: 4, h: 2 },
      content: { title: { text: "Swift 6", size: 80 } } },
    { id: "t6-code", type: "code", grid: { x: 4, y: 0, w: 5, h: 3 },
      content: { language: "swift", title: { text: "Foundation Models" },
        code: 'let session = LanguageModelSession()\nlet response = try await\n  session.respond(to: "Tell a joke")' } },
    { id: "t6-img1", type: "image", grid: { x: 9, y: 0, w: 3, h: 2 },
      content: { src: "", fit: "cover",
        overlay: { text: { text: "visionOS 26" }, placement: "bottom" } } },
    { id: "t6-icon1", type: "icon", grid: { x: 0, y: 2, w: 2, h: 2 },
      content: { icon: { kind: "emoji", value: "🧩" }, label: { text: "SwiftUI" },
        caption: { text: "Crafting experiences" }, layout: "top" } },
    { id: "t6-icon2", type: "icon", grid: { x: 2, y: 2, w: 2, h: 2 },
      content: { icon: { kind: "emoji", value: "📦" }, label: { text: "Containerization" },
        caption: { text: "Linux on Mac" }, layout: "top" } },
    { id: "t6-list", type: "list", grid: { x: 4, y: 3, w: 5, h: 3 },
      content: { title: { text: "Swift highlights" }, marker: "none",
        items: [{ text: "Fast" }, { text: "Expressive" }, { text: "Safe" }, { text: "Interoperable" }] } },
    { id: "t6-stat1", type: "stat", grid: { x: 9, y: 2, w: 3, h: 2 },
      content: { prefix: { text: "Up to" }, value: { text: "2x" }, caption: { text: "faster Swift builds" } } },
    { id: "t6-tools", type: "iconRow", grid: { x: 0, y: 4, w: 4, h: 2 },
      content: { items: [
        { icon: { kind: "emoji", value: "🛠" }, label: { text: "Xcode 26" } },
        { icon: { kind: "emoji", value: "🎨" }, label: { text: "Icon Composer" } },
        { icon: { kind: "emoji", value: "📊" }, label: { text: "Swift Charts" } },
      ], caption: { text: "Developer tools" } } },
    { id: "t6-head1", type: "headline", grid: { x: 9, y: 4, w: 3, h: 2 },
      content: { text: { text: "New design with Liquid Glass", size: 34,
        gradient: { from: "#0a84ff", to: "#bf5af2", angle: 90 } } } },
  ],
};

// Inspired by examples/airpods-4-2024.webp + examples/airpods-pro-3-2025.webp:
// icon captions, dual-battery statGroup row, workout iconRow, bottom overlay.
const airpodsLight: SlideDocument = {
  version: 1,
  title: "AirPods Light",
  canvas: { format: "16:9", width: 1920, height: 1080 },
  theme: {
    mode: "light", accent: "#007aff",
    background: { type: "solid", color: "#f5f5f7" },
    cardStyle: { radius: 28, gap: 14 },
  },
  cards: [
    { id: "t7-icon1", type: "icon", grid: { x: 0, y: 0, w: 2, h: 2 },
      content: { icon: { kind: "emoji", value: "🎧" }, label: { text: "Spatial audio", size: 24 },
        caption: { text: "with dynamic head tracking", size: 18 }, layout: "top" } },
    { id: "t7-icon2", type: "icon", grid: { x: 2, y: 0, w: 2, h: 2 },
      content: { icon: { kind: "emoji", value: "❤️" }, label: { text: "Heart rate sensor", size: 24 },
        caption: { text: "during workouts", size: 18 }, layout: "top" } },
    { id: "t7-img1", type: "image", grid: { x: 0, y: 2, w: 4, h: 2 },
      content: { src: "", fit: "cover",
        overlay: { text: { text: "Best-fitting AirPods ever" }, placement: "bottom" } } },
    { id: "t7-workouts", type: "iconRow", grid: { x: 0, y: 4, w: 4, h: 2 },
      content: { items: [
        { icon: { kind: "emoji", value: "🏃" }, label: { text: "Run" } },
        { icon: { kind: "emoji", value: "🚴" }, label: { text: "Ride" } },
        { icon: { kind: "emoji", value: "🧘" }, label: { text: "Yoga" } },
      ], caption: { text: "iOS Workout experience" } } },
    { id: "t7-hero", type: "hero", grid: { x: 4, y: 0, w: 4, h: 4 },
      content: { title: { text: "AirPods Pro", size: 92 } } },
    { id: "t7-sg1", type: "statGroup", grid: { x: 4, y: 4, w: 4, h: 2 },
      content: { layout: "row", stats: [
        { value: { text: "8 hrs", size: 44 }, caption: { text: "Active Noise Cancellation" } },
        { value: { text: "10 hrs", size: 44 }, caption: { text: "with Hearing Aid" } },
      ] } },
    { id: "t7-stat1", type: "stat", grid: { x: 8, y: 0, w: 4, h: 2 },
      content: { prefix: { text: "Up to" }, value: { text: "2x" },
        caption: { text: "more Active Noise Cancellation" } } },
    { id: "t7-icon3", type: "icon", grid: { x: 8, y: 2, w: 2, h: 2 },
      content: { icon: { kind: "emoji", value: "💧" }, label: { text: "IP57", size: 24 },
        caption: { text: "dust & water resistant", size: 18 }, layout: "top" } },
    { id: "t7-stat2", type: "stat", grid: { x: 10, y: 2, w: 2, h: 2 },
      content: { value: { text: "65%" }, caption: { text: "recycled plastic" } } },
    { id: "t7-head1", type: "headline", grid: { x: 8, y: 4, w: 4, h: 2 },
      content: { text: { text: "Hearing Aid. Hearing Test. Hearing Protection.", size: 38,
        gradient: { from: "#007aff", to: "#5ac8fa", angle: 90 } } } },
  ],
};
```

And extend the `templates` array (keep "Everything (QA)" last):

```ts
export const templates: Template[] = [
  { id: "apple-bento-dark", name: "Apple Bento Dark", doc: appleBentoDark },
  { id: "pixel-light", name: "Pixel Light", doc: pixelLight },
  { id: "spec-sheet-dark", name: "Spec Sheet Dark", doc: specSheetDark },
  { id: "launch-light", name: "Launch Light", doc: launchLight },
  { id: "chip-spec-dark", name: "Chip Spec Dark", doc: chipSpecDark },
  { id: "developer-keynote-light", name: "Developer Keynote Light", doc: developerKeynoteLight },
  { id: "airpods-light", name: "AirPods Light", doc: airpodsLight },
  { id: "everything", name: "Everything (QA)", doc: kitchenSinkDocument() },
];
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/templates/templates.test.ts`
Expected: PASS — including all pre-existing invariant tests (schema-valid, no overlaps, no overrides without textColor) now exercising the three new docs.

- [ ] **Step 5: Typecheck + full frontend suite**

Run: `npx tsc -b && npm test`
Expected: PASS.

## Task 2: Visual size-tuning check + commit

- [ ] **Step 1: Visual check in the editor**

```bash
npm run build
(npx vite preview --port 4173 >/tmp/preview.log 2>&1 &)
sleep 2
```

Write a throwaway script `e2e/.smoke-templates.mjs`:

```js
import { chromium } from "@playwright/test";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
for (const id of ["chip-spec-dark", "developer-keynote-light", "airpods-light"]) {
  await page.goto(`http://localhost:4173/edit?t=${id}`);
  await page.waitForSelector(".react-grid-item");
  await page.waitForTimeout(400);
  await page.screenshot({ path: `e2e/.smoke-${id}.png` });
}
await browser.close();
console.log("done");
```

Run: `node e2e/.smoke-templates.mjs && pkill -f "vite preview"`

Read the three PNGs (they render the actual templates). Check: no text overflowing/clipping in any cell, statGroup rows show dividers, code card shows highlighted Swift, iconRows fit their cells, captions legible. If text overflows a cell, reduce that field's `size` in `src/templates/index.ts` and re-run this step. Then delete the throwaway files:

```bash
rm e2e/.smoke-templates.mjs e2e/.smoke-*.png
```

(Note: the `/edit?t=<id>` URL pattern is confirmed by `e2e/slide.spec.ts:10` which navigates to `/edit?t=apple-bento-dark`.)

- [ ] **Step 2: Run all suites in CI order**

```bash
npm test && npm run build && npm run test:worker && npm run typecheck:worker && npm run e2e
```
Expected: all PASS.

- [ ] **Step 3: Commit**

```bash
git add src/templates docs/superpowers/plans/2026-06-04-showcase-templates.md
git commit -m "feat: three showcase templates for the new card types (chip spec, developer keynote, AirPods)"
```
