import path from "node:path";
import { defineWorkersConfig, readD1Migrations } from "@cloudflare/vitest-pool-workers/config";

export default defineWorkersConfig(async () => {
  const migrations = await readD1Migrations(path.join(__dirname, "../migrations"));
  return {
    test: {
      include: ["worker/**/*.test.ts"],
      setupFiles: ["./worker/apply-migrations.ts"],
      poolOptions: {
        workers: {
          wrangler: { configPath: "../wrangler.jsonc" },
          miniflare: {
            bindings: { TEST_MIGRATIONS: migrations },
            ratelimits: { RATE_LIMITER: { simple: { limit: 30, period: 60 } } },
          },
        },
      },
    },
  };
});
