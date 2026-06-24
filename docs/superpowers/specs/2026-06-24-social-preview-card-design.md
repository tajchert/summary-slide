# Social preview card — design

## Goal

When `https://summary-slide.mtajchert.com` is shared on social platforms
(Slack, iMessage, Twitter/X, LinkedIn, Facebook, Discord), show a rich,
clickbait-y preview that communicates the product's key feature:
Apple-keynote-style bento summary slides.

## Scope

- **In:** a single homepage-level social card + Open Graph / Twitter meta tags.
- **Out:** per-share-link (`/s/:id`) dynamic OG images — a separate worker
  feature (consistent with CLAUDE.md "out of scope").

## Why static

The site is an SPA whose `index.html` is served as the static SPA fallback by
the worker (`run_worker_first` only matches `/api/*` and `/i/*`). Social
crawlers do **not** execute JavaScript, so the meta tags and image reference
must be present in the served HTML and the image must be a static asset.

## 1. Meta tags (`index.html` `<head>`)

| tag | value |
|-----|-------|
| `description` | Apple-style summary slides in seconds. Free, in your browser. |
| `og:type` | website |
| `og:site_name` | Summary Slide |
| `og:url` | https://summary-slide.mtajchert.com |
| `og:title` | Your boring bullet points just became a keynote. |
| `og:description` | Apple-style summary slides in seconds. Free, in your browser. |
| `og:image` | https://summary-slide.mtajchert.com/og.png |
| `og:image:width` / `:height` | 1200 / 630 |
| `og:image:alt` | A dark Apple-keynote-style bento summary slide. |
| `twitter:card` | summary_large_image |
| `twitter:title` / `:description` / `:image` | mirror the og:* values |

`<title>` stays "Summary Slide".

## 2. The card image (`public/og.png`, 1200×630)

A genuine dark keynote bento slide as the hero — real cards on the `#1c1c1e`
dark-theme background (`97%` stat, `⚡` icon tile, a stat-group, a headline
tile), rendered in **Inter Variable** using the exact `SLIDE_FONT_FAMILY`
stack so it reads as the actual product. A left-anchored darkening gradient
carries the dominant headline (kept large for feed-thumbnail legibility), the
subline, and a small `summary-slide` wordmark.

Real slide = credibility; big headline = clickbait; one frame.

## 3. Generation

- `scripts/og-card.html` — self-contained source (Inter woff2 base64-embedded,
  reuses the real font stack + theme colors), committed so the card is
  regenerable.
- `scripts/gen-og.mjs` — captures the HTML to `public/og.png` at 1200×630 via
  Playwright (already a dev dependency). Optionally wired as an npm script.

## Verification

- `public/og.png` exists, is 1200×630, and is not blank (bright-pixel sanity).
- Meta tags present in `index.html` and survive `npm run build` into `dist/`.
- Visual check of the rendered PNG.
