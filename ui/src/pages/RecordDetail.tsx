import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ActivityEvent, Agent, Approval, Issue, Project, RecordLink } from "@paperclipai/shared";
import { Link, useParams } from "@/lib/router";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MarkdownBody } from "../components/MarkdownBody";
import { PageSkeleton } from "../components/PageSkeleton";
import { activityApi } from "../api/activity";
import { agentsApi } from "../api/agents";
import { approvalsApi } from "../api/approvals";
import { assetsApi } from "../api/assets";
import { issuesApi } from "../api/issues";
import { projectsApi } from "../api/projects";
import { recordsApi } from "../api/records";
import { useBreadcrumbs } from "../context/BreadcrumbContext";
import { useCompany } from "../context/CompanyContext";
import { queryKeys } from "../lib/queryKeys";
import { cn, formatDateTime, issueUrl, projectUrl, relativeTime } from "../lib/utils";
import { Paperclip, RefreshCcw } from "lucide-react";

function healthBadgeClass(status: string | null | undefined) {
  if (status === "green") return "border-green-500/40 bg-green-500/10 text-green-700 dark:text-green-300";
  if (status === "yellow") return "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300";
  if (status === "red") return "border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-300";
  return "border-border bg-muted/30 text-muted-foreground";
}

function actorLabel(event: ActivityEvent, agents: Agent[]) {
  if (event.actorType === "user") return "Board";
  if (event.actorType === "system") return "System";
  return agents.find((agent) => agent.id === event.actorId)?.name ?? event.actorId;
}

function actionLabel(action: string) {
  return action.replace(/[._]/g, " ");
}

function resolveLinkedEntity(
  link: RecordLink,
  data: {
    agents: Agent[];
    approvals: Approval[];
    issues: Issue[];
    projects: Project[];
  },
) {
  if (link.targetType === "project") {
    const project = data.projects.find((item) => item.id === link.targetId);
    return {
      label: project?.name ?? `Project ${link.targetId.slice(0, 8)}`,
      href: project ? projectUrl(project) : null,
    };
  }
  if (link.targetType === "issue") {
    const issue = data.issues.find((item) => item.id === link.targetId);
    return {
      label: issue ? `${issue.identifier ?? issue.id.slice(0, 8)} - ${issue.title}` : `Issue ${link.targetId.slice(0, 8)}`,
      href: issue ? issueUrl(issue) : null,
    };
  }
  if (link.targetType === "approval") {
    const approval = data.approvals.find((item) => item.id === link.targetId);
    return {
      label: approval ? `${approval.type.replace(/_/g, " ")} approval` : `Approval ${link.targetId.slice(0, 8)}`,
      href: `/approvals/${link.targetId}`,
    };
  }
  if (link.targetType === "agent") {
    const agent = data.agents.find((item) => item.id === link.targetId);
    return {
      label: agent?.name ?? `Agent ${link.targetId.slice(0, 8)}`,
      href: `/agents/${link.targetId}`,
    };
  }
  if (link.targetType === "record") {
    return {
      label: `Record ${link.targetId.slice(0, 8)}`,
      href: `/briefings/records/${link.targetId}`,
    };
  }
  if (link.targetType === "goal") {
    return {
      label: `Goal ${link.targetId.slice(0, 8)}`,
      href: `/goals/${link.targetId}`,
    };
  }
  return {
    label: `${link.targetType.replace(/_/g, " ")} ${link.targetId.slice(0, 8)}`,
    href: null,
  };
}

