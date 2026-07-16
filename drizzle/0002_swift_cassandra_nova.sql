CREATE TABLE "test_cases" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"repo_id" integer,
	"repo_name" varchar(255) NOT NULL,
	"repo_owner" varchar(255) NOT NULL,
	"branch" varchar(100) DEFAULT 'main',
	"title" varchar(500) NOT NULL,
	"description" text NOT NULL,
	"type" varchar(100) NOT NULL,
	"priority" varchar(50) NOT NULL,
	"target_route" varchar(500),
	"target_files" jsonb DEFAULT '[]'::jsonb,
	"expected_result" text,
	"browserbase_script" text,
	"status" varchar(100) DEFAULT 'generated',
	"created_at" timestamp DEFAULT now(),
	"logs" jsonb DEFAULT '[]'::jsonb,
	"session_id" varchar(255),
	"session_url" varchar(500)
);
--> statement-breakpoint
CREATE TABLE "processed_stripe_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_id" text NOT NULL,
	"event_type" text NOT NULL,
	"processed_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "processed_stripe_events_event_id_unique" UNIQUE("event_id")
);
--> statement-breakpoint
ALTER TABLE "repositories" ADD COLUMN "target_domain" varchar DEFAULT 'http://localhost:3000';--> statement-breakpoint
ALTER TABLE "repositories" ADD COLUMN "global_instruction" text;--> statement-breakpoint
ALTER TABLE "repositories" ADD COLUMN "ui_discovery_cache" jsonb;--> statement-breakpoint
ALTER TABLE "repositories" ADD COLUMN "repository_intelligence_cache" jsonb;--> statement-breakpoint
ALTER TABLE "repositories" ADD COLUMN "repository_memory_cache" jsonb;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "github_token" text;--> statement-breakpoint
ALTER TABLE "test_cases" ADD CONSTRAINT "test_cases_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_cases" ADD CONSTRAINT "test_cases_repo_id_repositories_id_fk" FOREIGN KEY ("repo_id") REFERENCES "public"."repositories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "test_cases_user_id_idx" ON "test_cases" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "test_cases_repo_id_idx" ON "test_cases" USING btree ("repo_id");--> statement-breakpoint
CREATE INDEX "test_cases_status_idx" ON "test_cases" USING btree ("status");--> statement-breakpoint
CREATE INDEX "repo_id_idx" ON "repositories" USING btree ("repo_id");--> statement-breakpoint
CREATE INDEX "full_name_idx" ON "repositories" USING btree ("full_name");--> statement-breakpoint
CREATE INDEX "user_id_idx" ON "repositories" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "repositories" DROP COLUMN "updated_at";