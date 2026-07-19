import { defineConfig } from "vitest/config";
import path from "path";

// Pure-logic unit tests only for now (no React plugin / jsdom) — this
// project runs on a bleeding-edge Next.js/React stack (see AGENTS.md) where
// @vitejs/plugin-react's optional Babel-8 peer conflicts with an existing
// Babel-7 devDependency. Component-rendering tests can be added once that's
// resolved; this still covers real regressions in business logic.
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  test: {
    environment: "node",
    include: ["**/*.test.ts"],
    exclude: ["node_modules", ".next"],
  },
});