export function RecordDetail() {
  const { recordId } = useParams<{ recordId: string }>();
  const { selectedCompanyId, setSelectedCompanyId } = useCompany();
  const { setBreadcrumbs } = useBreadcrumbs();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [bodyMd, setBodyMd] = useState("");
  const [uploadError, setUploadError] = useState<string | null>(null);

  const recordQuery = useQuery({
    queryKey: queryKeys.records.detail(recordId ?? ""),
    queryFn: () => recordsApi.get(recordId!),
    enabled: !!recordId,
  });
  const record = recordQuery.data;

  useEffect(() => {
    if (!record?.companyId || record.companyId === selectedCompanyId) return;
    setSelectedCompanyId(record.companyId, { source: "route_sync" });
  }, [record?.companyId, selectedCompanyId, setSelectedCompanyId]);

  const companyId = record?.companyId ?? selectedCompanyId ?? "";

  const projectsQuery = useQuery({
    queryKey: queryKeys.projects.list(companyId),
    queryFn: () => projectsApi.list(companyId),
    enabled: Boolean(companyId),
  });
  const agentsQuery = useQuery({
    queryKey: queryKeys.agents.list(companyId),
    queryFn: () => agentsApi.list(companyId),
    enabled: Boolean(companyId),
  });
  const issuesQuery = useQuery({
    queryKey: queryKeys.issues.list(companyId),
    queryFn: () => issuesApi.list(companyId),
    enabled: Boolean(companyId),
  });
  const approvalsQuery = useQuery({
    queryKey: queryKeys.approvals.list(companyId),
    queryFn: () => approvalsApi.list(companyId),
    enabled: Boolean(companyId),
  });
  const activityQuery = useQuery({
    queryKey: queryKeys.records.activity(companyId, recordId ?? ""),
    queryFn: () => activityApi.list(companyId, { entityType: "record", entityId: recordId! }),
    enabled: Boolean(companyId && recordId),
  });

  useEffect(() => {
    if (!record) return;
    setTitle(record.title);
    setSummary(record.summary ?? "");
    setBodyMd(record.bodyMd ?? "");
    setBreadcrumbs([
      { label: "Briefings", href: "/briefings/board" },
      { label: record.title },
    ]);
  }, [record, setBreadcrumbs]);

  const saveMutation = useMutation({
    mutationFn: () => recordsApi.update(recordId!, { title, summary: summary || null, bodyMd: bodyMd || null }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.records.detail(recordId!) });
      await queryClient.invalidateQueries({ queryKey: ["records", companyId] });
    },
  });

  const generateMutation = useMutation({
    mutationFn: () => recordsApi.generate(recordId!, { since: "last_visit" }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.records.detail(recordId!) });
      await queryClient.invalidateQueries({ queryKey: ["records", companyId] });
    },
  });

  const publishMutation = useMutation({
    mutationFn: () => recordsApi.publish(recordId!),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.records.detail(recordId!) });
      await queryClient.invalidateQueries({ queryKey: ["records", companyId] });
      await queryClient.invalidateQueries({ queryKey: queryKeys.records.activity(companyId, recordId!) });
    },
  });

  const attachMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!record) throw new Error("Record not loaded");
      const asset = await assetsApi.uploadFile(record.companyId, file, "records");
      return recordsApi.addAttachment(record.id, { assetId: asset.assetId });
    },
    onSuccess: async () => {
      setUploadError(null);
      await queryClient.invalidateQueries({ queryKey: queryKeys.records.detail(recordId!) });
      await queryClient.invalidateQueries({ queryKey: queryKeys.records.activity(companyId, recordId!) });
    },
    onError: (error) => {
      setUploadError(error instanceof Error ? error.message : "Failed to attach file");
    },
  });

  const dirty = record ? title !== record.title || summary !== (record.summary ?? "") || bodyMd !== (record.bodyMd ?? "") : false;

  const relatedData = useMemo(
    () => ({
      agents: agentsQuery.data ?? [],
      approvals: approvalsQuery.data ?? [],
      issues: issuesQuery.data ?? [],
      projects: projectsQuery.data ?? [],
    }),
    [agentsQuery.data, approvalsQuery.data, issuesQuery.data, projectsQuery.data],
  );

  const ownerName = record?.ownerAgentId
    ? relatedData.agents.find((agent) => agent.id === record.ownerAgentId)?.name ?? record.ownerAgentId.slice(0, 8)
    : "Unassigned";

  if (recordQuery.isLoading) return <PageSkeleton variant="detail" />;
  if (recordQuery.error) return <p className="text-sm text-destructive">{recordQuery.error.message}</p>;
  if (!record) return <p className="text-sm text-muted-foreground">Record not found.</p>;

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border bg-card p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{record.category}</Badge>
              <Badge variant="outline">{record.kind.replace(/_/g, " ")}</Badge>
              <Badge variant="outline">{record.status.replace(/_/g, " ")}</Badge>
              {record.healthStatus ? (
                <span className={cn("rounded-full border px-2 py-0.5 text-xs font-medium", healthBadgeClass(record.healthStatus))}>
                  {record.healthStatus}
                </span>
              ) : null}
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-foreground">{record.title}</h1>
              <p className="text-sm text-muted-foreground">{record.summary ?? "No executive summary yet."}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {record.category === "briefing" ? (
              <Button variant="outline" onClick={() => generateMutation.mutate()} disabled={generateMutation.isPending}>
                <RefreshCcw className="mr-2 h-4 w-4" />
                {generateMutation.isPending ? "Generating..." : "Generate draft"}
              </Button>
            ) : null}
            <Button onClick={() => publishMutation.mutate()} disabled={publishMutation.isPending}>
              {publishMutation.isPending ? "Saving..." : record.category === "plan" ? "Activate plan" : "Publish"}
            </Button>
          </div>
        </div>

        <div className="mt-4 grid gap-3 text-sm md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-border/70 bg-background px-3 py-2">
            <div className="text-xs text-muted-foreground">Scope</div>
            <div className="mt-1 font-medium text-foreground">{record.scopeType.replace(/_/g, " ")}</div>
            <div className="text-xs text-muted-foreground">{record.scopeRefId}</div>
          </div>
          <div className="rounded-xl border border-border/70 bg-background px-3 py-2">
            <div className="text-xs text-muted-foreground">Owner</div>
            <div className="mt-1 font-medium text-foreground">{ownerName}</div>
          </div>
          <div className="rounded-xl border border-border/70 bg-background px-3 py-2">
            <div className="text-xs text-muted-foreground">Published</div>
            <div className="mt-1 font-medium text-foreground">{record.publishedAt ? formatDateTime(record.publishedAt) : "Not published"}</div>
          </div>
          <div className="rounded-xl border border-border/70 bg-background px-3 py-2">
            <div className="text-xs text-muted-foreground">Updated</div>
            <div className="mt-1 font-medium text-foreground">{formatDateTime(record.updatedAt)}</div>
          </div>
        </div>

        {(record.decisionNeeded || record.decisionDueAt || record.healthDelta || record.confidence != null) ? (
          <div className="mt-4 grid gap-3 text-sm md:grid-cols-4">
            <div className="rounded-xl border border-border/70 bg-background px-3 py-2">
              <div className="text-xs text-muted-foreground">Decision needed</div>
              <div className="mt-1 font-medium text-foreground">{record.decisionNeeded ? "Yes" : "No"}</div>
            </div>
            <div className="rounded-xl border border-border/70 bg-background px-3 py-2">
              <div className="text-xs text-muted-foreground">Decision due</div>
              <div className="mt-1 font-medium text-foreground">{record.decisionDueAt ? formatDateTime(record.decisionDueAt) : "Not set"}</div>
            </div>
            <div className="rounded-xl border border-border/70 bg-background px-3 py-2">
              <div className="text-xs text-muted-foreground">Trend</div>
              <div className="mt-1 font-medium text-foreground">{record.healthDelta ?? "Not set"}</div>
            </div>
            <div className="rounded-xl border border-border/70 bg-background px-3 py-2">
              <div className="text-xs text-muted-foreground">Confidence</div>
              <div className="mt-1 font-medium text-foreground">{record.confidence == null ? "Not set" : `${record.confidence}%`}</div>
            </div>
          </div>
        ) : null}
      </section>

      <section className="rounded-2xl border border-border bg-card p-4 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-foreground">Executive narrative</h2>
            <p className="text-sm text-muted-foreground">Edit the durable summary and detail body directly here.</p>
          </div>
          <Button variant="outline" onClick={() => saveMutation.mutate()} disabled={!dirty || saveMutation.isPending}>
            {saveMutation.isPending ? "Saving..." : "Save changes"}
          </Button>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="space-y-3">
            <label className="space-y-1 text-sm block">
              <span className="text-muted-foreground">Title</span>
              <Input value={title} onChange={(event) => setTitle(event.target.value)} />
            </label>
            <label className="space-y-1 text-sm block">
              <span className="text-muted-foreground">Summary</span>
              <Textarea value={summary} onChange={(event) => setSummary(event.target.value)} rows={4} />
            </label>
            <label className="space-y-1 text-sm block">
              <span className="text-muted-foreground">Body</span>
              <Textarea value={bodyMd} onChange={(event) => setBodyMd(event.target.value)} rows={16} />
            </label>
          </div>
          <div className="rounded-xl border border-border/70 bg-background p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-foreground">Preview</h3>
              <span className="text-xs text-muted-foreground">Markdown</span>
            </div>
            {bodyMd.trim().length > 0 ? (
              <MarkdownBody>{bodyMd}</MarkdownBody>
            ) : (
              <p className="text-sm text-muted-foreground">No body content yet.</p>
            )}
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="rounded-2xl border border-border bg-card p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-foreground">Linked work and evidence</h2>
              <p className="text-sm text-muted-foreground">Issues, approvals, runs, and related records attached to this executive artifact.</p>
            </div>
            <Badge variant="outline">{record.links?.length ?? 0} links</Badge>
          </div>
          <div className="space-y-3">
            {(record.links ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No linked work yet.</p>
            ) : (
              (record.links ?? []).map((link) => {
                const resolved = resolveLinkedEntity(link, relatedData);
                return (
                  <div key={link.id} className="rounded-xl border border-border/70 bg-background px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="outline">{link.targetType.replace(/_/g, " ")}</Badge>
                      <Badge variant="outline">{link.relation.replace(/_/g, " ")}</Badge>
                    </div>
                    <div className="mt-2 text-sm">
                      {resolved.href ? (
                        <Link to={resolved.href} className="font-medium text-foreground hover:underline">
                          {resolved.label}
                        </Link>
                      ) : (
                        <span className="font-medium text-foreground">{resolved.label}</span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        <div className="space-y-6">
          <section className="rounded-2xl border border-border bg-card p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-foreground">Attachments</h2>
                <p className="text-sm text-muted-foreground">General files for reports, decks, and artifacts.</p>
              </div>
              <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={attachMutation.isPending}>
                <Paperclip className="mr-2 h-4 w-4" />
                {attachMutation.isPending ? "Uploading..." : "Attach file"}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  attachMutation.mutate(file);
                  event.currentTarget.value = "";
                }}
              />
            </div>
            {uploadError ? <p className="mb-3 text-sm text-destructive">{uploadError}</p> : null}
            <div className="space-y-2">
              {(record.attachments ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No files attached yet.</p>
              ) : (
                (record.attachments ?? []).map((attachment) => (
                  <a
                    key={attachment.id}
                    href={attachment.asset.contentPath}
                    className="block rounded-xl border border-border/70 bg-background px-4 py-3 transition-colors hover:bg-accent/20"
                  >
                    <div className="text-sm font-medium text-foreground">{attachment.asset.originalFilename ?? attachment.asset.assetId}</div>
                    <div className="text-xs text-muted-foreground">{attachment.asset.contentType} · {attachment.asset.byteSize.toLocaleString()} bytes</div>
                  </a>
                ))
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-card p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-foreground">Activity</h2>
                <p className="text-sm text-muted-foreground">Compact audit trail for the record lifecycle.</p>
              </div>
              <Badge variant="outline">{activityQuery.data?.length ?? 0} events</Badge>
            </div>
            {activityQuery.isLoading ? (
              <p className="text-sm text-muted-foreground">Loading activity...</p>
            ) : activityQuery.error ? (
              <p className="text-sm text-destructive">{activityQuery.error.message}</p>
            ) : (
              <div className="space-y-2">
                {(activityQuery.data ?? []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">No activity yet.</p>
                ) : (
                  (activityQuery.data ?? []).map((event) => (
                    <div key={event.id} className="rounded-xl border border-border/70 bg-background px-4 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="text-sm font-medium text-foreground">{actorLabel(event, relatedData.agents)}</div>
                          <div className="text-sm text-muted-foreground">{actionLabel(event.action)}</div>
                        </div>
                        <div className="text-right text-xs text-muted-foreground">
                          <div>{relativeTime(event.createdAt)}</div>
                          <div>{formatDateTime(event.createdAt)}</div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
