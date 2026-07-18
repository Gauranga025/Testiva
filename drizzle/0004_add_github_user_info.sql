-- Add GitHub username and GitHub ID to users table
-- This prevents the same GitHub account from being connected to multiple users

ALTER TABLE "users" ADD COLUMN "github_username" text;
ALTER TABLE "users" ADD COLUMN "github_id" integer;

-- Add unique constraint on github_id to prevent duplicate GitHub account connections
ALTER TABLE "users" ADD CONSTRAINT "users_github_id_unique" UNIQUE ("github_id");
