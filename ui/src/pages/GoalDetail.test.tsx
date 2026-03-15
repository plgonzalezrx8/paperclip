// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Goal } from "@paperclipai/shared";

type ReactActGlobal = typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

const goalData: Goal = {
  id: "goal-1",
  companyId: "company-1",
  title: "Visual Overhaul",
  description: "Make the roadmap detail surface feel obviously editable.",
  guidance: "Let operators update lifecycle state without depending on hidden chrome.",
  level: "task",
  status: "active",
  planningHorizon: "now",
  sortOrder: 0,
  parentId: null,
  ownerAgentId: null,
  createdAt: new Date("2026-03-15T00:00:00.000Z"),
  updatedAt: new Date("2026-03-15T00:00:00.000Z"),
};

let goalQueryState: {
  isLoading: boolean;
  error: Error | null;
  data: Goal | null;
} = {
  isLoading: false,
  error: null,
  data: goalData,
};

const mutateMock = vi.fn();
const invalidateQueriesMock = vi.fn();
const openPanelMock = vi.fn();
const closePanelMock = vi.fn();
const setSelectedCompanyIdMock = vi.fn();
const openNewGoalMock = vi.fn();
const setBreadcrumbsMock = vi.fn();

vi.mock("@/lib/router", () => ({
  useParams: () => ({ goalId: "goal-1" }),
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: ({ queryKey }: { queryKey: readonly unknown[] }) => {
    if (queryKey[0] === "goals" && queryKey[1] === "detail") {
      return goalQueryState;
    }
    if (queryKey[0] === "goals") {
      return {
        data: [goalData],
        isLoading: false,
        error: null,
      };
    }
    if (queryKey[0] === "projects") {
      return {
        data: [],
        isLoading: false,
        error: null,
      };
    }
    return {
      data: null,
      isLoading: false,
      error: null,
    };
  },
  useMutation: () => ({
    mutate: mutateMock,
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useQueryClient: () => ({
    invalidateQueries: invalidateQueriesMock,
  }),
}));

vi.mock("../context/CompanyContext", () => ({
  useCompany: () => ({
    selectedCompanyId: "company-1",
    setSelectedCompanyId: setSelectedCompanyIdMock,
  }),
}));

vi.mock("../context/DialogContext", () => ({
  useDialog: () => ({
    openNewGoal: openNewGoalMock,
  }),
}));

vi.mock("../context/PanelContext", () => ({
  usePanel: () => ({
    openPanel: openPanelMock,
    closePanel: closePanelMock,
  }),
}));

vi.mock("../context/BreadcrumbContext", () => ({
  useBreadcrumbs: () => ({
    setBreadcrumbs: setBreadcrumbsMock,
  }),
}));

vi.mock("../components/GoalProperties", () => ({
  GoalProperties: () => <div>Goal properties</div>,
}));

vi.mock("../components/GoalTree", () => ({
  GoalTree: () => <div>Goal tree</div>,
}));

vi.mock("../components/InlineEditor", () => ({
  InlineEditor: ({ value, as = "div" }: { value: string; as?: string }) => {
    if (as === "h2") return <h2>{value}</h2>;
    if (as === "p") return <p>{value}</p>;
    return <div>{value}</div>;
  },
}));

vi.mock("../components/EntityRow", () => ({
  EntityRow: ({ title }: { title: string }) => <div>{title}</div>,
}));

vi.mock("../components/PageSkeleton", () => ({
  PageSkeleton: () => <div>Loading roadmap item</div>,
}));

describe("GoalDetail", () => {
  let container: HTMLDivElement;
  let root: Root;
  const reactActGlobal = globalThis as ReactActGlobal;

  beforeEach(() => {
    reactActGlobal.IS_REACT_ACT_ENVIRONMENT = true;
    goalQueryState = {
      isLoading: false,
      error: null,
      data: goalData,
    };
    mutateMock.mockReset();
    invalidateQueriesMock.mockReset();
    openPanelMock.mockReset();
    closePanelMock.mockReset();
    setSelectedCompanyIdMock.mockReset();
    openNewGoalMock.mockReset();
    setBreadcrumbsMock.mockReset();
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

  it("renders a main-surface status editor so lifecycle updates are visible without the side panel", async () => {
    const { GoalDetail } = await import("./GoalDetail");

    await act(async () => {
      root.render(<GoalDetail />);
    });

    expect(container.textContent).toContain("Visual Overhaul");
    expect(container.querySelector('button[aria-label="Change status from active"]')).not.toBeNull();
  });
});
