import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "@/lib/router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Issue, IssuePageSortDirection, IssuePageSortField } from "@paperclipai/shared";
import { agentsApi } from "../api/agents";
import { authApi } from "../api/auth";
import { heartbeatsApi } from "../api/heartbeats";
import { issuesApi } from "../api/issues";
import { projectsApi } from "../api/projects";
import { Identity } from "../components/Identity";
import { EmptyState } from "../components/EmptyState";
import { PageSkeleton } from "../components/PageSkeleton";
import { StatusIcon } from "../components/StatusIcon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useBreadcrumbs } from "../context/BreadcrumbContext";
import { useCompany } from "../context/CompanyContext";
import { useDialog } from "../context/DialogContext";
import { formatAssigneeUserLabel } from "../lib/assignees";
import { queryKeys } from "../lib/queryKeys";
import { formatDate } from "../lib/utils";
import { CircleDot, Plus, Search } from "lucide-react";

const DEFAULT_PAGE = 1;
const ISSUES_PAGE_SIZE = 25;
const DEFAULT_SORT_FIELD: IssuePageSortField = "updated";
const DEFAULT_SORT_DIR: IssuePageSortDirection = "desc";
const DEFAULT_TERMINAL_AGE_HOURS = 48;

const STATUS_FILTER_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "todo,in_progress,in_review,blocked", label: "Active" },
  { value: "backlog", label: "Backlog" },
  { value: "todo", label: "Todo" },
  { value: "in_progress", label: "In progress" },
  { value: "in_review", label: "In review" },
  { value: "blocked", label: "Blocked" },
  { value: "done,cancelled", label: "Closed" },
  { value: "done", label: "Done" },
  { value: "cancelled", label: "Cancelled" },
] as const;

const SORT_OPTIONS: Array<{
  value: string;
  label: string;
  field: IssuePageSortField;
  dir: IssuePageSortDirection;
}> = [
  { value: "updated:desc", label: "Updated, newest first", field: "updated", dir: "desc" },
  { value: "updated:asc", label: "Updated, oldest first", field: "updated", dir: "asc" },
  { value: "created:desc", label: "Created, newest first", field: "created", dir: "desc" },
  { value: "created:asc", label: "Created, oldest first", field: "created", dir: "asc" },
  { value: "priority:asc", label: "Priority, highest first", field: "priority", dir: "asc" },
  { value: "priority:desc", label: "Priority, lowest first", field: "priority", dir: "desc" },
  { value: "status:asc", label: "Status, active first", field: "status", dir: "asc" },
  { value: "status:desc", label: "Status, terminal first", field: "status", dir: "desc" },
  { value: "title:asc", label: "Title, A to Z", field: "title", dir: "asc" },
  { value: "title:desc", label: "Title, Z to A", field: "title", dir: "desc" },
];

const TERMINAL_AGE_OPTIONS = [
  { value: "24", label: "Hide done/cancelled after 24h" },
  { value: "48", label: "Hide done/cancelled after 48h" },
  { value: "168", label: "Hide done/cancelled after 7d" },
  { value: "all", label: "Show all terminal issues" },
] as const;

function parsePositivePage(value: string | null): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) return DEFAULT_PAGE;
  return Math.trunc(parsed);
}

function parseSortField(value: string | null): IssuePageSortField {
  if (value === "created" || value === "priority" || value === "title" || value === "status") {
    return value;
  }
  return DEFAULT_SORT_FIELD;
}

function parseSortDir(value: string | null, sortField: IssuePageSortField): IssuePageSortDirection {
  if (value === "asc" || value === "desc") return value;
  return sortField === "created" || sortField === "updated" ? "desc" : "asc";
}

function parseTerminalAge(value: string | null): number | "all" {
  if (value === "all") return "all";
  if (value === "24" || value === "168") return Number(value);
  return DEFAULT_TERMINAL_AGE_HOURS;
}

