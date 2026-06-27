import { sql } from "drizzle-orm";
import { Browserbase } from "@browserbasehq/sdk";
import { db } from "@/db";
import { formatLogLine } from "./logger";
import { detectEnvironmentType, normalizeBaseUrl, resolveEnvironmentType } from "./environment-utils";
import { verifyCloudflaredAvailable } from "./tunnel";
import type { HealthCheckItem, HealthReport } from "./types";

const FETCH_TIMEOUT_MS = 12_000;

export type PreflightOptions = {
    baseUrl: string;
    useLocalhost?: boolean;
    repositoryExists: boolean;
    githubToken: string | null;
    needsGithubToken: boolean;
    needsAiProviders: boolean;
    browserbaseProjectId: string;
    logs: string[];
};

async function timedCheck(
    id: string,
    label: string,
    fn: () => Promise<string>
): Promise<HealthCheckItem> {
    const start = Date.now();
    try {
        const message = await fn();
        return {
            id,
            label,
            status: "passed",
            message,
            durationMs: Date.now() - start,
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
            id,
            label,
            status: "failed",
            message,
            durationMs: Date.now() - start,
        };
    }
}

async function fetchWithTimeout(
    url: string,
    init?: RequestInit
): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
        return await fetch(url, {
            ...init,
            signal: controller.signal,
            redirect: "follow",
        });
    } finally {
        clearTimeout(timer);
    }
}

async function checkUrlReachable(url: string): Promise<string> {
    const normalized = normalizeBaseUrl(url);

    let response: Response;
    try {
        response = await fetchWithTimeout(normalized, { method: "HEAD" });
    } catch {
        response = await fetchWithTimeout(normalized, { method: "GET" });
    }

    if (response.status >= 500) {
        throw new Error(`URL returned server error ${response.status}`);
    }

    return `Reachable (${response.status})`;
}

async function checkDatabase(): Promise<string> {
    if (!process.env.DATABASE_URL) {
        throw new Error("DATABASE_URL is not configured");
    }

    await db.execute(sql`SELECT 1`);
    return "Database connection healthy";
}

async function checkGithubToken(token: string): Promise<string> {
    const response = await fetchWithTimeout("https://api.github.com/user", {
        headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github+json",
            "User-Agent": "Testiva",
        },
    });

    if (response.status === 401) {
        throw new Error("GitHub token is invalid or expired");
    }

    if (!response.ok) {
        throw new Error(`GitHub API returned ${response.status}`);
    }

    const data = (await response.json()) as { login?: string };
    return data.login ? `Authenticated as ${data.login}` : "GitHub token valid";
}

async function checkBrowserbaseApi(): Promise<string> {
    const apiKey = process.env.BROWSERBASE_API_KEY;
    if (!apiKey) {
        throw new Error("BROWSERBASE_API_KEY is not configured");
    }

    const bb = new Browserbase({ apiKey });
    await bb.projects.list();
    return "Browserbase API reachable";
}

async function checkBrowserbaseProject(projectId: string): Promise<string> {
    if (!projectId) {
        throw new Error("BROWSERBASE_PROJECT_ID is not configured");
    }

    const apiKey = process.env.BROWSERBASE_API_KEY;
    if (!apiKey) {
        throw new Error("BROWSERBASE_API_KEY is not configured");
    }

    const bb = new Browserbase({ apiKey });
    const project = await bb.projects.retrieve(projectId);
    return `Project valid (${project.name})`;
}

async function checkAiProviders(): Promise<string> {
    const hasGemini = Boolean(process.env.GEMINI_API_KEY);
    const hasGroq = Boolean(process.env.GROQ_API_KEY);

    if (!hasGemini && !hasGroq) {
        throw new Error("No AI provider configured (GEMINI_API_KEY or GROQ_API_KEY required)");
    }

    const providers = [hasGemini ? "Gemini" : null, hasGroq ? "Groq" : null]
        .filter(Boolean)
        .join(", ");

    return `AI providers available (${providers})`;
}

function skippedCheck(id: string, label: string, reason: string): HealthCheckItem {
    return {
        id,
        label,
        status: "skipped",
        message: reason,
        durationMs: 0,
    };
}

export async function runPreflightChecks(
    options: PreflightOptions
): Promise<HealthReport> {
    const { logs } = options;
    const normalizedBaseUrl = normalizeBaseUrl(options.baseUrl);
    const environmentType = resolveEnvironmentType(
        normalizedBaseUrl,
        options.useLocalhost
    );

    logs.push(formatLogLine("[HEALTH]", "Running preflight health checks..."));

    const checks: HealthCheckItem[] = [];

    checks.push(
        await timedCheck("database", "Database", checkDatabase)
    );

    checks.push(
        options.repositoryExists
            ? {
                  id: "repository",
                  label: "Repository",
                  status: "passed",
                  message: "Repository record found",
                  durationMs: 0,
              }
            : {
                  id: "repository",
                  label: "Repository",
                  status: "failed",
                  message: "Repository record not found for this test case",
                  durationMs: 0,
              }
    );

    if (options.needsGithubToken) {
        if (!options.githubToken) {
            checks.push({
                id: "github_token",
                label: "GitHub Token",
                status: "failed",
                message: "GitHub authentication token is missing or expired",
                durationMs: 0,
            });
        } else {
            checks.push(
                await timedCheck("github_token", "GitHub Token", () =>
                    checkGithubToken(options.githubToken!)
                )
            );
        }
    } else {
        checks.push(
            skippedCheck(
                "github_token",
                "GitHub Token",
                "Not required for cached script execution"
            )
        );
    }

    checks.push(
        await timedCheck("browserbase_api", "Browserbase API", checkBrowserbaseApi)
    );

    checks.push(
        await timedCheck("browserbase_project", "Browserbase Project", () =>
            checkBrowserbaseProject(options.browserbaseProjectId)
        )
    );

    if (options.needsAiProviders) {
        checks.push(
            await timedCheck("ai_providers", "AI Providers", checkAiProviders)
        );
    } else {
        checks.push(
            skippedCheck(
                "ai_providers",
                "AI Providers",
                "Not required for cached script execution"
            )
        );
    }

    if (environmentType === "localhost") {
        checks.push(
            await timedCheck("local_server", "Local Server", () =>
                checkUrlReachable(normalizedBaseUrl)
            )
        );

        checks.push(
            await timedCheck("cloudflared", "Tunnel Executable", verifyCloudflaredAvailable)
        );
    } else {
        checks.push(
            await timedCheck("url_reachable", "Target URL", () =>
                checkUrlReachable(normalizedBaseUrl)
            )
        );

        checks.push(
            skippedCheck(
                "cloudflared",
                "Tunnel Executable",
                "Not required for deployed applications"
            )
        );
    }

    for (const check of checks) {
        const statusLabel =
            check.status === "passed"
                ? "OK"
                : check.status === "skipped"
                  ? "SKIP"
                  : "FAIL";
        logs.push(
            formatLogLine(
                "[HEALTH]",
                `${check.label}: ${statusLabel} — ${check.message}`
            )
        );
    }

    const ok = checks.every(
        (check) => check.status === "passed" || check.status === "skipped"
    );

    if (!ok) {
        const failed = checks.filter((check) => check.status === "failed");
        logs.push(
            formatLogLine(
                "[HEALTH]",
                `Preflight failed — ${failed.length} check(s) did not pass`
            )
        );
    } else {
        logs.push(formatLogLine("[HEALTH]", "All preflight checks passed"));
    }

    return {
        ok,
        environmentType,
        checks,
    };
}

export { detectEnvironmentType, resolveEnvironmentType };
