/**
 * AI Failure Analysis Service
 * 
 * Collects execution snapshots, analyzes failures, and generates root cause reports.
 * Reuses existing AIContext and Repository Intelligence without re-analysis.
 */

import type { AIContext } from "@/lib/ai/ai-context";
import type { RepositoryIntelligence } from "@/lib/ai/repository-intelligence";
import type { DomSummary } from "./types";
import { generateStructured, Type, type GeminiSchema } from "@/lib/ai/provider";
import { PromptBuilders } from "@/lib/ai/prompt-builders";

// ============================================================================
// Browser State
// ============================================================================

export interface BrowserState {
    currentUrl: string;
    expectedUrl: string;
    redirectChain: string[];
    pageTitle: string;
    domSummary: DomSummary | null;
    accessibilityTree: AccessibilityNode[] | null;
    visibleHeadings: string[];
    buttons: ButtonState[];
    forms: FormState[];
    dialogs: DialogState[];
    navigation: NavigationState[];
    activeRoute: string;
}

export interface AccessibilityNode {
    role: string;
    name: string;
    description: string;
    level?: number;
    expanded?: boolean;
    selected?: boolean;
}

export interface ButtonState {
    text: string;
    selector: string;
    visible: boolean;
    enabled: boolean;
    ariaLabel: string | null;
}

export interface FormState {
    action: string | null;
    method: string;
    fields: FormFieldState[];
    submitButton: ButtonState | null;
}

export interface FormFieldState {
    name: string | null;
    type: string;
    label: string | null;
    visible: boolean;
    required: boolean;
    value: string | null;
}

export interface DialogState {
    role: string;
    title: string;
    message: string;
    buttons: ButtonState[];
    visible: boolean;
}

export interface NavigationState {
    label: string;
    href: string | null;
    active: boolean;
    visible: boolean;
}

// ============================================================================
// Visual State
// ============================================================================

export interface VisualState {
    screenshot: string; // base64 encoded
    browserbaseRecording: string | null; // recording URL
    browserbaseSessionUrl: string | null;
    viewport: Viewport;
    device: Device;
    timestamp: string;
}

export interface Viewport {
    width: number;
    height: number;
    deviceScaleFactor: number;
    isMobile: boolean;
}

export interface Device {
    userAgent: string;
    platform: string;
    language: string;
}

// ============================================================================
// Console State
// ============================================================================

export interface ConsoleState {
    logs: ConsoleLog[];
    warnings: ConsoleLog[];
    errors: ConsoleLog[];
    unhandledExceptions: ConsoleLog[];
}

export interface ConsoleLog {
    level: "log" | "warn" | "error" | "info" | "debug";
    message: string;
    timestamp: string;
    source: string;
    stack?: string;
}

// ============================================================================
// Network State
// ============================================================================

export interface NetworkState {
    failedRequests: NetworkRequest[];
    httpErrors: NetworkRequest[];
    redirects: NetworkRequest[];
    apiResponses: NetworkRequest[];
    networkTiming: NetworkTiming;
    requestWaterfall: NetworkRequest[];
}

export interface NetworkRequest {
    url: string;
    method: string;
    status: number;
    statusText: string;
    headers: Record<string, string>;
    timing: RequestTiming;
    size: number;
    timestamp: string;
}

export interface RequestTiming {
    startTime: number;
    dnsLookup: number;
    tcpConnection: number;
    tlsHandshake: number;
    requestSent: number;
    waiting: number;
    contentDownload: number;
    totalTime: number;
}

export interface NetworkTiming {
    totalRequests: number;
    totalSize: number;
    averageResponseTime: number;
    slowestRequest: NetworkRequest | null;
    fastestRequest: NetworkRequest | null;
}

// ============================================================================
// Playwright Context
// ============================================================================

export interface PlaywrightContext {
    generatedScript: string;
    failedStep: FailedStep;
    locator: string;
    assertion: Assertion | null;
    stackTrace: string;
    timeout: number;
    executionTimeline: ExecutionTimeline;
}

