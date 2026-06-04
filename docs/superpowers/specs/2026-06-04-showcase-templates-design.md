# Showcase templates for the new card types — design

Date: 2026-06-04
Status: approved

## Motivation

The five new card capabilities (`iconRow`, `icon` caption, `statGroup`, `code`,
image-overlay `bottom`) shipped without any built-in template using them. Add three
templates modeled on the Apple reference slides in `examples/` so the start page
showcases the new cards and gives users editable starting points.

## Approach (approved: Option A)

Three new `SlideDocument` consts appended to `src/templates/index.ts`, following the
existing pattern exactly (pure data, `t5-`/`t6-`/`t7-` card-id prefixes, registered in
the `templates` array before "Everything (QA)"). No new files besides the spec/plan.
StartPage thumbnails render automatically through `SlideRenderer`.

Constraints carried over from existing templates:
- **Zero card background overrides** — all cards follow theme tokens so the
  light/dark toggle restyles the whole slide (and the override⇒textColor test stays trivially green).
- Canvas 1920×1080, 12×6 grid, no overlapping cards (enforced by `templates.test.ts`).
- All text content fits its cell at the specified sizes (review in editor during implementation;
  adjust `size` per field like existing templates do).

## Template 1: "Chip Spec Dark" (`chip-spec-dark`)

Inspired by `examples/mac-m3-family-2023.webp` + `examples/mac-pro-2023.webp`.
Theme: `mode: "dark"`, accent `#30d158`, background solid `#000000`, radius 24, gap 14.

| Card | Grid | Content |
|---|---|---|
| statGroup column | x0,y0,w2,h3 | "Up to **16-core** CPU" / "Up to **40-core** GPU" |
| statGroup column | x0,y3,w2,h3 | "Up to **128GB** unified memory" / "Up to **8TB** SSD storage" |
| hero | x2,y0,w6,h4 | "M4 Pro", size ~120, gradient `#30d158 → #5af` |
| iconRow | x2,y4,w6,h1 | ⚡ "Thunderbolt 5" · 🔌 "MagSafe 3" · 🖥 "HDMI" (no group caption — h1 cell) |
| icon (caption, layout left) | x2,y5,w6,h1 | 🧠 "Neural Engine" / caption "38 trillion operations per second" |
| headline | x8,y0,w4,h1 | "3-nanometer technology", size ~36 |
| stat | x8,y1,w2,h2 | prefix "Up to", value "2.5x" (accent color), caption "faster GPU rendering" |
| stat | x10,y1,w2,h2 | value "92B" caption "transistors" |
| statGroup row | x8,y3,w4,h2 | "120GB/s" caption "M4" \| "273GB/s" caption "M4 Pro" (values size ~40) |
| headline | x8,y5,w4,h1 | "Faster 16-core Neural Engine", size ~32 |

## Template 2: "Developer Keynote Light" (`developer-keynote-light`)

Inspired by `examples/developers-sotu-wwdc2025.webp` (a light slide).
Theme: `mode: "light"`, accent `#ff9500`, background solid `#ececf0`, radius 24, gap 14.

| Card | Grid | Content |
|---|---|---|
| hero | x0,y0,w4,h2 | "Swift 6", size ~80 |
| code | x4,y0,w5,h3 | language swift, title "Foundation Models", code:<br>`let session = LanguageModelSession()`<br>`let response = try await`<br>`  session.respond(to: "Tell a joke")` |
| image (overlay bottom) | x9,y0,w3,h2 | src "", fit cover, overlay text "visionOS 26", placement `bottom` |
| icon (caption) | x0,y2,w2,h2 | 🧩 "SwiftUI" / caption "Crafting experiences", layout top |
| icon (caption) | x2,y2,w2,h2 | 📦 "Containerization" / caption "Linux on Mac", layout top |
| list | x4,y3,w5,h3 | title "Swift highlights", marker none, items: Fast / Expressive / Safe / Interoperable |
| stat | x9,y2,w3,h2 | prefix "Up to", value "2x", caption "faster Swift builds" |
| iconRow | x0,y4,w4,h2 | 🛠 "Xcode 26" · 🎨 "Icon Composer" · 📊 "Swift Charts", group caption "Developer tools" |
| headline | x9,y4,w3,h2 | "New design with Liquid Glass", size ~34, gradient `#0a84ff → #bf5af2` |

## Template 3: "AirPods Light" (`airpods-light`)

Inspired by `examples/airpods-4-2024.webp` + `examples/airpods-pro-3-2025.webp`.
Theme: `mode: "light"`, accent `#007aff`, background solid `#f5f5f7`, radius 28, gap 14.

| Card | Grid | Content |
|---|---|---|
| icon (caption) | x0,y0,w2,h2 | 🎧 "Spatial audio" / caption "with dynamic head tracking", layout top |
| icon (caption) | x2,y0,w2,h2 | ❤️ "Heart rate sensor" / caption "during workouts", layout top |
| image (overlay bottom) | x0,y2,w4,h2 | src "", fit cover, overlay "Best-fitting AirPods ever", placement `bottom` |
| iconRow | x0,y4,w4,h2 | 🏃 "Run" · 🚴 "Ride" · 🧘 "Yoga", group caption "iOS Workout experience" |
| hero | x4,y0,w4,h4 | "AirPods Pro", size ~92 |
| statGroup row | x4,y4,w4,h2 | "8 hrs" caption "Active Noise Cancellation" \| "10 hrs" caption "with Hearing Aid" (values size ~44) |
| stat | x8,y0,w4,h2 | prefix "Up to", value "2x", caption "more Active Noise Cancellation" |
| icon (caption) | x8,y2,w2,h2 | 💧 "IP57" / caption "dust & water resistant", layout top |
| stat | x10,y2,w2,h2 | value "65%", caption "recycled plastic" |
| headline | x8,y4,w4,h2 | "Hearing Aid. Hearing Test. Hearing Protection.", size ~38, gradient `#007aff → #5ac8fa` |

## Testing

- Existing `src/templates/templates.test.ts` invariants cover the new entries automatically
  (schema-valid, no overlap/out-of-bounds, override⇒textColor, light+dark coverage).
- New test in the same file: **showcase coverage** — across all built-in templates, each of
  `iconRow`, `statGroup`, `code` appears in at least one template, and at least one image
  card uses overlay placement `bottom`, and at least one icon card has a `caption`.
- Visual check during implementation: load each template in the editor, confirm no text
  overflows its cell; adjust per-field `size` values as needed (the table sizes are starting
  points, not contracts).

## Out of scope

- Replacing image-card `src:""` placeholders with bundled artwork (templates keep the
  established empty-src + "Add an image" placeholder convention).
- Start-page redesign; template ordering beyond "before Everything (QA)".
