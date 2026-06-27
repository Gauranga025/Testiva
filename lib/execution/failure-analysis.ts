/**
 * AI Failure Analysis Service
 * 
 * Collects execution snapshots, analyzes failures, and generates root cause reports.
 * Reuses existing AIContext and Repository Intelligence without re-analysis.
 */

import type { AIContext } from "@/lib/ai/ai-context";
import type { RepositoryIntelligence } from "@/lib/ai/repository-intelligence";
import type { DomSummary } from "./types";

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
    }): Promise<FailureContext> {
        const {
            browserbaseSession,
            generatedScript,
            failedStep,
            aiContext,
            repositoryIntelligence,
            domSummary,
            executionId,
        } = params;

        // Collect browser state
        const browserState = await this.collectBrowserState(browserbaseSession);
        
        // Collect visual state
        const visualState = await this.collectVisualState(browserbaseSession);
        
        // Collect console logs
        const consoleLogs = await this.collectConsoleLogs(browserbaseSession);
        
        // Collect network logs
        const networkLogs = await this.collectNetworkLogs(browserbaseSession);
        
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
        // In production, this would call AI to analyze the failure
        // For now, return a basic report structure
        
        const category = this.determineFailureCategory(failureContext);
        const severity = this.determineSeverity(failureContext, category);
        const retryRecommended = this.shouldRetry(failureContext, category);
        
        return {
            executionId: failureContext.executionId,
            timestamp: failureContext.timestamp,
            
            rootCause: "AI analysis pending",
            confidenceScore: 0,
            severity,
            category,
            
            affectedFeature: this.extractAffectedFeature(failureContext),
            failedStep: failureContext.failedStep,
            brokenSelector: this.extractBrokenSelector(failureContext),
            suggestedSelector: null,
            suggestedFix: "AI-generated fix pending",
            
            retryRecommended,
            retryReason: retryRecommended ? "Selector-related failure, safe to retry" : "Non-retryable failure",
            
            relatedRepositoryFiles: this.extractRelatedFiles(failureContext),
            relatedRoutes: this.extractRelatedRoutes(failureContext),
            relatedApis: this.extractRelatedApis(failureContext),
            
            executiveSummary: "AI-generated executive summary pending",
            
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
        // In production, this would query the Browserbase session
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
        // In production, this would capture screenshot and recording
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
    
    private async collectConsoleLogs(browserbaseSession: any): Promise<ConsoleState> {
        // In production, this would collect console logs
        return {
            logs: [],
            warnings: [],
            errors: [],
            unhandledExceptions: [],
        };
    }
    
    private async collectNetworkLogs(browserbaseSession: any): Promise<NetworkState> {
        // In production, this would collect network logs
        return {
            failedRequests: [],
            httpErrors: [],
            redirects: [],
            apiResponses: [],
            networkTiming: {
                totalRequests: 0,
                totalSize: 0,
                averageResponseTime: 0,
                slowestRequest: null,
                fastestRequest: null,
            },
            requestWaterfall: [],
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
    
    private determineFailureCategory(failureContext: FailureContext): FailureCategory {
        const { failedStep, consoleLogs, networkLogs } = failureContext;
        
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
    
    private shouldRetry(failureContext: FailureContext, category: FailureCategory): boolean {
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
