import { Hono } from "hono";
import { slides } from "./slides";
import { upload, images } from "./upload";
import { exportRoute } from "./exportRoute";

export interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  BUCKET: R2Bucket;
  BROWSER: Fetcher;
  RATE_LIMITER: { limit: (opts: { key: string }) => Promise<{ success: boolean }> };
}

const app = new Hono<{ Bindings: Env }>();

app.use("/api/*", async (c, next) => {
  if (c.req.method !== "POST") return next();
  const ip = c.req.header("cf-connecting-ip") ?? "unknown";
  const { success } = await c.env.RATE_LIMITER.limit({ key: ip });
  if (!success) return c.json({ error: "Too many requests — slow down" }, 429);
  return next();
});

app.get("/api/health", (c) => c.json({ ok: true }));
app.route("/api/slides", slides);
app.route("/api/upload", upload);
app.route("/i", images);
app.route("/api/export", exportRoute);

export default app;
