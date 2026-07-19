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
    console.log('========================================');
    console.log('Starting execution');
    console.log('========================================');
    
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
        console.log('[EXECUTION] Authentication check started');
        const user = await currentUser();
        if (!user) {
            console.log('[EXECUTION] Authentication failed - no user');
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        console.log('[EXECUTION] Authentication successful');

        console.log('[EXECUTION] Parsing request body');
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
            console.log('[EXECUTION] Validation failed - missing testCaseId or baseUrl');
            return NextResponse.json(
                { error: "testCaseId and baseUrl are required" },
                { status: 400 }
            );
        }
        console.log('[EXECUTION] Request body parsed successfully');

        // Transition state machine
        stateMachine.transition("initializing", "request_received", "route.ts:203");

        console.log('[EXECUTION] Fetching test case from database');
        const [testCase] = await db
            .select()
            .from(TestCasesTable)
            .where(eq(TestCasesTable.id, testCaseId));

        if (!testCase) {
            console.log('[EXECUTION] Test case not found');
            return NextResponse.json({ error: "Test case not found" }, { status: 404 });
        }
        console.log('[EXECUTION] Test case loaded:', testCase.title);

        // Verify the authenticated Clerk user owns this test case.
        console.log('[EXECUTION] Verifying user ownership');
        const email = user.primaryEmailAddress?.emailAddress ?? "";
        const [localUser] = await db
            .select()
            .from(users)
            .where(eq(users.email, email));

        if (!localUser || String(testCase.userId) !== String(localUser.id)) {
            console.log('[EXECUTION] Ownership verification failed');
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
        console.log('[EXECUTION] Ownership verified');

        if (testCase.status === "running" && !forceRun) {
            console.log('[EXECUTION] Test case already running');
            return NextResponse.json(
                {
                    success: false,
                    status: "failed",
                    error: "Test case is already running. Wait for the current execution to finish.",
                },
                { status: 409 }
            );
        }

        console.log('[EXECUTION] Fetching repository record');
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
        console.log('[EXECUTION] Repository loaded:', repoRecord?.fullName || 'not found');

        scriptText = testCase.browserbaseScript;
        const forceRegenerate = mode === "generate" || !scriptText;

        // Validate URL using new validator
        console.log('[EXECUTION] Validating URL');
        const normalizedBaseUrl = urlValidator.validateOrThrow(baseUrl);
        const environmentType = resolveEnvironmentType(normalizedBaseUrl, useLocalhost);
        const cacheKey = buildDiscoveryCacheKey({
            repoId: testCase.repoId ?? repoRecord?.repoId ?? null,
            baseUrl: normalizedBaseUrl,
            branch: testCase.branch,
        });
        console.log('[EXECUTION] URL validated - environment type:', environmentType);

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
            console.log('[EXECUTION] BROWSERBASE_PROJECT_ID not configured');
            throw new Error("BROWSERBASE_PROJECT_ID is not configured");
        }

        console.log('[EXECUTION] Resolving GitHub token');
        const githubToken = await resolveGithubToken(bodyGithubToken, email);
        console.log('[EXECUTION] GitHub token resolved:', !!githubToken);

        pipelineStages = activatePipelineStage(pipelineStages, "health_checks");
        stateMachine.transition("health_checks", "preflight_start", "route.ts:276");

        console.log('[EXECUTION] Running preflight health checks');
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
        console.log('[EXECUTION] Health checks completed - status:', healthReport.ok);

        if (!healthReport.ok) {
            const failedChecks = healthReport.checks
                .filter((check) => check.status === "failed")
                .map((check) => `${check.label}: ${check.message}`)
                .join("; ");

            console.log('[EXECUTION] Health checks failed:', failedChecks);
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

        console.log('[EXECUTION] Starting environment discovery');
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
        console.log('[EXECUTION] Environment discovery complete - effective URL:', effectiveBaseUrl);

        stateMachine.transition(needsTunnel ? "tunnel_creation" : "repository_analysis", "environment_discovered", "route.ts:335");
        pipelineStages = markPipelineStage(pipelineStages, "environment_discovery", "completed");

        if (needsTunnel) {
            console.log('[EXECUTION] Tunnel creation started');
            pipelineStages = activatePipelineStage(pipelineStages, "tunnel_creation");
            pipelineStages = markPipelineStage(
                pipelineStages,
                "tunnel_creation",
                envResult.tunnel?.status === "connected" ? "completed" : "failed"
            );
            if (envResult.tunnel?.status !== "connected") {
                console.log('[EXECUTION] Tunnel creation failed');
                stateMachine.transition("failed", "tunnel_creation_failed", "route.ts:346");
            } else {
                console.log('[EXECUTION] Tunnel created successfully');
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
            console.log('[EXECUTION] Starting repository analysis');
            const { contextText, codeFiles } = await fetchRepoContext(testCase, githubToken!, pipelineLogs);
            repoContext = contextText;
            console.log('[EXECUTION] Repository context fetched - files:', codeFiles.length);

            // Fetch package.json and the repo file tree for repository analysis
            let packageJson: any = { dependencies: {}, devDependencies: {} };
            let repoFilePaths: string[] = testCase.targetFiles || [];
            let envContent = "";

            try {
                console.log('[EXECUTION] Fetching package.json');
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
                console.log('[EXECUTION] package.json fetched');
            } catch (pkgErr) {
                console.log('[EXECUTION] Could not read package.json - proceeding with empty dependencies');
                pipelineLogs.push(
                    formatLogLine("[SYSTEM]", "Could not read package.json — proceeding with empty dependency list")
                );
            }

            // Fetch environment variable example file for Repository Intelligence
            try {
                console.log('[EXECUTION] Fetching environment variable example file');
                const envExampleFiles = [".env.example", ".env.sample", ".env.template"];
                let envFileContent = "";
                
                for (const envFileName of envExampleFiles) {
                    try {
                        const envFile = await readGithubFile({
                            owner: testCase.repoOwner,
                            repo: testCase.repoName,
                            branch: testCase.branch || "main",
                            path: envFileName,
                            githubToken: githubToken!,
                        });
                        if (envFile && envFile.content) {
                            envFileContent = envFile.content;
                            console.log('[EXECUTION] Environment variable file fetched:', envFileName);
                            break;
                        }
                    } catch (envErr) {
                        // Try next file
                        continue;
                    }
                }
                
                envContent = envFileContent;
                console.log('[EXECUTION] Environment variable content length:', envContent.length);
            } catch (envErr) {
                console.log('[EXECUTION] Could not read environment variable example file - proceeding with empty env content');
                pipelineLogs.push(
                    formatLogLine("[SYSTEM]", "Could not read environment variable example file — proceeding with empty env content")
                );
            }

            try {
                console.log('[EXECUTION] Fetching repository file tree');
                const tree = await getRepoTree({
                    owner: testCase.repoOwner,
                    repo: testCase.repoName,
                    branch: testCase.branch || "main",
                    githubToken: githubToken!,
                });
                repoFilePaths = tree.map((item: any) => item.path);
                console.log('[EXECUTION] Repository file tree fetched - files:', repoFilePaths.length);
            } catch (treeErr) {
                console.log('[EXECUTION] Could not fetch repository file tree - falling back to target files');
                pipelineLogs.push(
                    formatLogLine("[SYSTEM]", "Could not fetch repository file tree — falling back to target files only")
                );
            }

            // Generate Repository Intelligence
            repositoryHash = repositoryIntelligenceService.generateRepositoryHash({
                packageJson,
                files: repoFilePaths,
                envContent,
            });
            console.log('[EXECUTION] Repository hash generated:', repositoryHash);

            // Check if we have cached Repository Intelligence that's still valid
            repositoryIntelligence = repoRecord?.repositoryIntelligenceCache;
            if (repositoryIntelligence && repositoryIntelligence.repositoryHash !== repositoryHash) {
                console.log('[EXECUTION] Repository changed - invalidating cached Repository Intelligence');
                pipelineLogs.push(
                    formatLogLine("[SYSTEM]", "Repository changed - invalidating cached Repository Intelligence")
                );
                repositoryIntelligence = null;
            }

            if (!repositoryIntelligence) {
                console.log('[EXECUTION] Generating new Repository Intelligence');
                pipelineLogs.push(
                    formatLogLine("[SYSTEM]", "Generating new Repository Intelligence")
                );

                repositoryIntelligence = await repositoryIntelligenceService.analyzeRepository({
                    packageJson,
                    files: repoFilePaths,
                    codeFiles,
                    envContent,
                    repositoryHash,
                });
                console.log('[EXECUTION] Repository Intelligence complete');

                // Cache the Repository Intelligence
                if (repoRecord) {
                    try {
                        await db
                            .update(repositories)
                            .set({ repositoryIntelligenceCache: repositoryIntelligence })
                            .where(eq(repositories.id, repoRecord.id));
                        console.log('[EXECUTION] Repository Intelligence cached');
                        pipelineLogs.push(
                            formatLogLine("[SYSTEM]", "Repository Intelligence cached")
                        );
                    } catch (cacheErr) {
                        console.log('[EXECUTION] Failed to cache Repository Intelligence (continuing anyway)');
                        pipelineLogs.push(
                            formatLogLine("[ERROR]", "Failed to cache Repository Intelligence (continuing anyway)")
                        );
                    }
                }
            } else {
                console.log('[EXECUTION] Using cached Repository Intelligence');
                pipelineLogs.push(
                    formatLogLine("[SYSTEM]", "Using cached Repository Intelligence")
                );
            }
        } else {
            console.log('[EXECUTION] Using cached Playwright script - skipping repository re-analysis');
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
            console.log('[EXECUTION] Skipping UI discovery for cached script run');
            pipelineLogs.push(formatLogLine("[DISCOVERY]", "Skipping UI discovery for cached script run"));
            stateMachine.transition("playwright_generation", "skipped_discovery", "route.ts:438");
            pipelineStages = markPipelineStage(pipelineStages, "ui_discovery", "skipped");
            pipelineStages = markPipelineStage(pipelineStages, "dom_summary", "skipped");
        } else if (cachedDiscovery) {
            console.log('[EXECUTION] Using cached DOM summary');
            domSummary = cachedDiscovery.domSummary;
            pipelineLogs.push(formatLogLine("[DISCOVERY]", "Using cached DOM summary"));
            // Don't transition to playwright_generation here - will transition in forceRegenerate block
            pipelineStages = markPipelineStage(pipelineStages, "ui_discovery", "skipped");
            pipelineStages = markPipelineStage(pipelineStages, "dom_summary", "completed");
        } else {
            console.log('[EXECUTION] Starting UI discovery');
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
            console.log('[EXECUTION] UI discovery complete');

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
                console.log('[EXECUTION] UI discovery cached');
            }
        }

        const uiContext = domSummary ? summarizeDomForPrompt(domSummary) : "";

        if (forceRegenerate) {
            console.log('[EXECUTION] Building AI context');
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
            console.log('[EXECUTION] AI context built');

            // Build prompt using PromptBuilders
            console.log('[EXECUTION] Building Playwright prompt');
            const prompt = PromptBuilders.buildPlaywrightPrompt(aiContext, repositoryMemoryService, repositoryHash);

            try {
                console.log('[EXECUTION] Calling AI to generate Playwright script');
                const { text, provider } = await generateText(prompt);
                console.log('[EXECUTION] AI response received from provider:', provider);

                let generatedCode = text
                    .replace(/^```(?:javascript|js)?\s*/i, "")
                    .replace(/```\s*$/i, "")
                    .trim();

                if (!generatedCode) {
                    console.log('[EXECUTION] AI returned empty script');
                    throw new Error("AI returned an empty script after cleanup");
                }

                scriptText = generatedCode;
                console.log('[EXECUTION] Script generated - length:', scriptText.length);
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
                console.log('[EXECUTION] Script generation failed:', message);
                console.log('[EXECUTION] Error location: route.ts:591');

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
            console.log('[EXECUTION] Using cached Playwright script');
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
            console.log('[EXECUTION] No script available');
            stateMachine.transition("failed", "no_script_available", "route.ts:647");
            throw new Error("No Playwright script available for execution");
        }

        console.log('[EXECUTION] Validating and rewriting script for environment');
        const executableScript = rewriteScriptForEnvironment(
            scriptText,
            normalizedBaseUrl,
            effectiveBaseUrl
        );

        pipelineStages = activatePipelineStage(pipelineStages, "execution");

        console.log('[EXECUTION] Creating Browserbase session');
        const outcome = await runBrowserbaseScript({
            bb,
            projectId: process.env.BROWSERBASE_PROJECT_ID,
            scriptText: executableScript,
        });
        console.log('[EXECUTION] Browserbase execution completed - success:', outcome.success);

        const logs = [...pipelineLogs, ...outcome.logs];

        pipelineStages = markPipelineStage(pipelineStages, "execution", outcome.success ? "completed" : "failed");
        
        // repositoryHash was already computed earlier (during repository_analysis)
        // so it's available consistently for both script generation and memory.
        
        // Initialize repository memory
        console.log('[EXECUTION] Initializing repository memory');
        repositoryMemoryService.getRepositoryMemory(repositoryHash, repoRecord?.htmlUrl || "");
        repositoryMemoryService.loadFromCache(
            repositoryHash,
            repoRecord?.htmlUrl || "",
            repoRecord?.repositoryMemoryCache ?? null
        );
        
        if (outcome.success) {
            console.log('[EXECUTION] Execution succeeded');
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

            // Run accessibility audit (non-fatal)
            try {
                if (domSummary) {
                    console.log('[EXECUTION] Running accessibility audit');
                    const { AccessibilityAuditService } = await import("@/lib/accessibility/accessibility-audit");
                    const accessibilityService = new AccessibilityAuditService();
                    const accessibilityReport = await accessibilityService.performAudit({
                        page: null, // No live page available after execution
                        domSummary,
                        url: effectiveBaseUrl,
                        executionId: testCase.id.toString(),
                    });
                    
                    const memory = repositoryMemoryService.serializeForCache(repositoryHash);
                    if (memory) {
                        memory.accessibilityReport = accessibilityReport;
                    }
                    console.log('[EXECUTION] Accessibility audit completed');
                }
            } catch (accessibilityErr) {
                console.log('[EXECUTION] Accessibility audit failed - continuing without it:', accessibilityErr);
                pipelineLogs.push(
                    formatLogLine("[SYSTEM]", "Accessibility audit failed — continuing without it")
                );
            }

            // Run analytics update (non-fatal)
            try {
                console.log('[EXECUTION] Running analytics update');
                const { AnalyticsEngine } = await import("@/lib/analytics/analytics-engine");
                const analyticsEngine = new AnalyticsEngine();
                const routesTouched = domSummary?.routes?.map(r => r.path) || [];
                
                analyticsEngine.recordExecution({
                    executionId: testCase.id.toString(),
                    timestamp: new Date().toISOString(),
                    repositoryHash,
                    route: testCase.targetRoute || "/",
                    success: true,
                    runtime: 0,
                    tokenUsage: 0,
                    aiCostEstimate: 0,
                    retryCount: 0,
                    selfHealingSuccess: false,
                    accessibilityScore: 0,
                    apiCoverage: routesTouched.length > 0 ? 100 : 0,
                    visualRegressionScore: 100,
                });
                
                const analyticsData = analyticsEngine.generateReport();
                const memory = repositoryMemoryService.serializeForCache(repositoryHash);
                if (memory) {
                    memory.analyticsData = analyticsData;
                }
                console.log('[EXECUTION] Analytics update completed');
            } catch (analyticsErr) {
                console.log('[EXECUTION] Analytics update failed - continuing without it:', analyticsErr);
                pipelineLogs.push(
                    formatLogLine("[SYSTEM]", "Analytics update failed — continuing without it")
                );
            }
        } else {
            console.log('[EXECUTION] Execution failed - starting failure analysis');
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
                console.log('[EXECUTION] Collecting execution snapshot for failure analysis');
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
                console.log('[EXECUTION] Analyzing failure');
                failureReport = await failureAnalysisService.analyzeFailure(failureContext);
                logs.push(formatLogLine("[FAILURE]", `Root cause: ${failureReport.rootCause}`));
                logs.push(formatLogLine("[FAILURE]", `Category: ${failureReport.category}`));
                logs.push(formatLogLine("[FAILURE]", `Severity: ${failureReport.severity}`));
                console.log('[EXECUTION] Failure analysis complete - root cause:', failureReport.rootCause);
                
                // Attempt self-healing
                console.log('[EXECUTION] Attempting self-healing');
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
                console.log('[EXECUTION] Self-healing completed - success:', selfHealingResult.success);
                
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
                console.log('[EXECUTION] Failure analysis error:', analysisError);
                logs.push(formatLogLine("[FAILURE]", `Failure analysis error: ${analysisError}`));
            }
        }
        
        pipelineStages = completePipeline(pipelineStages, outcome.success);

        console.log('[EXECUTION] Starting cleanup');
        // Cleanup all registered resources
        await cleanupManager.cleanupAll();
        if (tunnelInfo) {
            tunnelInfo = { ...tunnelInfo, status: "closed" };
        }
        console.log('[EXECUTION] Cleanup completed');

        // Persist Repository Memory back to the database (continuing anyway on failure,
        // same pattern used for repositoryIntelligenceCache writes above).
        if (repoRecord) {
            try {
                const serializedMemory = repositoryMemoryService.serializeForCache(repositoryHash);
                await db
                    .update(repositories)
                    .set({ repositoryMemoryCache: serializedMemory })
                    .where(eq(repositories.id, repoRecord.id));
                console.log('[EXECUTION] Repository memory cached');
            } catch (memoryCacheErr) {
                console.log('[EXECUTION] Failed to cache Repository Memory (continuing anyway)');
                logs.push(
                    formatLogLine("[ERROR]", "Failed to cache Repository Memory (continuing anyway)")
                );
            }
        }

        if (outcome.success) {
            console.log('[EXECUTION] Test passed - updating database');
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

            console.log('========================================');
            console.log('Execution completed successfully');
            console.log('========================================');

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
            console.log('[EXECUTION] Test failed - updating database');
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

            console.log('========================================');
            console.log('Execution failed');
            console.log('========================================');

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
        console.error('[EXECUTION] API endpoint error:', message);
        console.error('[EXECUTION] Error location: route.ts:844');
        console.error('[EXECUTION] Stack trace:', error instanceof Error ? error.stack : 'No stack trace');

        // Record error in diagnostics
        diagnostics.recordEvent("execution_error", { message, isExecutionError: isExecutionError(error) });

        // Transition state machine to failed
        if (!stateMachine.isTerminal()) {
            stateMachine.transition("failed", "unexpected_error", "route.ts:844");
        }

        console.log('[EXECUTION] Starting cleanup due to error');
        // Cleanup all registered resources
        await cleanupManager.cleanupAll();
        if (tunnelInfo) {
            tunnelInfo = { ...tunnelInfo, status: "closed" };
        }
        console.log('[EXECUTION] Cleanup completed');

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
                    "[EXECUTION] Failed to cache Repository Memory (continuing anyway):",
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
                console.error("[EXECUTION] Failed to update test case status:", dbErr);
            }
        }

        console.log('========================================');
        console.log('Execution failed with error');
        console.log('========================================');

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
