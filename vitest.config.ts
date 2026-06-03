import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  // vitest@3 bundles its own (rollup-based) vite typings, which differ from the
  // project's vite@8 (rolldown-based) Plugin type; cast to reconcile the skew.
  plugins: [react() as never],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test-setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    passWithNoTests: true,
  },
});
