import { describe, it, expect } from "vitest";
import { env, createExecutionContext, waitOnExecutionContext } from "cloudflare:test";
import app from "./index";
import { blankDocument } from "../src/schema/slide";

export async function request(path: string, init?: RequestInit) {
  const ctx = createExecutionContext();
  const res = await app.fetch(new Request(`http://test.local${path}`, init), env, ctx);
  await waitOnExecutionContext(ctx);
  return res;
}

describe("worker", () => {
  it("GET /api/health returns ok", async () => {
    const res = await request("/api/health");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });
});

describe("slides API", () => {
  const validDoc = () => {
    const doc = blankDocument();
    doc.cards = [{ id: "a", type: "headline", grid: { x: 0, y: 0, w: 4, h: 2 },
      content: { text: { text: "hi" } } }];
    return doc;
  };

  it("POST then GET round-trips a slide", async () => {
    const post = await request("/api/slides", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(validDoc()),
    });
    expect(post.status).toBe(201);
    const { id } = await post.json() as { id: string };
    expect(id).toMatch(/^[A-Za-z0-9_-]{8}$/);

    const get = await request(`/api/slides/${id}`);
    expect(get.status).toBe(200);
    const doc = await get.json();
    expect(doc).toEqual(validDoc());
  });

  it("rejects invalid documents with 400", async () => {
    const res = await request("/api/slides", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ version: 99 }),
    });
    expect(res.status).toBe(400);
  });

  it("rejects oversized documents with 413", async () => {
    const doc = validDoc();
    (doc as { title: string }).title = "x".repeat(250_000);
    const res = await request("/api/slides", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(doc),
    });
    expect(res.status).toBe(413);
  });

  it("404s for unknown slide id", async () => {
    const res = await request("/api/slides/nope1234");
    expect(res.status).toBe(404);
  });
});
