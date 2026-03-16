import type { ButtonHTMLAttributes, ReactNode } from "react";
import userEvent from "@testing-library/user-event";
import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { IssueDetail } from "./IssueDetail";
import { renderWithQueryClient } from "../test/render";

const { setPanelVisibleMock } = vi.hoisted(() => ({
  setPanelVisibleMock: vi.fn(),
}));

vi.mock("react-router-dom", () => ({
  useParams: () => ({ issueId: "PAP-1" }),
  useNavigate: () => vi.fn(),
  Link: ({ children, to }: { children: ReactNode; to: string }) => <a href={to}>{children}</a>,
}));

vi.mock("../context/CompanyContext", () => ({
  useCompany: () => ({
    selectedCompanyId: "company-1",
  }),
}));

vi.mock("../context/PanelContext", () => ({
  usePanel: () => ({
    openPanel: vi.fn(),
    closePanel: vi.fn(),
    panelVisible: false,
    setPanelVisible: setPanelVisibleMock,
  }),
}));

vi.mock("../context/BreadcrumbContext", () => ({
  useBreadcrumbs: () => ({
    setBreadcrumbs: vi.fn(),
  }),
}));

vi.mock("../hooks/useProjectOrder", () => ({
  useProjectOrder: ({ projects }: { projects: unknown[] }) => ({
    orderedProjects: projects,
  }),
}));

vi.mock("../components/InlineEditor", () => ({
  InlineEditor: ({ value }: { value: string }) => <div>{value}</div>,
}));

vi.mock("../components/CommentThread", () => ({
  CommentThread: () => <div>Comment thread</div>,
}));

vi.mock("../components/IssueProperties", () => ({
  IssueProperties: () => <div>Issue properties panel</div>,
}));

vi.mock("../components/LiveRunWidget", () => ({
  LiveRunWidget: () => <div>Live run widget</div>,
}));

vi.mock("../components/StatusIcon", () => ({
  StatusIcon: ({ status }: { status: string }) => <span>{status}</span>,
}));

vi.mock("../components/PriorityIcon", () => ({
  PriorityIcon: ({ priority }: { priority: string }) => <span>{priority}</span>,
}));

vi.mock("../components/StatusBadge", () => ({
  StatusBadge: ({ status }: { status: string }) => <span>{status}</span>,
}));

vi.mock("../components/Identity", () => ({
  Identity: ({ name }: { name: string }) => <span>{name}</span>,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props}>{children}</button>
  ),
}));

vi.mock("@/components/ui/separator", () => ({
  Separator: () => <div />,
}));

vi.mock("@/components/ui/popover", () => ({
  Popover: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  PopoverTrigger: ({ children }: { children: ReactNode }) => <>{children}</>,
  PopoverContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/collapsible", () => ({
  Collapsible: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CollapsibleTrigger: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CollapsibleContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/sheet", () => ({
  Sheet: ({ open, children }: { open: boolean; children: ReactNode }) => (open ? <div>{children}</div> : null),
  SheetContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SheetHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SheetTitle: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/scroll-area", () => ({
  ScrollArea: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/tabs", () => ({
  Tabs: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  TabsContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  TabsList: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  TabsTrigger: ({ children }: { children: ReactNode }) => <button type="button">{children}</button>,
}));

vi.mock("../api/issues", () => ({
  issuesApi: {
    get: vi.fn().mockResolvedValue({
      id: "issue-1",
      identifier: "PAP-1",
      companyId: "company-1",
      projectId: null,
      goalId: null,
      title: "Harden issue coverage",
      description: "Exercise the issue detail UI.",
      status: "todo",
      priority: "high",
      assigneeAgentId: null,
      assigneeUserId: null,
      checkoutRunId: null,
      executionRunId: null,
      createdByUserId: "user-1",
      labelIds: [],
      labels: [],
      attachments: [],
      createdAt: "2026-03-15T10:00:00.000Z",
      updatedAt: "2026-03-15T11:00:00.000Z",
    }),
    listComments: vi.fn().mockResolvedValue([]),
    listApprovals: vi.fn().mockResolvedValue([]),
    listAttachments: vi.fn().mockResolvedValue([]),
    list: vi.fn().mockResolvedValue([]),
    markRead: vi.fn().mockResolvedValue({ ok: true }),
    update: vi.fn().mockResolvedValue({ ok: true }),
    addComment: vi.fn().mockResolvedValue({ id: "comment-1" }),
    uploadAttachment: vi.fn(),
    deleteAttachment: vi.fn(),
  },
}));

vi.mock("../api/activity", () => ({
  activityApi: {
    forIssue: vi.fn().mockResolvedValue([]),
    runsForIssue: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock("../api/heartbeats", () => ({
  heartbeatsApi: {
    liveRunsForIssue: vi.fn().mockResolvedValue([]),
    activeRunForIssue: vi.fn().mockResolvedValue(null),
  },
}));

vi.mock("../api/agents", () => ({
  agentsApi: {
    list: vi.fn().mockResolvedValue([]),
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
    list: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock("../api/records", () => ({
  recordsApi: {
    promoteToResult: vi.fn().mockResolvedValue({ id: "record-1" }),
  },
}));

describe("IssueDetail interactions", () => {
  beforeEach(() => {
    setPanelVisibleMock.mockReset();
  });

  it("opens the mobile properties sheet from the issue toolbar", async () => {
    const user = userEvent.setup();

    renderWithQueryClient(<IssueDetail />);

    expect(await screen.findByText("Harden issue coverage")).toBeInTheDocument();

    await user.click(screen.getByTitle("Properties"));

    expect(screen.getByText("Issue properties panel")).toBeInTheDocument();
  });
});
