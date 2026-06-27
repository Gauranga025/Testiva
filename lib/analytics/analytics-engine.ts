/**
 * Analytics Engine
 * Persists analytics for every execution and generates comprehensive reports
 */

export interface ExecutionMetrics {
    executionId: string;
    timestamp: string;
    repositoryHash: string;
    route: string;
    success: boolean;
    runtime: number;
    tokenUsage: number;
    aiCostEstimate: number;
    retryCount: number;
    selfHealingSuccess: boolean;
    accessibilityScore: number;
    apiCoverage: number;
    visualRegressionScore: number;
}

export interface AnalyticsReport {
    executionReport: ExecutionReport;
    coverageReport: CoverageReport;
    failureReport: FailureReport;
    healthReport: HealthReport;
    accessibilityReport: AccessibilityReport;
    apiReport: APIReport;
    visualRegressionReport: VisualRegressionReport;
}

export interface ExecutionReport {
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    averageRuntime: number;
    totalTokenUsage: number;
    totalAICost: number;
}

export interface CoverageReport {
    overallCoverage: number;
    routeCoverage: number;
    apiCoverage: number;
}

export interface FailureReport {
    totalFailures: number;
    byCategory: Record<string, number>;
    selfHealingSuccessRate: number;
}

export interface HealthReport {
    totalExecutions: number;
    passRate: number;
    failureRate: number;
    averageExecutionTime: number;
    selfHealingSuccessRate: number;
}

export interface AccessibilityReport {
    averageScore: number;
    totalViolations: number;
}

export interface APIReport {
    totalAPITests: number;
    passedAPITests: number;
    failedAPITests: number;
    coverage: number;
}

export interface VisualRegressionReport {
    totalComparisons: number;
    passedComparisons: number;
    failedComparisons: number;
    averageDifference: number;
}

export class AnalyticsEngine {
    private executionMetrics: ExecutionMetrics[] = [];
    
    recordExecution(metrics: ExecutionMetrics): void {
        this.executionMetrics.push(metrics);
    }
    
    generateReport(): AnalyticsReport {
        return {
            executionReport: this.generateExecutionReport(),
            coverageReport: this.generateCoverageReport(),
            failureReport: this.generateFailureReport(),
            healthReport: this.generateHealthReport(),
            accessibilityReport: this.generateAccessibilityReport(),
            apiReport: this.generateAPIReport(),
            visualRegressionReport: this.generateVisualRegressionReport(),
        };
    }
    
    private generateExecutionReport(): ExecutionReport {
        const totalExecutions = this.executionMetrics.length;
        const successfulExecutions = this.executionMetrics.filter(m => m.success).length;
        const failedExecutions = totalExecutions - successfulExecutions;
        
        const averageRuntime = totalExecutions > 0
            ? this.executionMetrics.reduce((sum, m) => sum + m.runtime, 0) / totalExecutions
            : 0;
        
        const totalTokenUsage = this.executionMetrics.reduce((sum, m) => sum + m.tokenUsage, 0);
        const totalAICost = this.executionMetrics.reduce((sum, m) => sum + m.aiCostEstimate, 0);
        
        return {
            totalExecutions,
            successfulExecutions,
            failedExecutions,
            averageRuntime,
            totalTokenUsage,
            totalAICost,
        };
    }
    
    private generateCoverageReport(): CoverageReport {
        const apiScores = this.executionMetrics.map(m => m.apiCoverage);
        const averageAPICoverage = apiScores.length > 0
            ? apiScores.reduce((sum, score) => sum + score, 0) / apiScores.length
            : 0;
        
        return {
            overallCoverage: averageAPICoverage,
            routeCoverage: 0,
            apiCoverage: averageAPICoverage,
        };
    }
    
    private generateFailureReport(): FailureReport {
        const failedExecutions = this.executionMetrics.filter(m => !m.success);
        const totalFailures = failedExecutions.length;
        
        const byCategory: Record<string, number> = {};
        const selfHealingSuccessRate = totalFailures > 0
            ? failedExecutions.filter(m => m.selfHealingSuccess).length / totalFailures
            : 0;
        
        return {
            totalFailures,
            byCategory,
            selfHealingSuccessRate,
        };
    }
    
    private generateHealthReport(): HealthReport {
        const totalExecutions = this.executionMetrics.length;
        const successfulExecutions = this.executionMetrics.filter(m => m.success).length;
        
        const passRate = totalExecutions > 0 ? (successfulExecutions / totalExecutions) * 100 : 0;
        const failureRate = totalExecutions > 0 ? ((totalExecutions - successfulExecutions) / totalExecutions) * 100 : 0;
        
        const averageExecutionTime = totalExecutions > 0
            ? this.executionMetrics.reduce((sum, m) => sum + m.runtime, 0) / totalExecutions
            : 0;
        
        const selfHealingSuccessRate = this.executionMetrics.filter(m => m.selfHealingSuccess).length / totalExecutions;
        
        return {
            totalExecutions,
            passRate,
            failureRate,
            averageExecutionTime,
            selfHealingSuccessRate,
        };
    }
    
    private generateAccessibilityReport(): AccessibilityReport {
        const accessibilityScores = this.executionMetrics.map(m => m.accessibilityScore);
        
        const averageScore = accessibilityScores.length > 0
            ? accessibilityScores.reduce((sum, score) => sum + score, 0) / accessibilityScores.length
            : 100;
        
        return {
            averageScore,
            totalViolations: 0,
        };
    }
    
    private generateAPIReport(): APIReport {
        const apiScores = this.executionMetrics.map(m => m.apiCoverage);
        
        const averageCoverage = apiScores.length > 0
            ? apiScores.reduce((sum, score) => sum + score, 0) / apiScores.length
            : 0;
        
        return {
            totalAPITests: 0,
            passedAPITests: 0,
            failedAPITests: 0,
            coverage: averageCoverage,
        };
    }
    
    private generateVisualRegressionReport(): VisualRegressionReport {
        const visualScores = this.executionMetrics.map(m => m.visualRegressionScore);
        
        const averageScore = visualScores.length > 0
            ? visualScores.reduce((sum, score) => sum + score, 0) / visualScores.length
            : 100;
        
        return {
            totalComparisons: 0,
            passedComparisons: 0,
            failedComparisons: 0,
            averageDifference: 100 - averageScore,
        };
    }
    
    getExecutionMetrics(): ExecutionMetrics[] {
        return this.executionMetrics;
    }
    
    clearMetrics(): void {
        this.executionMetrics = [];
    }
}