export interface FailedStep {
    stepNumber: number;
    action: string;
    selector: string;
    expected: string;
    actual: string;
    error: string;
    line: number;
}

export interface Assertion {
    type: "url" | "element" | "text" | "visibility" | "custom";
    target: string;
    expected: string | boolean;
    actual: string | boolean;
    passed: boolean;
    message: string;
}

export interface ExecutionTimeline {
    totalDuration: number;
    steps: TimelineStep[];
}

export interface TimelineStep {
    stepNumber: number;
    action: string;
    selector: string;
    duration: number;
    status: "success" | "failed" | "skipped";
    timestamp: string;
}

// ============================================================================
// Failure Context
// ============================================================================

export interface FailureContext {
    aiContext: AIContext;
    repositoryIntelligence: RepositoryIntelligence;
    domSummary: DomSummary | null;
    accessibilityTree: AccessibilityNode[] | null;
    screenshot: string;
    browserbaseRecording: string | null;
    browserbaseSessionUrl: string | null;
    networkLogs: NetworkState;
    consoleLogs: ConsoleState;
    failedStep: FailedStep;
    generatedScript: string;
    timeline: ExecutionTimeline;
    browserState: BrowserState;
    visualState: VisualState;
    playwrightContext: PlaywrightContext;
    executionId: string;
    timestamp: string;
}

// ============================================================================
// Failure Report
// ============================================================================

export type FailureCategory =
    | "ui_change"
    | "authentication"
    | "navigation"
    | "api_failure"
    | "network"
    | "environment"
    | "playwright"
    | "ai_generation"
    | "repository"
    | "infrastructure";

export type Severity = "critical" | "high" | "medium" | "low";

export interface FailureReport {
    executionId: string;
    timestamp: string;
    
    // Root Cause Analysis
    rootCause: string;
    confidenceScore: number; // 0-100
    severity: Severity;
    category: FailureCategory;
    
    // Failure Details
    affectedFeature: string;
    failedStep: FailedStep;
    brokenSelector: string | null;
    suggestedSelector: string | null;
    suggestedFix: string;
    
    // Retry Recommendation
    retryRecommended: boolean;
    retryReason: string;
    
    // Related Information
    relatedRepositoryFiles: string[];
    relatedRoutes: string[];
    relatedApis: string[];
    
    // Executive Summary
    executiveSummary: string;
    
    // Raw Context (for debugging)
    failureContext: Omit<FailureContext, "aiContext" | "repositoryIntelligence">;
}

// ============================================================================
// Failure Analysis Service
// ============================================================================

export class FailureAnalysisService {
    /**
     * Collect complete execution snapshot
     */
    async collectExecutionSnapshot(params: {
        browserbaseSession: any;
        generatedScript: string;
        failedStep: FailedStep;
        aiContext: AIContext;
        repositoryIntelligence: RepositoryIntelligence;
        domSummary: DomSummary | null;
        executionId: string;
        logs?: string[];
    }): Promise<FailureContext> {
        const {
            browserbaseSession,
            generatedScript,
            failedStep,
            aiContext,
            repositoryIntelligence,
            domSummary,
            executionId,
            logs = [],
        } = params;

        // Collect browser state
        const browserState = await this.collectBrowserState(browserbaseSession);
        
        // Collect visual state
        const visualState = await this.collectVisualState(browserbaseSession);
        
        // Collect console logs
        const consoleLogs = await this.collectConsoleLogs(browserbaseSession, logs);
        
        // Collect network logs
        const networkLogs = await this.collectNetworkLogs(browserbaseSession, logs);
        
        // Build Playwright context
        const playwrightContext = this.buildPlaywrightContext(
            generatedScript,
            failedStep,
            browserbaseSession
        );
        
        return {
            aiContext,
            repositoryIntelligence,
            domSummary,
            accessibilityTree: browserState.accessibilityTree,
            screenshot: visualState.screenshot,
            browserbaseRecording: visualState.browserbaseRecording,
            browserbaseSessionUrl: visualState.browserbaseSessionUrl,
            networkLogs,
            consoleLogs,
            failedStep,
            generatedScript,
            timeline: playwrightContext.executionTimeline,
            browserState,
            visualState,
            playwrightContext,
            executionId,
            timestamp: new Date().toISOString(),
        };
    }
    
