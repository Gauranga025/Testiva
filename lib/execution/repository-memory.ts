/**
 * Repository Memory Service
 * 
 * Persists and retrieves execution knowledge to improve future test reliability.
 * Memory is repository-specific and invalidated intelligently on repository changes.
 */

import type { FailureReport } from "./failure-analysis";

// ============================================================================
// Repository Memory Schema
// ============================================================================

export interface RepositoryMemory {
    repositoryHash: string;
    repositoryUrl: string;
    lastUpdated: string;
    
    // Selector Knowledge
    successfulSelectors: SelectorMemory[];
    failedSelectors: SelectorMemory[];
    repairedSelectors: RepairedSelectorMemory[];
    
    // Flow Knowledge
    loginFlows: LoginFlowMemory[];
    navigationPatterns: NavigationPatternMemory[];
    
    // UI Knowledge
    routes: RouteMemory[];
    dialogs: DialogMemory[];
    forms: FormMemory[];
    
    // Script Knowledge
    workingScripts: ScriptMemory[];
    failedScripts: ScriptMemory[];
    
    // Execution History
    executionHistory: ExecutionHistoryEntry[];
    
    // Coverage History
    coverageHistory: CoverageHistoryEntry[];
    
    // Failure Reports
    failureReports: FailureReportMemory[];
    
    // Metadata
    totalExecutions: number;
    totalSuccesses: number;
    totalFailures: number;
    successRate: number;
}

export interface SelectorMemory {
    selector: string;
    element: string;
    route: string;
    lastUsed: string;
    successCount: number;
    failureCount: number;
    confidence: number; // 0-100
    lastVerified: string;
}

export interface RepairedSelectorMemory {
    originalSelector: string;
    repairedSelector: string;
    repairReason: string;
    timestamp: string;
    successCount: number;
    failureCount: number;
}

export interface LoginFlowMemory {
    loginUrl: string;
    usernameSelector: string;
    passwordSelector: string;
    submitSelector: string;
    successRedirect: string;
    lastUsed: string;
    successCount: number;
    failureCount: number;
}

export interface NavigationPatternMemory {
    fromRoute: string;
    toRoute: string;
    navigationSelector: string;
    expectedDelay: number;
    lastUsed: string;
    successCount: number;
    failureCount: number;
}

export interface RouteMemory {
    path: string;
    title: string;
    requiresAuth: boolean;
    expectedElements: string[];
    lastVisited: string;
    successCount: number;
    failureCount: number;
}

export interface DialogMemory {
    role: string;
    triggerSelector: string;
    closeSelector: string;
    title: string;
    lastSeen: string;
    successCount: number;
    failureCount: number;
}

export interface FormMemory {
    action: string;
    submitSelector: string;
    fieldSelectors: Record<string, string>;
    validationRules: string[];
    lastUsed: string;
    successCount: number;
    failureCount: number;
}

export interface ScriptMemory {
    scriptHash: string;
    route: string;
    script: string;
    lastUsed: string;
    successCount: number;
    failureCount: number;
    averageRuntime: number;
}

export interface ExecutionHistoryEntry {
    executionId: string;
    timestamp: string;
    route: string;
    success: boolean;
    runtime: number;
    failureCategory?: string;
    memoryHits: number;
    memoryMisses: number;
}

export interface CoverageHistoryEntry {
    timestamp: string;
    routeCoverage: number;
    apiCoverage: number;
    formCoverage: number;
    componentCoverage: number;
    overallCoverage: number;
}

export interface FailureReportMemory {
    executionId: string;
    timestamp: string;
    rootCause: string;
    category: string;
    severity: string;
    affectedFeature: string;
    brokenSelector: string | null;
    suggestedSelector: string | null;
    suggestedFix: string;
    retryRecommended: boolean;
    retryAttempted: boolean;
    retrySuccess: boolean;
}

// ============================================================================
// Repository Memory Service
// ============================================================================

export class RepositoryMemoryService {
    private memoryCache: Map<string, RepositoryMemory> = new Map();
    
    /**
     * Get repository memory for a specific repository
     */
    getRepositoryMemory(repositoryHash: string, repositoryUrl: string): RepositoryMemory {
        const cached = this.memoryCache.get(repositoryHash);
        
        if (cached) {
            return cached;
        }
        
        // Initialize new memory
        const newMemory: RepositoryMemory = {
            repositoryHash,
            repositoryUrl,
            lastUpdated: new Date().toISOString(),
            
            successfulSelectors: [],
            failedSelectors: [],
            repairedSelectors: [],
            
            loginFlows: [],
            navigationPatterns: [],
            
            routes: [],
            dialogs: [],
            forms: [],
            
            workingScripts: [],
            failedScripts: [],
            
            executionHistory: [],
            coverageHistory: [],
            failureReports: [],
            
            totalExecutions: 0,
            totalSuccesses: 0,
            totalFailures: 0,
            successRate: 0,
        };
        
        this.memoryCache.set(repositoryHash, newMemory);
        return newMemory;
    }
    
