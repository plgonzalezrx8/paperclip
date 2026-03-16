import type { ReactNode } from "react";
import userEvent from "@testing-library/user-event";
import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Dashboard } from "./Dashboard";
import { renderWithQueryClient } from "../test/render";

const { openOnboardingMock } = vi.hoisted(() => ({
  openOnboardingMock: vi.fn(),
}));

vi.mock("../context/CompanyContext", () => ({
  useCompany: () => ({
    selectedCompanyId: "company-1",
    companies: [{ id: "company-1", name: "Paperclip" }],
  }),
}));

vi.mock("../context/DialogContext", () => ({
  useDialog: () => ({
    openOnboarding: openOnboardingMock,
  }),
}));

vi.mock("../context/BreadcrumbContext", () => ({
  useBreadcrumbs: () => ({
    setBreadcrumbs: vi.fn(),
  }),
}));

vi.mock("@/lib/router", () => ({
  Link: ({ children, to }: { children: ReactNode; to: string }) => <a href={to}>{children}</a>,
}));

vi.mock("../components/MetricCard", () => ({
  MetricCard: ({ title, value }: { title: string; value: string | number }) => (
    <div>
      <span>{title}</span>
      <span>{value}</span>
    </div>
  ),
}));

vi.mock("../components/EmptyState", () => ({
  EmptyState: ({ message, action, onAction }: { message: string; action?: string; onAction?: () => void }) => (
    <div>
      <p>{message}</p>
      {action ? <button onClick={onAction}>{action}</button> : null}
    </div>
  ),
}));

vi.mock("../components/ActivityRow", () => ({
  ActivityRow: ({ event }: { event: { action: string } }) => <div>{event.action}</div>,
}));

vi.mock("../components/ActiveAgentsPanel", () => ({
  ActiveAgentsPanel: () => <div>Active agents panel</div>,
}));

vi.mock("../components/ActivityCharts", () => ({
  ChartCard: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  RunActivityChart: () => <div>Run activity chart</div>,
  PriorityChart: () => <div>Priority chart</div>,
  IssueStatusChart: () => <div>Issue status chart</div>,
  SuccessRateChart: () => <div>Success rate chart</div>,
}));

vi.mock("../components/PageSkeleton", () => ({
  PageSkeleton: () => <div>Loading dashboard</div>,
}));

vi.mock("../components/SystemHealthSection", () => ({
  SystemHealthSection: () => <div>System health</div>,
}));

vi.mock("../components/StatusIcon", () => ({
  StatusIcon: ({ status }: { status: string }) => <span>{status}</span>,
}));

vi.mock("../components/PriorityIcon", () => ({
  PriorityIcon: ({ priority }: { priority: string }) => <span>{priority}</span>,
}));

vi.mock("../components/Identity", () => ({
  Identity: ({ name }: { name: string }) => <span>{name}</span>,
}));

vi.mock("../api/dashboard", () => ({
  dashboardApi: {
    summary: vi.fn().mockResolvedValue({
      companyId: "company-1",
      agents: { active: 2, running: 0, paused: 1, error: 0 },
      tasks: { open: 8, inProgress: 3, blocked: 1, done: 4 },
      approvals: { pending: 2 },
      costs: {
        monthSpendCents: 1234,
        monthBudgetCents: 10000,
        monthUtilizationPercent: 12,
      },
      pendingApprovals: 2,
      staleTasks: 1,
    }),
  },
}));

vi.mock("../api/activity", () => ({
  activityApi: {
    list: vi.fn().mockResolvedValue([{ id: "evt-1", action: "issue.created" }]),
  },
}));

vi.mock("../api/issues", () => ({
  issuesApi: {
    list: vi.fn().mockResolvedValue([
      {
        id: "issue-1",
        identifier: "PAP-1",
        title: "Ship coverage",
        status: "todo",
        priority: "high",
        assigneeAgentId: null,
        updatedAt: "2026-03-15T15:00:00.000Z",
      },
    ]),
  },
}));

vi.mock("../api/agents", () => ({
  agentsApi: {
    list: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock("../api/health", () => ({
  healthApi: {
    subsystems: vi.fn().mockResolvedValue({
      status: "green",
      checks: [],
    }),
  },
}));

vi.mock("../api/projects", () => ({
  projectsApi: {
    list: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock("../api/heartbeats", () => ({
  heartbeatsApi: {
    list: vi.fn().mockResolvedValue([]),
  },
}));

describe("Dashboard interactions", () => {
  beforeEach(() => {
    openOnboardingMock.mockReset();
  });

  it("renders key operating counters and routes the no-agent CTA into onboarding", async () => {
    const user = userEvent.setup();

    renderWithQueryClient(<Dashboard />);

    expect(await screen.findByText("Paperclip operations")).toBeInTheDocument();
    expect(screen.getByText("Run Load")).toBeInTheDocument();
    expect(screen.getByText("Task Queue")).toBeInTheDocument();
    expect(screen.getByText("Budget Pulse")).toBeInTheDocument();
    expect(screen.getByText("You have no agents.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Create one here" }));

    expect(openOnboardingMock).toHaveBeenCalledWith({
      initialStep: 2,
      companyId: "company-1",
    });
  });
});