    /**
     * Analyze failure and generate report
     */
    async analyzeFailure(failureContext: FailureContext): Promise<FailureReport> {
        let category = this.fallbackFailureCategory(failureContext);
        let severity = this.determineSeverity(failureContext, category);
        let retryRecommended = this.fallbackShouldRetry(failureContext, category);

        // Defaults used if the AI call fails — a flaky AI call should never
        // block failure reporting entirely.
        let rootCause = "AI analysis pending";
        let confidenceScore = 0;
        let suggestedFix = "AI-generated fix pending";
        let suggestedSelector: string | null = null;
        let executiveSummary = "AI-generated executive summary pending";

        try {
            const errorLogs = [
                `Failed step: ${failureContext.failedStep.action}`,
                `Selector: ${failureContext.failedStep.selector}`,
                `Expected: ${failureContext.failedStep.expected}`,
                `Actual: ${failureContext.failedStep.actual}`,
                `Error: ${failureContext.failedStep.error}`,
                ...failureContext.consoleLogs.errors.map((e) => `[CONSOLE ERROR] ${e.message}`),
                ...failureContext.consoleLogs.warnings.map((w) => `[CONSOLE WARN] ${w.message}`),
            ];

            const prompt = PromptBuilders.buildFailureAnalysisPrompt(failureContext.aiContext, errorLogs);

            const schema: GeminiSchema = {
                type: Type.OBJECT,
                properties: {
                    rootCause: { type: Type.STRING },
                    confidenceScore: { type: Type.NUMBER },
                    suggestedFix: { type: Type.STRING },
                    suggestedSelector: { type: Type.STRING, nullable: true },
                    executiveSummary: { type: Type.STRING },
                    isFlaky: { type: Type.BOOLEAN },
                    category: { 
                        type: Type.STRING,
                        enum: ["authentication", "network", "api_failure", "playwright", "ui_change", "navigation", "infrastructure"]
                    },
                    retryRecommended: { type: Type.BOOLEAN },
                },
                required: [
                    "rootCause",
                    "confidenceScore",
                    "suggestedFix",
                    "suggestedSelector",
                    "executiveSummary",
                    "isFlaky",
                    "category",
                    "retryRecommended",
                ],
            };

            const { data } = await generateStructured<{
                rootCause: string;
                confidenceScore: number;
                suggestedFix: string;
                suggestedSelector: string | null;
                executiveSummary: string;
                isFlaky: boolean;
                category: FailureCategory;
                retryRecommended: boolean;
            }>(prompt, schema);

            rootCause = data.rootCause;
            confidenceScore = data.confidenceScore;
            suggestedFix = data.suggestedFix;
            suggestedSelector = data.suggestedSelector;
            executiveSummary = data.executiveSummary;
            
            // Use AI-provided category and retry recommendation
            category = data.category;
            retryRecommended = data.retryRecommended;
            
            // Recalculate severity based on AI-provided category
            severity = this.determineSeverity(failureContext, category);
        } catch (aiError) {
            // Fall back to rule-based logic when AI fails
            category = this.fallbackFailureCategory(failureContext);
            retryRecommended = this.fallbackShouldRetry(failureContext, category);
        }

        return {
            executionId: failureContext.executionId,
            timestamp: failureContext.timestamp,

            rootCause,
            confidenceScore,
            severity,
            category,

            affectedFeature: this.extractAffectedFeature(failureContext),
            failedStep: failureContext.failedStep,
            brokenSelector: this.extractBrokenSelector(failureContext),
            suggestedSelector,
            suggestedFix,

            retryRecommended,
            retryReason: retryRecommended ? "Selector-related failure, safe to retry" : "Non-retryable failure",

            relatedRepositoryFiles: this.extractRelatedFiles(failureContext),
            relatedRoutes: this.extractRelatedRoutes(failureContext),
            relatedApis: this.extractRelatedApis(failureContext),

            executiveSummary,

            failureContext: {
                domSummary: failureContext.domSummary,
                accessibilityTree: failureContext.accessibilityTree,
                screenshot: failureContext.screenshot,
                browserbaseRecording: failureContext.browserbaseRecording,
                browserbaseSessionUrl: failureContext.browserbaseSessionUrl,
                networkLogs: failureContext.networkLogs,
                consoleLogs: failureContext.consoleLogs,
                failedStep: failureContext.failedStep,
                generatedScript: failureContext.generatedScript,
                timeline: failureContext.timeline,
                browserState: failureContext.browserState,
                visualState: failureContext.visualState,
                playwrightContext: failureContext.playwrightContext,
                executionId: failureContext.executionId,
                timestamp: failureContext.timestamp,
            },
        };
    }
    
