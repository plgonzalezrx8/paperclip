ALTER TABLE "agents" ADD COLUMN "manager_planning_mode_override" text;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "default_manager_planning_mode" text DEFAULT 'automatic' NOT NULL;--> statement-breakpoint
ALTER TABLE "goals" ADD COLUMN "guidance" text;--> statement-breakpoint
ALTER TABLE "goals" ADD COLUMN "planning_horizon" text DEFAULT 'next' NOT NULL;--> statement-breakpoint
ALTER TABLE "goals" ADD COLUMN "sort_order" integer DEFAULT 0 NOT NULL;