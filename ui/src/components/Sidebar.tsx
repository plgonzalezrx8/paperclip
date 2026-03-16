import {
  Inbox,
  CircleDot,
  Target,
  FileText,
  LayoutDashboard,
  Library,
  DollarSign,
  History,
  Search,
  SquarePen,
  Network,
  Settings,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { SidebarSection } from "./SidebarSection";
import { SidebarNavItem } from "./SidebarNavItem";
import { SidebarProjects } from "./SidebarProjects";
import { SidebarAgents } from "./SidebarAgents";
import { useDialog } from "../context/DialogContext";
import { useCompany } from "../context/CompanyContext";
import { heartbeatsApi } from "../api/heartbeats";
import { queryKeys } from "../lib/queryKeys";
import { useInboxBadge } from "../hooks/useInboxBadge";
import { Button } from "@/components/ui/button";
import { PluginSlotOutlet } from "@/plugins/slots";

export function Sidebar() {
  const { openNewIssue } = useDialog();
  const { selectedCompanyId, selectedCompany } = useCompany();
  const inboxBadge = useInboxBadge(selectedCompanyId);
  const { data: liveRuns } = useQuery({
    queryKey: queryKeys.liveRuns(selectedCompanyId!),
    queryFn: () => heartbeatsApi.liveRunsForCompany(selectedCompanyId!),
    enabled: !!selectedCompanyId,
    refetchInterval: 10_000,
  });
  const liveRunCount = liveRuns?.length ?? 0;

  function openSearch() {
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }));
  }

  const pluginContext = {
    companyId: selectedCompanyId,
    companyPrefix: selectedCompany?.issuePrefix ?? null,
  };

  return (
    <aside className="paperclip-panel relative flex h-full min-h-0 w-64 flex-col overflow-hidden rounded-[calc(var(--radius)+0.55rem)]">
      {/* The header anchors the current company so the nav reads like an active console, not a generic drawer. */}
      <div className="border-b border-[color:var(--surface-outline)] px-4 py-4">
        <div className="paperclip-kicker mb-3">Company Console</div>
        <div className="flex items-start gap-3">
          <div
            className="paperclip-chip flex h-10 w-10 shrink-0 items-center justify-center rounded-[calc(var(--radius)-0.15rem)]"
            style={selectedCompany?.brandColor ? { color: selectedCompany.brandColor } : undefined}
          >
            <div
              className="h-4 w-4 rounded-sm"
              style={{ backgroundColor: selectedCompany?.brandColor ?? "var(--primary)" }}
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold tracking-[0.01em] text-foreground">
              {selectedCompany?.name ?? "Select company"}
            </p>
            <p className="paperclip-nav-meta mt-1 text-muted-foreground">
              {selectedCompany?.issuePrefix ?? "No prefix"} route space
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            className="shrink-0 text-muted-foreground"
            onClick={openSearch}
            aria-label="Open command search"
          >
            <Search className="h-4 w-4" />
          </Button>
        </div>
        <Button
          type="button"
          onClick={() => openNewIssue()}
          className="mt-4 w-full justify-start gap-2.5"
        >
          <SquarePen className="h-4 w-4" />
          <span>New Issue</span>
        </Button>
      </div>

      <nav className="scrollbar-auto-hide flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-3 py-4">
        <div className="flex flex-col gap-1">
          <SidebarNavItem to="/dashboard" label="Dashboard" icon={LayoutDashboard} liveCount={liveRunCount} />
          <SidebarNavItem to="/briefings/board" label="Briefings" icon={FileText} />
          <SidebarNavItem to="/knowledge" label="Knowledge" icon={Library} />
          <SidebarNavItem
            to="/inbox"
            label="Inbox"
            icon={Inbox}
            badge={inboxBadge.inbox}
            badgeTone={inboxBadge.failedRuns > 0 ? "danger" : "default"}
            alert={inboxBadge.failedRuns > 0}
          />
          <PluginSlotOutlet
            slotTypes={["sidebar"]}
            context={pluginContext}
            className="flex flex-col gap-0.5"
            itemClassName="text-[13px] font-medium"
            missingBehavior="placeholder"
          />
        </div>

        <SidebarSection label="Work">
          <SidebarNavItem to="/issues" label="Issues" icon={CircleDot} />
          <SidebarNavItem to="/roadmap" label="Roadmap" icon={Target} />
        </SidebarSection>

        <SidebarProjects />

        <SidebarAgents />

        <SidebarSection label="Company">
          <SidebarNavItem to="/org" label="Org" icon={Network} />
          <SidebarNavItem to="/costs" label="Costs" icon={DollarSign} />
          <SidebarNavItem to="/activity" label="Activity" icon={History} />
          <SidebarNavItem to="/company/settings" label="Settings" icon={Settings} />
        </SidebarSection>

        <PluginSlotOutlet
          slotTypes={["sidebarPanel"]}
          context={pluginContext}
          className="flex flex-col gap-3"
          itemClassName="rounded-lg border border-border p-3"
          missingBehavior="placeholder"
        />
      </nav>
    </aside>
  );
}
