import type { Goal, GoalPlanningHorizon, GoalStatus } from "@paperclipai/shared";

export type RoadmapLaneId = GoalPlanningHorizon | "done" | "archived";
export type RoadmapLanePatch = {
  planningHorizon?: GoalPlanningHorizon;
  status?: GoalStatus;
};

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
): RoadmapLanePatch {
  if (lane === "done") {
    return { status: "achieved" };
  }

  if (lane === "archived") {
    return { status: "cancelled" };
  }

  // Avoid replaying stale non-terminal statuses when the operator only moves a
  // roadmap item between planning lanes; explicit status writes are reserved
  // for transitions into or out of terminal lanes.
  if (goal.status === "achieved" || goal.status === "cancelled") {
    return {
      planningHorizon: lane,
      status: "planned",
    };
  }

  return {
    planningHorizon: lane,
  };
}
