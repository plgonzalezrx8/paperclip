// @vitest-environment jsdom

import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Goal, Project } from "@paperclipai/shared";

type ReactActGlobal = typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

const goalData: Goal = {
  id: "goal-1",
  companyId: "company-1",
  title: "Visual Overhaul",
  description: "Make the roadmap detail surface feel obviously editable.",
  guidance:
    "Let operators update lifecycle state without depending on hidden chrome.",
  level: "task",
  status: "active",
  planningHorizon: "now",
  sortOrder: 0,
  parentId: null,
  ownerAgentId: null,
  createdAt: new Date("2026-03-15T00:00:00.000Z"),
  updatedAt: new Date("2026-03-15T00:00:00.000Z"),
};

const linkedProject: Project = {
  id: "project-1",
  companyId: "company-1",
  urlKey: "project-1",
  goalId: "goal-1",
  goalIds: ["goal-1"],
  goals: [{ id: "goal-1", title: "Visual Overhaul" }],
  name: "Operator Console Refresh",
  description: "Refresh the main control room.",
  status: "in_progress",
  leadAgentId: null,
  targetDate: null,
  color: "#000000",
  workspaces: [],
  primaryWorkspace: null,
  archivedAt: null,
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

let goalsListState: {
  isLoading: boolean;
  error: Error | null;
  data: Goal[];
} = {
  isLoading: false,
  error: null,
  data: [goalData],
};

let projectsListState: {
  isLoading: boolean;
  error: Error | null;
  data: Project[];
} = {
  isLoading: false,
  error: null,
  data: [],
};

let mutationCallIndex = 0;

const updateMutateMock = vi.fn();
const deleteMutateMock = vi.fn();
const uploadMutateAsyncMock = vi.fn();
const invalidateQueriesMock = vi.fn();
const removeQueriesMock = vi.fn();
const openPanelMock = vi.fn();
const closePanelMock = vi.fn();
const setSelectedCompanyIdMock = vi.fn();
const openNewGoalMock = vi.fn();
const setBreadcrumbsMock = vi.fn();
const navigateMock = vi.fn();

vi.mock("@/lib/router", () => ({
  useParams: () => ({ goalId: "goal-1" }),
  useNavigate: () => navigateMock,
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: ({ queryKey }: { queryKey: readonly unknown[] }) => {
    if (queryKey[0] === "goals" && queryKey[1] === "detail") {
      return goalQueryState;
    }
    if (queryKey[0] === "goals") {
      return goalsListState;
    }
    if (queryKey[0] === "projects") {
      return projectsListState;
    }
    return {
      data: null,
      isLoading: false,
      error: null,
    };
  },
  useMutation: (config: {
    onError?: (error: unknown) => void;
    onSuccess?: () => void;
  }) => {
    const slot = mutationCallIndex % 3;
    mutationCallIndex += 1;

    if (slot === 0) {
      return {
        mutate: (
          variables: unknown,
          callbacks?: {
            onError?: (error: unknown) => void;
            onSuccess?: () => void;
          }
        ) => updateMutateMock({ variables, callbacks, config }),
        mutateAsync: vi.fn(),
        isPending: false,
      };
    }

    if (slot === 1) {
      return {
        mutate: (
          variables: unknown,
          callbacks?: {
            onError?: (error: unknown) => void;
            onSuccess?: () => void;
          }
        ) => deleteMutateMock({ variables, callbacks, config }),
        mutateAsync: vi.fn(),
        isPending: false,
      };
    }

    return {
      mutate: vi.fn(),
      mutateAsync: uploadMutateAsyncMock,
      isPending: false,
    };
  },
  useQueryClient: () => ({
    invalidateQueries: invalidateQueriesMock,
    removeQueries: removeQueriesMock,
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

vi.mock("../components/RoadmapLaneMenu", () => ({
  RoadmapLaneMenu: ({ triggerLabel }: { triggerLabel?: string }) => (
    <button type="button">{triggerLabel ?? "Lane"}</button>
  ),
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

vi.mock("../components/StatusBadge", () => ({
  StatusBadge: ({ status }: { status: string }) => <span>{status}</span>,
}));

vi.mock("@/components/ui/popover", () => ({
  Popover: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  PopoverTrigger: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  PopoverContent: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children, open }: { children: ReactNode; open: boolean }) =>
    open ? <div>{children}</div> : null,
  DialogContent: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  DialogHeader: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  DialogTitle: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogDescription: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  DialogFooter: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  DialogClose: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

describe("GoalDetail", () => {
  let container: HTMLDivElement;
  let root: Root;
  const reactActGlobal = globalThis as ReactActGlobal;

  beforeEach(() => {
    reactActGlobal.IS_REACT_ACT_ENVIRONMENT = true;
    mutationCallIndex = 0;
    goalQueryState = {
      isLoading: false,
      error: null,
      data: goalData,
    };
    goalsListState = {
      isLoading: false,
      error: null,
      data: [goalData],
    };
    projectsListState = {
      isLoading: false,
      error: null,
      data: [],
    };
    updateMutateMock.mockReset();
    deleteMutateMock.mockReset();
    uploadMutateAsyncMock.mockReset();
    invalidateQueriesMock.mockReset();
    removeQueriesMock.mockReset();
    openPanelMock.mockReset();
    closePanelMock.mockReset();
    setSelectedCompanyIdMock.mockReset();
    openNewGoalMock.mockReset();
    setBreadcrumbsMock.mockReset();
    navigateMock.mockReset();
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

  it("renders a main-surface status editor so lifecycle updates stay visible without the side panel", async () => {
    const { GoalDetail } = await import("./GoalDetail");

    await act(async () => {
      root.render(<GoalDetail />);
    });

    expect(container.textContent).toContain("Visual Overhaul");
    expect(
      container.querySelector('button[aria-label="Change status from active"]')
    ).not.toBeNull();
  });

  it("disables delete and explains why when linked work still depends on the roadmap item", async () => {
    const { GoalDetail } = await import("./GoalDetail");
    goalsListState = {
      isLoading: false,
      error: null,
      data: [
        goalData,
        {
          ...goalData,
          id: "goal-2",
          parentId: "goal-1",
          title: "Child item",
        },
      ],
    };
    projectsListState = {
      isLoading: false,
      error: null,
      data: [linkedProject],
    };

    await act(async () => {
      root.render(<GoalDetail />);
    });

    expect(container.textContent).toContain(
      "Delete is unavailable while 1 child roadmap item and 1 linked project still reference this roadmap item."
    );
    const deleteButton = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent?.includes("Delete roadmap item")
    ) as HTMLButtonElement | undefined;
    expect(deleteButton?.disabled).toBe(true);
  });

  it("confirms delete and redirects to the parent roadmap item after success", async () => {
    const { GoalDetail } = await import("./GoalDetail");
    goalQueryState = {
      isLoading: false,
      error: null,
      data: {
        ...goalData,
        parentId: "goal-parent",
      },
    };
    deleteMutateMock.mockImplementation(
      ({
        callbacks,
        config,
      }: {
        callbacks?: { onSuccess?: () => void };
        config: { onSuccess?: () => void };
      }) => {
        config.onSuccess?.();
        callbacks?.onSuccess?.();
      }
    );

    await act(async () => {
      root.render(<GoalDetail />);
    });

    const openDeleteDialogButton = Array.from(
      container.querySelectorAll("button")
    ).find((button) => button.textContent?.trim() === "Delete roadmap item");
    expect(openDeleteDialogButton).toBeTruthy();

    await act(async () => {
      openDeleteDialogButton?.dispatchEvent(
        new MouseEvent("click", { bubbles: true })
      );
    });

    expect(container.textContent).toContain('Delete "Visual Overhaul"?');

    const confirmDeleteButton = Array.from(
      container.querySelectorAll("button")
    ).find(
      (button) =>
        button.textContent?.trim() === "Delete roadmap item permanently"
    );
    expect(confirmDeleteButton).toBeTruthy();

    await act(async () => {
      confirmDeleteButton?.dispatchEvent(
        new MouseEvent("click", { bubbles: true })
      );
    });

    expect(deleteMutateMock).toHaveBeenCalled();
    expect(removeQueriesMock).toHaveBeenCalled();
    expect(navigateMock).toHaveBeenCalledWith("/roadmap/goal-parent", {
      replace: true,
    });
  });
});
