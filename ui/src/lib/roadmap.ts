import type { Goal, GoalPlanningHorizon, GoalStatus } from "@paperclipai/shared";

export type RoadmapLaneId = GoalPlanningHorizon | "done" | "archived";

export const ROADMAP_LANES: Array<{
  id: RoadmapLaneId;
  title: string;
  description: string;
}> = [
  {
    id: "now",
    title: "Now",
    description: "Current priorities and active strategic work.",
  },
  {
    id: "next",
    title: "Next",
    description: "Queued initiatives the managers should prepare for.",
  },
  {
    id: "later",
    title: "Later",
    description: "Longer-horizon bets and deferred opportunities.",
  },
  {
    id: "done",
    title: "Done",
    description: "Completed roadmap items kept visible without crowding live lanes.",
  },
  {
    id: "archived",
    title: "Archived",
    description: "Cancelled or shelved roadmap items kept for reference.",
  },
];

export function getGoalStatusLabel(status: GoalStatus): string {
  switch (status) {
    case "achieved":
      return "done";
    case "cancelled":
      return "archived";
    default:
      return status.replace("_", " ");
  }
}

export function getRoadmapLane(
  goal: Pick<Goal, "planningHorizon" | "status">
): RoadmapLaneId {
  if (goal.status === "achieved") return "done";
  if (goal.status === "cancelled") return "archived";
  return goal.planningHorizon;
}

export function getRoadmapLaneLabel(lane: RoadmapLaneId): string {
  return ROADMAP_LANES.find((candidate) => candidate.id === lane)?.title ?? lane;
}

export function buildRoadmapLanePatch(
  goal: Pick<Goal, "planningHorizon" | "status">,
  lane: RoadmapLaneId
): {
  planningHorizon?: GoalPlanningHorizon;
  status: GoalStatus;
} {
  if (lane === "done") {
    return { status: "achieved" };
  }

  if (lane === "archived") {
    return { status: "cancelled" };
  }

  // Moving a terminal roadmap item back into a planning lane should reopen it,
  // but we preserve the current non-terminal status when the operator is only
  // changing the horizon.
  return {
    planningHorizon: lane,
    status:
      goal.status === "achieved" || goal.status === "cancelled"
        ? "planned"
        : goal.status,
  };
}
