import { describe, expect, it } from "vitest";
import type { Db } from "@paperclipai/db";
import { companyPortabilityService, companyPortabilityTestHelpers } from "../services/company-portability.js";

function createInlineManifest() {
  return {
    schemaVersion: 1,
    generatedAt: "2026-03-15T12:00:00.000Z",
    source: {
      companyId: "11111111-1111-4111-8111-111111111111",
      companyName: "Portable Co",
    },
    includes: {
      company: true,
      agents: true,
    },
    company: {
      path: "COMPANY.md",
      name: "Portable Co",
      description: "Move safely between instances.",
      brandColor: "#335577",
      requireBoardApprovalForNewAgents: true,
      defaultManagerPlanningMode: "approval_required" as const,
    },
    agents: [
      {
        slug: "planner",
        name: "Planner",
        path: "agents/planner/AGENTS.md",
        role: "pm",
        title: null,
        icon: null,
        capabilities: "Plan work",
        reportsToSlug: null,
        adapterType: "process",
        adapterConfig: {},
        runtimeConfig: {},
        permissions: {},
        managerPlanningModeOverride: null,
        budgetMonthlyCents: 0,
        metadata: null,
      },
    ],
    requiredSecrets: [],
  };
}

describe("company portability helpers", () => {
  it("parses markdown frontmatter into typed scalar values", () => {
    const parsed = companyPortabilityTestHelpers.parseFrontmatterMarkdown(`---
kind: agent
name: Planner
budgetMonthlyCents: 25
requireBoardApprovalForNewAgents: true
metadata: {"team":"ops"}
---
# Planner

Keep the roadmap aligned.
`);

    expect(parsed.frontmatter).toEqual({
      kind: "agent",
      name: "Planner",
      budgetMonthlyCents: 25,
      requireBoardApprovalForNewAgents: true,
      metadata: { team: "ops" },
    });
    expect(parsed.body).toContain("# Planner");
  });

  it("warns when inline agent markdown does not declare kind: agent", async () => {
    const service = companyPortabilityService({} as Db);

    const preview = await service.previewImport({
      source: {
        type: "inline",
        manifest: createInlineManifest(),
        files: {
          "agents/planner/AGENTS.md": `---
name: Planner
---
Plan the next sprint.`,
        },
      },
      target: {
        mode: "new_company",
      },
    });

    expect(preview.selectedAgentSlugs).toEqual(["planner"]);
    expect(preview.warnings).toEqual(
      expect.arrayContaining([
        "Agent markdown agents/planner/AGENTS.md does not declare kind: agent in frontmatter.",
      ]),
    );
    expect(preview.errors).toEqual([]);
  });

  it("reports missing agent markdown files as preview errors", async () => {
    const service = companyPortabilityService({} as Db);

    const preview = await service.previewImport({
      source: {
        type: "inline",
        manifest: createInlineManifest(),
        files: {},
      },
      target: {
        mode: "new_company",
      },
    });

    expect(preview.errors).toEqual(
      expect.arrayContaining([
        "Missing markdown file for agent planner: agents/planner/AGENTS.md",
      ]),
    );
  });
});
