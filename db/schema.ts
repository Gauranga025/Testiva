import {
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import type { DiscoveryCacheEntry } from "@/lib/execution/types";
import type { RepositoryIntelligence } from "@/lib/ai/repository-intelligence";
import type { RepositoryMemory } from "@/lib/execution/repository-memory";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name"),
  email: text("email").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  credits: integer("credits").default(1000).notNull(),
  githubToken: text("github_token"),
});

export const repositories = pgTable("repositories", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  repoId: integer("repo_id").notNull(),
  name: text("name").notNull(),
  fullName: text("full_name").notNull(),
  private: integer("private").notNull(),
  htmlUrl: text("html_url").notNull(),
  description: text("description"),
  language: text("language"),
  defaultBranch: text("default_branch").notNull(),
  owner: text("owner").notNull(),
  targetDomain: varchar("target_domain").default('http://localhost:3000'),
  globalInstruction: text("global_instruction"),
  uiDiscoveryCache: jsonb("ui_discovery_cache").$type<DiscoveryCacheEntry | null>(),
  repositoryIntelligenceCache: jsonb("repository_intelligence_cache").$type<RepositoryIntelligence | null>(),
  repositoryMemoryCache: jsonb("repository_memory_cache").$type<RepositoryMemory | null>(),
});

export const TestCasesTable = pgTable("test_cases", {
  id: serial("id").primaryKey(),

  // User / project details
  userId: varchar("user_id", { length: 255 }).notNull(),
  repoId: varchar("repo_id", { length: 255 }),
  repoName: varchar("repo_name", { length: 255 }).notNull(),
  repoOwner: varchar("repo_owner", { length: 255 }).notNull(),
  branch: varchar("branch", { length: 100 }).default("main"),

  // Main test case data
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description").notNull(),
  type: varchar("type", { length: 100 }).notNull(),
  priority: varchar("priority", { length: 50 }).notNull(),

  // Important metadata for second step: Browserbase script generation
  targetRoute: varchar("target_route", { length: 500 }),
  targetFiles: jsonb("target_files").$type<string[]>().default([]),
  expectedResult: text("expected_result"),

  // Later you can update these fields
  browserbaseScript: text("browserbase_script"),
  status: varchar("status", { length: 100 }).default("generated"),

  createdAt: timestamp("created_at").defaultNow(),

  logs: jsonb("logs").$type<string[]>().default([]),
  sessionId: varchar("session_id", {length: 255}),
  sessionUrl: varchar("session_url", {length: 500}),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;


