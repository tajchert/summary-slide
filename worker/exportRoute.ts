import { Hono } from "hono";
import { z } from "zod";
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

  const { default: puppeteer } = await import("@cloudflare/puppeteer");
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
