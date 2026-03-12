import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { healthRoutes } from "../routes/health.js";

const mockGetSnapshot = vi.hoisted(() => vi.fn());
const mockSubsystemHealthService = vi.hoisted(() => vi.fn(() => ({ getSnapshot: mockGetSnapshot })));

vi.mock("../services/index.js", () => ({
  subsystemHealthService: mockSubsystemHealthService,
}));

const COMPANY_ID = "11111111-1111-4111-8111-111111111111";

function createApp(db?: Record<string, unknown>) {
  const app = express();
  app.use((req, _res, next) => {
    (req as any).actor = {
      type: "board",
      source: "local_implicit",
      userId: "board-user",
    };
    next();
  });
  app.use(
    "/health",
    healthRoutes(db as any, {
      databaseConnectionString: "postgres://paperclip.test/app",
      deploymentMode: "local_trusted",
      deploymentExposure: "private",
      authReady: true,
      companyDeletionEnabled: true,
    }),
  );
  return app;
}

describe("GET /health/subsystems", () => {
  beforeEach(() => {
    mockGetSnapshot.mockReset();
    mockSubsystemHealthService.mockClear();
  });

  it("returns subsystem diagnostics for the requested company", async () => {
    mockGetSnapshot.mockResolvedValue({
      status: "green",
      testedAt: "2026-03-09T10:00:00.000Z",
      checks: [],
    });
    const app = createApp({});

    const res = await request(app).get(`/health/subsystems?companyId=${COMPANY_ID}`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("green");
    expect(mockSubsystemHealthService).toHaveBeenCalled();
    expect(mockGetSnapshot).toHaveBeenCalledWith({ companyId: COMPANY_ID });
  });

  it("returns 503 when diagnostics are unavailable", async () => {
    const app = createApp();

    const res = await request(app).get(`/health/subsystems?companyId=${COMPANY_ID}`);

    expect(res.status).toBe(503);
    expect(res.body.error).toContain("unavailable");
  });
});
