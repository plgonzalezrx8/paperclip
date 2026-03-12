import { Lightbulb, Map, ShieldCheck, UserPlus } from "lucide-react";

export const typeLabel: Record<string, string> = {
  hire_agent: "Hire Agent",
  approve_ceo_strategy: "CEO Strategy",
  approve_manager_plan: "Manager Plan",
};

export const typeIcon: Record<string, typeof UserPlus> = {
  hire_agent: UserPlus,
  approve_ceo_strategy: Lightbulb,
  approve_manager_plan: Map,
};

export const defaultTypeIcon = ShieldCheck;

function PayloadField({ label, value }: { label: string; value: unknown }) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-2">
      <span className="text-muted-foreground w-20 sm:w-24 shrink-0 text-xs">{label}</span>
      <span>{String(value)}</span>
    </div>
  );
}

export function HireAgentPayload({ payload }: { payload: Record<string, unknown> }) {
  return (
    <div className="mt-3 space-y-1.5 text-sm">
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground w-20 sm:w-24 shrink-0 text-xs">Name</span>
        <span className="font-medium">{String(payload.name ?? "—")}</span>
      </div>
      <PayloadField label="Role" value={payload.role} />
      <PayloadField label="Title" value={payload.title} />
      <PayloadField label="Icon" value={payload.icon} />
      {!!payload.capabilities && (
        <div className="flex items-start gap-2">
          <span className="text-muted-foreground w-20 sm:w-24 shrink-0 text-xs pt-0.5">Capabilities</span>
          <span className="text-muted-foreground">{String(payload.capabilities)}</span>
        </div>
      )}
      {!!payload.adapterType && (
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground w-20 sm:w-24 shrink-0 text-xs">Adapter</span>
          <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
            {String(payload.adapterType)}
          </span>
        </div>
      )}
    </div>
  );
}

export function CeoStrategyPayload({ payload }: { payload: Record<string, unknown> }) {
  const plan = payload.plan ?? payload.description ?? payload.strategy ?? payload.text;
  return (
    <div className="mt-3 space-y-1.5 text-sm">
      <PayloadField label="Title" value={payload.title} />
      {!!plan && (
        <div className="mt-2 rounded-md bg-muted/40 px-3 py-2 text-sm text-muted-foreground whitespace-pre-wrap font-mono text-xs max-h-48 overflow-y-auto">
          {String(plan)}
        </div>
      )}
      {!plan && (
        <pre className="mt-2 rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground overflow-x-auto max-h-48">
          {JSON.stringify(payload, null, 2)}
        </pre>
      )}
    </div>
  );
}

function readStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];
}

function readIssueDrafts(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value)
    ? value.filter(
        (entry): entry is Record<string, unknown> =>
          typeof entry === "object" && entry !== null && !Array.isArray(entry),
      )
    : [];
}

function readDisplayText(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return null;
}

export function ManagerPlanPayload({ payload }: { payload: Record<string, unknown> }) {
  const roadmapItemIds = readStringArray(payload.roadmapItemIds ?? payload.goalIds ?? payload.roadmapIds);
  const proposedIssues = readIssueDrafts(payload.proposedIssues ?? payload.issues);
  const summary = readDisplayText(payload.summary ?? payload.rationale ?? payload.description);

  return (
    <div className="mt-3 space-y-2 text-sm">
      <PayloadField label="Title" value={payload.title} />
      {summary && (
        <div className="rounded-md bg-muted/40 px-3 py-2 text-sm text-muted-foreground whitespace-pre-wrap">
          {String(summary)}
        </div>
      )}
      {roadmapItemIds.length > 0 && (
        <div className="space-y-1">
          <span className="text-muted-foreground text-xs">Roadmap items</span>
          <div className="flex flex-wrap gap-1.5">
            {roadmapItemIds.map((itemId) => (
              <span
                key={itemId}
                className="rounded-md border border-border px-2 py-1 text-xs font-mono"
              >
                {itemId}
              </span>
            ))}
          </div>
        </div>
      )}
      {proposedIssues.length > 0 && (
        <div className="space-y-1">
          <span className="text-muted-foreground text-xs">Proposed issues</span>
          <div className="space-y-1.5">
            {proposedIssues.map((issue, index) => (
              <div key={`${String(issue.title ?? "issue")}-${index}`} className="rounded-md border border-border px-3 py-2">
                <div className="font-medium">{String(issue.title ?? `Issue ${index + 1}`)}</div>
                <div className="text-xs text-muted-foreground">
                  {[
                    typeof issue.assigneeAgentId === "string" ? `assignee ${issue.assigneeAgentId}` : null,
                    typeof issue.priority === "string" ? `priority ${issue.priority}` : null,
                    typeof issue.projectId === "string" ? `project ${issue.projectId}` : null,
                    typeof issue.goalId === "string" ? `roadmap ${issue.goalId}` : null,
                  ]
                    .filter(Boolean)
                    .join(" • ") || "No assignment details provided."}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {!summary && roadmapItemIds.length === 0 && proposedIssues.length === 0 && (
        <pre className="rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground overflow-x-auto">
          {JSON.stringify(payload, null, 2)}
        </pre>
      )}
    </div>
  );
}

export function ApprovalPayloadRenderer({ type, payload }: { type: string; payload: Record<string, unknown> }) {
  if (type === "hire_agent") return <HireAgentPayload payload={payload} />;
  if (type === "approve_manager_plan") return <ManagerPlanPayload payload={payload} />;
  return <CeoStrategyPayload payload={payload} />;
}
