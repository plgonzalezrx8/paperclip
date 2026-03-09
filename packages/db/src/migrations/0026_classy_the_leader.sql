CREATE TABLE "briefing_view_states" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"scope_type" text NOT NULL,
	"scope_ref_id" uuid NOT NULL,
	"last_viewed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "record_attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"record_id" uuid NOT NULL,
	"asset_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "record_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"record_id" uuid NOT NULL,
	"target_type" text NOT NULL,
	"target_id" uuid NOT NULL,
	"relation" text DEFAULT 'related' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"category" text NOT NULL,
	"kind" text NOT NULL,
	"scope_type" text NOT NULL,
	"scope_ref_id" uuid NOT NULL,
	"title" text NOT NULL,
	"summary" text,
	"body_md" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"owner_agent_id" uuid,
	"decision_needed" boolean DEFAULT false NOT NULL,
	"decision_due_at" timestamp with time zone,
	"health_status" text,
	"health_delta" text,
	"confidence" integer,
	"published_at" timestamp with time zone,
	"generated_at" timestamp with time zone,
	"metadata" jsonb,
	"created_by_agent_id" uuid,
	"created_by_user_id" text,
	"updated_by_agent_id" uuid,
	"updated_by_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "briefing_view_states" ADD CONSTRAINT "briefing_view_states_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "record_attachments" ADD CONSTRAINT "record_attachments_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "record_attachments" ADD CONSTRAINT "record_attachments_record_id_records_id_fk" FOREIGN KEY ("record_id") REFERENCES "public"."records"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "record_attachments" ADD CONSTRAINT "record_attachments_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "record_links" ADD CONSTRAINT "record_links_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "record_links" ADD CONSTRAINT "record_links_record_id_records_id_fk" FOREIGN KEY ("record_id") REFERENCES "public"."records"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "records" ADD CONSTRAINT "records_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "records" ADD CONSTRAINT "records_owner_agent_id_agents_id_fk" FOREIGN KEY ("owner_agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "records" ADD CONSTRAINT "records_created_by_agent_id_agents_id_fk" FOREIGN KEY ("created_by_agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "records" ADD CONSTRAINT "records_updated_by_agent_id_agents_id_fk" FOREIGN KEY ("updated_by_agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "briefing_view_states_company_user_scope_uq" ON "briefing_view_states" USING btree ("company_id","user_id","scope_type","scope_ref_id");--> statement-breakpoint
CREATE INDEX "briefing_view_states_company_user_idx" ON "briefing_view_states" USING btree ("company_id","user_id","updated_at");--> statement-breakpoint
CREATE INDEX "record_attachments_company_record_idx" ON "record_attachments" USING btree ("company_id","record_id");--> statement-breakpoint
CREATE UNIQUE INDEX "record_attachments_record_asset_uq" ON "record_attachments" USING btree ("record_id","asset_id");--> statement-breakpoint
CREATE INDEX "record_links_company_record_idx" ON "record_links" USING btree ("company_id","record_id");--> statement-breakpoint
CREATE INDEX "record_links_company_target_idx" ON "record_links" USING btree ("company_id","target_type","target_id");--> statement-breakpoint
CREATE INDEX "records_company_category_status_idx" ON "records" USING btree ("company_id","category","status");--> statement-breakpoint
CREATE INDEX "records_company_scope_idx" ON "records" USING btree ("company_id","scope_type","scope_ref_id","updated_at");--> statement-breakpoint
CREATE INDEX "records_company_owner_idx" ON "records" USING btree ("company_id","owner_agent_id","updated_at");