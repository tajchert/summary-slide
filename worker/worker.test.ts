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

describe("upload API", () => {
  const png = () => {
    // minimal PNG magic bytes + padding
    const bytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
    return new Blob([bytes], { type: "image/png" });
  };

  it("uploads a PNG and serves it back via /i/:key", async () => {
    const form = new FormData();
    form.append("file", png(), "photo.png");
    const up = await request("/api/upload", { method: "POST", body: form });
    expect(up.status).toBe(201);
    const { url } = await up.json() as { url: string };
    expect(url).toMatch(/^\/i\/images\/[a-f0-9]{16}\.png$/);

    const img = await request(url);
    expect(img.status).toBe(200);
    expect(img.headers.get("content-type")).toBe("image/png");
    expect(img.headers.get("cache-control")).toContain("immutable");
  });

  it("rejects disallowed content types", async () => {
    const form = new FormData();
    form.append("file", new Blob([new Uint8Array(4)], { type: "image/svg+xml" }), "x.svg");
    const res = await request("/api/upload", { method: "POST", body: form });
    expect(res.status).toBe(415);
  });

  it("rejects files over 10MB", async () => {
    const form = new FormData();
    form.append("file", new Blob([new Uint8Array(10 * 1024 * 1024 + 1)], { type: "image/png" }), "big.png");
    const res = await request("/api/upload", { method: "POST", body: form });
    expect(res.status).toBe(413);
  });

  it("404s for missing image keys", async () => {
    const res = await request("/i/images/0000000000000000.png");
    expect(res.status).toBe(404);
  });
});

describe("export API validation", () => {
  it("rejects missing id", async () => {
    const res = await request("/api/export", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ scale: 2 }),
    });
    expect(res.status).toBe(400);
  });

  it("rejects out-of-range scale", async () => {
    const res = await request("/api/export", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: "abc12345", scale: 9 }),
    });
    expect(res.status).toBe(400);
  });

  it("404s for unknown slide id before launching a browser", async () => {
    const res = await request("/api/export", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: "missing1", scale: 2 }),
    });
    expect(res.status).toBe(404);
  });
});

describe("rate limiting", () => {
  it("returns 429 when the limiter denies", async () => {
    const orig = env.RATE_LIMITER;
    (env as { RATE_LIMITER: unknown }).RATE_LIMITER = { limit: async () => ({ success: false }) };
    try {
      const res = await request("/api/slides", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{}",
      });
      expect(res.status).toBe(429);
    } finally {
      // unconditional restore so a mid-flight throw can't leak the denying stub into later tests
      (env as { RATE_LIMITER: unknown }).RATE_LIMITER = orig;
    }
  });
});
