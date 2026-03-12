import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { errorHandler } from "../middleware/index.js";
import { sidebarBadgeRoutes } from "../routes/sidebar-badges.js";

const mockSidebarBadgeService = vi.hoisted(() => ({
  get: vi.fn(),
}));

const mockIssueService = vi.hoisted(() => ({
  countUnreadTouchedByUser: vi.fn(),
  staleCount: vi.fn(),
}));

const mockAccessService = vi.hoisted(() => ({
  canUser: vi.fn(),
  hasPermission: vi.fn(),
}));

const mockDashboardService = vi.hoisted(() => ({
  summary: vi.fn(),
}));

vi.mock("../services/sidebar-badges.js", () => ({
  sidebarBadgeService: () => mockSidebarBadgeService,
}));

vi.mock("../services/issues.js", () => ({
  issueService: () => mockIssueService,
}));

vi.mock("../services/access.js", () => ({
  accessService: () => mockAccessService,
}));

vi.mock("../services/dashboard.js", () => ({
  dashboardService: () => mockDashboardService,
}));

const COMPANY_ID = "11111111-1111-4111-8111-111111111111";

function createApp(actor: Record<string, unknown>) {
  const app = express();
  app.use((req, _res, next) => {
    (req as any).actor = actor;
    next();
  });
  app.use("/api", sidebarBadgeRoutes({} as any));
  app.use(errorHandler);
  return app;
}

describe("sidebar badge routes", () => {
  beforeEach(() => {
    mockSidebarBadgeService.get.mockReset();
    mockIssueService.countUnreadTouchedByUser.mockReset();
    mockIssueService.staleCount.mockReset();
    mockAccessService.canUser.mockReset();
    mockAccessService.hasPermission.mockReset();
    mockDashboardService.summary.mockReset();

    mockSidebarBadgeService.get.mockResolvedValue({
      inbox: 6,
      approvals: 1,
      failedRuns: 2,
      joinRequests: 0,
    });
    mockIssueService.countUnreadTouchedByUser.mockResolvedValue(3);
    mockIssueService.staleCount.mockResolvedValue(1);
    mockAccessService.canUser.mockResolvedValue(false);
    mockDashboardService.summary.mockResolvedValue({
      agents: { error: 0 },
      costs: { monthBudgetCents: 0, monthUtilizationPercent: 0 },
    });
  });

  it("includes unread touched issues in the inbox badge for board users", async () => {
    const app = createApp({
      type: "board",
      source: "session",
      userId: "board-user",
      companyIds: [COMPANY_ID],
      isInstanceAdmin: false,
    });

    const res = await request(app).get(`/api/companies/${COMPANY_ID}/sidebar-badges`);

    expect(res.status).toBe(200);
    expect(mockIssueService.countUnreadTouchedByUser).toHaveBeenCalledWith(
      COMPANY_ID,
      "board-user",
      "backlog,todo,in_progress,in_review,blocked,done",
    );
    expect(mockSidebarBadgeService.get).toHaveBeenCalledWith(
      COMPANY_ID,
      expect.objectContaining({ unreadTouchedIssues: 3 }),
    );
    expect(res.body.inbox).toBe(7);
  });
});
