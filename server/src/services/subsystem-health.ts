import { constants as fsConstants } from "node:fs";
import { access } from "node:fs/promises";
import path from "node:path";
import type { Db, MigrationState } from "@paperclipai/db";
import { companies, instanceUserRoles, inspectMigrations } from "@paperclipai/db";
import { count, eq } from "drizzle-orm";
import type {
  AdapterEnvironmentTestResult,
  DeploymentExposure,
  DeploymentMode,
  HealthStatus,
  SubsystemHealthCheck,
  SubsystemHealthResponse,
} from "@paperclipai/shared";
import { findServerAdapter } from "../adapters/index.js";

type CommandCheckResult = {
  found: boolean;
  resolvedPath: string | null;
};

type SubsystemHealthOptions = {
  authReady: boolean;
  companyDeletionEnabled: boolean;
  databaseConnectionString?: string | null;
  deploymentExposure: DeploymentExposure;
  deploymentMode: DeploymentMode;
  inspectMigrationsFn?: (connectionString: string) => Promise<MigrationState>;
  runAdapterEnvironmentTest?: (
    adapterType: string,
    input: { companyId: string; config: Record<string, unknown> },
  ) => Promise<AdapterEnvironmentTestResult>;
  resolveCommand?: (command: string) => Promise<CommandCheckResult>;
};

type SnapshotInput = {
  companyId: string;
};

const LOCAL_ADAPTER_DIAGNOSTICS = [
  { type: "codex_local", label: "Codex" },
  { type: "claude_local", label: "Claude" },
  { type: "opencode_local", label: "OpenCode" },
  { type: "cursor", label: "Cursor" },
  { type: "pi_local", label: "Pi" },
] as const;

const COMMAND_EXTENSIONS =
  process.platform === "win32"
    ? (process.env.PATHEXT ?? ".EXE;.CMD;.BAT;.COM")
        .split(";")
        .map((entry) => entry.toLowerCase())
        .filter(Boolean)
    : [""];

async function resolveCommandOnPath(command: string): Promise<CommandCheckResult> {
  const pathValue = process.env.PATH ?? process.env.Path ?? "";
  const delimiter = process.platform === "win32" ? ";" : ":";
  const pathEntries = pathValue.split(delimiter).filter(Boolean);
  const hasPathSeparator = command.includes("/") || command.includes("\\");
  const directCandidates = hasPathSeparator
    ? [path.isAbsolute(command) ? command : path.resolve(process.cwd(), command)]
    : pathEntries.flatMap((dir) =>
        COMMAND_EXTENSIONS.map((extension) =>
          path.join(
            dir,
            process.platform === "win32" && extension
              ? `${command}${extension}`
              : command,
          ),
        ),
      );

  for (const candidate of directCandidates) {
    try {
      await access(candidate, fsConstants.X_OK);
      return { found: true, resolvedPath: candidate };
    } catch {
      // Keep scanning PATH candidates until one resolves.
    }
  }

  return { found: false, resolvedPath: null };
}

function summarizeChecks(checks: AdapterEnvironmentTestResult["checks"]) {
  const firstError = checks.find((check) => check.level === "error") ?? null;
  if (firstError) {
    return {
      status: "red" as const,
      summary: firstError.message,
      detail: firstError.detail ?? null,
      hint: firstError.hint ?? null,
    };
  }

  const firstWarning = checks.find((check) => check.level === "warn") ?? null;
  if (firstWarning) {
    return {
      status: "yellow" as const,
      summary: firstWarning.message,
      detail: firstWarning.detail ?? null,
      hint: firstWarning.hint ?? null,
    };
  }

  const firstInfo = checks.find((check) => check.level === "info") ?? null;
  return {
    status: "green" as const,
    summary: firstInfo?.message ?? "Environment check passed.",
    detail: firstInfo?.detail ?? null,
    hint: firstInfo?.hint ?? null,
  };
}

function overallStatus(checks: SubsystemHealthCheck[]): HealthStatus {
  if (checks.some((check) => check.status === "red")) return "red";
  if (checks.some((check) => check.status === "yellow")) return "yellow";
  if (checks.some((check) => check.status === "green")) return "green";
  return "unknown";
}

