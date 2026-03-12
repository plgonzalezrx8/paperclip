import type { CompanyStatus, ManagerPlanningMode } from "../constants.js";

export interface Company {
  id: string;
  name: string;
  description: string | null;
  status: CompanyStatus;
  issuePrefix: string;
  issueCounter: number;
  budgetMonthlyCents: number;
  spentMonthlyCents: number;
  requireBoardApprovalForNewAgents: boolean;
  defaultManagerPlanningMode: ManagerPlanningMode;
  brandColor: string | null;
  createdAt: Date;
  updatedAt: Date;
}
