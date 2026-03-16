import path from "path";
import { defineConfig } from "vitest/config";
import { createProjectCoverageConfig } from "../vitest.coverage";

const repoRoot = path.resolve(__dirname, "..");

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    name: "ui",
    // Default UI tests to jsdom so interaction coverage can use the same
    // render path as the real board UI.
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    coverage: createProjectCoverageConfig({
      repoRoot,
      reportName: "ui",
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/test/**"],
      // Lock CI to the measured baseline so we fail only on regressions.
      thresholds: {
        statements: 17,
        branches: 51,
        functions: 33,
        lines: 17,
      },
    }),
  },
});
