// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type ReactActGlobal = typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

let locationPath = "/projects/paperclip/issues";
let projectQueryState: {
  isLoading: boolean;
  error: Error | null;
  data: Record<string, unknown> | null;
} = {
  isLoading: true,
  error: null,
  data: null,
};

const navigateMock = vi.fn();
const openPanelMock = vi.fn();
const closePanelMock = vi.fn();
const setPanelVisibleMock = vi.fn();
const setSelectedCompanyIdMock = vi.fn();
const invalidateQueriesMock = vi.fn();

vi.mock("@/lib/router", () => ({
  useParams: () => ({ projectId: "paperclip" }),
  useNavigate: () => navigateMock,
  useLocation: () => ({ pathname: locationPath }),
  Navigate: ({ to }: { to: string }) => <div data-navigate={to} />,
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: ({ queryKey }: { queryKey: readonly unknown[] }) => {
    if (queryKey[0] === "projects" && queryKey[1] === "detail") {
      return projectQueryState;
    }
    return {
      data: queryKey[0] === "issues" ? [] : queryKey[0] === "agents" ? [] : null,
      isLoading: false,
      error: null,
    };
  },
  useMutation: () => ({
    mutate: vi.fn(),
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useQueryClient: () => ({
    invalidateQueries: invalidateQueriesMock,
  }),
}));

vi.mock("../context/CompanyContext", () => ({
  useCompany: () => ({
    companies: [{ id: "company-1", issuePrefix: "BLU" }],
    selectedCompanyId: "company-1",
    setSelectedCompanyId: setSelectedCompanyIdMock,
  }),
}));

vi.mock("../context/PanelContext", () => ({
  usePanel: () => ({
    openPanel: openPanelMock,
    closePanel: closePanelMock,
    panelVisible: true,
    setPanelVisible: setPanelVisibleMock,
  }),
}));

vi.mock("../context/BreadcrumbContext", () => ({
  useBreadcrumbs: () => ({
    setBreadcrumbs: vi.fn(),
  }),
}));

vi.mock("../components/ProjectProperties", () => ({
  ProjectProperties: () => <div>Project properties</div>,
}));

vi.mock("../components/InlineEditor", () => ({
  InlineEditor: ({ value, as = "div" }: { value: string; as?: string }) => {
    if (as === "h2") return <h2>{value}</h2>;
    if (as === "p") return <p>{value}</p>;
    return <div>{value}</div>;
  },
}));

vi.mock("../components/StatusBadge", () => ({
  StatusBadge: ({ status }: { status: string }) => <span>{status}</span>,
}));

vi.mock("../components/IssuesList", () => ({
  IssuesList: () => <div>Issues list</div>,
}));

vi.mock("../components/PageSkeleton", () => ({
  PageSkeleton: () => <div>Loading project</div>,
}));

vi.mock("../api/projects", () => ({
  projectsApi: {
    get: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock("../api/issues", () => ({
  issuesApi: {
    list: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock("../api/agents", () => ({
  agentsApi: {
    list: vi.fn(),
  },
}));

vi.mock("../api/heartbeats", () => ({
  heartbeatsApi: {
    liveRunsForCompany: vi.fn(),
  },
}));

vi.mock("../api/assets", () => ({
  assetsApi: {
    uploadImage: vi.fn(),
  },
}));

describe("ProjectDetail", () => {
  let container: HTMLDivElement;
  let root: Root;
  const reactActGlobal = globalThis as ReactActGlobal;

  beforeEach(() => {
    reactActGlobal.IS_REACT_ACT_ENVIRONMENT = true;
    locationPath = "/projects/paperclip/issues";
    projectQueryState = {
      isLoading: true,
      error: null,
      data: null,
    };
    navigateMock.mockReset();
    openPanelMock.mockReset();
    closePanelMock.mockReset();
    setPanelVisibleMock.mockReset();
    setSelectedCompanyIdMock.mockReset();
    invalidateQueriesMock.mockReset();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  it("survives the loading-to-loaded transition without changing hook order", async () => {
    const { ProjectDetail } = await import("./ProjectDetail");

    await act(async () => {
      root.render(<ProjectDetail />);
    });

    projectQueryState = {
      isLoading: false,
      error: null,
      data: {
        id: "project-1",
        companyId: "company-1",
        name: "paperclip",
        description: "Runtime hardening",
        status: "in_progress",
        targetDate: null,
        color: "#000000",
        urlKey: "paperclip",
        goalId: null,
        goalIds: [],
        goals: [],
        workspaces: [],
        leadAgentId: null,
        createdAt: "2026-03-12T00:00:00.000Z",
        updatedAt: "2026-03-12T00:00:00.000Z",
      },
    };

    await act(async () => {
      root.render(<ProjectDetail />);
    });

    expect(container.textContent).toContain("paperclip");
    expect(container.textContent).toContain("Issues list");
  });
});