    /**
     * Invalidate repository memory when repository hash changes
     */
    invalidateRepositoryMemory(repositoryHash: string): void {
        this.memoryCache.delete(repositoryHash);
    }
    
    /**
     * Check if memory should be invalidated based on UI Discovery changes
     */
    shouldInvalidateMemory(
        repositoryHash: string,
        currentDomHash: string,
        previousDomHash: string | null
    ): boolean {
        if (!previousDomHash) {
            return false;
        }
        
        // Invalidate if DOM hash changed significantly
        return currentDomHash !== previousDomHash;
    }
    
    /**
     * Record successful selector usage
     */
    recordSuccessfulSelector(
        repositoryHash: string,
        selector: string,
        element: string,
        route: string
    ): void {
        const memory = this.getRepositoryMemory(repositoryHash, "");
        
        const existing = memory.successfulSelectors.find(s => s.selector === selector);
        
        if (existing) {
            existing.successCount++;
            existing.lastUsed = new Date().toISOString();
            existing.confidence = Math.min(100, existing.confidence + 5);
            existing.lastVerified = new Date().toISOString();
        } else {
            memory.successfulSelectors.push({
                selector,
                element,
                route,
                lastUsed: new Date().toISOString(),
                successCount: 1,
                failureCount: 0,
                confidence: 50,
                lastVerified: new Date().toISOString(),
            });
        }
        
        memory.lastUpdated = new Date().toISOString();
    }
    
    /**
     * Record failed selector usage
     */
    recordFailedSelector(
        repositoryHash: string,
        selector: string,
        element: string,
        route: string
    ): void {
        const memory = this.getRepositoryMemory(repositoryHash, "");
        
        const existing = memory.failedSelectors.find(s => s.selector === selector);
        
        if (existing) {
            existing.failureCount++;
            existing.lastUsed = new Date().toISOString();
            existing.confidence = Math.max(0, existing.confidence - 10);
        } else {
            memory.failedSelectors.push({
                selector,
                element,
                route,
                lastUsed: new Date().toISOString(),
                successCount: 0,
                failureCount: 1,
                confidence: 0,
                lastVerified: new Date().toISOString(),
            });
        }
        
        memory.lastUpdated = new Date().toISOString();
    }
    
    /**
     * Record repaired selector
     */
    recordRepairedSelector(
        repositoryHash: string,
        originalSelector: string,
        repairedSelector: string,
        repairReason: string
    ): void {
        const memory = this.getRepositoryMemory(repositoryHash, "");
        
        const existing = memory.repairedSelectors.find(
            r => r.originalSelector === originalSelector
        );
        
        if (existing) {
            existing.repairedSelector = repairedSelector;
            existing.repairReason = repairReason;
            existing.timestamp = new Date().toISOString();
        } else {
            memory.repairedSelectors.push({
                originalSelector,
                repairedSelector,
                repairReason,
                timestamp: new Date().toISOString(),
                successCount: 0,
                failureCount: 0,
            });
        }
        
        memory.lastUpdated = new Date().toISOString();
    }
    
    /**
     * Get repaired selector for a failed selector
     */
    getRepairedSelector(repositoryHash: string, originalSelector: string): string | null {
        const memory = this.getRepositoryMemory(repositoryHash, "");
        
        const repaired = memory.repairedSelectors.find(
            r => r.originalSelector === originalSelector
        );
        
        return repaired?.repairedSelector || null;
    }
    
    /**
     * Get successful selector for an element on a route
     */
    getSuccessfulSelector(
        repositoryHash: string,
        element: string,
        route: string
    ): string | null {
        const memory = this.getRepositoryMemory(repositoryHash, "");
        
        const selectors = memory.successfulSelectors
            .filter(s => s.element === element && s.route === route)
            .sort((a, b) => b.confidence - a.confidence);
        
        return selectors.length > 0 ? selectors[0].selector : null;
    }
    
    /**
     * Record login flow discovery
     */
    recordLoginFlow(
        repositoryHash: string,
        loginUrl: string,
        usernameSelector: string,
        passwordSelector: string,
        submitSelector: string,
        successRedirect: string
    ): void {
        const memory = this.getRepositoryMemory(repositoryHash, "");
        
        const existing = memory.loginFlows.find(f => f.loginUrl === loginUrl);
        
        if (existing) {
            existing.usernameSelector = usernameSelector;
            existing.passwordSelector = passwordSelector;
            existing.submitSelector = submitSelector;
            existing.successRedirect = successRedirect;
            existing.lastUsed = new Date().toISOString();
        } else {
            memory.loginFlows.push({
                loginUrl,
                usernameSelector,
                passwordSelector,
                submitSelector,
                successRedirect,
                lastUsed: new Date().toISOString(),
                successCount: 0,
                failureCount: 0,
            });
        }
        
        memory.lastUpdated = new Date().toISOString();
    }
    
    /**
     * Get login flow for a repository
     */
    getLoginFlow(repositoryHash: string): LoginFlowMemory | null {
        const memory = this.getRepositoryMemory(repositoryHash, "");
        
        return memory.loginFlows.length > 0 ? memory.loginFlows[0] : null;
    }
    
