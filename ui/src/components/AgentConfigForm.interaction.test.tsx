import userEvent from "@testing-library/user-event";
import { screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AgentConfigForm } from "./AgentConfigForm";
import { renderWithQueryClient } from "../test/render";

const onSaveMock = vi.fn();

vi.mock("../context/CompanyContext", () => ({
  useCompany: () => ({
    selectedCompanyId: "company-1",
    selectedCompany: { id: "company-1", name: "Paperclip" },
  }),
}));

vi.mock("../api/secrets", () => ({
  secretsApi: {
    list: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock("../api/agents", () => ({
  agentsApi: {
    adapterModels: vi.fn().mockResolvedValue([]),
    testEnvironment: vi.fn().mockResolvedValue({ ok: true, checks: [] }),
  },
}));

vi.mock("../api/assets", () => ({
  assetsApi: {
    uploadImage: vi.fn(),
  },
}));

vi.mock("../adapters", () => ({
  getUIAdapter: () => ({
    ConfigFields: () => <div data-testid="adapter-fields">Adapter fields</div>,
  }),
}));

vi.mock("../adapters/claude-local/config-fields", () => ({
  ClaudeLocalAdvancedFields: () => <div>Claude advanced fields</div>,
}));

vi.mock("./MarkdownEditor", () => ({
  MarkdownEditor: () => <textarea aria-label="Prompt template" />,
}));

vi.mock("./PathInstructionsModal", () => ({
  ChoosePathButton: () => <button type="button">Choose path</button>,
}));

vi.mock("./OpenCodeLogoIcon", () => ({
  OpenCodeLogoIcon: () => <span>OpenCode</span>,
}));

describe("AgentConfigForm interactions", () => {
  beforeEach(() => {
    onSaveMock.mockReset();
  });

  it("marks local adapter edits dirty and saves the updated command", async () => {
    const user = userEvent.setup();

    renderWithQueryClient(
      <AgentConfigForm
        mode="edit"
        agent={{
          id: "agent-1",
          companyId: "company-1",
          name: "Builder Bot",
          urlKey: "builder-bot",
          role: "engineer",
          title: null,
          icon: null,
          status: "idle",
          reportsTo: null,
          capabilities: null,
          adapterType: "codex_local",
          adapterConfig: {
            command: "codex",
            model: "gpt-5",
            env: {},
            extraArgs: [],
            timeoutSec: 30,
            graceSec: 5,
          },
          runtimeConfig: {},
          budgetMonthlyCents: 0,
          spentMonthlyCents: 0,
          permissions: {
            canCreateAgents: false,
            canAssignTasks: true,
          },
          managerPlanningModeOverride: null,
          resolvedManagerPlanningMode: "automatic",
          lastHeartbeatAt: null,
          metadata: null,
          createdAt: new Date("2026-03-10T00:00:00.000Z"),
          updatedAt: new Date("2026-03-10T00:00:00.000Z"),
        }}
        onSave={onSaveMock}
      />,
    );

    const commandInput = await screen.findByDisplayValue("codex");
    await user.clear(commandInput);
    await user.type(commandInput, "codex exec");

    const saveButton = await screen.findByRole("button", { name: "Save" });
    await user.click(saveButton);

    await waitFor(() => {
      expect(onSaveMock).toHaveBeenCalledWith({
        adapterConfig: expect.objectContaining({
          command: "codex exec",
        }),
      });
    });
  });
});
