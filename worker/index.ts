import { Hono } from "hono";
import { slides } from "./slides";
import { upload, images } from "./upload";
import { exportRoute } from "./exportRoute";

export interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  BUCKET: R2Bucket;
  BROWSER: Fetcher;
}

const app = new Hono<{ Bindings: Env }>();

app.get("/api/health", (c) => c.json({ ok: true }));
app.route("/api/slides", slides);
app.route("/api/upload", upload);
app.route("/i", images);
app.route("/api/export", exportRoute);

export default app;
