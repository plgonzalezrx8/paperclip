import type { SubsystemHealthResponse } from "@paperclipai/shared";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "../lib/utils";
import { timeAgo } from "../lib/timeAgo";

const STATUS_CLASSES = {
  green: "bg-green-500",
  yellow: "bg-yellow-500",
  red: "bg-red-500",
  unknown: "bg-zinc-400",
} as const;

function StatusDot({ status }: { status: keyof typeof STATUS_CLASSES }) {
  return <span className={cn("inline-block h-2.5 w-2.5 rounded-full", STATUS_CLASSES[status])} />;
}

interface SystemHealthSectionProps {
  data?: SubsystemHealthResponse;
  error?: Error | null;
  isLoading: boolean;
  isRefetching: boolean;
  onRefresh: () => void;
}

export function SystemHealthSection({
  data,
  error,
  isLoading,
  isRefetching,
  onRefresh,
}: SystemHealthSectionProps) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            System Health
          </h2>
          <p className="text-sm text-muted-foreground">
            Instance-level diagnostics for the control plane and local runtimes.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={onRefresh} disabled={isRefetching}>
          <RefreshCw className={cn("mr-1.5 h-3.5 w-3.5", isRefetching && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {isLoading && (
        <div className="border border-border px-4 py-3 text-sm text-muted-foreground">
          Loading subsystem diagnostics...
        </div>
      )}

      {error && (
        <div className="border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-950/50 dark:text-red-200">
          {error.message}
        </div>
      )}

      {data && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <StatusDot status={data.status} />
            <span className="capitalize">{data.status}</span>
            <span>checked {timeAgo(data.testedAt)}</span>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {data.checks.map((check) => (
              <article key={check.id} className="border border-border p-4 space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <StatusDot status={check.status} />
                    <h3 className="text-sm font-medium">{check.label}</h3>
                  </div>
                  <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    {check.blocking ? "blocking" : "advisory"}
                  </span>
                </div>
                <p className="text-sm">{check.summary}</p>
                {check.detail && (
                  <p className="text-xs text-muted-foreground">{check.detail}</p>
                )}
                {check.hint && (
                  <p className="text-xs text-muted-foreground">Hint: {check.hint}</p>
                )}
                <p className="text-[11px] text-muted-foreground">
                  Checked {timeAgo(check.testedAt)}
                </p>
              </article>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
