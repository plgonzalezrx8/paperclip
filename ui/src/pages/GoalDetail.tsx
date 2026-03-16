import { useEffect, useState } from "react";
import { useNavigate, useParams } from "@/lib/router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  GOAL_STATUSES,
  type GoalStatus,
} from "@paperclipai/shared";
import { ChevronDown, Plus, Trash2 } from "lucide-react";
import { goalsApi } from "../api/goals";
import { projectsApi } from "../api/projects";
import { assetsApi } from "../api/assets";
import { ApiError } from "../api/client";
import { usePanel } from "../context/PanelContext";
import { useCompany } from "../context/CompanyContext";
import { useDialog } from "../context/DialogContext";
import { useBreadcrumbs } from "../context/BreadcrumbContext";
import { queryKeys } from "../lib/queryKeys";
import { GoalProperties } from "../components/GoalProperties";
import { GoalTree } from "../components/GoalTree";
import { RoadmapLaneMenu } from "../components/RoadmapLaneMenu";
import { StatusBadge } from "../components/StatusBadge";
import { InlineEditor } from "../components/InlineEditor";
import { EntityRow } from "../components/EntityRow";
import { PageSkeleton } from "../components/PageSkeleton";
import { cn, projectUrl } from "../lib/utils";
import {
  getGoalStatusLabel,
  getRoadmapLane,
  getRoadmapLaneLabel,
} from "../lib/roadmap";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return fallback;
}

function describeDeleteGuardrails(
  childGoalCount: number,
  linkedProjectCount: number
) {
  const blockers: string[] = [];

  if (childGoalCount > 0) {
    blockers.push(
      `${childGoalCount} child roadmap item${childGoalCount === 1 ? "" : "s"}`
    );
  }

  if (linkedProjectCount > 0) {
    blockers.push(
      `${linkedProjectCount} linked project${
        linkedProjectCount === 1 ? "" : "s"
      }`
    );
  }

  if (blockers.length === 0) return null;
  if (blockers.length === 1) {
    return `Delete is unavailable while ${blockers[0]} still reference this roadmap item. Unlink that work or set this item to cancelled instead.`;
  }

  const lastBlocker = blockers.pop();
  return `Delete is unavailable while ${blockers.join(
    ", "
  )} and ${lastBlocker} still reference this roadmap item. Unlink that work or set this item to cancelled instead.`;
}

/**
 * Keep roadmap lifecycle changes visible in the hero row so operators do not need the side panel for a core action.
 */
