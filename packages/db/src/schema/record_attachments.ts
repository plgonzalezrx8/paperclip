import { pgTable, uuid, timestamp, index, uniqueIndex } from "drizzle-orm/pg-core";
import { companies } from "./companies.js";
import { records } from "./records.js";
import { assets } from "./assets.js";

export const recordAttachments = pgTable(
  "record_attachments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id").notNull().references(() => companies.id),
    recordId: uuid("record_id").notNull().references(() => records.id, { onDelete: "cascade" }),
    assetId: uuid("asset_id").notNull().references(() => assets.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    companyRecordIdx: index("record_attachments_company_record_idx").on(table.companyId, table.recordId),
    recordAssetUq: uniqueIndex("record_attachments_record_asset_uq").on(table.recordId, table.assetId),
  }),
);
