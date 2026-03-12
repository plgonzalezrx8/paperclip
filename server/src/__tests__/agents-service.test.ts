import { describe, expect, it } from "vitest";
import { agentService } from "../services/agents.js";

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

function createAgentRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "agent-1",
    companyId: "company-1",
    name: "Planner",
    role: "manager",
    title: null,
    reportsTo: null,
    icon: null,
    status: "idle",
    capabilities: null,
    adapterType: "codex_local",
    adapterConfig: {},
    runtimeConfig: {},
    budgetMonthlyCents: 0,
    spentMonthlyCents: 0,
    permissions: {},
    managerPlanningModeOverride: null,
    lastHeartbeatAt: null,
    metadata: null,
    createdAt: new Date("2026-03-09T09:00:00.000Z"),
    updatedAt: new Date("2026-03-09T10:00:00.000Z"),
    ...overrides,
  };
}

describe("agentService manager planning mode resolution", () => {
  it("inherits the company default when no override is set", async () => {
    const svc = agentService(
      createDbWithSelectSequence(
        [createAgentRow()],
        [{ defaultManagerPlanningMode: "approval_required" }],
      ),
    );

    const agent = await svc.getById("agent-1");

    expect(agent?.managerPlanningModeOverride).toBeNull();
    expect(agent?.resolvedManagerPlanningMode).toBe("approval_required");
  });

  it("prefers the agent override over the company default", async () => {
    const svc = agentService(
      createDbWithSelectSequence(
        [createAgentRow({ managerPlanningModeOverride: "automatic" })],
        [{ defaultManagerPlanningMode: "approval_required" }],
      ),
    );

    const agent = await svc.getById("agent-1");

    expect(agent?.managerPlanningModeOverride).toBe("automatic");
    expect(agent?.resolvedManagerPlanningMode).toBe("automatic");
  });
});
