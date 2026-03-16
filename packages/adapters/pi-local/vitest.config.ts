import path from "path";
import { defineConfig } from "vitest/config";
import { createProjectCoverageConfig } from "../../../vitest.coverage";

const repoRoot = path.resolve(__dirname, "../../..");

export default defineConfig({
  test: {
    name: "adapter-pi-local",
    environment: "node",
    coverage: createProjectCoverageConfig({
      repoRoot,
      reportName: "adapter-pi-local",
      include: ["src/**/*.ts"],
      // Lock CI to the measured baseline so we fail only on regressions.
      thresholds: {
        statements: 28,
        branches: 72,
        functions: 27,
        lines: 28,
      },
    }),
  },
});
