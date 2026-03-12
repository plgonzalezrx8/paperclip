import { describe, expect, it, vi } from "vitest";
import { subsystemHealthService } from "../services/subsystem-health.js";

function thenableRows(rows: unknown[]) {
  return {
    then(onFulfilled?: (value: unknown[]) => unknown, onRejected?: (reason: unknown) => unknown) {
      return Promise.resolve(rows).then(onFulfilled, onRejected);
    },
  };
}

function createDbWithSelectSequence(...responses: unknown[][]) {
  let index = 0;
  const nextRows = () => responses[index++] ?? [];

  return {
    select() {
      return {
        from() {
          return {
            where() {
              return thenableRows(nextRows());
            },
            then(onFulfilled?: (value: unknown[]) => unknown, onRejected?: (reason: unknown) => unknown) {
              return Promise.resolve(nextRows()).then(onFulfilled, onRejected);
            },
          };
        },
      };
    },
  } as any;
}

describe("subsystemHealthService", () => {
  it("reports qmd as degraded but non-blocking when the binary is missing", async () => {
    const service = subsystemHealthService(createDbWithSelectSequence([{ count: 1 }]), {
      authReady: true,
      companyDeletionEnabled: true,
      databaseConnectionString: "postgres://paperclip.test/app",
      deploymentExposure: "private",
      deploymentMode: "local_trusted",
      inspectMigrationsFn: vi.fn().mockResolvedValue({
        status: "upToDate",
        tableCount: 12,
        availableMigrations: ["0028_lazy_hemingway.sql"],
        appliedMigrations: ["0028_lazy_hemingway.sql"],
      }),
      resolveCommand: vi.fn().mockResolvedValue({ found: false, resolvedPath: null }),
      runAdapterEnvironmentTest: vi.fn().mockResolvedValue({
        adapterType: "codex_local",
        status: "pass",
        checks: [{ code: "ready", level: "info", message: "Runtime is ready." }],
        testedAt: "2026-03-09T10:00:00.000Z",
      }),
    });

    const snapshot = await service.getSnapshot({ companyId: "company-1" });
    const database = snapshot.checks.find((check) => check.id === "database");
    const qmd = snapshot.checks.find((check) => check.id === "qmd");

    expect(snapshot.status).toBe("yellow");
    expect(database?.status).toBe("green");
    expect(qmd).toMatchObject({
      status: "yellow",
      blocking: false,
    });
  });

  it("marks pending migrations as blocking failures while keeping adapter warnings advisory", async () => {
    const service = subsystemHealthService(createDbWithSelectSequence([{ count: 1 }]), {
      authReady: true,
      companyDeletionEnabled: true,
      databaseConnectionString: "postgres://paperclip.test/app",
      deploymentExposure: "private",
      deploymentMode: "local_trusted",
      inspectMigrationsFn: vi.fn().mockResolvedValue({
        status: "needsMigrations",
        tableCount: 12,
        availableMigrations: ["0027_old.sql", "0028_lazy_hemingway.sql"],
        appliedMigrations: ["0027_old.sql"],
        pendingMigrations: ["0028_lazy_hemingway.sql"],
        reason: "pending-migrations",
      }),
      resolveCommand: vi.fn().mockResolvedValue({ found: true, resolvedPath: "/usr/local/bin/qmd" }),
      runAdapterEnvironmentTest: vi.fn().mockResolvedValue({
        adapterType: "codex_local",
        status: "warn",
        checks: [
          {
            code: "missing_cli",
            level: "warn",
            message: "Codex CLI is not configured.",
            hint: "Install or configure the Codex runtime on this host.",
          },
        ],
        testedAt: "2026-03-09T10:00:00.000Z",
      }),
    });

    const snapshot = await service.getSnapshot({ companyId: "company-1" });
    const database = snapshot.checks.find((check) => check.id === "database");
    const codex = snapshot.checks.find((check) => check.id === "codex_local");

    expect(snapshot.status).toBe("red");
    expect(database).toMatchObject({
      status: "red",
      blocking: true,
    });
    expect(codex).toMatchObject({
      status: "yellow",
      blocking: false,
    });
  });
});
