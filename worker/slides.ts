import { Hono } from "hono";
import { sha256Hex } from "./hash";
import { slideDocumentSchema } from "../src/schema/slide";
import type { Env } from "./index";

const MAX_DOC_BYTES = 200_000;

export const slides = new Hono<{ Bindings: Env }>();

slides.post("/", async (c) => {
  const raw = await c.req.text();
  // Byte-accurate cap: string .length under-counts multi-byte UTF-8 (emoji in cards).
  if (new TextEncoder().encode(raw).byteLength > MAX_DOC_BYTES) {
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
  // Content-addressed id: zod's output follows schema key order, so identical docs serialize
  // (and hash) identically whatever the input key order. Re-sharing an unchanged doc reuses
  // its row and its HQ-export cache; any edit yields a new id, so stored docs stay immutable.
  const json = JSON.stringify(result.data);
  const id = await sha256Hex(new TextEncoder().encode(json));
  await c.env.DB.prepare(
    "INSERT OR IGNORE INTO slides (id, doc, created_at) VALUES (?, ?, ?)"
  ).bind(id, json, Date.now()).run();
  return c.json({ id }, 201);
});

slides.get("/:id", async (c) => {
  const row = await c.env.DB.prepare("SELECT doc FROM slides WHERE id = ?")
    .bind(c.req.param("id")).first<{ doc: string }>();
  // No cache header on 404: a content id that's missing now can exist after its first POST.
  if (!row) return c.json({ error: "Not found" }, 404);
  return c.body(row.doc, 200, {
    "content-type": "application/json",
    "cache-control": "public, max-age=31536000, immutable",
  });
});
