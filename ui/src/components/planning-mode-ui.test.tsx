import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Agent, Company } from "@paperclipai/shared";
import { CompanySettings } from "../pages/CompanySettings";
import { AgentProperties } from "./AgentProperties";
import { useCompany } from "../context/CompanyContext";
import { TooltipProvider } from "./ui/tooltip";

vi.mock("../context/CompanyContext", () => ({
  useCompany: vi.fn(),
}));

vi.mock("../context/BreadcrumbContext", () => ({
  useBreadcrumbs: () => ({ setBreadcrumbs: vi.fn() }),
}));

function createCompany(overrides: Partial<Company> = {}): Company {
  return {
    id: "company-1",
    name: "Paperclip",
    description: null,
    status: "active",
    issuePrefix: "PAP",
    issueCounter: 42,
    budgetMonthlyCents: 0,
    spentMonthlyCents: 0,
    requireBoardApprovalForNewAgents: false,
    defaultManagerPlanningMode: "approval_required",
    brandColor: null,
    createdAt: new Date("2026-03-09T09:00:00.000Z"),
    updatedAt: new Date("2026-03-09T10:00:00.000Z"),
    ...overrides,
  };
}

function createAgent(overrides: Partial<Agent> = {}): Agent {
  return {
    id: "agent-1",
    companyId: "company-1",
    name: "Planner",
    urlKey: "planner",
    role: "general",
    title: null,
    icon: null,
    status: "idle",
    reportsTo: null,
    capabilities: null,
    adapterType: "codex_local",
    adapterConfig: {},
    runtimeConfig: {},
    budgetMonthlyCents: 0,
    spentMonthlyCents: 0,
    permissions: { canCreateAgents: false },
    managerPlanningModeOverride: null,
    resolvedManagerPlanningMode: "approval_required",
    lastHeartbeatAt: null,
    metadata: null,
    createdAt: new Date("2026-03-09T09:00:00.000Z"),
    updatedAt: new Date("2026-03-09T10:00:00.000Z"),
    ...overrides,
  };
}

function renderWithQueryClient(node: React.ReactElement) {
  const queryClient = new QueryClient();
  return renderToStaticMarkup(
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>{node}</TooltipProvider>
    </QueryClientProvider>,
  );
}

describe("planning mode UI", () => {
  beforeEach(() => {
    vi.mocked(useCompany).mockReturnValue({
      companies: [createCompany()],
      selectedCompanyId: null,
      selectedCompany: createCompany(),
      selectionSource: "manual",
      loading: false,
      error: null,
      setSelectedCompanyId: vi.fn(),
      reloadCompanies: async () => {},
      createCompany: async () => createCompany(),
    });
  });

  it("renders the company setting controls for the default manager planning mode", () => {
    const html = renderWithQueryClient(<CompanySettings />);

    expect(html).toContain("Default manager planning mode");
    expect(html).toContain("Automatic");
    expect(html).toContain("Approval required");
  });

  it("shows the effective planning mode on agent properties", () => {
    const html = renderWithQueryClient(<AgentProperties agent={createAgent()} />);

    expect(html).toContain("Company default (Approval required)");
    expect(html).toContain("Approval required");
  });
});