    // ============================================================================
    // Private Methods - State Collection
    // ============================================================================
    
    private async collectBrowserState(browserbaseSession: any): Promise<BrowserState> {
        // TODO: To populate this with real data (currentUrl, pageTitle, domSummary,
        // accessibilityTree, buttons, forms, dialogs, navigation, activeRoute) we need
        // access to the live Playwright `page` object at the point of failure. Right now
        // this function only receives `browserbaseSession` (sessionId/url metadata), not
        // the `page` handle itself. The `page` is created and used inside
        // lib/execution/browserbase-runner.ts during script execution and is not
        // currently threaded out to the failure-analysis call site in
        // app/api/test-cases/run/route.ts. To fix properly: have the runner catch the
        // failure at the point it occurs (inside the executing script's try/catch) and
        // call page.url(), page.title(), and an accessibility snapshot there, then pass
        // those captured values into collectExecutionSnapshot() instead of trying to
        // reconstruct them after the Browserbase session has likely already ended.
        return {
            currentUrl: browserbaseSession?.url || "",
            expectedUrl: "",
            redirectChain: [],
            pageTitle: "",
            domSummary: null,
            accessibilityTree: [],
            visibleHeadings: [],
            buttons: [],
            forms: [],
            dialogs: [],
            navigation: [],
            activeRoute: "",
        };
    }
    
    private async collectVisualState(browserbaseSession: any): Promise<VisualState> {
        // TODO: Same constraint as collectBrowserState() above — capturing a real
        // page.screenshot() requires access to the live Playwright `page` object at the
        // point of failure, which isn't passed into this function today. The recording
        // and session URLs are already real (sourced from the Browserbase session
        // metadata), but the screenshot, viewport, and device fields would need the
        // runner to capture them at failure time and pass them through.
        return {
            screenshot: "",
            browserbaseRecording: browserbaseSession?.recordingUrl || null,
            browserbaseSessionUrl: browserbaseSession?.sessionUrl || null,
            viewport: {
                width: 1920,
                height: 1080,
                deviceScaleFactor: 1,
                isMobile: false,
            },
            device: {
                userAgent: "",
                platform: "",
                language: "en",
            },
            timestamp: new Date().toISOString(),
        };
    }
    
