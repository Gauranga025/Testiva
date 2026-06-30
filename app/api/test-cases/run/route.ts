import { NextRequest, NextResponse } from "next/server";
import { generateText } from "@/lib/ai/provider";
import { db } from "@/db";
import { TestCasesTable, repositories, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { currentUser } from "@clerk/nextjs/server";
import { Browserbase } from "@browserbasehq/sdk";
import { formatLogLine } from "@/lib/execution/logger";
import { runBrowserbaseScript } from "@/lib/execution/browserbase-runner";
import {
    buildDiscoveryCacheEntry,
    buildDiscoveryCacheKey,
    getCachedDiscovery,
    summarizeDomForPrompt,
} from "@/lib/execution/discovery-cache";
import {
    buildFullUrl,
    discoverEnvironment,
    normalizeBaseUrl,
    resolveEnvironmentType,
    rewriteScriptForEnvironment,
} from "@/lib/execution/environment";
import { runPreflightChecks } from "@/lib/execution/health-checks";
import {
    activatePipelineStage,
    completePipeline,
    createInitialPipeline,
    markPipelineStage,
} from "@/lib/execution/pipeline-stages";
import { runUiDiscovery } from "@/lib/execution/ui-discovery";
import type { DomSummary, HealthReport, PipelineStage, TunnelInfo } from "@/lib/execution/types";
import { ExecutionStateMachine } from "@/lib/execution/state-machine";
import { CleanupManager } from "@/lib/execution/cleanup-manager";
import { TimeoutManager } from "@/lib/execution/timeout-manager";
import { BrowserbaseLifecycleManager } from "@/lib/execution/browserbase-lifecycle";
import { CloudflareLifecycleManager } from "@/lib/execution/cloudflare-lifecycle";
import { ExecutionDiagnostics } from "@/lib/execution/diagnostics";
import { UrlValidator } from "@/lib/execution/url-validator";
import { LocalServerVerifier } from "@/lib/execution/local-server-verifier";
import { isExecutionError } from "@/lib/execution/errors";
import { RepositoryIntelligenceService } from "@/lib/ai/repository-intelligence";
import { AIContextEngine, type AIContext } from "@/lib/ai/ai-context";
import { PromptBuilders } from "@/lib/ai/prompt-builders";
import { FailureAnalysisService, type FailureContext, type FailedStep } from "@/lib/execution/failure-analysis";
import { RepositoryMemoryService } from "@/lib/execution/repository-memory";
import { SelfHealingService } from "@/lib/execution/self-healing";
import { getRepoTree, readGithubFile } from "@/lib/github";

export const maxDuration = 300;

const bb = new Browserbase({
    apiKey: process.env.BROWSERBASE_API_KEY!,
});

async function resolveGithubToken(bodyToken?: string, userEmail?: string): Promise<string | null> {
    // If token is provided in the body, use it (for backward compatibility)
    if (bodyToken) {
        return bodyToken;
    }
    
    // Otherwise, look up from database using the authenticated user's email
    if (!userEmail) {
        return null;
    }
    
    const [userRecord] = await db
        .select()
        .from(users)
        .where(eq(users.email, userEmail));
    
    return userRecord?.githubToken ?? null;
}

async function markTestCaseFailed(
    testCaseId: number,
    logs: string[],
    scriptText: string | null,
    sessionId?: string | null,
    sessionUrl?: string | null
) {
    await db
        .update(TestCasesTable)
        .set({
            status: "failed",
            browserbaseScript: scriptText ?? undefined,
            logs,
            sessionId: sessionId ?? null,
            sessionUrl: sessionUrl ?? null,
        })
        .where(eq(TestCasesTable.id, testCaseId));
}

async function fetchRepoContext(
    testCase: typeof TestCasesTable.$inferSelect,
    githubToken: string,
    logs: string[]
): Promise<{ contextText: string; codeFiles: { path: string; content: string }[] }> {
    logs.push(formatLogLine("[SYSTEM]", "Analyzing repository files for context..."));

    const targetFiles = testCase.targetFiles || [];
    if (targetFiles.length === 0) {
        return { contextText: "", codeFiles: [] };
    }

    const fileContents = await Promise.all(
        targetFiles.map((path) =>
            readGithubFile({
                owner: testCase.repoOwner,
                repo: testCase.repoName,
                branch: testCase.branch || "main",
                path,
                githubToken,
            })
        )
    );

    const codeFiles = fileContents.filter(
        (file): file is { path: string; content: string } => Boolean(file)
    );

    const contextText = codeFiles
        .map(
            (file) => `
File Path: ${file.path}
File Content:
${file.content}
`
        )
        .join("\n\n----------------------\n\n");

    return { contextText, codeFiles };
}

export async function POST(req: NextRequest) {
    let testCaseId: number | null = null;
    let scriptText: string | null = null;
    let pipelineStages: PipelineStage[] = [];
    let tunnelInfo: TunnelInfo | null = null;
    let healthReport: HealthReport | null = null;
    let repoRecord: typeof repositories.$inferSelect | null = null;
    let repositoryHash = "";

    // Initialize production-grade services
    const pipelineLogs: string[] = [];
    const stateMachine = new ExecutionStateMachine();
    const cleanupManager = new CleanupManager(pipelineLogs);
    const timeoutManager = new TimeoutManager();
    const diagnostics = new ExecutionDiagnostics();
    const urlValidator = new UrlValidator();
    const localServerVerifier = new LocalServerVerifier(pipelineLogs, timeoutManager);
    const browserbaseLifecycle = new BrowserbaseLifecycleManager(
        bb,
        process.env.BROWSERBASE_PROJECT_ID!,
        pipelineLogs,
        timeoutManager
    );
    const cloudflareLifecycle = new CloudflareLifecycleManager(pipelineLogs, timeoutManager);
    const repositoryIntelligenceService = new RepositoryIntelligenceService();
    const aiContextEngine = new AIContextEngine();
    const failureAnalysisService = new FailureAnalysisService();
    const repositoryMemoryService = new RepositoryMemoryService();
    const selfHealingService = new SelfHealingService();

    try {
        const user = await currentUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        testCaseId = Number(body.testCaseId);
        const baseUrl: string = body.baseUrl;
        const mode: "cache" | "generate" = body.mode === "cache" ? "cache" : "generate";
        const customPrompt: string = body.customPrompt ?? "";
        const bodyGithubToken: string | undefined = body.githubToken;
        const forceRun: boolean = body.force === true;
        const refreshDiscovery: boolean = body.refreshDiscovery === true;
        const useLocalhost: boolean | undefined =
            body.useLocalhost === undefined ? undefined : body.useLocalhost === true;

        if (!testCaseId || !baseUrl) {
            return NextResponse.json(
                { error: "testCaseId and baseUrl are required" },
                { status: 400 }
            );
        }

        // Transition state machine
        stateMachine.transition("initializing", "request_received", "route.ts:203");

        const [testCase] = await db
            .select()
            .from(TestCasesTable)
            .where(eq(TestCasesTable.id, testCaseId));

        if (!testCase) {
            return NextResponse.json({ error: "Test case not found" }, { status: 404 });
        }

        // Verify the authenticated Clerk user owns this test case.
        const email = user.primaryEmailAddress?.emailAddress ?? "";
        const [localUser] = await db
            .select()
            .from(users)
            .where(eq(users.email, email));

        if (!localUser || String(testCase.userId) !== String(localUser.id)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        if (testCase.status === "running" && !forceRun) {
            return NextResponse.json(
                {
                    success: false,
                    status: "failed",
                    error: "Test case is already running. Wait for the current execution to finish.",
                },
                { status: 409 }
            );
        }

        if (testCase.repoId) {
            const [r] = await db
                .select()
                .from(repositories)
                .where(eq(repositories.repoId, parseInt(testCase.repoId, 10)));
            repoRecord = r ?? null;
        }

        if (!repoRecord) {
            const [r] = await db
                .select()
                .from(repositories)
                .where(
                    eq(repositories.fullName, `${testCase.repoOwner}/${testCase.repoName}`)
                );
            repoRecord = r ?? null;
        }

        scriptText = testCase.browserbaseScript;
        const forceRegenerate = mode === "generate" || !scriptText;

        // Validate URL using new validator
        const normalizedBaseUrl = urlValidator.validateOrThrow(baseUrl);
        const environmentType = resolveEnvironmentType(normalizedBaseUrl, useLocalhost);
        const cacheKey = buildDiscoveryCacheKey({
            repoId: testCase.repoId ?? repoRecord?.repoId ?? null,
            baseUrl: normalizedBaseUrl,
            branch: testCase.branch,
        });

        const needsTunnel = environmentType === "localhost";
        const cachedDiscoveryPreview = refreshDiscovery
            ? null
            : getCachedDiscovery(repoRecord?.uiDiscoveryCache ?? null, cacheKey);
        const skipUiDiscovery =
            !forceRegenerate || (!!cachedDiscoveryPreview && !refreshDiscovery);

        pipelineStages = createInitialPipeline({
            skipTunnel: !needsTunnel,
            skipUiDiscovery,
            skipGeneration: !forceRegenerate,
        });

        if (!process.env.BROWSERBASE_PROJECT_ID) {
            throw new Error("BROWSERBASE_PROJECT_ID is not configured");
        }

        const githubToken = await resolveGithubToken(bodyGithubToken, email);

        pipelineStages = activatePipelineStage(pipelineStages, "health_checks");
        stateMachine.transition("health_checks", "preflight_start", "route.ts:276");

        healthReport = await runPreflightChecks({
            baseUrl: normalizedBaseUrl,
            useLocalhost,
            repositoryExists: !!repoRecord,
            githubToken,
            needsGithubToken: forceRegenerate,
            needsAiProviders: forceRegenerate,
            browserbaseProjectId: process.env.BROWSERBASE_PROJECT_ID,
            logs: pipelineLogs,
        });

        if (!healthReport.ok) {
            const failedChecks = healthReport.checks
                .filter((check) => check.status === "failed")
                .map((check) => `${check.label}: ${check.message}`)
                .join("; ");

            stateMachine.transition("failed", "health_checks_failed", "route.ts:295");
            pipelineStages = markPipelineStage(pipelineStages, "health_checks", "failed");
            pipelineStages = completePipeline(pipelineStages, false);

            await markTestCaseFailed(
                testCase.id,
                pipelineLogs,
                scriptText
            );

            return NextResponse.json(
                {
                    success: false,
                    status: "failed",
                    error: `Preflight health checks failed: ${failedChecks}`,
                    logs: pipelineLogs,
                    stages: pipelineStages,
                    healthReport,
                },
                { status: 422 }
            );
        }

        stateMachine.transition("environment_discovery", "health_checks_passed", "route.ts:318");
        pipelineStages = markPipelineStage(pipelineStages, "health_checks", "completed");
        pipelineStages = activatePipelineStage(pipelineStages, "environment_discovery");

        const { result: envResult, tunnelHandle: createdTunnel } = await discoverEnvironment({
            baseUrl: normalizedBaseUrl,
            useLocalhost,
            logs: pipelineLogs,
        });

        // Register tunnel with cleanup manager if created
        if (createdTunnel) {
            cleanupManager.registerTunnel("tunnel", createdTunnel.close);
        }
        tunnelInfo = envResult.tunnel;
        const effectiveBaseUrl = envResult.effectiveUrl;

        stateMachine.transition(needsTunnel ? "tunnel_creation" : "repository_analysis", "environment_discovered", "route.ts:335");
        pipelineStages = markPipelineStage(pipelineStages, "environment_discovery", "completed");

        if (needsTunnel) {
            pipelineStages = activatePipelineStage(pipelineStages, "tunnel_creation");
            pipelineStages = markPipelineStage(
                pipelineStages,
                "tunnel_creation",
                envResult.tunnel?.status === "connected" ? "completed" : "failed"
            );
            if (envResult.tunnel?.status !== "connected") {
                stateMachine.transition("failed", "tunnel_creation_failed", "route.ts:346");
            } else {
                stateMachine.transition("repository_analysis", "tunnel_created", "route.ts:348");
                pipelineStages = activatePipelineStage(pipelineStages, "repository_analysis");
            }
        } else {
            pipelineStages = activatePipelineStage(pipelineStages, "repository_analysis");
        }

        let repoContext = "";
        let repositoryIntelligence: any = null;
        let aiContext: AIContext | null = null;

        if (forceRegenerate) {
            const { contextText, codeFiles } = await fetchRepoContext(testCase, githubToken!, pipelineLogs);
            repoContext = contextText;

            // Fetch package.json and the repo file tree for repository analysis
            let packageJson: any = { dependencies: {}, devDependencies: {} };
            let repoFilePaths: string[] = testCase.targetFiles || [];

            try {
                const packageJsonFile = await readGithubFile({
                    owner: testCase.repoOwner,
                    repo: testCase.repoName,
                    branch: testCase.branch || "main",
                    path: "package.json",
                    githubToken: githubToken!,
                });
                if (packageJsonFile) {
                    packageJson = JSON.parse(packageJsonFile.content);
                }
            } catch (pkgErr) {
                pipelineLogs.push(
                    formatLogLine("[SYSTEM]", "Could not read package.json — proceeding with empty dependency list")
                );
            }

            try {
                const tree = await getRepoTree({
                    owner: testCase.repoOwner,
                    repo: testCase.repoName,
                    branch: testCase.branch || "main",
                    githubToken: githubToken!,
                });
                repoFilePaths = tree.map((item: any) => item.path);
            } catch (treeErr) {
                pipelineLogs.push(
                    formatLogLine("[SYSTEM]", "Could not fetch repository file tree — falling back to target files only")
                );
            }

            // Generate Repository Intelligence
            repositoryHash = repositoryIntelligenceService.generateRepositoryHash({
                packageJson,
                files: repoFilePaths,
                envContent: "",
            });

            // Check if we have cached Repository Intelligence that's still valid
            repositoryIntelligence = repoRecord?.repositoryIntelligenceCache;
            if (repositoryIntelligence && repositoryIntelligence.repositoryHash !== repositoryHash) {
                pipelineLogs.push(
                    formatLogLine("[SYSTEM]", "Repository changed - invalidating cached Repository Intelligence")
                );
                repositoryIntelligence = null;
            }

            if (!repositoryIntelligence) {
                pipelineLogs.push(
                    formatLogLine("[SYSTEM]", "Generating new Repository Intelligence")
                );

                repositoryIntelligence = await repositoryIntelligenceService.analyzeRepository({
                    packageJson,
                    files: repoFilePaths,
                    codeFiles,
                    envContent: "",
                    repositoryHash,
                });

                // Cache the Repository Intelligence
                if (repoRecord) {
                    try {
                        await db
                            .update(repositories)
                            .set({ repositoryIntelligenceCache: repositoryIntelligence })
                            .where(eq(repositories.id, repoRecord.id));
                        pipelineLogs.push(
                            formatLogLine("[SYSTEM]", "Repository Intelligence cached")
                        );
                    } catch (cacheErr) {
                        pipelineLogs.push(
                            formatLogLine("[ERROR]", "Failed to cache Repository Intelligence (continuing anyway)")
                        );
                    }
                }
            } else {
                pipelineLogs.push(
                    formatLogLine("[SYSTEM]", "Using cached Repository Intelligence")
                );
            }
        } else {
            pipelineLogs.push(formatLogLine("[SYSTEM]", "Using cached Playwright script — skipping repository re-analysis"));
            // Use cached Repository Intelligence if available
            repositoryIntelligence = repoRecord?.repositoryIntelligenceCache;
            repositoryHash =
                repositoryIntelligence?.repositoryHash ||
                repositoryIntelligenceService.generateRepositoryHash({
                    packageJson: { dependencies: {}, devDependencies: {} },
                    files: testCase.targetFiles || [],
                    envContent: "",
                });
        }

        pipelineStages = markPipelineStage(pipelineStages, "repository_analysis", "completed");

        let domSummary: DomSummary | null = null;
        const cachedDiscovery = cachedDiscoveryPreview;

        if (!forceRegenerate) {
            pipelineLogs.push(formatLogLine("[DISCOVERY]", "Skipping UI discovery for cached script run"));
            stateMachine.transition("playwright_generation", "skipped_discovery", "route.ts:438");
            pipelineStages = markPipelineStage(pipelineStages, "ui_discovery", "skipped");
            pipelineStages = markPipelineStage(pipelineStages, "dom_summary", "skipped");
        } else if (cachedDiscovery) {
            domSummary = cachedDiscovery.domSummary;
            pipelineLogs.push(formatLogLine("[DISCOVERY]", "Using cached DOM summary"));
            stateMachine.transition("playwright_generation", "cached_discovery", "route.ts:444");
            pipelineStages = markPipelineStage(pipelineStages, "ui_discovery", "skipped");
            pipelineStages = markPipelineStage(pipelineStages, "dom_summary", "completed");
        } else {
            stateMachine.transition("ui_discovery", "repository_analyzed", "route.ts:448");
            pipelineStages = activatePipelineStage(pipelineStages, "ui_discovery");

            const discoveryUrl = buildFullUrl(
                effectiveBaseUrl,
                testCase.targetRoute || "/"
            );

            domSummary = await runUiDiscovery({
                bb,
                projectId: process.env.BROWSERBASE_PROJECT_ID,
                targetUrl: discoveryUrl,
                logs: pipelineLogs,
            });

            stateMachine.transition("dom_summary", "ui_discovered", "route.ts:463");
            pipelineStages = markPipelineStage(pipelineStages, "ui_discovery", "completed");
            pipelineStages = activatePipelineStage(pipelineStages, "dom_summary");
            pipelineStages = markPipelineStage(pipelineStages, "dom_summary", "completed");

            if (repoRecord) {
                const cacheEntry = buildDiscoveryCacheEntry({
                    cacheKey,
                    targetUrl: normalizedBaseUrl,
                    effectiveUrl: effectiveBaseUrl,
                    environmentType: envResult.environmentType,
                    domSummary,
                });

                await db
                    .update(repositories)
                    .set({ uiDiscoveryCache: cacheEntry })
                    .where(eq(repositories.id, repoRecord.id));
            }
        }

        const uiContext = domSummary ? summarizeDomForPrompt(domSummary) : "";

        if (forceRegenerate) {
            stateMachine.transition("playwright_generation", "dom_summarized", "route.ts:487");
            pipelineStages = activatePipelineStage(pipelineStages, "playwright_generation");
            pipelineLogs.push(
                formatLogLine("[AI]", "Generating Playwright script using AI Context Engine...")
            );

            // Build AI Context using Repository Intelligence from repository_analysis stage
            const aiContext: AIContext = aiContextEngine.buildContext({
                environment: {
                    type: envResult.environmentType,
                    baseUrl: normalizedBaseUrl,
                    effectiveUrl: effectiveBaseUrl,
                    isLocalhost: envResult.environmentType === "localhost",
                },
                repository: repositoryIntelligence || {
                    // Genuine fallback for the case where repositoryIntelligence is null
                    // (e.g. analyzeRepository() failed or no repo record exists yet).
                    framework: { name: "unknown", version: "0.0.0", type: "frontend" },
                    authentication: { provider: null, type: "none", libraries: [] },
                    database: { type: null, host: null, name: null },
                    orm: { name: null, version: null },
                    routing: { type: "none", basePath: null },
                    middleware: { present: false, type: "none" },
                    api: { type: "none", basePath: null },
                    forms: { library: null, validation: null },
                    validation: { library: null, schemaLocation: null },
                    businessModules: [],
                    libraries: [],
                    packageManager: "unknown",
                    buildTool: { name: "unknown", version: "0.0.0" },
                    environmentVariables: [],
                    architecture: { pattern: "unknown", layers: [] },
                    analyzedAt: new Date().toISOString(),
                    repositoryHash: "",
                },
                uiDiscovery: domSummary || {
                    currentUrl: effectiveBaseUrl,
                    finalUrl: effectiveBaseUrl,
                    title: "",
                    metaDescription: null,
                    navigation: [],
                    buttons: [],
                    forms: [],
                    headings: [],
                    dialogs: [],
                    tabs: [],
                    dropdowns: [],
                    tables: [],
                    cards: [],
                    routes: [],
                    loginDiscovery: null,
                    accessibility: [],
                    loadingStates: [],
                    errorStates: [],
                    emptyStates: [],
                    visibleComponents: [],
                },
                executionGoal: {
                    type: "test_execution",
                    targetRoute: testCase.targetRoute || "/",
                    expectedBehavior: testCase.expectedResult || "",
                    priority: "high",
                },
                testCase: {
                    id: testCase.id,
                    title: testCase.title,
                    description: testCase.description,
                    targetRoute: testCase.targetRoute || "/",
                    expectedResult: testCase.expectedResult || "",
                    targetFiles: testCase.targetFiles || [],
                    repoOwner: testCase.repoOwner,
                    repoName: testCase.repoName,
                    branch: testCase.branch || "main",
                },
                globalInstructions: repoRecord?.globalInstruction || undefined,
                runtimeInstructions: customPrompt || undefined,
            });

            // Build prompt using PromptBuilders
            const prompt = PromptBuilders.buildPlaywrightPrompt(aiContext, repositoryMemoryService, repositoryHash);

            try {
                const { text, provider } = await generateText(prompt);

                let generatedCode = text
                    .replace(/^```(?:javascript|js)?\s*/i, "")
                    .replace(/```\s*$/i, "")
                    .trim();

                if (!generatedCode) {
                    throw new Error("AI returned an empty script after cleanup");
                }

                scriptText = generatedCode;
                pipelineLogs.push(
                    formatLogLine(
                        "[AI]",
                        `Script generated via ${provider} (${generatedCode.length} chars)`
                    )
                );
                stateMachine.transition("execution", "script_generated", "route.ts:585");
                pipelineStages = markPipelineStage(pipelineStages, "playwright_generation", "completed");
            } catch (aiError: unknown) {
                const message =
                    aiError instanceof Error ? aiError.message : String(aiError);

                stateMachine.transition("failed", "script_generation_failed", "route.ts:591");
                pipelineStages = markPipelineStage(pipelineStages, "playwright_generation", "failed");

                await db
                    .update(TestCasesTable)
                    .set({
                        status: "gemini_error",
                        logs: [
                            formatLogLine("[AI]", "Script generation failed (all providers exhausted)"),
                            formatLogLine("[ERROR]", message),
                            ...pipelineLogs,
                        ],
                    })
                    .where(eq(TestCasesTable.id, testCase.id));

                return NextResponse.json(
                    {
                        success: false,
                        status: "gemini_error",
                        error: message,
                        logs: [
                            formatLogLine("[AI]", "Script generation failed"),
                            formatLogLine("[ERROR]", message),
                            ...pipelineLogs,
                        ],
                        stages: pipelineStages,
                        tunnel: tunnelInfo,
                        healthReport,
                    },
                    { status: 500 }
                );
            }

            await db
                .update(TestCasesTable)
                .set({
                    browserbaseScript: scriptText,
                    status: "running",
                    logs: [...pipelineLogs],
                })
                .where(eq(TestCasesTable.id, testCase.id));
        } else {
            pipelineLogs.push(
                formatLogLine("[SYSTEM]", "Using cached Playwright script from database")
            );
            stateMachine.transition("execution", "using_cached_script", "route.ts:636");
            await db
                .update(TestCasesTable)
                .set({
                    status: "running",
                    logs: [...pipelineLogs],
                })
                .where(eq(TestCasesTable.id, testCase.id));
        }

        if (!scriptText) {
            stateMachine.transition("failed", "no_script_available", "route.ts:647");
            throw new Error("No Playwright script available for execution");
        }

        const executableScript = rewriteScriptForEnvironment(
            scriptText,
            normalizedBaseUrl,
            effectiveBaseUrl
        );

        pipelineStages = activatePipelineStage(pipelineStages, "execution");

        const outcome = await runBrowserbaseScript({
            bb,
            projectId: process.env.BROWSERBASE_PROJECT_ID,
            scriptText: executableScript,
        });

        const logs = [...pipelineLogs, ...outcome.logs];

        pipelineStages = markPipelineStage(pipelineStages, "execution", outcome.success ? "completed" : "failed");
        
        // repositoryHash was already computed earlier (during repository_analysis)
        // so it's available consistently for both script generation and memory.
        
        // Initialize repository memory
        repositoryMemoryService.getRepositoryMemory(repositoryHash, repoRecord?.htmlUrl || "");
        repositoryMemoryService.loadFromCache(
            repositoryHash,
            repoRecord?.htmlUrl || "",
            repoRecord?.repositoryMemoryCache ?? null
        );
        
        if (outcome.success) {
            stateMachine.transition("assertions", "execution_completed", "route.ts:680");
            pipelineStages = activatePipelineStage(pipelineStages, "assertions");
            pipelineStages = markPipelineStage(pipelineStages, "assertions", "completed");
            stateMachine.transition("cleanup", "assertions_passed", "route.ts:683");
            
            // Record successful execution in memory
            repositoryMemoryService.recordExecutionHistory(repositoryHash, {
                executionId: testCase.id.toString(),
                route: testCase.targetRoute || "/",
                success: true,
                runtime: 0,
                memoryHits: 0,
                memoryMisses: 0,
            });
        } else {
            // Don't transition to "failed" yet — self-healing below may still
            // recover this execution into a passing one. The state machine
            // only allows failed -> idle, so committing to "failed" here would
            // make the later transition (after self-healing/cleanup) illegal
            // even on a successful recovery, throwing
            // "Invalid state transition from failed to failed".
            // The final transition to "completed" or "failed" happens once,
            // after the real outcome (including any self-healing recovery)
            // is known — see route.ts:829/853 below.

            // Failure Analysis and Self-Healing
            logs.push(formatLogLine("[FAILURE]", "Execution failed, starting failure analysis"));
            
            // Create failed step from outcome
            const failedStep: FailedStep = {
                stepNumber: 1,
                action: "unknown",
                selector: "unknown",
                expected: "success",
                actual: "failure",
                error: "Execution failed - see logs for details",
                line: 0,
            };
            
            // Collect failure context
            let failureContext: FailureContext | null = null;
            let failureReport: any = null;
            let selfHealingResult: any = null;
            
            try {
                failureContext = await failureAnalysisService.collectExecutionSnapshot({
                    browserbaseSession: { sessionId: outcome.sessionId, url: "" },
                    generatedScript: executableScript,
                    failedStep,
                    aiContext: aiContext || {} as AIContext,
                    repositoryIntelligence: repositoryIntelligence || {} as any,
                    domSummary: domSummary,
                    executionId: testCase.id.toString(),
                    logs,
                });
                
                // Analyze failure
                failureReport = await failureAnalysisService.analyzeFailure(failureContext);
                logs.push(formatLogLine("[FAILURE]", `Root cause: ${failureReport.rootCause}`));
                logs.push(formatLogLine("[FAILURE]", `Category: ${failureReport.category}`));
                logs.push(formatLogLine("[FAILURE]", `Severity: ${failureReport.severity}`));
                
                // Attempt self-healing
                selfHealingResult = await selfHealingService.attemptSelfHealing({
                    failureContext,
                    failureReport,
                    repositoryMemoryService,
                    repositoryHash,
                    executeScript: async (script: string) => {
                        const retryOutcome = await runBrowserbaseScript({
                            bb,
                            projectId: process.env.BROWSERBASE_PROJECT_ID || "",
                            scriptText: script,
                        });
                        return {
                            success: retryOutcome.success,
                            logs: retryOutcome.logs,
                            sessionId: retryOutcome.sessionId,
                            sessionUrl: retryOutcome.sessionUrl,
                            recordingUrl: retryOutcome.recordingUrl,
                        };
                    },
                    logs,
                });
                
                // Record failure in memory
                repositoryMemoryService.recordFailureReport(
                    repositoryHash,
                    failureReport,
                    selfHealingResult.attempted,
                    selfHealingResult.success
                );
                
                // Record failed execution in memory
                repositoryMemoryService.recordExecutionHistory(repositoryHash, {
                    executionId: testCase.id.toString(),
                    route: testCase.targetRoute || "/",
                    success: selfHealingResult.success,
                    runtime: 0,
                    memoryHits: 0,
                    memoryMisses: 0,
                });
                
                // If self-healing succeeded, update outcome with retry session metadata
                if (selfHealingResult.success) {
                    logs.push(formatLogLine("[RECOVERY]", "Self-healing succeeded, updating execution outcome"));
                    // Update outcome with retry session metadata
                    outcome.success = true;
                    outcome.sessionId = selfHealingResult.sessionId;
                    outcome.sessionUrl = selfHealingResult.sessionUrl;
                    outcome.recordingUrl = selfHealingResult.recordingUrl;
                }
            } catch (analysisError) {
                logs.push(formatLogLine("[FAILURE]", `Failure analysis error: ${analysisError}`));
            }
        }
        
        pipelineStages = completePipeline(pipelineStages, outcome.success);

        // Cleanup all registered resources
        await cleanupManager.cleanupAll();
        if (tunnelInfo) {
            tunnelInfo = { ...tunnelInfo, status: "closed" };
        }

        // Persist Repository Memory back to the database (continuing anyway on failure,
        // same pattern used for repositoryIntelligenceCache writes above).
        if (repoRecord) {
            try {
                const serializedMemory = repositoryMemoryService.serializeForCache(repositoryHash);
                await db
                    .update(repositories)
                    .set({ repositoryMemoryCache: serializedMemory })
                    .where(eq(repositories.id, repoRecord.id));
            } catch (memoryCacheErr) {
                logs.push(
                    formatLogLine("[ERROR]", "Failed to cache Repository Memory (continuing anyway)")
                );
            }
        }

        if (outcome.success) {
            // If we got here via the original happy path, the state machine is
            // already past "execution" (see the `if (outcome.success)` branch
            // above). If we got here via a self-healing recovery, the state
            // machine is still sitting in "execution" (since we no longer jump
            // to "failed" prematurely), so route it through the same
            // assertions -> cleanup -> completed chain the happy path uses,
            // rather than jumping straight to "completed" (which is not a
            // legal transition from "execution").
            if (stateMachine.getCurrentState() === "execution") {
                stateMachine.transition("assertions", "self_healing_recovered", "route.ts:837");
                stateMachine.transition("cleanup", "assertions_passed", "route.ts:837");
            }
            stateMachine.transition("completed", "cleanup_completed", "route.ts:790");
            await db
                .update(TestCasesTable)
                .set({
                    status: "passed",
                    browserbaseScript: scriptText,
                    logs,
                    sessionId: outcome.sessionId,
                    sessionUrl: outcome.sessionUrl,
                })
                .where(eq(TestCasesTable.id, testCase.id));

            return NextResponse.json({
                success: true,
                status: "passed",
                logs,
                sessionId: outcome.sessionId,
                sessionUrl: outcome.sessionUrl,
                stages: pipelineStages,
                tunnel: tunnelInfo,
                healthReport,
            });
        } else {
            // Genuinely failed (execution failed and self-healing did not
            // recover it). This is the only place "failed" is reached for an
            // execution-failure path, so there's no risk of a duplicate
            // failed -> failed transition.
            stateMachine.transition("failed", "cleanup_completed", "route.ts:813");
            await markTestCaseFailed(
                testCase.id,
                logs,
                scriptText,
                outcome.sessionId,
                outcome.sessionUrl
            );

            return NextResponse.json(
                {
                    success: false,
                    status: "failed",
                    error: "Test execution failed",
                    logs,
                    stages: pipelineStages,
                    tunnel: tunnelInfo,
                    healthReport,
                },
                { status: 500 }
            );
        }
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("[test-cases/run] API endpoint error:", message);

        // Record error in diagnostics
        diagnostics.recordEvent("execution_error", { message, isExecutionError: isExecutionError(error) });

        // Transition state machine to failed
        if (!stateMachine.isTerminal()) {
            stateMachine.transition("failed", "unexpected_error", "route.ts:844");
        }

        // Cleanup all registered resources
        await cleanupManager.cleanupAll();
        if (tunnelInfo) {
            tunnelInfo = { ...tunnelInfo, status: "closed" };
        }

        // Persist Repository Memory back to the database if we got far enough to
        // have a repoRecord and repositoryHash (continuing anyway on failure).
        if (repoRecord && repositoryHash) {
            try {
                const serializedMemory = repositoryMemoryService.serializeForCache(repositoryHash);
                await db
                    .update(repositories)
                    .set({ repositoryMemoryCache: serializedMemory })
                    .where(eq(repositories.id, repoRecord.id));
            } catch (memoryCacheErr) {
                console.error(
                    "[test-cases/run] Failed to cache Repository Memory (continuing anyway):",
                    memoryCacheErr
                );
            }
        }

        if (testCaseId) {
            const failureLogs = [
                formatLogLine("[ERROR]", `Unexpected execution failure: ${message}`),
                ...pipelineLogs,
            ];

            try {
                await markTestCaseFailed(testCaseId, failureLogs, scriptText);
            } catch (dbErr) {
                console.error("[test-cases/run] Failed to update test case status:", dbErr);
            }
        }

        return NextResponse.json(
            {
                success: false,
                status: "failed",
                error: message,
                logs: [formatLogLine("[ERROR]", message), ...pipelineLogs],
                stages: pipelineStages.length
                    ? completePipeline(pipelineStages, false)
                    : undefined,
                tunnel: tunnelInfo,
                healthReport,
                diagnostics: diagnostics.getSummary(),
            },
            { status: 500 }
        );
    }
}
