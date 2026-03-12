import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ApprovalPayloadRenderer } from "./ApprovalPayload";

describe("ApprovalPayloadRenderer", () => {
  it("renders manager-plan approvals with roadmap context and proposed issues", () => {
    const html = renderToStaticMarkup(
      <ApprovalPayloadRenderer
        type="approve_manager_plan"
        payload={{
          title: "Roadmap follow-through",
          summary: "Create the next set of health and roadmap issues.",
          roadmapItemIds: ["goal-health", "goal-roadmap"],
          proposedIssues: [
            {
              title: "Add subsystem diagnostics",
              assigneeAgentId: "agent-1",
              priority: "high",
              goalId: "goal-health",
            },
          ],
        }}
      />,
    );

    expect(html).toContain("Roadmap follow-through");
    expect(html).toContain("Roadmap items");
    expect(html).toContain("goal-health");
    expect(html).toContain("Add subsystem diagnostics");
    expect(html).toContain("assignee agent-1");
    expect(html).toContain("priority high");
  });
});