// Centralize query updates so filter changes reliably reset pagination while keeping unrelated
// controls, such as sort order, intact.
function buildNextSearchParams(
  search: string,
  patch: Record<string, string | null | undefined>,
  options?: { resetPage?: boolean },
) {
  const next = new URLSearchParams(search);
  for (const [key, value] of Object.entries(patch)) {
    if (value == null || value === "") {
      next.delete(key);
    } else {
      next.set(key, value);
    }
  }
  if (options?.resetPage) {
    next.delete("page");
  }
  if (next.get("page") === "1") {
    next.delete("page");
  }
  return next;
}

function assigneeSummary(issue: Issue, input: {
  agentNames: Map<string, string>;
  currentUserId: string | null;
}) {
  if (issue.assigneeAgentId) {
    return {
      kind: "agent" as const,
      label: input.agentNames.get(issue.assigneeAgentId) ?? issue.assigneeAgentId.slice(0, 8),
    };
  }
  if (issue.assigneeUserId) {
    return {
      kind: "user" as const,
      label: formatAssigneeUserLabel(issue.assigneeUserId, input.currentUserId) ?? "Board user",
    };
  }
  return {
    kind: "none" as const,
    label: "Unassigned",
  };
}

export function Issues() {
  const { selectedCompanyId } = useCompany();
  const { setBreadcrumbs } = useBreadcrumbs();
  const { openNewIssue } = useDialog();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const searchParamString = searchParams.toString();

  const querySearch = searchParams.get("q") ?? "";
  const page = parsePositivePage(searchParams.get("page"));
  const status = searchParams.get("status") ?? "";
  const assigneeAgentId = searchParams.get("assigneeAgentId") ?? undefined;
  const assigneeUserId = searchParams.get("assigneeUserId") ?? undefined;
  const projectId = searchParams.get("projectId") ?? undefined;
  const sortField = parseSortField(searchParams.get("sortField"));
  const sortDir = parseSortDir(searchParams.get("sortDir"), sortField);
  const terminalAge = parseTerminalAge(searchParams.get("terminalAgeHours"));
  const selectedAssigneeValue = assigneeAgentId
    ? `agent:${assigneeAgentId}`
    : assigneeUserId === "me"
      ? "me"
      : "all";
  const selectedSortValue = `${sortField}:${sortDir}`;

  const [searchInput, setSearchInput] = useState(querySearch);

  useEffect(() => {
    setBreadcrumbs([{ label: "Issues" }]);
  }, [setBreadcrumbs]);

  useEffect(() => {
    setSearchInput(querySearch);
  }, [querySearch]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const trimmed = searchInput.trim();
      if (trimmed === querySearch) return;
      const next = buildNextSearchParams(searchParamString, { q: trimmed || null }, { resetPage: true });
      setSearchParams(next, { replace: true });
    }, 300);
    return () => window.clearTimeout(timeoutId);
  }, [querySearch, searchInput, searchParamString, setSearchParams]);

  const { data: session } = useQuery({
    queryKey: queryKeys.auth.session,
    queryFn: () => authApi.getSession(),
  });

  const { data: agents = [] } = useQuery({
    queryKey: queryKeys.agents.list(selectedCompanyId!),
    queryFn: () => agentsApi.list(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  });

  const { data: projects = [] } = useQuery({
    queryKey: queryKeys.projects.list(selectedCompanyId!),
    queryFn: () => projectsApi.list(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  });

  const { data: liveRuns = [] } = useQuery({
    queryKey: queryKeys.liveRuns(selectedCompanyId!),
    queryFn: () => heartbeatsApi.liveRunsForCompany(selectedCompanyId!),
    enabled: !!selectedCompanyId,
    refetchInterval: 5000,
  });

  const liveIssueIds = useMemo(() => {
    const ids = new Set<string>();
    for (const run of liveRuns) {
      if (run.issueId) ids.add(run.issueId);
    }
    return ids;
  }, [liveRuns]);

  const pageFilters = useMemo(() => ({
    status: status || undefined,
    assigneeAgentId,
    assigneeUserId,
    projectId,
    q: querySearch.trim() || undefined,
    page,
    pageSize: ISSUES_PAGE_SIZE,
    sortField,
    sortDir,
    terminalAgeHours: terminalAge,
  }), [assigneeAgentId, assigneeUserId, page, projectId, querySearch, sortDir, sortField, status, terminalAge]);

  const issuesPageQuery = useQuery({
    queryKey: queryKeys.issues.page(selectedCompanyId!, pageFilters),
    queryFn: () => issuesApi.listPage(selectedCompanyId!, pageFilters),
    enabled: !!selectedCompanyId,
  });

  const isRecoveringOutOfRangePage =
    !!issuesPageQuery.data &&
    issuesPageQuery.data.total > 0 &&
    issuesPageQuery.data.items.length === 0 &&
    issuesPageQuery.data.page > issuesPageQuery.data.totalPages;

  const updateIssue = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) => issuesApi.update(id, data),
    onSuccess: async (_issue, variables) => {
      if (!selectedCompanyId) return;
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.issues.list(selectedCompanyId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.issues.detail(variables.id) }),
      ]);
    },
  });

  useEffect(() => {
    if (!issuesPageQuery.data) return;
    if (issuesPageQuery.data.page === page) return;
    const next = buildNextSearchParams(
      searchParamString,
      { page: issuesPageQuery.data.page > 1 ? String(issuesPageQuery.data.page) : null },
    );
    setSearchParams(next, { replace: true });
  }, [issuesPageQuery.data, page, searchParamString, setSearchParams]);

  useEffect(() => {
    if (!isRecoveringOutOfRangePage || !issuesPageQuery.data) return;
    // Keep operators on a valid page after the API reports an empty,
    // out-of-range result without mutating the server-side pagination contract.
    const next = buildNextSearchParams(
      searchParamString,
      { page: issuesPageQuery.data.totalPages > 1 ? String(issuesPageQuery.data.totalPages) : null },
    );
    setSearchParams(next, { replace: true });
  }, [isRecoveringOutOfRangePage, issuesPageQuery.data, searchParamString, setSearchParams]);

  const currentUserId = session?.user?.id ?? session?.session?.userId ?? null;
  const agentNames = useMemo(
    () => new Map(agents.map((agent) => [agent.id, agent.name])),
    [agents],
  );
  const projectNames = useMemo(
    () => new Map(projects.map((project) => [project.id, project.name])),
    [projects],
  );

  const activeFilterCount = [
    querySearch.trim(),
    status,
    assigneeAgentId ?? assigneeUserId,
    projectId,
    terminalAge === DEFAULT_TERMINAL_AGE_HOURS ? "" : String(terminalAge),
  ].filter(Boolean).length;

  const resultsLabel = useMemo(() => {
    const pageData = issuesPageQuery.data;
    if (!pageData) return null;
    if (pageData.total === 0) return "0 issues";
    if (pageData.items.length === 0) return `Showing 0 of ${pageData.total} issues`;
    const start = (pageData.page - 1) * pageData.pageSize + 1;
    const end = start + pageData.items.length - 1;
    return `Showing ${start}-${end} of ${pageData.total} issues`;
  }, [issuesPageQuery.data]);

  if (!selectedCompanyId) {
    return <EmptyState icon={CircleDot} message="Select a company to view issues." />;
  }

  function applyQueryPatch(
    patch: Record<string, string | null | undefined>,
    options?: { resetPage?: boolean; replace?: boolean },
  ) {
    const next = buildNextSearchParams(searchParamString, patch, { resetPage: options?.resetPage });
    setSearchParams(next, { replace: options?.replace });
  }

  function clearFilters() {
    const next = buildNextSearchParams(
      searchParamString,
      {
        q: null,
        status: null,
        assigneeAgentId: null,
        assigneeUserId: null,
        projectId: null,
        terminalAgeHours: null,
      },
      { resetPage: true },
    );
    setSearchParams(next);
  }

  const emptyMessage =
    activeFilterCount > 0
      ? "No issues match the current filters."
      : "No issues have been created for this company yet.";

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border/70 bg-card p-4">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center">
              <Button
                size="sm"
                variant="outline"
                onClick={() => openNewIssue(projectId ? { projectId } : undefined)}
              >
                <Plus className="mr-1 h-4 w-4" />
                New Issue
              </Button>
              <div className="relative w-full sm:max-w-md">
                <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  aria-label="Search issues"
                  className="pl-7"
                  placeholder="Search issues by title, identifier, or comment"
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                />
              </div>
            </div>
            {activeFilterCount > 0 ? (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Clear filters
              </Button>
            ) : null}
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <label className="space-y-1 text-sm">
              <span className="text-muted-foreground">Status</span>
              <select
                aria-label="Status filter"
                value={status}
                onChange={(event) => applyQueryPatch({ status: event.target.value || null }, { resetPage: true })}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {STATUS_FILTER_OPTIONS.map((option) => (
                  <option key={option.value || "all"} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1 text-sm">
              <span className="text-muted-foreground">Assignee</span>
              <select
                aria-label="Assignee filter"
                value={selectedAssigneeValue}
                onChange={(event) => {
                  const nextValue = event.target.value;
                  if (nextValue === "all") {
                    applyQueryPatch(
                      { assigneeAgentId: null, assigneeUserId: null },
                      { resetPage: true },
                    );
                    return;
                  }
                  if (nextValue === "me") {
                    applyQueryPatch(
                      { assigneeAgentId: null, assigneeUserId: "me" },
                      { resetPage: true },
                    );
                    return;
                  }
                  const agentId = nextValue.startsWith("agent:") ? nextValue.slice("agent:".length) : "";
                  applyQueryPatch(
                    { assigneeAgentId: agentId || null, assigneeUserId: null },
                    { resetPage: true },
                  );
                }}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="all">All assignees</option>
                {currentUserId ? <option value="me">Assigned to me</option> : null}
                {agents.map((agent) => (
                  <option key={agent.id} value={`agent:${agent.id}`}>
                    {agent.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1 text-sm">
              <span className="text-muted-foreground">Project</span>
              <select
                aria-label="Project filter"
                value={projectId ?? ""}
                onChange={(event) => applyQueryPatch({ projectId: event.target.value || null }, { resetPage: true })}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">All projects</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1 text-sm">
              <span className="text-muted-foreground">Sort</span>
              <select
                aria-label="Sort issues"
                value={selectedSortValue}
                onChange={(event) => {
                  const selected = SORT_OPTIONS.find((option) => option.value === event.target.value);
                  if (!selected) return;
                  applyQueryPatch(
                    {
                      sortField: selected.field === DEFAULT_SORT_FIELD ? null : selected.field,
                      sortDir: selected.field === DEFAULT_SORT_FIELD && selected.dir === DEFAULT_SORT_DIR
                        ? null
                        : selected.dir,
                    },
                    { replace: true },
                  );
                }}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1 text-sm">
              <span className="text-muted-foreground">Terminal age</span>
              <select
                aria-label="Terminal age filter"
                value={String(terminalAge)}
                onChange={(event) =>
                  applyQueryPatch(
                    { terminalAgeHours: event.target.value === String(DEFAULT_TERMINAL_AGE_HOURS) ? null : event.target.value },
                    { resetPage: true },
                  )}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {TERMINAL_AGE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="flex flex-col gap-1 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <div>
              {resultsLabel}
              {issuesPageQuery.data && issuesPageQuery.data.total > 0 ? ` • Page ${issuesPageQuery.data.page} of ${issuesPageQuery.data.totalPages}` : ""}
            </div>
            <div>{activeFilterCount > 0 ? `${activeFilterCount} active filter${activeFilterCount === 1 ? "" : "s"}` : "Default 48h terminal trimming"}</div>
          </div>
        </div>
      </section>

      {issuesPageQuery.isLoading ? <PageSkeleton variant="issues-list" /> : null}
      {issuesPageQuery.error ? <p className="text-sm text-destructive">{issuesPageQuery.error.message}</p> : null}

      {!issuesPageQuery.isLoading && !issuesPageQuery.error && !isRecoveringOutOfRangePage && issuesPageQuery.data?.items.length === 0 ? (
        <EmptyState
          icon={CircleDot}
          message={emptyMessage}
          action="Create Issue"
          onAction={() => openNewIssue(projectId ? { projectId } : undefined)}
        />
      ) : null}

      {!issuesPageQuery.isLoading && !issuesPageQuery.error && (issuesPageQuery.data?.items.length ?? 0) > 0 ? (
        <div className="overflow-hidden rounded-2xl border border-border/70 bg-card">
          {issuesPageQuery.data?.items.map((issue) => {
            const assignee = assigneeSummary(issue, { agentNames, currentUserId });
            const projectName = issue.projectId ? projectNames.get(issue.projectId) : null;

            return (
              <Link
                key={issue.id}
                to={`/issues/${issue.identifier ?? issue.id}`}
                className="flex items-center gap-3 border-b border-border/70 px-4 py-3 text-sm text-inherit no-underline transition-colors last:border-b-0 hover:bg-accent/30"
              >
                <div onClick={(event) => { event.preventDefault(); event.stopPropagation(); }}>
                  <StatusIcon
                    status={issue.status}
                    onChange={(nextStatus) => updateIssue.mutate({ id: issue.id, data: { status: nextStatus } })}
                  />
                </div>

                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground">
                      {issue.identifier ?? issue.id.slice(0, 8)}
                    </span>
                    {projectName ? (
                      <span className="rounded-full border border-border/70 px-2 py-0.5 text-[11px] text-muted-foreground">
                        {projectName}
                      </span>
                    ) : null}
                    {liveIssueIds.has(issue.id) ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-0.5 text-[11px] font-medium text-blue-600">
                        <span className="relative flex h-2 w-2">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75" />
                          <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-500" />
                        </span>
                        Live
                      </span>
                    ) : null}
                  </div>
                  <p className="truncate font-medium text-foreground">{issue.title}</p>
                  {(issue.labels ?? []).length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {(issue.labels ?? []).slice(0, 3).map((label) => (
                        <span
                          key={label.id}
                          className="inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] font-medium"
                          style={{
                            borderColor: label.color,
                            color: label.color,
                            backgroundColor: `${label.color}1f`,
                          }}
                        >
                          {label.name}
                        </span>
                      ))}
                      {(issue.labels ?? []).length > 3 ? (
                        <span className="text-[10px] text-muted-foreground">
                          +{(issue.labels ?? []).length - 3}
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                </div>

                <div className="hidden shrink-0 text-right text-xs text-muted-foreground sm:block">
                  {assignee.kind === "agent" ? (
                    <Identity name={assignee.label} size="sm" />
                  ) : (
                    <div>{assignee.label}</div>
                  )}
                  <div className="mt-1">Updated {formatDate(issue.updatedAt)}</div>
                </div>
              </Link>
            );
          })}
        </div>
      ) : null}

      {!issuesPageQuery.isLoading && !issuesPageQuery.error && !isRecoveringOutOfRangePage && issuesPageQuery.data && issuesPageQuery.data.total > 0 ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            {resultsLabel}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={issuesPageQuery.data.page <= 1}
              onClick={() =>
                applyQueryPatch(
                  { page: issuesPageQuery.data && issuesPageQuery.data.page > 2 ? String(issuesPageQuery.data.page - 1) : null },
                  { replace: true },
                )}
            >
              Previous
            </Button>
            <span className="min-w-24 text-center text-sm text-muted-foreground">
              Page {issuesPageQuery.data.page} of {issuesPageQuery.data.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={issuesPageQuery.data.page >= issuesPageQuery.data.totalPages}
              onClick={() =>
                applyQueryPatch(
                  { page: String(issuesPageQuery.data.page + 1) },
                  { replace: true },
                )}
            >
              Next
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
