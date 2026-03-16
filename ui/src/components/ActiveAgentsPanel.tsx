import { useMemo } from "react";
import { Link } from "@/lib/router";
import { useQuery } from "@tanstack/react-query";
import type { Issue } from "@paperclipai/shared";
import { heartbeatsApi, type LiveRunForIssue } from "../api/heartbeats";
import { issuesApi } from "../api/issues";
import type { TranscriptEntry } from "../adapters";
import { queryKeys } from "../lib/queryKeys";
import { cn, relativeTime } from "../lib/utils";
import { ExternalLink } from "lucide-react";
import { Identity } from "./Identity";
import { RunTranscriptView } from "./transcript/RunTranscriptView";
import { useLiveRunTranscripts } from "./transcript/useLiveRunTranscripts";

const MIN_DASHBOARD_RUNS = 4;

function isRunActive(run: LiveRunForIssue): boolean {
  return run.status === "queued" || run.status === "running";
}

interface ActiveAgentsPanelProps {
  companyId: string;
}

export function ActiveAgentsPanel({ companyId }: ActiveAgentsPanelProps) {
  const { data: liveRuns } = useQuery({
    queryKey: [...queryKeys.liveRuns(companyId), "dashboard"],
    queryFn: () => heartbeatsApi.liveRunsForCompany(companyId, MIN_DASHBOARD_RUNS),
  });

  const runs = liveRuns ?? [];
  const { data: issues } = useQuery({
    queryKey: queryKeys.issues.list(companyId),
    queryFn: () => issuesApi.list(companyId),
    enabled: runs.length > 0,
  });

  const issueById = useMemo(() => {
    const map = new Map<string, Issue>();
    for (const issue of issues ?? []) {
      map.set(issue.id, issue);
    }
    return map;
  }, [issues]);

  const { transcriptByRun, hasOutputForRun } = useLiveRunTranscripts({
    runs,
    companyId,
    maxChunksPerRun: 120,
  });

  return (
    <div className="space-y-3">
      <div className="paperclip-section-header">
        <p className="paperclip-monitor-title">Agents</p>
      </div>
      {runs.length === 0 ? (
        <div className="paperclip-monitor-card p-4">
          <p className="text-sm text-muted-foreground">No recent agent runs.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {runs.map((run) => (
            <AgentRunCard
              key={run.id}
              run={run}
              issue={run.issueId ? issueById.get(run.issueId) : undefined}
              transcript={transcriptByRun.get(run.id) ?? []}
              hasOutput={hasOutputForRun(run.id)}
              isActive={isRunActive(run)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function AgentRunCard({
  run,
  issue,
  transcript,
  hasOutput,
  isActive,
}: {
  run: LiveRunForIssue;
  issue?: Issue;
  transcript: TranscriptEntry[];
  hasOutput: boolean;
  isActive: boolean;
}) {
  return (
    <div
      className={cn(
        "flex min-h-[220px] flex-col overflow-hidden",
        isActive ? "paperclip-monitor-card-strong shadow-[0_0_32px_color-mix(in_oklab,var(--primary)_16%,transparent)]" : "paperclip-monitor-card",
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/60 px-3 py-2.5">
        <div className="flex items-center gap-2 min-w-0">
          {isActive ? (
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
            </span>
          ) : (
            <span className="flex h-2 w-2 shrink-0">
              <span className="inline-flex rounded-full h-2 w-2 bg-muted-foreground/40" />
            </span>
          )}
          <Identity name={run.agentName} size="sm" />
          {isActive && (
            <span className="paperclip-nav-meta text-[0.62rem] text-blue-600 dark:text-blue-400">Live</span>
          )}
        </div>
        <Link
          to={`/agents/${run.agentId}/runs/${run.id}`}
          className="paperclip-chip inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] text-muted-foreground hover:text-foreground shrink-0"
        >
          <ExternalLink className="h-2.5 w-2.5" />
        </Link>
      </div>

      {/* Issue context */}
      {run.issueId && (
        <div className="flex min-w-0 items-center gap-1 border-b border-border/50 px-3 py-2 text-xs">
          <Link
            to={`/agents/${run.agentId}/runs/${run.id}`}
            className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-background/70 px-2 py-1 text-[10px] text-muted-foreground transition-colors hover:text-foreground"
          >
            <ExternalLink className="h-2.5 w-2.5" />
          </Link>
        </div>

      {/* Feed body */}
      <div ref={bodyRef} className="flex-1 space-y-1 overflow-y-auto p-3 font-mono text-[11px]">
        {isActive && recent.length === 0 && (
          <div className="rounded-xl bg-background/35 px-2.5 py-2 text-xs text-muted-foreground">
            Waiting for output...
          </div>
        )}
        {!isActive && recent.length === 0 && (
          <div className="rounded-xl bg-background/35 px-2.5 py-2 text-xs text-muted-foreground">
            {run.finishedAt ? `Finished ${relativeTime(run.finishedAt)}` : `Started ${relativeTime(run.createdAt)}`}
          </div>
        )}
        {recent.map((item, index) => (
          <div
            key={item.id}
            className={cn(
              "rounded-xl border border-border/50 bg-background/30 px-2.5 py-2",
              "flex items-start gap-2",
              index === recent.length - 1 && isActive && "animate-in fade-in slide-in-from-bottom-1 duration-300",
            )}
          >
            <span className="text-[10px] text-muted-foreground shrink-0">{relativeTime(item.ts)}</span>
            <span className={cn(
              "min-w-0 break-words",
              item.tone === "error" && "text-red-600 dark:text-red-300",
              item.tone === "warn" && "text-amber-600 dark:text-amber-300",
              item.tone === "assistant" && "text-emerald-700 dark:text-emerald-200",
              item.tone === "tool" && "text-cyan-600 dark:text-cyan-300",
              item.tone === "info" && "text-foreground/80",
            )}>
              {item.text}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
