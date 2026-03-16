import userEvent from "@testing-library/user-event";
import { screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CompanySettings } from "./CompanySettings";
import { renderWithQueryClient } from "../test/render";

const {
  setSelectedCompanyIdMock,
  companyUpdateMock,
  createInvitePromptMock,
  getInviteOnboardingMock,
} = vi.hoisted(() => ({
  setSelectedCompanyIdMock: vi.fn(),
  companyUpdateMock: vi.fn(),
  createInvitePromptMock: vi.fn(),
  getInviteOnboardingMock: vi.fn(),
}));

const selectedCompany = {
  id: "company-1",
  name: "Paperclip",
  description: "Ship the control plane",
  brandColor: "#336699",
  issuePrefix: "PAP",
  requireBoardApprovalForNewAgents: false,
  defaultManagerPlanningMode: "approval_required",
} as const;

vi.mock("../context/CompanyContext", () => ({
  useCompany: () => ({
    companies: [selectedCompany],
    selectedCompany,
    selectedCompanyId: selectedCompany.id,
    setSelectedCompanyId: setSelectedCompanyIdMock,
  }),
}));

vi.mock("../context/BreadcrumbContext", () => ({
  useBreadcrumbs: () => ({
    setBreadcrumbs: vi.fn(),
  }),
}));

vi.mock("../api/companies", () => ({
  companiesApi: {
    update: companyUpdateMock,
    archive: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("../api/access", () => ({
  accessApi: {
    createOpenClawInvitePrompt: createInvitePromptMock,
    getInviteOnboarding: getInviteOnboardingMock,
  },
}));

vi.mock("../components/CompanyPatternIcon", () => ({
  CompanyPatternIcon: ({ companyName }: { companyName: string }) => <div>{companyName}</div>,
}));

describe("CompanySettings interactions", () => {
  beforeEach(() => {
    setSelectedCompanyIdMock.mockReset();
    companyUpdateMock.mockReset();
    createInvitePromptMock.mockReset();
    getInviteOnboardingMock.mockReset();
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });

    companyUpdateMock.mockResolvedValue({
      ...selectedCompany,
      name: "Paperclip Labs",
    });
    createInvitePromptMock.mockResolvedValue({
      token: "invite-token",
      onboardingTextUrl: "/api/invites/invite-token/onboarding.txt",
    });
    getInviteOnboardingMock.mockResolvedValue({
      onboarding: {
        connectivity: {
          connectionCandidates: ["http://127.0.0.1:3100/api/invites/invite-token/onboarding.txt"],
          testResolutionEndpoint: {
            url: "http://127.0.0.1:3100/api/health",
          },
        },
      },
    });
  });

  it("persists general company edits and surfaces the success state", async () => {
    const user = userEvent.setup();

    renderWithQueryClient(<CompanySettings />);

    const companyNameInput = await screen.findByDisplayValue("Paperclip");
    await user.clear(companyNameInput);
    await user.type(companyNameInput, "Paperclip Labs");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => {
      expect(companyUpdateMock).toHaveBeenCalledWith("company-1", {
        name: "Paperclip Labs",
        description: "Ship the control plane",
        brandColor: "#336699",
      });
    });

    expect(await screen.findByText("Saved")).toBeInTheDocument();
  });

  it("generates an OpenClaw invite snippet and renders it for copy", async () => {
    const user = userEvent.setup();

    renderWithQueryClient(<CompanySettings />);

    await user.click(screen.getByRole("button", { name: "Generate OpenClaw Invite Prompt" }));

    expect(await screen.findByText("OpenClaw Invite Prompt")).toBeInTheDocument();
    await waitFor(() => {
      expect(createInvitePromptMock).toHaveBeenCalledWith("company-1");
      expect(getInviteOnboardingMock).toHaveBeenCalledWith("invite-token");
    });

    const snippetField = screen.getAllByRole("textbox").at(-1);
    expect((snippetField as HTMLTextAreaElement).value).toContain("invite-token/onboarding.txt");
  });
});
