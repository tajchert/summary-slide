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

  const post = (body: string) => request("/api/slides", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
  });
  const postId = async (body: string) => ((await (await post(body)).json()) as { id: string }).id;

  it("POST then GET round-trips a slide", async () => {
    const res = await post(JSON.stringify(validDoc()));
    expect(res.status).toBe(201);
    const { id } = await res.json() as { id: string };
    expect(id).toMatch(/^[a-f0-9]{16}$/);

    const get = await request(`/api/slides/${id}`);
    expect(get.status).toBe(200);
    const doc = await get.json();
    expect(doc).toEqual(validDoc());
  });

  it("ids are content-addressed: same doc, same id, one row", async () => {
    const doc = validDoc();
    doc.title = "dedupe me";
    const a = await postId(JSON.stringify(doc));
    const b = await postId(JSON.stringify(doc));
    expect(b).toBe(a);
    const { n } = (await env.DB.prepare("SELECT COUNT(*) AS n FROM slides WHERE id = ?")
      .bind(a).first<{ n: number }>())!;
    expect(n).toBe(1);
  });

  it("ids ignore input key order but change with content", async () => {
    const doc = validDoc();
    doc.title = "key order";
    const reordered = { cards: doc.cards, theme: doc.theme, canvas: doc.canvas, title: doc.title, version: 1 };
    const a = await postId(JSON.stringify(doc));
    expect(await postId(JSON.stringify(reordered))).toBe(a);
    expect(await postId(JSON.stringify({ ...doc, title: "key order 2" }))).not.toBe(a);
  });

  it("serves stored slides as immutable, but never caches a 404", async () => {
    const id = await postId(JSON.stringify(validDoc()));
    const hit = await request(`/api/slides/${id}`);
    expect(hit.headers.get("cache-control")).toContain("immutable");
    const miss = await request("/api/slides/0000000000000000");
    expect(miss.status).toBe(404);
    expect(miss.headers.get("cache-control") ?? "").not.toContain("immutable");
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

  it("rejects files over 3MB", async () => {
    const form = new FormData();
    form.append("file", new Blob([new Uint8Array(3 * 1024 * 1024 + 1)], { type: "image/webp" }), "big.webp");
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

  it("serves a cached export for this deploy without launching a browser", async () => {
    const doc = blankDocument();
    doc.title = "cached export";
    const posted = await request("/api/slides", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(doc),
    });
    const { id } = await posted.json() as { id: string };
    // Key is scoped per deploy: same doc ids survive deploys, renderer changes must not serve stale PNGs.
    const key = `exports/${env.CF_VERSION_METADATA.id}/${id}-2x.png`;
    await env.BUCKET.put(key, new Uint8Array([1]), { httpMetadata: { contentType: "image/png" } });

    const res = await request("/api/export", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, scale: 2 }),
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ url: `/i/${key}` });
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
