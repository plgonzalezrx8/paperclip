import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { goalRoutes } from "../routes/goals.js";
import { errorHandler } from "../middleware/index.js";

const mockGoalService = vi.hoisted(() => ({
  list: vi.fn(),
  getById: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
}));

const mockLogActivity = vi.hoisted(() => vi.fn());

vi.mock("../services/index.js", () => ({
  goalService: () => mockGoalService,
  logActivity: mockLogActivity,
}));

const COMPANY_ID = "11111111-1111-4111-8111-111111111111";
const GOAL_ID = "22222222-2222-4222-8222-222222222222";

function createGoal(overrides: Record<string, unknown> = {}) {
  return {
    id: GOAL_ID,
    companyId: COMPANY_ID,
    parentId: null,
    title: "Harden manager planning",
    description: "Give managers a roadmap-backed backlog source.",
    guidance: "Create issues from this item only after validating the current sprint is clear.",
    level: "company",
    status: "planned",
    planningHorizon: "next",
    sortOrder: 10,
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
    };
    next();
  });
  app.use("/api", goalRoutes({} as any));
  app.use(errorHandler);
  return app;
}

describe("roadmap aliases", () => {
  beforeEach(() => {
    mockGoalService.list.mockReset();
    mockGoalService.getById.mockReset();
    mockGoalService.create.mockReset();
    mockGoalService.update.mockReset();
    mockGoalService.remove.mockReset();
    mockLogActivity.mockReset();
    mockLogActivity.mockResolvedValue(undefined);
  });

  it("lists roadmap items through the roadmap company alias", async () => {
    mockGoalService.list.mockResolvedValue([createGoal()]);
    const app = createApp();

    const res = await request(app).get(`/api/companies/${COMPANY_ID}/roadmap`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].id).toBe(GOAL_ID);
    expect(mockGoalService.list).toHaveBeenCalledWith(COMPANY_ID);
  });

  it("loads roadmap item detail through the roadmap item alias", async () => {
    mockGoalService.getById.mockResolvedValue(createGoal());
    const app = createApp();

    const res = await request(app).get(`/api/roadmap/${GOAL_ID}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(GOAL_ID);
    expect(mockGoalService.getById).toHaveBeenCalledWith(GOAL_ID);
  });

  it("creates roadmap items through the roadmap alias while preserving goal activity logging", async () => {
    mockGoalService.create.mockResolvedValue(
      createGoal({
        title: "Operational health dashboard",
        planningHorizon: "now",
        sortOrder: 1,
      }),
    );
    const app = createApp();

    const res = await request(app)
      .post(`/api/companies/${COMPANY_ID}/roadmap`)
      .send({
        title: "Operational health dashboard",
        description: "Surface runtime and database health to the board.",
        guidance: "Use this item to prioritize uptime and diagnostics work.",
        planningHorizon: "now",
        sortOrder: 1,
      });

    expect(res.status).toBe(201);
    expect(res.body.title).toBe("Operational health dashboard");
    expect(mockGoalService.create).toHaveBeenCalledWith(
      COMPANY_ID,
      expect.objectContaining({
        planningHorizon: "now",
        sortOrder: 1,
      }),
    );
    expect(mockLogActivity).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        action: "goal.created",
        entityId: GOAL_ID,
      }),
    );
  });
});
