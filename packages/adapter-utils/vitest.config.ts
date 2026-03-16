import path from "path";
import { defineConfig } from "vitest/config";
import { createProjectCoverageConfig } from "../../vitest.coverage";

const repoRoot = path.resolve(__dirname, "../..");

export default defineConfig({
  test: {
    name: "packages-adapter-utils",
    environment: "node",
    coverage: createProjectCoverageConfig({
      repoRoot,
      reportName: "packages-adapter-utils",
      include: ["src/**/*.ts"],
      // Lock CI to the measured baseline so we fail only on regressions.
      thresholds: {
        statements: 76,
        branches: 78,
        functions: 80,
        lines: 76,
      },
    }),
  },
});
