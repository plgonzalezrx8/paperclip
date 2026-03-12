import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { type GoalPlanningHorizon } from "@paperclipai/shared";
import { goalsApi } from "../api/goals";
import { useCompany } from "../context/CompanyContext";
import { useDialog } from "../context/DialogContext";
import { useBreadcrumbs } from "../context/BreadcrumbContext";
import { queryKeys } from "../lib/queryKeys";
import { GoalTree } from "../components/GoalTree";
import { EmptyState } from "../components/EmptyState";
import { PageSkeleton } from "../components/PageSkeleton";
import { Button } from "@/components/ui/button";
import { Target, Plus } from "lucide-react";

const ROADMAP_SECTIONS: Array<{ id: GoalPlanningHorizon; title: string; description: string }> = [
  { id: "now", title: "Now", description: "Current priorities and active strategic work." },
  { id: "next", title: "Next", description: "Queued initiatives the managers should prepare for." },
  { id: "later", title: "Later", description: "Longer-horizon bets and deferred opportunities." },
];

function branchForGoal(goalId: string, goals: Array<{ id: string; parentId: string | null }>) {
  const collected = new Set<string>();
  const stack = [goalId];
  while (stack.length > 0) {
    const currentId = stack.pop();
    if (!currentId || collected.has(currentId)) continue;
    collected.add(currentId);
    for (const goal of goals) {
      if (goal.parentId === currentId) stack.push(goal.id);
    }
  }
  return collected;
}

export function Goals() {
  const { selectedCompanyId } = useCompany();
  const { openNewGoal } = useDialog();
  const { setBreadcrumbs } = useBreadcrumbs();

  useEffect(() => {
    setBreadcrumbs([{ label: "Roadmap" }]);
  }, [setBreadcrumbs]);

  const { data: goals, isLoading, error } = useQuery({
    queryKey: queryKeys.goals.list(selectedCompanyId!),
    queryFn: () => goalsApi.list(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  });

  if (!selectedCompanyId) {
    return <EmptyState icon={Target} message="Select a company to view the roadmap." />;
  }

  if (isLoading) {
    return <PageSkeleton variant="list" />;
  }

  return (
    <div className="space-y-4">
      {error && <p className="text-sm text-destructive">{error.message}</p>}

      {goals && goals.length === 0 && (
        <EmptyState
          icon={Target}
          message="No roadmap items yet."
          action="Add Roadmap Item"
          onAction={() => openNewGoal()}
        />
      )}

      {goals && goals.length > 0 && (
        <>
          <div className="flex items-center justify-start">
            <Button size="sm" variant="outline" onClick={() => openNewGoal()}>
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              New Roadmap Item
            </Button>
          </div>
          <div className="space-y-6">
            {(() => {
              const goalIds = new Set(goals.map((goal) => goal.id));
              const rootGoals = goals.filter((goal) => !goal.parentId || !goalIds.has(goal.parentId));
              return ROADMAP_SECTIONS.map((section) => {
                // A section owns the full branch for each root roadmap item in that horizon so
                // descendants stay visually attached even when child nodes have mixed statuses.
                const branchIds = new Set<string>();
                for (const goal of rootGoals) {
                  if (goal.planningHorizon !== section.id) continue;
                  for (const id of branchForGoal(goal.id, goals)) branchIds.add(id);
                }
                const sectionGoals = goals.filter((goal) => branchIds.has(goal.id));
                return (
                  <section key={section.id} className="space-y-2">
                    <div>
                      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                        {section.title}
                      </h2>
                      <p className="text-sm text-muted-foreground">{section.description}</p>
                    </div>
                    {sectionGoals.length === 0 ? (
                      <div className="border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
                        No roadmap items in this horizon.
                      </div>
                    ) : (
                      <GoalTree goals={sectionGoals} goalLink={(goal) => `/roadmap/${goal.id}`} />
                    )}
                  </section>
                );
              });
            })()}
          </div>
        </>
      )}
    </div>
  );
}
