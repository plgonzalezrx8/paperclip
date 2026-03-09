import { pgTable, uuid, text, timestamp, index } from "drizzle-orm/pg-core";
import { companies } from "./companies.js";
import { records } from "./records.js";

// Links keep records connected to operational entities without forcing a rigid rollup tree.
export const recordLinks = pgTable(
  "record_links",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id").notNull().references(() => companies.id),
    recordId: uuid("record_id").notNull().references(() => records.id, { onDelete: "cascade" }),
    targetType: text("target_type").notNull(),
    targetId: uuid("target_id").notNull(),
    relation: text("relation").notNull().default("related"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    companyRecordIdx: index("record_links_company_record_idx").on(table.companyId, table.recordId),
    companyTargetIdx: index("record_links_company_target_idx").on(table.companyId, table.targetType, table.targetId),
  }),
);
