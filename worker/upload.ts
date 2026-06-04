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
  const bytes = await obj.arrayBuffer();
  return c.body(bytes, 200, {
    "content-type": obj.httpMetadata?.contentType ?? "application/octet-stream",
    "cache-control": "public, max-age=31536000, immutable",
  });
});
