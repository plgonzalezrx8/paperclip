import path from "path";
import { defineConfig } from "vitest/config";
import { createProjectCoverageConfig } from "../../vitest.coverage";

const repoRoot = path.resolve(__dirname, "../..");

export default defineConfig({
  test: {
    name: "packages-db",
    environment: "node",
    coverage: createProjectCoverageConfig({
      repoRoot,
      reportName: "packages-db",
      include: ["src/**/*.ts"],
    }),
  },
});
