import path from "path";
import { defineConfig } from "vitest/config";
import { createProjectCoverageConfig } from "../vitest.coverage";

const repoRoot = path.resolve(__dirname, "..");

export default defineConfig({
  test: {
    name: "cli",
    environment: "node",
    coverage: createProjectCoverageConfig({
      repoRoot,
      reportName: "cli",
      include: ["src/**/*.ts"],
      // Lock CI to the measured baseline so we fail only on regressions.
      thresholds: {
        statements: 85,
        branches: 65,
        functions: 73,
        lines: 85,
      },
    }),
  },
});
