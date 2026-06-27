/**
 * Intelligent Self-Healing Service
 * 
 * Automatically repairs failed Playwright scripts and retries once.
 * Only retries selector/UI-related failures, not authentication/infrastructure failures.
 */

import type { FailureContext, FailureReport } from "./failure-analysis";
import type { RepositoryMemoryService } from "./repository-memory";
import { PromptBuilders } from "@/lib/ai/prompt-builders";

export interface SelfHealingResult {
    attempted: boolean;
    success: boolean;
    repairedScript: string | null;
    failureReport: FailureReport | null;
    retryExecutionId: string | null;
    reason: string;
    sessionId: string | null;
    sessionUrl: string | null;
    recordingUrl: string | null;
}

export interface SelfHealingConfig {
    enabled: boolean;
    maxRetries: number;
    retryableCategories: string[];
}

export class SelfHealingService {
    private config: SelfHealingConfig = {
        enabled: true,
        maxRetries: 1,
        retryableCategories: ["ui_change", "navigation", "playwright"],
    };
    
    constructor(config?: Partial<SelfHealingConfig>) {
        if (config) {
            this.config = { ...this.config, ...config };
        }
    }
    
    /**
     * Attempt self-healing for a failed execution
     */
    async attemptSelfHealing(params: {
        failureContext: FailureContext;
        failureReport: FailureReport;
        repositoryMemoryService: RepositoryMemoryService;
        repositoryHash: string;
        executeScript: (script: string) => Promise<{ success: boolean; logs: string[]; sessionId: string | null; sessionUrl: string | null; recordingUrl: string | null }>;
        logs: string[];
    }): Promise<SelfHealingResult> {
        const {
            failureContext,
            failureReport,
            repositoryMemoryService,
            repositoryHash,
            executeScript,
            logs,
        } = params;
        
        logs.push(`[SELF_HEAL] Starting self-healing analysis`);
        logs.push(`[SELF_HEAL] Failure category: ${failureReport.category}`);
        logs.push(`[SELF_HEAL] Retry recommended: ${failureReport.retryRecommended}`);
        
        // Check if retry is recommended
        if (!failureReport.retryRecommended) {
            logs.push(`[SELF_HEAL] Retry not recommended for this failure type`);
            return {
                attempted: false,
                success: false,
                repairedScript: null,
                failureReport,
                retryExecutionId: null,
                reason: "Failure category is not retryable",
                sessionId: null,
                sessionUrl: null,
                recordingUrl: null,
            };
        }
        
        // Check if self-healing is enabled
        if (!this.config.enabled) {
            logs.push(`[SELF_HEAL] Self-healing is disabled`);
            return {
                attempted: false,
                success: false,
                repairedScript: null,
                failureReport,
                retryExecutionId: null,
                reason: "Self-healing is disabled",
                sessionId: null,
                sessionUrl: null,
                recordingUrl: null,
            };
        }
        
        // Check if category is retryable
        if (!this.config.retryableCategories.includes(failureReport.category)) {
            logs.push(`[SELF_HEAL] Category ${failureReport.category} is not retryable`);
            return {
                attempted: false,
                success: false,
                repairedScript: null,
                failureReport,
                retryExecutionId: null,
                reason: `Category ${failureReport.category} is not retryable`,
                sessionId: null,
                sessionUrl: null,
                recordingUrl: null,
            };
        }
        
        logs.push(`[SELF_HEAL] Generating repaired script`);
        
        // Generate repaired script
        const repairedScript = await this.generateRepairedScript(
            failureContext,
            repositoryMemoryService,
            repositoryHash
        );
        
        if (!repairedScript) {
            logs.push(`[SELF_HEAL] Failed to generate repaired script`);
            return {
                attempted: true,
                success: false,
                repairedScript: null,
                failureReport,
                retryExecutionId: null,
                reason: "Failed to generate repaired script",
                sessionId: null,
                sessionUrl: null,
                recordingUrl: null,
            };
        }
        
        logs.push(`[SELF_HEAL] Repaired script generated, executing retry`);
        
        // Execute repaired script
        const retryResult = await executeScript(repairedScript);
        
        const retryExecutionId = `retry-${Date.now()}`;
        
        if (retryResult.success) {
            logs.push(`[RECOVERY] Retry succeeded - script repaired successfully`);
            
            // Record successful repair in memory
            if (failureReport.brokenSelector) {
                repositoryMemoryService.recordRepairedSelector(
                    repositoryHash,
                    failureReport.brokenSelector,
                    failureReport.suggestedSelector || repairedScript,
                    failureReport.suggestedFix
                );
            }
            
            // Record successful selector usage
            repositoryMemoryService.recordSuccessfulSelector(
                repositoryHash,
                failureReport.suggestedSelector || "unknown",
                failureReport.affectedFeature,
                failureContext.browserState.currentUrl
            );
            
            return {
                attempted: true,
                success: true,
                repairedScript,
                failureReport,
                retryExecutionId,
                reason: "Retry succeeded with repaired script",
                sessionId: retryResult.sessionId || null,
                sessionUrl: retryResult.sessionUrl || null,
                recordingUrl: retryResult.recordingUrl || null,
            };
        } else {
            logs.push(`[RECOVERY] Retry failed - repair unsuccessful`);
            
            // Record failed repair in memory
            if (failureReport.brokenSelector) {
                repositoryMemoryService.recordFailedSelector(
                    repositoryHash,
                    failureReport.brokenSelector,
                    failureReport.affectedFeature,
                    failureContext.browserState.currentUrl
                );
            }
            
            return {
                attempted: true,
                success: false,
                repairedScript,
                failureReport,
                retryExecutionId,
                reason: "Retry failed with repaired script",
                sessionId: retryResult.sessionId || null,
                sessionUrl: retryResult.sessionUrl || null,
                recordingUrl: retryResult.recordingUrl || null,
            };
        }
    }
    
    /**
     * Generate repaired script using AI
     */
    private async generateRepairedScript(
        failureContext: FailureContext,
        repositoryMemoryService: RepositoryMemoryService,
        repositoryHash: string
    ): Promise<string | null> {
        const { aiContext, generatedScript, playwrightContext } = failureContext;
        
        // Build repair prompt with memory context
        const errorLogs = [
            `Failed step: ${playwrightContext.failedStep.action}`,
            `Selector: ${playwrightContext.failedStep.selector}`,
            `Error: ${playwrightContext.failedStep.error}`,
        ];
        
        const prompt = PromptBuilders.buildRepairPrompt(
            aiContext,
            generatedScript,
            errorLogs,
            repositoryMemoryService,
            repositoryHash
        );
        
        // In production, this would call the AI service
        // For now, return null to indicate AI generation is pending
        return null;
    }
    
    /**
     * Check if a failure is retryable
     */
    isRetryable(failureReport: FailureReport): boolean {
        if (!this.config.enabled) {
            return false;
        }
        
        if (!failureReport.retryRecommended) {
            return false;
        }
        
        return this.config.retryableCategories.includes(failureReport.category);
    }
}
