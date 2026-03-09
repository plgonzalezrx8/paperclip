import type {
  BriefingRecordKind,
  HealthDelta,
  HealthStatus,
  PlanRecordKind,
  PricingState,
  RecordCategory,
  RecordLinkRelation,
  RecordLinkTargetType,
  RecordScopeType,
  RecordStatus,
  ResultRecordKind,
} from "../constants.js";
import type { AssetFile } from "./asset.js";

export interface RecordLink {
  id: string;
  companyId: string;
  recordId: string;
  targetType: RecordLinkTargetType;
  targetId: string;
  relation: RecordLinkRelation;
  createdAt: Date;
  updatedAt: Date;
}

export interface RecordAttachment {
  id: string;
  companyId: string;
  recordId: string;
  assetId: string;
  createdAt: Date;
  updatedAt: Date;
  asset: AssetFile;
}

export interface BaseRecord {
  id: string;
  companyId: string;
  category: RecordCategory;
  kind: string;
  scopeType: RecordScopeType;
  scopeRefId: string;
  title: string;
  summary: string | null;
  bodyMd: string | null;
  status: RecordStatus;
  ownerAgentId: string | null;
  decisionNeeded: boolean;
  decisionDueAt: Date | null;
  healthStatus: HealthStatus | null;
  healthDelta: HealthDelta | null;
  confidence: number | null;
  publishedAt: Date | null;
  generatedAt: Date | null;
  metadata: Record<string, unknown> | null;
  createdByAgentId: string | null;
  createdByUserId: string | null;
  updatedByAgentId: string | null;
  updatedByUserId: string | null;
  links?: RecordLink[];
  attachments?: RecordAttachment[];
  createdAt: Date;
  updatedAt: Date;
}

export interface PlanRecord extends BaseRecord {
  category: "plan";
  kind: PlanRecordKind;
}

export interface ResultRecord extends BaseRecord {
  category: "result";
  kind: ResultRecordKind;
}

export interface BriefingRecord extends BaseRecord {
  category: "briefing";
  kind: BriefingRecordKind;
}

export type AnyRecord = PlanRecord | ResultRecord | BriefingRecord;

export interface ExecutiveProjectHealth {
  projectId: string;
  projectName: string;
  projectStatus: string;
  healthStatus: HealthStatus;
  healthDelta: HealthDelta;
  confidence: number | null;
  lastMeaningfulResult: ResultRecord | null;
  currentBlocker: string | null;
  nextDecision: PlanRecord | null;
}

export interface ExecutiveCostAnomaly {
  runId: string;
  agentId: string | null;
  agentName: string | null;
  projectId: string | null;
  projectName: string | null;
  reason: string;
  pricingState: PricingState;
  inputTokens: number;
  outputTokens: number;
  pricedCostCents: number | null;
  occurredAt: Date | null;
}

export interface ExecutiveBoardSummary {
  companyId: string;
  scopeType: RecordScopeType;
  scopeRefId: string;
  since: Date | null;
  lastViewedAt: Date | null;
  outcomesLanded: ResultRecord[];
  risksAndBlocks: Array<PlanRecord | ResultRecord>;
  decisionsNeeded: PlanRecord[];
  projectHealth: ExecutiveProjectHealth[];
  costAnomalies: ExecutiveCostAnomaly[];
  executiveRollups: BriefingRecord[];
}
