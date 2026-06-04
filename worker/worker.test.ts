import { describe, it, expect } from "vitest";
import { env, createExecutionContext, waitOnExecutionContext } from "cloudflare:test";
import app from "./index";

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
