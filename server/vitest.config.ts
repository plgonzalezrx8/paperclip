import path from "path";
import { defineConfig } from "vitest/config";
import { createProjectCoverageConfig } from "../vitest.coverage";

const repoRoot = path.resolve(__dirname, "..");

export default defineConfig({
  test: {
    name: "server",
    environment: "node",
    // Keep the server suite deterministic because integration tests boot the
    // full app, embedded Postgres, and background run workers.
    fileParallelism: false,
    minWorkers: 1,
    maxWorkers: 1,
    coverage: createProjectCoverageConfig({
      repoRoot,
      reportName: "server",
      include: ["src/**/*.ts"],
      exclude: ["src/test-support/**"],
      // Lock CI to the measured baseline so we fail only on regressions.
      thresholds: {
        statements: 37,
        branches: 57,
        functions: 52,
        lines: 37,
      },
    }),
  },
});
