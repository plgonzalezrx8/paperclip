import path from "path";
import { defineConfig } from "vitest/config";
import { createProjectCoverageConfig } from "../../vitest.coverage";

const repoRoot = path.resolve(__dirname, "../..");

export default defineConfig({
  test: {
    name: "packages-shared",
    environment: "node",
    coverage: createProjectCoverageConfig({
      repoRoot,
      reportName: "packages-shared",
      include: ["src/**/*.ts"],
      // Lock CI to the measured baseline so we fail only on regressions.
      thresholds: {
        statements: 95,
        branches: 78,
        functions: 95,
        lines: 95,
      },
    }),
  },
});
