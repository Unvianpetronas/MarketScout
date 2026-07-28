import { defineConfig } from "vitest/config";
import path from "path";

// No @vitejs/plugin-react on purpose: its optional Babel-8 peer conflicts with
// an existing Babel-7 devDependency on this stack (see AGENTS.md). It is not
// needed either — Vitest 4 transforms TSX with oxc, which picks up
// "jsx": "react-jsx" from tsconfig.json and uses the automatic runtime. The
// plugin only adds Fast Refresh and Babel plugins, neither of which matters
// under test. (Setting `esbuild.jsx` here does nothing — oxc takes precedence
// and Vitest warns that the esbuild options are ignored.)
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  test: {
    // Node by default (pure-logic suites). Component tests opt into jsdom with
    // a `@vitest-environment jsdom` docblock, so they don't slow the rest down.
    environment: "node",
    include: ["**/*.test.ts", "**/*.test.tsx"],
    exclude: ["node_modules", ".next"],
  },
});
