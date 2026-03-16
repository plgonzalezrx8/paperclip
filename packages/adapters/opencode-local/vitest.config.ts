import path from "path";
import { defineConfig } from "vitest/config";
import { createProjectCoverageConfig } from "../../../vitest.coverage";

const repoRoot = path.resolve(__dirname, "../../..");

export default defineConfig({
  test: {
    name: "adapter-opencode-local",
    environment: "node",
    coverage: createProjectCoverageConfig({
      repoRoot,
      reportName: "adapter-opencode-local",
      include: ["src/**/*.ts"],
      // Lock CI to the measured baseline so we fail only on regressions.
      thresholds: {
        statements: 40,
        branches: 55,
        functions: 60,
        lines: 40,
      },
    }),
  },
});
