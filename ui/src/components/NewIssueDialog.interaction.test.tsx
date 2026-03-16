import { forwardRef, useImperativeHandle, type ButtonHTMLAttributes, type ForwardedRef, type ReactNode } from "react";
import userEvent from "@testing-library/user-event";
import { screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NewIssueDialog } from "./NewIssueDialog";
import { renderWithQueryClient } from "../test/render";

const { closeNewIssueMock, createIssueMock } = vi.hoisted(() => ({
  closeNewIssueMock: vi.fn(),
  createIssueMock: vi.fn(),
}));

vi.mock("../context/DialogContext", () => ({
  useDialog: () => ({
    newIssueOpen: true,
    newIssueDefaults: {
      assigneeAgentId: "agent-1",
      projectId: "project-1",
    },
    closeNewIssue: closeNewIssueMock,
  }),
}));

vi.mock("../context/CompanyContext", () => ({
  useCompany: () => ({
    companies: [{ id: "company-1", name: "Paperclip" }],
    selectedCompanyId: "company-1",
    selectedCompany: { id: "company-1", name: "Paperclip" },
  }),
}));

vi.mock("../hooks/useProjectOrder", () => ({
  useProjectOrder: ({ projects }: { projects: unknown[] }) => ({
    orderedProjects: projects,
  }),
}));

vi.mock("../api/issues", () => ({
  issuesApi: {
    create: createIssueMock,
  },
}));

vi.mock("../api/projects", () => ({
  projectsApi: {
    list: vi.fn().mockResolvedValue([{ id: "project-1", name: "Coverage", color: "#336699" }]),
  },
}));

vi.mock("../api/agents", () => ({
  agentsApi: {
    list: vi.fn().mockResolvedValue([
      {
        id: "agent-1",
        name: "Builder Bot",
        status: "idle",
        role: "engineer",
        title: null,
        icon: null,
        adapterType: "process",
      },
    ]),
    adapterModels: vi.fn().mockResolvedValue([]),
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

vi.mock("../api/assets", () => ({
  assetsApi: {
    uploadImage: vi.fn(),
  },
}));

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/popover", () => ({
  Popover: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  PopoverTrigger: ({ children }: { children: ReactNode }) => <>{children}</>,
  PopoverContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props}>{children}</button>
  ),
}));

vi.mock("./MarkdownEditor", () => ({
  MarkdownEditor: forwardRef(function MarkdownEditorMock(
    {
      value,
      onChange,
    }: {
      value: string;
      onChange?: (value: string) => void;
    },
    ref: ForwardedRef<{ focus: () => void }>,
  ) {
    useImperativeHandle(ref, () => ({
      focus: () => {},
    }));

    return (
      <textarea
        aria-label="Description"
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
      />
    );
  }),
}));

vi.mock("./InlineEntitySelector", () => ({
  InlineEntitySelector: forwardRef(function InlineEntitySelectorMock(
    {
      value,
      placeholder,
    }: {
      value?: string;
      placeholder?: string;
    },
    ref: ForwardedRef<HTMLButtonElement>,
  ) {
    return (
      <button ref={ref} type="button">
        {value || placeholder || "Selector"}
      </button>
    );
  }),
}));

vi.mock("./AgentIconPicker", () => ({
  AgentIcon: () => <span>agent-icon</span>,
}));

describe("NewIssueDialog interactions", () => {
  beforeEach(() => {
    closeNewIssueMock.mockReset();
    createIssueMock.mockReset();
    createIssueMock.mockResolvedValue({ id: "issue-1" });
  });

  it("submits a new issue with the selected company, project, and default assignee", async () => {
    const user = userEvent.setup();

    renderWithQueryClient(<NewIssueDialog />);

    await user.type(await screen.findByPlaceholderText("Issue title"), "Harden UI coverage");
    await user.click(screen.getByRole("button", { name: "Create Issue" }));

    await waitFor(() => {
      expect(createIssueMock).toHaveBeenCalledWith("company-1", {
        title: "Harden UI coverage",
        description: undefined,
        status: "todo",
        priority: "medium",
        assigneeAgentId: "agent-1",
        projectId: "project-1",
      });
    });

  });
});