    /**
     * Record navigation pattern
     */
    recordNavigationPattern(
        repositoryHash: string,
        fromRoute: string,
        toRoute: string,
        navigationSelector: string,
        expectedDelay: number
    ): void {
        const memory = this.getRepositoryMemory(repositoryHash, "");
        
        const existing = memory.navigationPatterns.find(
            p => p.fromRoute === fromRoute && p.toRoute === toRoute
        );
        
        if (existing) {
            existing.navigationSelector = navigationSelector;
            existing.expectedDelay = expectedDelay;
            existing.lastUsed = new Date().toISOString();
        } else {
            memory.navigationPatterns.push({
                fromRoute,
                toRoute,
                navigationSelector,
                expectedDelay,
                lastUsed: new Date().toISOString(),
                successCount: 0,
                failureCount: 0,
            });
        }
        
        memory.lastUpdated = new Date().toISOString();
    }
    
    /**
     * Get navigation pattern
     */
    getNavigationPattern(
        repositoryHash: string,
        fromRoute: string,
        toRoute: string
    ): NavigationPatternMemory | null {
        const memory = this.getRepositoryMemory(repositoryHash, "");
        
        return memory.navigationPatterns.find(
            p => p.fromRoute === fromRoute && p.toRoute === toRoute
        ) || null;
    }
    
    /**
     * Record execution history
     */
    recordExecutionHistory(
        repositoryHash: string,
        entry: Omit<ExecutionHistoryEntry, "timestamp">
    ): void {
        const memory = this.getRepositoryMemory(repositoryHash, "");
        
        memory.executionHistory.push({
            ...entry,
            timestamp: new Date().toISOString(),
        });
        
        memory.totalExecutions++;
        
        if (entry.success) {
            memory.totalSuccesses++;
        } else {
            memory.totalFailures++;
        }
        
        memory.successRate = memory.totalExecutions > 0
            ? (memory.totalSuccesses / memory.totalExecutions) * 100
            : 0;
        
        memory.lastUpdated = new Date().toISOString();
    }
    
    /**
     * Record failure report
     */
    recordFailureReport(
        repositoryHash: string,
        failureReport: FailureReport,
        retryAttempted: boolean = false,
        retrySuccess: boolean = false
    ): void {
        const memory = this.getRepositoryMemory(repositoryHash, "");
        
        memory.failureReports.push({
            executionId: failureReport.executionId,
            timestamp: failureReport.timestamp,
            rootCause: failureReport.rootCause,
            category: failureReport.category,
            severity: failureReport.severity,
            affectedFeature: failureReport.affectedFeature,
            brokenSelector: failureReport.brokenSelector,
            suggestedSelector: failureReport.suggestedSelector,
            suggestedFix: failureReport.suggestedFix,
            retryRecommended: failureReport.retryRecommended,
            retryAttempted,
            retrySuccess,
        });
        
        memory.lastUpdated = new Date().toISOString();
    }
    
    /**
     * Get memory statistics
     */
    getMemoryStatistics(repositoryHash: string) {
        const memory = this.getRepositoryMemory(repositoryHash, "");
        
        return {
            totalSelectors: memory.successfulSelectors.length + memory.failedSelectors.length,
            successfulSelectors: memory.successfulSelectors.length,
            failedSelectors: memory.failedSelectors.length,
            repairedSelectors: memory.repairedSelectors.length,
            loginFlows: memory.loginFlows.length,
            navigationPatterns: memory.navigationPatterns.length,
            routes: memory.routes.length,
            dialogs: memory.dialogs.length,
            forms: memory.forms.length,
            workingScripts: memory.workingScripts.length,
            failedScripts: memory.failedScripts.length,
            totalExecutions: memory.totalExecutions,
            totalSuccesses: memory.totalSuccesses,
            totalFailures: memory.totalFailures,
            successRate: memory.successRate,
            lastUpdated: memory.lastUpdated,
        };
    }
    
    /**
     * Get memory hits/misses for a query
     */
    queryMemory(
        repositoryHash: string,
        query: {
            selector?: string;
            element?: string;
            route?: string;
            loginFlow?: boolean;
            navigationPattern?: { from: string; to: string };
        }
    ): { hit: boolean; data: any } {
        const memory = this.getRepositoryMemory(repositoryHash, "");
        
        if (query.selector) {
            const repaired = this.getRepairedSelector(repositoryHash, query.selector);
            if (repaired) {
                return { hit: true, data: { repairedSelector: repaired } };
            }
        }
        
        if (query.element && query.route) {
            const selector = this.getSuccessfulSelector(repositoryHash, query.element, query.route);
            if (selector) {
                return { hit: true, data: { selector } };
            }
        }
        
        if (query.loginFlow) {
            const flow = this.getLoginFlow(repositoryHash);
            if (flow) {
                return { hit: true, data: flow };
            }
        }
        
        if (query.navigationPattern) {
            const pattern = this.getNavigationPattern(
                repositoryHash,
                query.navigationPattern.from,
                query.navigationPattern.to
            );
            if (pattern) {
                return { hit: true, data: pattern };
            }
        }
        
        return { hit: false, data: null };
    }
}
