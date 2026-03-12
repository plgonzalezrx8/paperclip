import type { GoalLevel, GoalPlanningHorizon, GoalStatus } from "../constants.js";

export interface Goal {
  id: string;
  companyId: string;
  title: string;
  description: string | null;
  guidance: string | null;
  level: GoalLevel;
  status: GoalStatus;
  planningHorizon: GoalPlanningHorizon;
  sortOrder: number;
  parentId: string | null;
  ownerAgentId: string | null;
  createdAt: Date;
  updatedAt: Date;
}
