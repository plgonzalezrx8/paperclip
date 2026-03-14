import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  resolveNodeWorkspaceBootstrap,
  shouldInstallWorkspaceBootstrap,
  type ResolvedNodeWorkspaceBootstrap,
} from "../services/heartbeat.js";

async function withTempWorkspace(run: (workspacePath: string) => Promise<void>) {
  const workspacePath = await fs.mkdtemp(path.join(os.tmpdir(), "paperclip-heartbeat-"));
  try {
    await run(workspacePath);
  } finally {
    await fs.rm(workspacePath, { recursive: true, force: true });
  }
}

describe("workspace bootstrap helpers", () => {
  it("prefers the highest-priority lockfile when multiple package managers are present", async () => {
    await withTempWorkspace(async (workspacePath) => {
      await fs.writeFile(path.join(workspacePath, "package.json"), "{}\n", "utf8");
      await fs.writeFile(path.join(workspacePath, "pnpm-lock.yaml"), "lockfileVersion: '9.0'\n", "utf8");
      await fs.writeFile(path.join(workspacePath, "package-lock.json"), "{\n  \"lockfileVersion\": 3\n}\n", "utf8");

      const bootstrap = await resolveNodeWorkspaceBootstrap(workspacePath);

      expect(bootstrap).not.toBeNull();
      expect(bootstrap?.packageManager).toBe("pnpm");
      expect(path.basename(bootstrap?.lockfilePath ?? "")).toBe("pnpm-lock.yaml");
      expect(bootstrap?.installCommand).toBe("pnpm install --frozen-lockfile");
    });
  });

  it("skips reinstall when node_modules is present and the recorded bootstrap state still matches", () => {
    const bootstrap: ResolvedNodeWorkspaceBootstrap = {
      lockfile: "pnpm-lock.yaml",
      packageManager: "pnpm",
      installArgs: ["install", "--frozen-lockfile"],
      installCommand: "pnpm install --frozen-lockfile",
      lockfilePath: "/tmp/project/pnpm-lock.yaml",
      lockfileSha256: "abc123",
    };

    expect(
      shouldInstallWorkspaceBootstrap({
        bootstrap,
        nodeModulesPresent: true,
        bootstrapMetadata: {
          status: "succeeded",
          installCommand: "pnpm install --frozen-lockfile",
          lockfileSha256: "abc123",
        },
      }),
    ).toBe(false);
  });

  it("reinstalls when the lockfile changes, node_modules is missing, or the last bootstrap failed", () => {
    const bootstrap: ResolvedNodeWorkspaceBootstrap = {
      lockfile: "pnpm-lock.yaml",
      packageManager: "pnpm",
      installArgs: ["install", "--frozen-lockfile"],
      installCommand: "pnpm install --frozen-lockfile",
      lockfilePath: "/tmp/project/pnpm-lock.yaml",
      lockfileSha256: "next-hash",
    };

    expect(
      shouldInstallWorkspaceBootstrap({
        bootstrap,
        nodeModulesPresent: true,
        bootstrapMetadata: {
          status: "succeeded",
          installCommand: "pnpm install --frozen-lockfile",
          lockfileSha256: "previous-hash",
        },
      }),
    ).toBe(true);

    expect(
      shouldInstallWorkspaceBootstrap({
        bootstrap,
        nodeModulesPresent: false,
        bootstrapMetadata: {
          status: "succeeded",
          installCommand: "pnpm install --frozen-lockfile",
          lockfileSha256: "next-hash",
        },
      }),
    ).toBe(true);

    expect(
      shouldInstallWorkspaceBootstrap({
        bootstrap,
        nodeModulesPresent: true,
        bootstrapMetadata: {
          status: "failed",
          installCommand: "pnpm install --frozen-lockfile",
          lockfileSha256: "next-hash",
        },
      }),
    ).toBe(true);
  });
});
