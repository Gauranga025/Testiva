-- Manual migration to convert string user_id/repo_id to integers
-- This handles the data conversion that drizzle-kit push cannot do automatically

-- Step 1: Create new integer columns
ALTER TABLE "test_cases" ADD COLUMN "user_id_new" integer;
ALTER TABLE "test_cases" ADD COLUMN "repo_id_new" integer;

-- Step 2: Copy and convert data from string to integer
UPDATE "test_cases" 
SET "user_id_new" = CAST("user_id" AS integer)
WHERE "user_id" ~ '^[0-9]+$';

UPDATE "test_cases" 
SET "repo_id_new" = CAST("repo_id" AS integer)
WHERE "repo_id" ~ '^[0-9]+$';

-- Step 3: Drop old columns and rename new ones
ALTER TABLE "test_cases" DROP COLUMN "user_id";
ALTER TABLE "test_cases" RENAME COLUMN "user_id_new" TO "user_id";

ALTER TABLE "test_cases" DROP COLUMN "repo_id";
ALTER TABLE "test_cases" RENAME COLUMN "repo_id_new" TO "repo_id";

-- Step 4: Make columns NOT NULL (if all data was successfully converted)
ALTER TABLE "test_cases" ALTER COLUMN "user_id" SET NOT NULL;

-- Step 5: Add foreign key constraints
ALTER TABLE "test_cases" ADD CONSTRAINT "test_cases_user_id_users_id_fk" 
FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") 
ON DELETE no action ON UPDATE no action;

ALTER TABLE "test_cases" ADD CONSTRAINT "test_cases_repo_id_repositories_id_fk" 
FOREIGN KEY ("repo_id") REFERENCES "public"."repositories"("id") 
ON DELETE no action ON UPDATE no action;

-- Step 6: Add indexes
CREATE INDEX "test_cases_user_id_idx" ON "test_cases" USING btree ("user_id");
CREATE INDEX "test_cases_repo_id_idx" ON "test_cases" USING btree ("repo_id");
CREATE INDEX "test_cases_status_idx" ON "test_cases" USING btree ("status");
