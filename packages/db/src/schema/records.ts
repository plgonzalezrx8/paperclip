import { pgTable, uuid, text, boolean, integer, jsonb, timestamp, index } from "drizzle-orm/pg-core";
import { companies } from "./companies.js";
import { agents } from "./agents.js";

// Records are the durable executive layer backing plans, results, and briefings.
export const records = pgTable(
  "records",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id").notNull().references(() => companies.id),
    category: text("category").notNull(),
    kind: text("kind").notNull(),
    scopeType: text("scope_type").notNull(),
    scopeRefId: uuid("scope_ref_id").notNull(),
    title: text("title").notNull(),
    summary: text("summary"),
    bodyMd: text("body_md"),
    status: text("status").notNull().default("draft"),
    ownerAgentId: uuid("owner_agent_id").references(() => agents.id),
    decisionNeeded: boolean("decision_needed").notNull().default(false),
    decisionDueAt: timestamp("decision_due_at", { withTimezone: true }),
    healthStatus: text("health_status"),
    healthDelta: text("health_delta"),
    confidence: integer("confidence"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    generatedAt: timestamp("generated_at", { withTimezone: true }),
    metadata: jsonb("metadata").$type<Record<string, unknown> | null>(),
    createdByAgentId: uuid("created_by_agent_id").references(() => agents.id),
    createdByUserId: text("created_by_user_id"),
    updatedByAgentId: uuid("updated_by_agent_id").references(() => agents.id),
    updatedByUserId: text("updated_by_user_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    companyCategoryStatusIdx: index("records_company_category_status_idx").on(
      table.companyId,
      table.category,
      table.status,
    ),
    companyScopeIdx: index("records_company_scope_idx").on(
      table.companyId,
      table.scopeType,
      table.scopeRefId,
      table.updatedAt,
    ),
    companyOwnerIdx: index("records_company_owner_idx").on(table.companyId, table.ownerAgentId, table.updatedAt),
  }),
);
