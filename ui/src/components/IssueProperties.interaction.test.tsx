import type { ReactNode } from "react";
import userEvent from "@testing-library/user-event";
import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { IssueProperties } from "./IssueProperties";
import { renderWithQueryClient } from "../test/render";

const onUpdateMock = vi.fn();

vi.mock("../context/CompanyContext", () => ({
  useCompany: () => ({
    selectedCompanyId: "company-1",
  }),
}));

vi.mock("../hooks/useProjectOrder", () => ({
  useProjectOrder: ({ projects }: { projects: unknown[] }) => ({
    orderedProjects: projects,
  }),
}));

vi.mock("@/lib/router", () => ({
  Link: ({ children, to }: { children: ReactNode; to: string }) => <a href={to}>{children}</a>,
}));

vi.mock("@/components/ui/popover", () => ({
  Popover: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  PopoverTrigger: ({ children }: { children: ReactNode }) => <>{children}</>,
  PopoverContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/separator", () => ({
  Separator: () => <div />,
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

vi.mock("./AgentIconPicker", () => ({
  AgentIcon: () => <span>agent-icon</span>,
}));

vi.mock("../api/agents", () => ({
  agentsApi: {
    list: vi.fn().mockResolvedValue([
      {
        id: "agent-1",
        name: "Builder Bot",
        status: "idle",
        role: "engineer",
        icon: null,
      },
      {
        id: "agent-2",
        name: "Verifier Bot",
        status: "idle",
        role: "qa",
        icon: null,
      },
    ]),
  },
}));

vi.mock("../api/auth", () => ({
  authApi: {
    getSession: vi.fn().mockResolvedValue({
      user: { id: "user-1" },
      session: { userId: "user-1" },
    }),
  },
}));

vi.mock("../api/projects", () => ({
  projectsApi: {
    list: vi.fn().mockResolvedValue([{ id: "project-1", name: "Coverage", color: "#336699" }]),
  },
}));

vi.mock("../api/issues", () => ({
  issuesApi: {
    listLabels: vi.fn().mockResolvedValue([{ id: "label-1", name: "governance", color: "#112233" }]),
    createLabel: vi.fn(),
    deleteLabel: vi.fn(),
  },
}));

describe("IssueProperties interactions", () => {
  beforeEach(() => {
    onUpdateMock.mockReset();
  });

  it("reassigns the issue to a selected agent", async () => {
    const user = userEvent.setup();

    renderWithQueryClient(
      <IssueProperties
        issue={{
          id: "issue-1",
          companyId: "company-1",
          status: "todo",
          priority: "high",
          assigneeAgentId: null,
          assigneeUserId: null,
          createdByUserId: "user-1",
          projectId: null,
          labelIds: [],
          labels: [],
        } as any}
        onUpdate={onUpdateMock}
      />,
    );

    const assigneeButton = (await screen.findByText("Builder Bot")).closest("button");
    expect(assigneeButton).not.toBeNull();

    await user.click(assigneeButton!);

    expect(onUpdateMock).toHaveBeenCalledWith({
      assigneeAgentId: "agent-1",
      assigneeUserId: null,
    });
  });
});