    /**
     * Parse [BROWSER]-prefixed lines (pushed by attachPageListeners in
     * lib/execution/browser-session.ts) into structured ConsoleLog entries.
     *
     * Lines look like:
     *   "[BROWSER] [LOG] some message"
     *   "[BROWSER] [WARN] some message"
     *   "[BROWSER] [ERROR] some message"
     *   "[BROWSER] Page error: <message>"
     */
    private async collectConsoleLogs(browserbaseSession: any, logs: string[] = []): Promise<ConsoleState> {
        const consoleState: ConsoleState = {
            logs: [],
            warnings: [],
            errors: [],
            unhandledExceptions: [],
        };

        for (const rawLine of logs) {
            if (!rawLine.startsWith("[BROWSER]")) continue;

            const rest = rawLine.slice("[BROWSER]".length).trim();
            const timestamp = new Date().toISOString();

            const pageErrorMatch = rest.match(/^Page error:\s*(.*)$/i);
            if (pageErrorMatch) {
                const entry: ConsoleLog = {
                    level: "error",
                    message: pageErrorMatch[1],
                    timestamp,
                    source: "page",
                };
                consoleState.errors.push(entry);
                consoleState.unhandledExceptions.push(entry);
                continue;
            }

            const levelMatch = rest.match(/^\[(LOG|WARN|ERROR|INFO|DEBUG)\]\s*(.*)$/i);
            if (levelMatch) {
                const rawLevel = levelMatch[1].toLowerCase();
                const message = levelMatch[2];
                const level: ConsoleLog["level"] =
                    rawLevel === "warn" ? "warn" :
                    rawLevel === "error" ? "error" :
                    rawLevel === "info" ? "info" :
                    rawLevel === "debug" ? "debug" : "log";

                const entry: ConsoleLog = {
                    level,
                    message,
                    timestamp,
                    source: "console",
                };

                consoleState.logs.push(entry);
                if (level === "warn") consoleState.warnings.push(entry);
                if (level === "error") consoleState.errors.push(entry);
                continue;
            }

            // Unrecognized [BROWSER] line format — still capture it as a generic log
            // rather than silently dropping it.
            consoleState.logs.push({
                level: "log",
                message: rest,
                timestamp,
                source: "console",
            });
        }

        return consoleState;
    }
    
    /**
     * Parse [NETWORK]-prefixed lines (pushed by attachPageListeners in
     * lib/execution/browser-session.ts) into structured NetworkRequest entries.
     *
     * Lines look like:
     *   "[NETWORK] Request failed: GET https://example.com — net::ERR_FAILED"
     *   "[NETWORK] HTTP 404 GET https://example.com/api/users"
     */
    private async collectNetworkLogs(browserbaseSession: any, logs: string[] = []): Promise<NetworkState> {
        const failedRequests: NetworkRequest[] = [];
        const httpErrors: NetworkRequest[] = [];

        const emptyTiming: RequestTiming = {
            startTime: 0,
            dnsLookup: 0,
            tcpConnection: 0,
            tlsHandshake: 0,
            requestSent: 0,
            waiting: 0,
            contentDownload: 0,
            totalTime: 0,
        };

        for (const rawLine of logs) {
            if (!rawLine.startsWith("[NETWORK]")) continue;

            const rest = rawLine.slice("[NETWORK]".length).trim();
            const timestamp = new Date().toISOString();

            const requestFailedMatch = rest.match(/^Request failed:\s*(\S+)\s+(\S+)\s*—\s*(.*)$/);
            if (requestFailedMatch) {
                const [, method, url, errorText] = requestFailedMatch;
                failedRequests.push({
                    url,
                    method,
                    status: 0,
                    statusText: errorText,
                    headers: {},
                    timing: emptyTiming,
                    size: 0,
                    timestamp,
                });
                continue;
            }

            const httpErrorMatch = rest.match(/^HTTP (\d+)\s+(\S+)\s+(\S+)$/);
            if (httpErrorMatch) {
                const [, statusStr, method, url] = httpErrorMatch;
                httpErrors.push({
                    url,
                    method,
                    status: parseInt(statusStr, 10),
                    statusText: "",
                    headers: {},
                    timing: emptyTiming,
                    size: 0,
                    timestamp,
                });
                continue;
            }
        }

        const allRequests = [...failedRequests, ...httpErrors];

        return {
            failedRequests,
            httpErrors,
            redirects: [],
            apiResponses: httpErrors,
            networkTiming: {
                totalRequests: allRequests.length,
                totalSize: 0,
                averageResponseTime: 0,
                slowestRequest: null,
                fastestRequest: null,
            },
            requestWaterfall: allRequests,
        };
    }
    
