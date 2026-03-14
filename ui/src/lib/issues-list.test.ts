import { describe, expect, it } from "vitest";
import {
  applyIssueAssigneeFilters,
  applyIssueFilters,
  issueAssigneeGroupKey,
  issueAssigneeGroupLabel,
  issueDefaultsForGroup,
  ISSUE_ASSIGNEE_FILTER_ME,
  ISSUE_ASSIGNEE_FILTER_UNASSIGNED,
} from "./issues-list";

describe("issues list helpers", () => {
  const agentIssue = {
    id: "issue-agent",
    status: "todo",
    priority: "high",
    labelIds: ["label-a"],
    assigneeAgentId: "agent-123",
    assigneeUserId: null,
  };

  const userIssue = {
    id: "issue-user",
    status: "in_progress",
    priority: "medium",
    labelIds: ["label-b"],
    assigneeAgentId: null,
    assigneeUserId: "user-123",
  };

  const unassignedIssue = {
    id: "issue-unassigned",
    status: "backlog",
    priority: "low",
    labelIds: [],
    assigneeAgentId: null,
    assigneeUserId: null,
  };

  it("matches agent, current-user, explicit user, and unassigned assignee filters", () => {
    expect(applyIssueAssigneeFilters([agentIssue, userIssue, unassignedIssue], ["agent-123"])).toEqual([
      agentIssue,
    ]);
    expect(
      applyIssueAssigneeFilters(
        [agentIssue, userIssue, unassignedIssue],
        [ISSUE_ASSIGNEE_FILTER_ME],
        "user-123",
      ),
    ).toEqual([userIssue]);
    expect(
      applyIssueAssigneeFilters(
        [agentIssue, userIssue, unassignedIssue],
        ["__user:user-123"],
        "another-user",
      ),
    ).toEqual([userIssue]);
    expect(
      applyIssueAssigneeFilters(
        [agentIssue, userIssue, unassignedIssue],
        [ISSUE_ASSIGNEE_FILTER_UNASSIGNED],
      ),
    ).toEqual([unassignedIssue]);
  });

  it("applies assignee filters consistently alongside status, priority, and labels", () => {
    expect(
      applyIssueFilters(
        [agentIssue, userIssue, unassignedIssue],
        {
          statuses: ["in_progress"],
          priorities: ["medium"],
          assignees: ["__user:user-123"],
          labels: ["label-b"],
        },
        "another-user",
      ).map((issue) => issue.id),
    ).toEqual(["issue-user"]);
  });

  it("derives stable assignee group keys and labels for users and unassigned issues", () => {
    expect(issueAssigneeGroupKey(agentIssue)).toBe("agent-123");
    expect(issueAssigneeGroupKey(userIssue)).toBe("__user:user-123");
    expect(issueAssigneeGroupKey(unassignedIssue)).toBe(ISSUE_ASSIGNEE_FILTER_UNASSIGNED);

    expect(
      issueAssigneeGroupLabel("__user:user-123", {
        currentUserId: "user-123",
        agentName: () => null,
      }),
    ).toBe("Me");
    expect(
      issueAssigneeGroupLabel(ISSUE_ASSIGNEE_FILTER_UNASSIGNED, {
        currentUserId: "user-123",
        agentName: () => null,
      }),
    ).toBe("Unassigned");
  });

  it("builds new issue defaults from assignee groups without losing user assignments", () => {
    expect(
      issueDefaultsForGroup({
        groupBy: "assignee",
        groupKey: "__user:user-123",
        projectId: "project-123",
      }),
    ).toEqual({
      assigneeUserId: "user-123",
      projectId: "project-123",
    });

    expect(
      issueDefaultsForGroup({
        groupBy: "assignee",
        groupKey: "agent-123",
      }),
    ).toEqual({
      assigneeAgentId: "agent-123",
    });

    expect(
      issueDefaultsForGroup({
        groupBy: "assignee",
        groupKey: ISSUE_ASSIGNEE_FILTER_UNASSIGNED,
      }),
    ).toEqual({});
  });
});
