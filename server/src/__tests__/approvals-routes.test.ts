import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { approvalRoutes } from "../routes/approvals.js";
import { errorHandler } from "../middleware/index.js";

const mockApprovalService = vi.hoisted(() => ({
  approve: vi.fn(),
}));

const mockHeartbeatService = vi.hoisted(() => ({
  wakeup: vi.fn(),
}));

const mockIssueApprovalService = vi.hoisted(() => ({
  listIssuesForApproval: vi.fn(),
}));

const mockSecretService = vi.hoisted(() => ({
  normalizeHireApprovalPayloadForPersistence: vi.fn(),
}));

const mockLogActivity = vi.hoisted(() => vi.fn());

vi.mock("../services/index.js", () => ({
  approvalService: () => mockApprovalService,
  heartbeatService: () => mockHeartbeatService,
  issueApprovalService: () => mockIssueApprovalService,
  secretService: () => mockSecretService,
  logActivity: mockLogActivity,
}));

const COMPANY_ID = "11111111-1111-4111-8111-111111111111";
const APPROVAL_ID = "22222222-2222-4222-8222-222222222222";
const ISSUE_ID = "33333333-3333-4333-8333-333333333333";

function createApprovedManagerPlan(overrides: Record<string, unknown> = {}) {
  return {
    id: APPROVAL_ID,
    companyId: COMPANY_ID,
    type: "approve_manager_plan",
    status: "approved",
    requestedByAgentId: "agent-1",
    requestedByUserId: null,
    payload: {
      title: "Manager roadmap plan",
      summary: "Turn the next roadmap item into issues.",
      roadmapItemIds: ["goal-1"],
      proposedIssues: [{ title: "Create health dashboard" }],
    },
    decisionNote: null,
    decidedByUserId: "board",
    decidedAt: new Date("2026-03-09T10:00:00.000Z"),
    createdAt: new Date("2026-03-09T09:00:00.000Z"),
    updatedAt: new Date("2026-03-09T10:00:00.000Z"),
    ...overrides,
  };
}

function createApp() {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    (req as any).actor = {
      type: "board",
      source: "local_implicit",
      userId: "board-user",
      isInstanceAdmin: true,
    };
    next();
  });
  app.use("/api", approvalRoutes({} as any));
  app.use(errorHandler);
  return app;
}

describe("approval routes", () => {
  beforeEach(() => {
    mockApprovalService.approve.mockReset();
    mockHeartbeatService.wakeup.mockReset();
    mockIssueApprovalService.listIssuesForApproval.mockReset();
    mockSecretService.normalizeHireApprovalPayloadForPersistence.mockReset();
    mockLogActivity.mockReset();
    mockLogActivity.mockResolvedValue(undefined);
  });

  it("wakes the requesting manager when a manager-plan approval is approved", async () => {
    mockApprovalService.approve.mockResolvedValue(createApprovedManagerPlan());
    mockIssueApprovalService.listIssuesForApproval.mockResolvedValue([{ id: ISSUE_ID }]);
    mockHeartbeatService.wakeup.mockResolvedValue({ id: "wake-1" });
    const app = createApp();

    const res = await request(app)
      .post(`/api/approvals/${APPROVAL_ID}/approve`)
      .send({ decidedByUserId: "board-user" });

    expect(res.status).toBe(200);
    expect(res.body.type).toBe("approve_manager_plan");
    expect(mockHeartbeatService.wakeup).toHaveBeenCalledWith(
      "agent-1",
      expect.objectContaining({
        reason: "approval_approved",
        payload: expect.objectContaining({
          approvalId: APPROVAL_ID,
          issueId: ISSUE_ID,
          issueIds: [ISSUE_ID],
        }),
      }),
    );
  });
});