    private buildPlaywrightContext(
        generatedScript: string,
        failedStep: FailedStep,
        browserbaseSession: any
    ): PlaywrightContext {
        return {
            generatedScript,
            failedStep,
            locator: failedStep.selector,
            assertion: null,
            stackTrace: "",
            timeout: 30000,
            executionTimeline: {
                totalDuration: 0,
                steps: [],
            },
        };
    }
    
    // ============================================================================
    // Private Methods - Analysis Helpers
    // ============================================================================
    
    private fallbackFailureCategory(failureContext: FailureContext): FailureCategory {
        const { failedStep, consoleLogs, networkLogs, browserState } = failureContext;
        
        // Check for navigation failures (page did not reach expected URL/route after an action)
        if (failedStep.error.includes("redirect") || 
            failedStep.error.includes("URL") ||
            (browserState.currentUrl !== browserState.expectedUrl && browserState.expectedUrl)) {
            return "navigation";
        }
        
        // Check for authentication failures
        if (failedStep.selector.includes("login") || failedStep.selector.includes("auth")) {
            return "authentication";
        }
        
        // Check for network failures
        if (networkLogs.failedRequests.length > 0 || networkLogs.httpErrors.length > 0) {
            return "network";
        }
        
        // Check for API failures
        if (networkLogs.apiResponses.some(r => r.status >= 400)) {
            return "api_failure";
        }
        
        // Check for console errors
        if (consoleLogs.errors.length > 0) {
            return "playwright";
        }
        
        // Default to UI change
        return "ui_change";
    }
    
    private determineSeverity(failureContext: FailureContext, category: FailureCategory): Severity {
        const criticalCategories: FailureCategory[] = ["authentication", "infrastructure", "api_failure"];
        
        if (criticalCategories.includes(category)) {
            return "critical";
        }
        
        if (category === "network" || category === "playwright") {
            return "high";
        }
        
        return "medium";
    }
    
    private fallbackShouldRetry(failureContext: FailureContext, category: FailureCategory): boolean {
        // Do not retry on authentication, infrastructure, or API failures
        const nonRetryableCategories: FailureCategory[] = [
            "authentication",
            "infrastructure",
            "api_failure",
        ];
        
        if (nonRetryableCategories.includes(category)) {
            return false;
        }
        
        // Retry selector/UI-related failures
        return category === "ui_change" || category === "navigation";
    }
    
    private extractAffectedFeature(failureContext: FailureContext): string {
        const { failedStep, browserState } = failureContext;
        
        if (failedStep.selector.includes("button")) {
            return "Button interaction";
        }
        
        if (failedStep.selector.includes("form")) {
            return "Form submission";
        }
        
        if (failedStep.selector.includes("nav")) {
            return "Navigation";
        }
        
        return "UI element interaction";
    }
    
    private extractBrokenSelector(failureContext: FailureContext): string | null {
        return failureContext.failedStep.selector || null;
    }
    
    private extractRelatedFiles(failureContext: FailureContext): string[] {
        const { repositoryIntelligence, failedStep } = failureContext;
        
        // Return files related to the failed step
        return repositoryIntelligence.businessModules
            .filter(m => failedStep.selector.includes(m.name.toLowerCase()))
            .map(m => m.path);
    }
    
    private extractRelatedRoutes(failureContext: FailureContext): string[] {
        const { domSummary, browserState } = failureContext;
        
        if (!domSummary) return [];
        
        return domSummary.routes
            .filter(r => browserState.currentUrl.includes(r.path))
            .map(r => r.path);
    }
    
    private extractRelatedApis(failureContext: FailureContext): string[] {
        const { repositoryIntelligence, networkLogs } = failureContext;
        
        const apiRoutes = repositoryIntelligence.businessModules.map(m => `/api/${m.name}`);
        
        return apiRoutes.filter(api =>
            networkLogs.apiResponses.some(r => r.url.includes(api))
        );
    }
}
