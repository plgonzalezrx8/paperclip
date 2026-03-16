import path from "path";
import { defineConfig } from "vitest/config";
import { createProjectCoverageConfig } from "../vitest.coverage";

const repoRoot = path.resolve(__dirname, "..");

export default defineConfig({
  test: {
    name: "scripts",
    environment: "node",
    coverage: createProjectCoverageConfig({
      repoRoot,
      reportName: "scripts",
      include: ["*.{js,mjs,ts}"],
    }),
  },
});
