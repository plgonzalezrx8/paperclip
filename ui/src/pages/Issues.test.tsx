// @vitest-environment jsdom

import { act } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type ReactActGlobal = typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

const setBreadcrumbsMock = vi.fn();
const openNewIssueMock = vi.fn();
const listPageMock = vi.fn();
const updateIssueMock = vi.fn();
const listAgentsMock = vi.fn();
const listProjectsMock = vi.fn();
const liveRunsForCompanyMock = vi.fn();
const getSessionMock = vi.fn();

vi.mock("../context/CompanyContext", () => ({
  useCompany: () => ({
    selectedCompanyId: "company-1",
    selectedCompany: { id: "company-1", issuePrefix: "BLU" },
  }),
}));

vi.mock("../context/BreadcrumbContext", () => ({
  useBreadcrumbs: () => ({
    setBreadcrumbs: setBreadcrumbsMock,
  }),
}));

vi.mock("../context/DialogContext", () => ({
  useDialog: () => ({
    openNewIssue: openNewIssueMock,
  }),
}));

vi.mock("../api/issues", () => ({
  issuesApi: {
    listPage: listPageMock,
    update: updateIssueMock,
  },
}));

vi.mock("../api/agents", () => ({
  agentsApi: {
    list: listAgentsMock,
  },
}));

vi.mock("../api/projects", () => ({
  projectsApi: {
    list: listProjectsMock,
  },
}));

vi.mock("../api/heartbeats", () => ({
  heartbeatsApi: {
    liveRunsForCompany: liveRunsForCompanyMock,
  },
}));

vi.mock("../api/auth", () => ({
  authApi: {
    getSession: getSessionMock,
  },
}));

vi.mock("../components/EmptyState", () => ({
  EmptyState: ({ message, action, onAction }: { message: string; action?: string; onAction?: () => void }) => (
    <div>
      <p>{message}</p>
      {action ? <button onClick={onAction}>{action}</button> : null}
    </div>
  ),
}));

vi.mock("../components/PageSkeleton", () => ({
  PageSkeleton: () => <div>Loading issues</div>,
}));

vi.mock("../components/Identity", () => ({
  Identity: ({ name }: { name: string }) => <span>{name}</span>,
}));

vi.mock("../components/StatusIcon", () => ({
  StatusIcon: ({ status }: { status: string }) => <button type="button">{status}</button>,
}));

function createIssue(overrides: Partial<{
  id: string;
  identifier: string;
  title: string;
  status: string;
  projectId: string | null;
  assigneeAgentId: string | null;
  assigneeUserId: string | null;
  updatedAt: string;
}> = {}) {
  return {
    id: overrides.id ?? "issue-1",
    companyId: "company-1",
    projectId: overrides.projectId ?? "project-1",
    goalId: null,
    parentId: null,
    title: overrides.title ?? "Paginate the backlog",
    description: "Ship the /issues page pagination flow.",
    status: overrides.status ?? "todo",
    priority: "high",
    assigneeAgentId: overrides.assigneeAgentId ?? "agent-1",
    assigneeUserId: overrides.assigneeUserId ?? null,
    checkoutRunId: null,
    executionRunId: null,
    executionAgentNameKey: null,
    executionLockedAt: null,
    createdByAgentId: null,
    createdByUserId: "board-user",
    issueNumber: 31,
    identifier: overrides.identifier ?? "BLU-31",
    requestDepth: 0,
    billingCode: null,
    assigneeAdapterOverrides: null,
    startedAt: null,
    completedAt: null,
    cancelledAt: null,
    hiddenAt: null,
    labelIds: [],
    labels: [],
    createdAt: "2026-03-15T10:00:00.000Z",
    updatedAt: overrides.updatedAt ?? "2026-03-15T11:00:00.000Z",
    activeRun: null,
  };
}

function createIssuePageResult(overrides: Partial<{
  items: ReturnType<typeof createIssue>[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}> = {}) {
  return {
    items: overrides.items ?? [createIssue()],
    page: overrides.page ?? 1,
    pageSize: overrides.pageSize ?? 25,
    total: overrides.total ?? 1,
    totalPages: overrides.totalPages ?? 1,
  };
}

function LocationEcho() {
  const location = useLocation();
  return <div data-testid="location-search">{location.search}</div>;
}

async function flushQueries() {
  await act(async () => {
    await Promise.resolve();
    await new Promise((resolve) => window.setTimeout(resolve, 0));
  });
}

async function waitForCondition(condition: () => boolean, label: string) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    await flushQueries();
    if (condition()) return;
  }
  throw new Error(`Timed out waiting for ${label}`);
}

async function renderIssues(initialEntry: string) {
  const { Issues } = await import("./Issues");
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  await act(async () => {
    root.render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[initialEntry]}>
          <Routes>
            <Route
              path="/:companyPrefix/issues"
              element={
                <>
                  <LocationEcho />
                  <Issues />
                </>
              }
            />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );
  });

  return { container, root, queryClient };
}

