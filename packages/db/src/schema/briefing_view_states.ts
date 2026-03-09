import { pgTable, uuid, text, timestamp, index, uniqueIndex } from "drizzle-orm/pg-core";
import { companies } from "./companies.js";

export const briefingViewStates = pgTable(
  "briefing_view_states",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id").notNull().references(() => companies.id),
    userId: text("user_id").notNull(),
    scopeType: text("scope_type").notNull(),
    scopeRefId: uuid("scope_ref_id").notNull(),
    lastViewedAt: timestamp("last_viewed_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    companyUserScopeUq: uniqueIndex("briefing_view_states_company_user_scope_uq").on(
      table.companyId,
      table.userId,
      table.scopeType,
      table.scopeRefId,
    ),
    companyUserIdx: index("briefing_view_states_company_user_idx").on(table.companyId, table.userId, table.updatedAt),
  }),
);
