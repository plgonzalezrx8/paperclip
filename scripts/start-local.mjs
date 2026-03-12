#!/usr/bin/env node
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");

const requiredRuntimeFiles = [
  {
    label: "server tsx runtime",
    relativePath: "server/node_modules/tsx/dist/cli.mjs",
  },
  {
    label: "server detect-port runtime",
    relativePath: "server/node_modules/detect-port/dist/esm/index.js",
  },
];

const missingRuntimeFiles = requiredRuntimeFiles.filter((entry) =>
  !existsSync(path.resolve(repoRoot, entry.relativePath)),
);

if (missingRuntimeFiles.length > 0) {
  const missingList = missingRuntimeFiles
    .map((entry) => `- ${entry.label}: ${entry.relativePath}`)
    .join("\n");
  console.error(
    [
      "[paperclip] Startup dependencies are incomplete.",
      "Run `pnpm install` first. If that does not fix it, remove `node_modules` and reinstall.",
      "Missing runtime files:",
      missingList,
    ].join("\n"),
  );
  process.exit(1);
}

const child = spawn(
  process.execPath,
  [path.resolve(scriptDir, "dev-runner.mjs"), "dev", ...process.argv.slice(2)],
  {
    stdio: "inherit",
    env: process.env,
  },
);

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
