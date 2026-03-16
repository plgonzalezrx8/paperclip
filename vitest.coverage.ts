import path from "path";

type CoverageThresholds = {
  statements: number;
  branches: number;
  functions: number;
  lines: number;
};

type CoverageConfigInput = {
  reportName: string;
  repoRoot: string;
  include: string[];
  exclude?: string[];
  thresholds?: CoverageThresholds;
};

const DEFAULT_EXCLUDES = [
  "**/*.d.ts",
  "**/*.test.*",
  "**/*.spec.*",
  "**/__tests__/**",
  "**/test/**",
  "**/dist/**",
  "**/node_modules/**",
  "**/coverage/**",
];

export function createProjectCoverageConfig(input: CoverageConfigInput) {
  return {
    provider: "v8" as const,
    all: true,
    include: input.include,
    exclude: [...DEFAULT_EXCLUDES, ...(input.exclude ?? [])],
    reporter: ["text-summary", "json-summary", "html"] as const,
    reportsDirectory: path.resolve(input.repoRoot, "coverage", input.reportName),
    thresholds: input.thresholds,
  };
}
