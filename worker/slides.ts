import { Hono } from "hono";
import { nanoid } from "nanoid";
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