export function subsystemHealthService(db: Db, opts: SubsystemHealthOptions) {
  const inspectMigrationsFn = opts.inspectMigrationsFn ?? inspectMigrations;
  const resolveCommand = opts.resolveCommand ?? resolveCommandOnPath;
  const runAdapterEnvironmentTest =
    opts.runAdapterEnvironmentTest ??
    (async (adapterType: string, input: { companyId: string; config: Record<string, unknown> }) => {
      const adapter = findServerAdapter(adapterType);
      if (!adapter?.testEnvironment) {
        return {
          adapterType,
          status: "warn",
          checks: [
            {
              code: `${adapterType}_missing_test`,
              level: "warn",
              message: "Adapter does not expose an environment test.",
              hint: "Add a testEnvironment implementation for this adapter.",
            },
          ],
          testedAt: new Date().toISOString(),
        } satisfies AdapterEnvironmentTestResult;
      }

      return adapter.testEnvironment({
        companyId: input.companyId,
        adapterType,
        config: input.config,
      });
    });

  async function databaseCheck(): Promise<SubsystemHealthCheck> {
    const testedAt = new Date().toISOString();

    try {
      await db.select({ count: count() }).from(companies);
      if (!opts.databaseConnectionString) {
        return {
          id: "database",
          label: "Database",
          status: "green",
          summary: "Database is reachable.",
          detail: "Migration readiness check was skipped because no connection string was provided.",
          hint: null,
          blocking: true,
          testedAt,
        };
      }

      const migrationState = await inspectMigrationsFn(opts.databaseConnectionString);
      if (migrationState.status === "upToDate") {
        return {
          id: "database",
          label: "Database",
          status: "green",
          summary: "Database is reachable and migrations are current.",
          detail: `${migrationState.appliedMigrations.length} migrations applied.`,
          hint: null,
          blocking: true,
          testedAt,
        };
      }

      const pendingSummary =
        migrationState.pendingMigrations.length > 3
          ? `${migrationState.pendingMigrations.slice(0, 3).join(", ")} (+${migrationState.pendingMigrations.length - 3} more)`
          : migrationState.pendingMigrations.join(", ");

      return {
        id: "database",
        label: "Database",
        status: "red",
        summary: "Database is reachable, but migrations are pending.",
        detail: pendingSummary || migrationState.reason,
        hint: "Run the pending migrations before relying on this instance for normal work.",
        blocking: true,
        testedAt,
      };
    } catch (error) {
      return {
        id: "database",
        label: "Database",
        status: "red",
        summary: "Database connectivity check failed.",
        detail: error instanceof Error ? error.message : String(error),
        hint: "Verify the configured database is reachable and the schema is initialized.",
        blocking: true,
        testedAt,
      };
    }
  }

  async function deploymentCheck(): Promise<SubsystemHealthCheck> {
    const testedAt = new Date().toISOString();

    try {
      let bootstrapStatus: "ready" | "bootstrap_pending" = "ready";
      if (opts.deploymentMode === "authenticated") {
        const roleCount = await db
          .select({ count: count() })
          .from(instanceUserRoles)
          .where(eq(instanceUserRoles.role, "instance_admin"))
          .then((rows) => Number(rows[0]?.count ?? 0));
        bootstrapStatus = roleCount > 0 ? "ready" : "bootstrap_pending";
      }

      if (!opts.authReady) {
        return {
          id: "deployment",
          label: "Deployment",
          status: "red",
          summary: "Authentication is not ready.",
          detail: `Mode: ${opts.deploymentMode}; exposure: ${opts.deploymentExposure}.`,
          hint: "Finish auth setup before allowing managers or agents to operate normally.",
          blocking: true,
          testedAt,
        };
      }

      if (bootstrapStatus === "bootstrap_pending") {
        return {
          id: "deployment",
          label: "Deployment",
          status: "yellow",
          summary: "Deployment is up, but the first instance admin has not been created.",
          detail: `Mode: ${opts.deploymentMode}; exposure: ${opts.deploymentExposure}.`,
          hint: "Create the first instance admin so board access can be claimed.",
          blocking: true,
          testedAt,
        };
      }

      return {
        id: "deployment",
        label: "Deployment",
        status: "green",
        summary: "Deployment and auth settings are ready.",
        detail: `Mode: ${opts.deploymentMode}; exposure: ${opts.deploymentExposure}; company deletion ${opts.companyDeletionEnabled ? "enabled" : "disabled"}.`,
        hint: null,
        blocking: true,
        testedAt,
      };
    } catch (error) {
      return {
        id: "deployment",
        label: "Deployment",
        status: "red",
        summary: "Deployment readiness check failed.",
        detail: error instanceof Error ? error.message : String(error),
        hint: "Verify auth tables and deployment configuration are in a healthy state.",
        blocking: true,
        testedAt,
      };
    }
  }

  async function qmdCheck(): Promise<SubsystemHealthCheck> {
    const testedAt = new Date().toISOString();
    const command = await resolveCommand("qmd");

    if (command.found) {
      return {
        id: "qmd",
        label: "QMD",
        status: "green",
        summary: "QMD is available on PATH.",
        detail: command.resolvedPath,
        hint: null,
        blocking: false,
        testedAt,
      };
    }

    return {
      id: "qmd",
      label: "QMD",
      status: "yellow",
      summary: "QMD is not installed.",
      detail: "Knowledge recall can still run without QMD, but local memory workflows will be degraded.",
      hint: "Install qmd and ensure it is on PATH if you want full PARA memory support.",
      blocking: false,
      testedAt,
    };
  }

  async function adapterChecks(companyId: string): Promise<SubsystemHealthCheck[]> {
    const results = await Promise.all(
      LOCAL_ADAPTER_DIAGNOSTICS.map(async ({ type, label }) => {
        const result = await runAdapterEnvironmentTest(type, { companyId, config: {} });
        const summary = summarizeChecks(result.checks);
        return {
          id: type,
          label,
          status: summary.status,
          summary: summary.summary,
          detail: summary.detail,
          hint: summary.hint,
          // Adapter runtimes are useful to monitor, but a missing local CLI should not mark
          // the entire control plane as blocked when other runtimes may still be available.
          blocking: false,
          testedAt: result.testedAt,
        } satisfies SubsystemHealthCheck;
      }),
    );

    return results;
  }

  return {
    async getSnapshot(input: SnapshotInput): Promise<SubsystemHealthResponse> {
      const checks = [
        await databaseCheck(),
        await deploymentCheck(),
        await qmdCheck(),
        ...(await adapterChecks(input.companyId)),
      ];
      return {
        status: overallStatus(checks),
        checks,
        testedAt: new Date().toISOString(),
      };
    },
  };
}
