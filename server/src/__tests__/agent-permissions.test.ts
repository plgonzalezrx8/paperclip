import { describe, expect, it } from "vitest";
import {
  defaultPermissionsForRole,
  normalizeAgentPermissions,
} from "../services/agent-permissions.js";

describe("agent permission defaults", () => {
  it("defaults task assignment on for non-CEO agents", () => {
    expect(defaultPermissionsForRole("manager")).toEqual({
      canCreateAgents: false,
      canAssignTasks: true,
    });
  });

  it("backfills canAssignTasks when older permission payloads omit it", () => {
    expect(
      normalizeAgentPermissions(
        { canCreateAgents: true },
        "manager",
      ),
    ).toEqual({
      canCreateAgents: true,
      canAssignTasks: true,
    });
  });
});