function GoalStatusPicker({
  status,
  disabled,
  onChange,
}: {
  status: GoalStatus;
  disabled: boolean;
  onChange: (status: GoalStatus) => void;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (disabled) setOpen(false);
  }, [disabled]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Change status from ${status.replace(/_/g, " ")}`}
          aria-busy={disabled || undefined}
          disabled={disabled}
          className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-accent/50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span className="uppercase tracking-wide text-muted-foreground">
            Status
          </span>
          <StatusBadge status={status} label={getGoalStatusLabel(status)} />
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-44 p-1">
        {GOAL_STATUSES.map((goalStatus) => (
          <button
            key={goalStatus}
            type="button"
            disabled={disabled}
            className={cn(
              "flex w-full items-center gap-2 rounded px-2 py-1.5 text-xs transition-colors hover:bg-accent/50 disabled:cursor-not-allowed disabled:opacity-60",
              goalStatus === status && "bg-accent"
            )}
            onClick={() => {
              onChange(goalStatus);
              setOpen(false);
            }}
          >
            <StatusBadge
              status={goalStatus}
              label={getGoalStatusLabel(goalStatus)}
            />
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

export function GoalDetail() {
  const { goalId } = useParams<{ goalId: string }>();
  const navigate = useNavigate();
  const { selectedCompanyId, setSelectedCompanyId } = useCompany();
  const { openNewGoal } = useDialog();
  const { openPanel, closePanel } = usePanel();
  const { setBreadcrumbs } = useBreadcrumbs();
  const queryClient = useQueryClient();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isStatusSaving, setIsStatusSaving] = useState(false);

  const {
    data: goal,
    isLoading,
    error,
  } = useQuery({
    queryKey: queryKeys.goals.detail(goalId!),
    queryFn: () => goalsApi.get(goalId!),
    enabled: !!goalId,
  });
  const resolvedCompanyId = goal?.companyId ?? selectedCompanyId;

  const { data: allGoals, isLoading: areGoalsLoading } = useQuery({
    queryKey: queryKeys.goals.list(resolvedCompanyId!),
    queryFn: () => goalsApi.list(resolvedCompanyId!),
    enabled: !!resolvedCompanyId,
  });

  const { data: allProjects, isLoading: areProjectsLoading } = useQuery({
    queryKey: queryKeys.projects.list(resolvedCompanyId!),
    queryFn: () => projectsApi.list(resolvedCompanyId!),
    enabled: !!resolvedCompanyId,
  });

  useEffect(() => {
    if (!goal?.companyId || goal.companyId === selectedCompanyId) return;
    setSelectedCompanyId(goal.companyId, { source: "route_sync" });
  }, [goal?.companyId, selectedCompanyId, setSelectedCompanyId]);

  const saveGoal = useMutation({
    mutationFn: ({
      targetGoalId,
      data,
    }: {
      targetGoalId: string;
      data: Record<string, unknown>;
    }) => goalsApi.update(targetGoalId, data),
    onSuccess: (_updatedGoal, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.goals.detail(variables.targetGoalId),
      });
      if (resolvedCompanyId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.goals.list(resolvedCompanyId),
        });
      }
    },
  });

  function mutateGoal(
    targetGoalId: string,
    data: Record<string, unknown>,
    callbacks?: {
      onError?: (error: unknown) => void;
      onSettled?: () => void;
    }
  ) {
    saveGoal.mutate({ targetGoalId, data }, callbacks);
  }

  const deleteGoal = useMutation({
    mutationFn: () => goalsApi.remove(goalId!),
    onSuccess: () => {
      if (resolvedCompanyId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.goals.list(resolvedCompanyId),
        });
        queryClient.invalidateQueries({
          queryKey: queryKeys.projects.list(resolvedCompanyId),
        });
      }
      queryClient.removeQueries({
        queryKey: queryKeys.goals.detail(goalId!),
      });
      setDeleteDialogOpen(false);
      navigate(goal?.parentId ? `/roadmap/${goal.parentId}` : "/roadmap", {
        replace: true,
      });
    },
  });

  const uploadImage = useMutation({
    mutationFn: async (file: File) => {
      if (!resolvedCompanyId) throw new Error("No company selected");
      return assetsApi.uploadImage(
        resolvedCompanyId,
        file,
        `goals/${goalId ?? "draft"}`
      );
    },
  });

  const childGoals = (allGoals ?? []).filter(
    (candidate) => candidate.parentId === goalId
  );
  const linkedProjects = (allProjects ?? []).filter((project) => {
    if (!goalId) return false;
    if (project.goalIds.includes(goalId)) return true;
    if (project.goals.some((goalRef) => goalRef.id === goalId)) return true;
    return project.goalId === goalId;
  });

  // Keep delete disabled until dependent collections load so we never expose a destructive action before guardrails finish.
  const isDeleteGuardLoading = areGoalsLoading || areProjectsLoading;
  const deleteGuardrails = isDeleteGuardLoading
    ? "Checking child roadmap items and linked projects before enabling delete."
    : describeDeleteGuardrails(childGoals.length, linkedProjects.length);
  const canDeleteGoal =
    !isDeleteGuardLoading &&
    childGoals.length === 0 &&
    linkedProjects.length === 0;

  useEffect(() => {
    setBreadcrumbs([
      { label: "Roadmap", href: "/roadmap" },
      { label: goal?.title ?? goalId ?? "Roadmap Item" },
    ]);
  }, [setBreadcrumbs, goal, goalId]);

  useEffect(() => {
    if (goal) {
      openPanel(
        <GoalProperties
          goal={goal}
          onUpdate={(data) => mutateGoal(goal.id, data)}
        />
      );
    }
    return () => closePanel();
  }, [goal]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleStatusChange(status: GoalStatus) {
    setStatusError(null);
    setIsStatusSaving(true);
    mutateGoal(
      goalId!,
      { status },
      {
        onError: (mutationError) => {
          setStatusError(
            getErrorMessage(
              mutationError,
              "Failed to update roadmap item status."
            )
          );
        },
        onSettled: () => {
          setIsStatusSaving(false);
        },
      }
    );
  }

  function handleDeleteConfirm() {
    setDeleteError(null);
    deleteGoal.mutate(undefined, {
      onError: (mutationError) => {
        setDeleteError(
          getErrorMessage(mutationError, "Failed to delete roadmap item.")
        );
      },
    });
  }

  if (isLoading) return <PageSkeleton variant="detail" />;
  if (error) return <p className="text-sm text-destructive">{error.message}</p>;
  if (!goal) return null;

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs uppercase text-muted-foreground">
              {goal.level}
            </span>
            <RoadmapLaneMenu
              goal={goal}
              disabled={isStatusSaving}
              triggerLabel={`Lane: ${getRoadmapLaneLabel(getRoadmapLane(goal))}`}
              align="start"
              onMove={(data) => {
                setStatusError(null);
                setIsStatusSaving(true);
                mutateGoal(goal.id, data, {
                  onError: (mutationError) => {
                    setStatusError(
                      getErrorMessage(
                        mutationError,
                        "Failed to move roadmap item."
                      )
                    );
                  },
                  onSettled: () => {
                    setIsStatusSaving(false);
                  },
                });
              }}
            />
            <GoalStatusPicker
              status={goal.status}
              disabled={isStatusSaving}
              onChange={handleStatusChange}
            />
            {isStatusSaving ? (
              <span className="text-xs text-muted-foreground">
                Saving status…
              </span>
            ) : null}
          </div>
          {statusError ? (
            <p className="text-xs text-destructive">{statusError}</p>
          ) : null}
        </div>

        <InlineEditor
          value={goal.title}
          onSave={(title) => mutateGoal(goal.id, { title })}
          as="h2"
          className="paperclip-work-title"
        />

        <InlineEditor
          value={goal.description ?? ""}
          onSave={(description) => mutateGoal(goal.id, { description })}
          as="p"
          className="max-w-3xl text-sm text-muted-foreground"
          placeholder="Add a description..."
          multiline
          imageUploadHandler={async (file) => {
            const asset = await uploadImage.mutateAsync(file);
            return asset.contentPath;
          }}
        />

        <div className="paperclip-work-card max-w-3xl space-y-2 rounded-[calc(var(--radius)+0.35rem)] px-4 py-4">
          <p className="paperclip-work-kicker">
            Manager guidance
          </p>
          <InlineEditor
            value={goal.guidance ?? ""}
            onSave={(guidance) => mutateGoal(goal.id, { guidance })}
            as="p"
            className="text-sm text-muted-foreground"
            placeholder="Describe how managers should use this roadmap item when deciding what to do next."
            multiline
          />
        </div>

        <section className="space-y-3 rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-4">
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-destructive">
              Danger zone
            </p>
            <p className="text-sm text-muted-foreground">
              Delete this roadmap item only when nothing else still depends on
              it. If work is still attached, set the roadmap item to cancelled
              instead.
            </p>
          </div>

          <p
            className={cn(
              "text-sm",
              canDeleteGoal ? "text-muted-foreground" : "text-destructive"
            )}
          >
            {deleteGuardrails ??
              "Deletion removes the roadmap item immediately and redirects you back to the roadmap view."}
          </p>

          {deleteError ? (
            <p className="text-sm text-destructive">{deleteError}</p>
          ) : null}

          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="destructive"
              onClick={() => {
                setDeleteError(null);
                setDeleteDialogOpen(true);
              }}
              disabled={!canDeleteGoal || deleteGoal.isPending}
            >
              <Trash2 className="h-4 w-4" />
              {deleteGoal.isPending ? "Deleting…" : "Delete roadmap item"}
            </Button>
            {!canDeleteGoal ? (
              <span className="text-xs text-muted-foreground">
                Delete unlocks after dependency checks finish and linked work is
                removed.
              </span>
            ) : null}
          </div>
        </section>
      </div>

      <Tabs defaultValue="children" className="space-y-4">
        <TabsList>
          <TabsTrigger value="children">
            Sub-Items ({childGoals.length})
          </TabsTrigger>
          <TabsTrigger value="projects">
            Projects ({linkedProjects.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="children" className="mt-4 space-y-3">
          <div className="flex items-center justify-start">
            <Button
              size="sm"
              variant="outline"
              onClick={() => openNewGoal({ parentId: goalId })}
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Sub-Item
            </Button>
          </div>
          {childGoals.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No child roadmap items.
            </p>
          ) : (
            <GoalTree
              goals={childGoals}
              goalLink={(childGoal) => `/roadmap/${childGoal.id}`}
              goalAction={(childGoal) => (
                <RoadmapLaneMenu
                  goal={childGoal}
                  compact
                  disabled={saveGoal.isPending}
                  triggerLabel="Move"
                  onMove={(data) => mutateGoal(childGoal.id, data)}
                />
              )}
            />
          )}
        </TabsContent>

        <TabsContent value="projects" className="mt-4">
          {linkedProjects.length === 0 ? (
            <div className="paperclip-work-card rounded-[calc(var(--radius)+0.3rem)] px-4 py-3 text-sm text-muted-foreground">
              No linked projects.
            </div>
          ) : (
            <div className="paperclip-work-list">
              {linkedProjects.map((project) => (
                <EntityRow
                  key={project.id}
                  title={project.name}
                  subtitle={project.description ?? undefined}
                  to={projectUrl(project)}
                  trailing={<StatusBadge status={project.status} />}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          if (!deleteGoal.isPending) {
            setDeleteDialogOpen(open);
          }
        }}
      >
        <DialogContent
          showCloseButton={false}
          className="overflow-hidden p-0 sm:max-w-[30rem]"
        >
          <DialogHeader className="paperclip-panel-strong gap-3 border-b border-border px-5 py-4">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                <p className="paperclip-kicker text-destructive">Danger zone</p>
                <DialogTitle className="text-xl leading-tight">
                  Delete "{goal.title}"?
                </DialogTitle>
                <DialogDescription className="max-w-[34ch] text-sm leading-relaxed">
                  This permanently removes the roadmap item. If related work
                  should stay visible, cancel the roadmap item instead of
                  deleting it.
                </DialogDescription>
              </div>
              <DialogClose asChild>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  className="normal-case tracking-normal font-medium"
                  disabled={deleteGoal.isPending}
                  style={{
                    fontFamily: "var(--font-body)",
                    letterSpacing: "0.01em",
                    textTransform: "none",
                  }}
                >
                  <span className="sr-only">Close</span>
                  ×
                </Button>
              </DialogClose>
            </div>
          </DialogHeader>
          <div className="space-y-4 px-5 py-5">
            <div className="rounded-[calc(var(--radius)+0.15rem)] border border-destructive/30 bg-destructive/10 px-3 py-3 text-sm text-destructive">
              This action cannot be undone.
            </div>
            {deleteError ? (
              <p className="text-sm text-destructive">{deleteError}</p>
            ) : null}
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <DialogClose asChild>
                <Button
                  variant="outline"
                  disabled={deleteGoal.isPending}
                  className="w-full normal-case tracking-normal font-medium sm:w-auto"
                  style={{
                    fontFamily: "var(--font-body)",
                    letterSpacing: "0.01em",
                    textTransform: "none",
                  }}
                >
                  Keep roadmap item
                </Button>
              </DialogClose>
              <Button
                variant="destructive"
                onClick={handleDeleteConfirm}
                disabled={deleteGoal.isPending}
                className="w-full normal-case tracking-normal font-medium sm:w-auto"
                style={{
                  fontFamily: "var(--font-body)",
                  letterSpacing: "0.01em",
                  textTransform: "none",
                }}
              >
                {deleteGoal.isPending
                  ? "Deleting roadmap item…"
                  : "Delete roadmap item permanently"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