describe("Issues page", () => {
  let root: Root | null = null;
  let container: HTMLDivElement | null = null;
  const reactActGlobal = globalThis as ReactActGlobal;

  beforeEach(() => {
    reactActGlobal.IS_REACT_ACT_ENVIRONMENT = true;
    setBreadcrumbsMock.mockReset();
    openNewIssueMock.mockReset();
    listPageMock.mockReset();
    updateIssueMock.mockReset();
    listAgentsMock.mockReset();
    listProjectsMock.mockReset();
    liveRunsForCompanyMock.mockReset();
    getSessionMock.mockReset();

    listPageMock.mockImplementation(async (_companyId: string, filters: { page?: number } = {}) =>
      createIssuePageResult({
        page: filters.page ?? 1,
        total: 80,
        totalPages: 4,
      }));
    updateIssueMock.mockResolvedValue(createIssue());
    listAgentsMock.mockResolvedValue([
      { id: "agent-1", name: "Product Engineer" },
      { id: "agent-2", name: "Founding Engineer" },
    ]);
    listProjectsMock.mockResolvedValue([
      { id: "project-1", name: "Paperclip" },
      { id: "project-2", name: "Operator Console" },
    ]);
    liveRunsForCompanyMock.mockResolvedValue([]);
    getSessionMock.mockResolvedValue({
      user: { id: "board-user" },
      session: { userId: "board-user" },
    });
  });

  afterEach(async () => {
    if (root) {
      await act(async () => {
        root?.unmount();
      });
      root = null;
    }
    container?.remove();
    container = null;
    vi.resetModules();
  });

  it("round-trips URL query state into the server page query and control values", async () => {
    const rendered = await renderIssues(
      "/BLU/issues?status=done,cancelled&assigneeAgentId=agent-2&projectId=project-2&sortField=created&sortDir=asc&page=3&terminalAgeHours=24&q=latency",
    );
    root = rendered.root;
    container = rendered.container;
    await waitForCondition(
      () => !(container?.textContent ?? "").includes("Loading issues"),
      "issues page query to settle",
    );

    expect(listPageMock).toHaveBeenCalledWith(
      "company-1",
      expect.objectContaining({
        status: "done,cancelled",
        assigneeAgentId: "agent-2",
        projectId: "project-2",
        sortField: "created",
        sortDir: "asc",
        page: 3,
        pageSize: 25,
        terminalAgeHours: 24,
        q: "latency",
      }),
    );

    expect((container.querySelector('input[aria-label="Search issues"]') as HTMLInputElement).value).toBe("latency");
    expect((container.querySelector('select[aria-label="Status filter"]') as HTMLSelectElement).value).toBe("done,cancelled");
    expect((container.querySelector('select[aria-label="Assignee filter"]') as HTMLSelectElement).value).toBe("agent:agent-2");
    expect((container.querySelector('select[aria-label="Project filter"]') as HTMLSelectElement).value).toBe("project-2");
    expect((container.querySelector('select[aria-label="Sort issues"]') as HTMLSelectElement).value).toBe("created:asc");
    expect((container.querySelector('select[aria-label="Terminal age filter"]') as HTMLSelectElement).value).toBe("24");
    expect(container.querySelector('[data-testid="location-search"]')?.textContent).toContain("page=3");
  });

  it("resets pagination back to page 1 when a filter changes", async () => {
    const rendered = await renderIssues("/BLU/issues?page=4&projectId=project-1");
    root = rendered.root;
    container = rendered.container;
    await waitForCondition(
      () => !(container?.textContent ?? "").includes("Loading issues"),
      "initial issues page query to settle",
    );

    const projectFilter = container.querySelector('select[aria-label="Project filter"]') as HTMLSelectElement;
    await act(async () => {
      projectFilter.value = "project-2";
      projectFilter.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await waitForCondition(
      () => (container?.querySelector('[data-testid="location-search"]')?.textContent ?? "").includes("projectId=project-2"),
      "project filter update to reach the URL",
    );

    expect(listPageMock).toHaveBeenLastCalledWith(
      "company-1",
      expect.objectContaining({
        projectId: "project-2",
        page: 1,
      }),
    );
    expect(container.querySelector('[data-testid="location-search"]')?.textContent).toContain("projectId=project-2");
    expect(container.querySelector('[data-testid="location-search"]')?.textContent).not.toContain("page=4");
  });

  it("shows the filtered empty state when the current query returns no results", async () => {
    listPageMock.mockResolvedValueOnce(createIssuePageResult({
      items: [],
      total: 0,
      totalPages: 1,
    }));

    const rendered = await renderIssues("/BLU/issues?status=blocked");
    root = rendered.root;
    container = rendered.container;
    await waitForCondition(
      () => !(container?.textContent ?? "").includes("Loading issues"),
      "empty issues page query to settle",
    );

    expect(container.textContent).toContain("No issues match the current filters.");
    expect(container.textContent).toContain("Create Issue");
  });

  it("recovers invalid out-of-range URLs back to the last valid page", async () => {
    listPageMock.mockImplementation(async (_companyId: string, filters: { page?: number } = {}) => {
      if ((filters.page ?? 1) > 4) {
        return createIssuePageResult({
          items: [],
          page: filters.page ?? 1,
          total: 80,
          totalPages: 4,
        });
      }

      return createIssuePageResult({
        page: filters.page ?? 1,
        total: 80,
        totalPages: 4,
      });
    });

    const rendered = await renderIssues("/BLU/issues?page=6");
    root = rendered.root;
    container = rendered.container;
    await waitForCondition(
      () => (container?.querySelector('[data-testid="location-search"]')?.textContent ?? "").includes("page=4"),
      "out-of-range issue page recovery to reach the URL",
    );

    expect(listPageMock).toHaveBeenCalledWith(
      "company-1",
      expect.objectContaining({ page: 6 }),
    );
    expect(listPageMock).toHaveBeenLastCalledWith(
      "company-1",
      expect.objectContaining({ page: 4 }),
    );
    expect(container.textContent).not.toContain("No issues match the current filters.");
  });
});
