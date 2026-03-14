import { formatAssigneeUserLabel } from "./assignees";

export const ISSUE_ASSIGNEE_FILTER_UNASSIGNED = "__unassigned";
export const ISSUE_ASSIGNEE_FILTER_ME = "__me";

// User-assignee buckets use a prefix so they can live alongside raw agent ids
// in the same saved filter and grouping state.
const USER_ASSIGNEE_FILTER_PREFIX = "__user:";

export interface IssueAssigneeLike {
  assigneeAgentId?: string | null;
  assigneeUserId?: string | null;
}

export interface IssueFilterableLike extends IssueAssigneeLike {
  status: string;
  priority: string;
  labelIds?: string[] | null;
}

export function issueAssigneeGroupKey(issue: IssueAssigneeLike): string {
  if (issue.assigneeAgentId) return issue.assigneeAgentId;
  if (issue.assigneeUserId) return `${USER_ASSIGNEE_FILTER_PREFIX}${issue.assigneeUserId}`;
  return ISSUE_ASSIGNEE_FILTER_UNASSIGNED;
}

export function issueAssigneeFilterMatches(
  issue: IssueAssigneeLike,
  assigneeFilter: string,
  currentUserId?: string | null,
): boolean {
  if (assigneeFilter === ISSUE_ASSIGNEE_FILTER_UNASSIGNED) {
    return !issue.assigneeAgentId && !issue.assigneeUserId;
  }
  if (assigneeFilter === ISSUE_ASSIGNEE_FILTER_ME) {
    return Boolean(currentUserId && issue.assigneeUserId === currentUserId);
  }
  if (assigneeFilter.startsWith(USER_ASSIGNEE_FILTER_PREFIX)) {
    return issue.assigneeUserId === assigneeFilter.slice(USER_ASSIGNEE_FILTER_PREFIX.length);
  }
  return issue.assigneeAgentId === assigneeFilter;
}

export function applyIssueAssigneeFilters<T extends IssueAssigneeLike>(
  issues: T[],
  assigneeFilters: string[],
  currentUserId?: string | null,
): T[] {
  if (assigneeFilters.length === 0) return issues;
  return issues.filter((issue) =>
    assigneeFilters.some((assigneeFilter) =>
      issueAssigneeFilterMatches(issue, assigneeFilter, currentUserId),
    ),
  );
}

export function issueAssigneeGroupLabel(
  groupKey: string,
  input: {
    currentUserId?: string | null;
    agentName: (id: string) => string | null;
  },
): string {
  if (groupKey === ISSUE_ASSIGNEE_FILTER_UNASSIGNED) return "Unassigned";
  if (groupKey.startsWith(USER_ASSIGNEE_FILTER_PREFIX)) {
    return formatAssigneeUserLabel(
      groupKey.slice(USER_ASSIGNEE_FILTER_PREFIX.length),
      input.currentUserId,
    ) ?? "User";
  }
  return input.agentName(groupKey) ?? groupKey.slice(0, 8);
}

export function issueDefaultsForGroup(input: {
  groupBy: "status" | "priority" | "assignee" | "none";
  groupKey?: string;
  projectId?: string;
}): Record<string, string> {
  const defaults: Record<string, string> = {};
  if (input.projectId) defaults.projectId = input.projectId;
  if (!input.groupKey) return defaults;

  if (input.groupBy === "status") {
    defaults.status = input.groupKey;
    return defaults;
  }
  if (input.groupBy === "priority") {
    defaults.priority = input.groupKey;
    return defaults;
  }
  if (
    input.groupBy === "assignee" &&
    input.groupKey !== ISSUE_ASSIGNEE_FILTER_UNASSIGNED
  ) {
    if (input.groupKey.startsWith(USER_ASSIGNEE_FILTER_PREFIX)) {
      defaults.assigneeUserId = input.groupKey.slice(USER_ASSIGNEE_FILTER_PREFIX.length);
    } else {
      defaults.assigneeAgentId = input.groupKey;
    }
  }

  return defaults;
}

export function applyIssueFilters<T extends IssueFilterableLike>(
  issues: T[],
  input: {
    statuses: string[];
    priorities: string[];
    assignees: string[];
    labels: string[];
  },
  currentUserId?: string | null,
): T[] {
  let result = issues;
  if (input.statuses.length > 0) {
    result = result.filter((issue) => input.statuses.includes(issue.status));
  }
  if (input.priorities.length > 0) {
    result = result.filter((issue) => input.priorities.includes(issue.priority));
  }
  result = applyIssueAssigneeFilters(result, input.assignees, currentUserId);
  if (input.labels.length > 0) {
    result = result.filter((issue) =>
      (issue.labelIds ?? []).some((labelId) => input.labels.includes(labelId)),
    );
  }
  return result;
}
