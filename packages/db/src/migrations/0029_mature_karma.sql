ALTER TABLE "workspace_checkouts" ADD COLUMN "head_commit_sha" text;--> statement-breakpoint
ALTER TABLE "workspace_checkouts" ADD COLUMN "remote_branch_name" text;--> statement-breakpoint
ALTER TABLE "workspace_checkouts" ADD COLUMN "pull_request_url" text;--> statement-breakpoint
ALTER TABLE "workspace_checkouts" ADD COLUMN "pull_request_number" integer;--> statement-breakpoint
ALTER TABLE "workspace_checkouts" ADD COLUMN "pull_request_title" text;--> statement-breakpoint
ALTER TABLE "workspace_checkouts" ADD COLUMN "submitted_for_review_at" timestamp with time zone;